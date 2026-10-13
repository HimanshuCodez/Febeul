import userModel from '../models/userModel.js';
import { verifyToken } from '../utils/authTokens.js';

export default async function authUser(req, res, next) {
    try {
        const claims = verifyToken(req.headers.token, 'customer');
        if (typeof claims.id !== 'string' || !/^[a-f\d]{24}$/i.test(claims.id)) throw new Error('Invalid identity');
        const user = await userModel.findById(claims.id).select('isBlocked tokenVersion');
        if (!user || (user.tokenVersion || 0) !== claims.version) throw new Error('Invalid session');
        const path = `${req.baseUrl}${req.path}`.toLowerCase().replace(/\/$/, '');
        const appealAccess = path === '/api/user/profile' || path.startsWith('/api/ticket/');
        if (user.isBlocked && !appealAccess) return res.status(403).json({ success: false, message: 'Account is blocked.' });
        req.userId = String(user._id);
        if (req.body && typeof req.body === 'object') req.body.userId = req.userId;
        res.set('Cache-Control', 'no-store');
        return next();
    } catch {
        return res.status(401).json({ success: false, message: 'Not authorized. Please log in again.' });
    }
}
