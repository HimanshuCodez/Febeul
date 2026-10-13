import jwt from 'jsonwebtoken';
import { createHmac, timingSafeEqual } from 'node:crypto';

const issuer = 'febeul-api';
export const safeEqual = (a, b) => {
    if (typeof a !== 'string' || typeof b !== 'string') return false;
    const left = Buffer.from(a), right = Buffer.from(b);
    return left.length === right.length && timingSafeEqual(left, right);
};
export const signToken = (claims, audience, expiresIn = '2h') => jwt.sign(claims, process.env.JWT_SECRET, {
    algorithm: 'HS256', issuer, audience, expiresIn,
});
export const verifyToken = (token, audience) => {
    const claims = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'], issuer, audience });
    if (!claims || typeof claims !== 'object' || !Number.isInteger(claims.exp)) throw new Error('Invalid token');
    return claims;
};
export const userToken = (user, audience = 'customer') => signToken({ id: String(user._id), version: user.tokenVersion || 0 }, audience);
export const envAccounts = () => {
    const emails = (process.env.STAFF_EMAILS || '').split(',');
    const passwords = (process.env.STAFF_PASSWORDS || '').split(',');
    return [
        { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD, role: 'admin' },
        ...emails.map((email, i) => ({ email, password: passwords[i], role: 'staff' })),
        { email: process.env.STAFF_EMAIL, password: process.env.STAFF_PASSWORD, role: 'staff' },
    ].filter(a => a.email?.trim() && a.password).map(a => ({ ...a, email: a.email.trim().toLowerCase() }));
};
const fingerprint = account => createHmac('sha256', process.env.JWT_SECRET).update(JSON.stringify([account.email, account.password, account.role])).digest('hex');
export const envToken = account => signToken({ email: account.email, source: 'env', fingerprint: fingerprint(account) }, 'admin', '1h');
export const envAccountForToken = claims => envAccounts().find(a => a.email === claims.email && safeEqual(claims.fingerprint, fingerprint(a)));
