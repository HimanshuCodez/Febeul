import axios from 'axios';

const getConfiguration = () => {
    const siteKey = (process.env.TURNSTILE_SITE_KEY || '').trim();
    const secretKey = (process.env.TURNSTILE_SECRET_KEY || '').trim();
    const hostnames = (process.env.TURNSTILE_ALLOWED_HOSTNAMES || 'febeul.com,www.febeul.com').split(',').map(value => value.trim().toLowerCase()).filter(Boolean);
    // Both absent preserves existing sign-in during rollout. Partial configuration fails closed.
    const enabled = Boolean(siteKey || secretKey);
    const configured = Boolean(siteKey && secretKey && hostnames.length && hostnames.every(host => /^[a-z0-9.-]+$/.test(host)));
    return { siteKey, secretKey, hostnames, enabled, configured };
};

export function getAuthConfig(_req, res) {
    res.set('Cache-Control', 'no-store');
    const config = getConfiguration();
    if (config.enabled && !config.configured) return res.status(503).json({ success: false, message: 'Sign-in verification is temporarily unavailable. Please try again later.' });
    return res.json({ success: true, turnstile: { enabled: config.enabled, siteKey: config.enabled ? config.siteKey : null } });
}

export async function requireTurnstile(req, res, next) {
    res.set('Cache-Control', 'no-store');
    const config = getConfiguration();
    if (!config.enabled) return next();
    if (!config.configured) return res.status(503).json({ success: false, message: 'Sign-in verification is temporarily unavailable. Please try again later.' });
    const token = req.body?.turnstileToken;
    if (typeof token !== 'string' || !token.trim() || token.length > 2048) {
        return res.status(400).json({ success: false, message: 'Please complete the security verification and try again.' });
    }
    try {
        const { data } = await axios.post('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
            secret: config.secretKey, response: token,
        }, { timeout: 8000, maxRedirects: 0, maxContentLength: 16 * 1024 });
        if (data?.['error-codes']?.some(code => ['missing-input-secret', 'invalid-input-secret', 'internal-error'].includes(code))) {
            return res.status(503).json({ success: false, message: 'Sign-in verification is temporarily unavailable. Please try again later.' });
        }
        if (data?.success !== true || data.action !== 'auth' || typeof data.hostname !== 'string' || !config.hostnames.includes(data.hostname.toLowerCase())) {
            return res.status(403).json({ success: false, message: 'Security verification expired or failed. Please verify again.' });
        }
        // Never accept the same token locally after an error or cache a successful validation.
        // Cloudflare enforces expiry and single use on every Siteverify call.
        return next();
    } catch {
        return res.status(503).json({ success: false, message: 'Unable to verify right now. Please retry the security check.' });
    }
}
