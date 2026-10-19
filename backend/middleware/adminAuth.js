import userModel from '../models/userModel.js';
import { verifyToken, envAccountForToken } from '../utils/authTokens.js';

const getRequiredPermission = (fullPath) => {
    if (fullPath === '/api/admin/search') return '/';
    if (fullPath.startsWith('/api/analytics/reports')) return '/user-tracking';
    if (fullPath.startsWith('/api/admin/dashboard-stats') || 
        fullPath.startsWith('/api/admin/monthly-trends') || 
        fullPath.startsWith('/api/admin/daily-trends') || 
        fullPath.startsWith('/api/admin/category-sales') || 
        fullPath.startsWith('/api/admin/recent-orders') || 
        fullPath.startsWith('/api/admin/sku-sales') || 
        fullPath.startsWith('/api/admin/sku-stocks') || 
        fullPath.startsWith('/api/admin/export-report')) {
        return '/';
    }
    if (fullPath.startsWith('/api/admin/send-marketing-mail')) return '/send-mail';
    if (fullPath.startsWith('/api/admin/mail-history')) return '/send-mail';
    if (fullPath.startsWith('/api/email-template')) return '/email-templates';
    if (fullPath.startsWith('/api/admin/system-stats')) return '/stats';
    if (fullPath.startsWith('/api/product/add')) return '/add';
    if (fullPath.startsWith('/api/product/remove') || fullPath.startsWith('/api/product/update') || fullPath.startsWith('/api/product/toggle-active')) return '/list';
    if (fullPath.startsWith('/api/order')) return '/orders';
    if (fullPath.startsWith('/api/refund')) return '/refund-requests';
    if (fullPath.startsWith('/api/return')) return '/return-requests';
    if (fullPath.startsWith('/api/exchange')) return '/exchanges';
    if (fullPath.startsWith('/api/giftwrap')) return '/gift-wraps';
    if (fullPath.startsWith('/api/policy')) return '/policy-update';
    if (fullPath.startsWith('/api/ticket')) return '/tickets';
    if (fullPath.startsWith('/api/review')) return '/reviews';
    if (fullPath.startsWith('/api/cms')) {
        if (fullPath.includes('settings')) {
            // Check if it's maintenance or configurations specifically? 
            // For now, let's map it to their specific front-end paths if needed, 
            // but the front-end sends 'name: settings'.
            // Let's allow if they have either cms or maintenance/configs permission.
            return '/cms'; 
        }
        return '/cms';
    }
    if (fullPath.startsWith('/api/coupon')) return '/coupons';
    if (fullPath.startsWith('/api/reset')) return '/reset-data';
    if (fullPath.includes('/maintenance')) return '/maintenance';
    if (fullPath.includes('/configurations')) return '/configurations';
    if (fullPath.startsWith('/api/admin/update-permissions')) return '/allusers';
    if (fullPath.startsWith('/api/admin/toggle-block')) return '/allusers';
    if (fullPath.startsWith('/api/admin/grant-luxe')) return '/allusers';
    if (fullPath.startsWith('/api/user/allusers')) return '/allusers';

    return null;
};

const adminAuth = async (req, res, next) => {
    try {
        const claims = verifyToken(req.headers.token, 'admin');
        if (claims.source === 'env') {
            const account = envAccountForToken(claims);
            if (!account) throw new Error('Invalid account');
            req.role = account.role;
            req.userEmail = account.email;
            req.userName = account.role === 'admin' ? 'Primary Admin' : 'Staff';
            req.permissions = (process.env.STAFF_PERMISSIONS || '').split(',').map(p => p.trim()).filter(Boolean);
        } else {
            if (typeof claims.id !== 'string' || !/^[a-f\d]{24}$/i.test(claims.id)) throw new Error('Invalid identity');
            const user = await userModel.findById(claims.id);
            if (!user || user.isBlocked || !['admin', 'staff'].includes(user.role) || (user.tokenVersion || 0) !== claims.version) throw new Error('Invalid account');
            req.role = user.role;
            req.userEmail = user.email;
            req.userName = user.name;
            req.permissions = user.permissions || [];
        }
        const fullPath = (req.baseUrl + req.path).toLowerCase().replace(/\/$/, '');
        if (req.role === 'staff') {
            const permission = getRequiredPermission(fullPath);
            if (fullPath.includes('/update-permissions') || fullPath.startsWith('/api/reset') || !permission || !req.permissions.includes(permission)) {
                return res.status(403).json({ success: false, message: 'Access denied.' });
            }
        }
        res.set('Cache-Control', 'no-store');
        return next();
    } catch {
        return res.status(401).json({ success: false, message: 'Not authorized. Please log in again.' });
    }
};
export default adminAuth;
