import helmet from 'helmet';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import { createHash } from 'node:crypto';
import mongoose from 'mongoose';

const bucketSchema = new mongoose.Schema({ _id: String, count: Number, expiresAt: Date });
bucketSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
const Bucket = mongoose.models.SecurityRateBucket || mongoose.model('SecurityRateBucket', bucketSchema);

export function rejectUnsafeInput(req, res, next) {
    const walk = (value, depth = 0) => {
        if (depth > 25) return false;
        if (!value || typeof value !== 'object') return true;
        return Object.entries(value).every(([key, child]) => !key.startsWith('$') && !key.includes('.') && !['__proto__', 'prototype', 'constructor'].includes(key) && walk(child, depth + 1));
    };
    if (!walk(req.body) || !walk(req.query)) return res.status(400).json({ success: false, message: 'Invalid request fields.' });
    next();
}

export const allowedOrigins = () => (process.env.CORS_ORIGINS || 'https://febeul.com,https://www.febeul.com').split(',').map(s => s.trim()).filter(Boolean);
export function installSecurity(app) {
    if (process.env.NODE_ENV === 'production' && Buffer.byteLength(process.env.JWT_SECRET || '') < 32) throw new Error('JWT_SECRET must contain at least 32 random bytes in production.');
    if (!/^\d{1,2}$/.test(String(process.env.TRUST_PROXY_HOPS || 0))) throw new Error('Invalid TRUST_PROXY_HOPS.');
    app.disable('x-powered-by');
    // Enable only for the exact number of trusted proxies in front of the app.
    app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS || 0));
    app.use(helmet());
    app.use(cors({ origin(origin, callback) {
        const local = process.env.NODE_ENV !== 'production' && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin || '');
        callback(null, !origin || local || allowedOrigins().includes(origin));
    }, allowedHeaders: ['Content-Type', 'token', 'Authorization', 'X-Analytics-Context'], methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'] }));
    app.use('/api', rateLimit({ windowMs: 60_000, limit: 300, standardHeaders: 'draft-7', legacyHeaders: false }));
}

export const authInput = (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    for (const key of ['email', 'password', 'newPassword', 'otp', 'mobile', 'name', 'credential', 'purpose', 'registrationToken']) {
        if (req.body?.[key] !== undefined && (typeof req.body[key] !== 'string' || req.body[key].length > (key === 'credential' || key === 'registrationToken' ? 4096 : 320))) return res.status(400).json({ success: false, message: 'Invalid authentication input.' });
    }
    if (typeof req.body?.email === 'string') req.body.email = req.body.email.trim().toLowerCase();
    next();
};

// Durable, fail-closed limits for credential guessing and email/SMS abuse.
export async function authRateLimit(req, res, next) {
    const windowMs = 15 * 60_000;
    const window = Math.floor(Date.now() / windowMs);
    const sending = /send|forgot/.test(req.path);
    const identity = req.body?.email || req.body?.mobile;
    const keys = [[`ip:${req.ip}`, 60]];
    if (typeof identity === 'string' && identity.length) keys.push([`account:${identity.trim().toLowerCase()}`, sending ? 5 : 25]);
    try {
        for (const [key, limit] of keys) {
            const id = createHash('sha256').update(`${window}:${sending ? 'send' : 'verify'}:${key}`).digest('hex');
            const bucket = await Bucket.findOneAndUpdate({ _id: id }, { $inc: { count: 1 }, $setOnInsert: { expiresAt: new Date((window + 1) * windowMs) } }, { upsert: true, new: true });
            if (bucket.count > limit) {
                res.set('Retry-After', String(Math.ceil(((window + 1) * windowMs - Date.now()) / 1000)));
                return res.status(429).json({ success: false, message: 'Too many attempts. Please try again later.' });
            }
        }
        next();
    } catch {
        res.status(503).json({ success: false, message: 'Authentication temporarily unavailable.' });
    }
}
