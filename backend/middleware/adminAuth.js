import jwt from 'jsonwebtoken';

const getRequiredPermission = (fullPath) => {
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
    if (fullPath.startsWith('/api/product/add')) return '/add';
    if (fullPath.startsWith('/api/product/remove') || fullPath.startsWith('/api/product/update')) return '/list';
    if (fullPath.startsWith('/api/order')) return '/orders';
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
    if (fullPath.includes('/maintenance')) return '/maintenance';
    if (fullPath.includes('/configurations')) return '/configurations';
    if (fullPath.startsWith('/api/admin/update-permissions')) return '/allusers';
    
    return null;
};

const adminAuth = async (req, res, next) => {
    const { token } = req.headers;
    if (!token) {
        return res.status(401).json({ success: false, message: 'Not authorized. Login again.' });
    }
    try {
        const token_decode = jwt.verify(token, process.env.JWT_SECRET);
        
        // 1. Check Primary Admin (ENV)
        const adminEmailEnv = process.env.ADMIN_EMAIL;
        const adminPassEnv = process.env.ADMIN_PASSWORD;
        if (token_decode === (adminEmailEnv + adminPassEnv)) {
            req.role = 'admin';
            req.userEmail = adminEmailEnv;
            req.userName = 'Primary Admin';
            return next();
        }

        // 2. Check Staff Members (ENV)
        const staffEmails = process.env.STAFF_EMAILS ? process.env.STAFF_EMAILS.split(',') : [];
        const staffPasswords = process.env.STAFF_PASSWORDS ? process.env.STAFF_PASSWORDS.split(',') : [];
        let isStaffEnv = false;
        for (let i = 0; i < staffEmails.length; i++) {
            if (token_decode === (staffEmails[i] + staffPasswords[i])) {
                isStaffEnv = true;
                req.userEmail = staffEmails[i];
                req.userName = 'Staff Member (ENV)';
                break;
            }
        }
        // Legacy single staff check
        if (!isStaffEnv && token_decode === (process.env.STAFF_EMAIL + process.env.STAFF_PASSWORD)) {
            isStaffEnv = true;
            req.userEmail = process.env.STAFF_EMAIL;
            req.userName = 'Staff (Legacy ENV)';
        }

        if (isStaffEnv) {
            req.role = 'staff';
            // ENV Staff typically have limited access, let's allow them except dashboard/sensitive stuff
            // but for simplicity, if they are ENV staff, they might not have a dashboard.
            if (req.baseUrl.includes('/api/admin')) {
                return res.status(403).json({ success: false, message: 'Access denied. Admins only.' });
            }
            return next();
        }

        // 3. Check Database for Staff/Admin
        try {
            const userModel = (await import('../models/userModel.js')).default;
            const user = await userModel.findById(token_decode);
            if (user && (user.role === 'staff' || user.role === 'admin')) {
                req.role = user.role;
                req.userEmail = user.email;
                req.userName = user.name;
                req.permissions = user.permissions || [];
                
                if (user.role === 'staff') {
                    const fullPath = (req.baseUrl + req.path).replace(/\/$/, "");
                    
                    // Strictly restrict permission updates to Admin only, 
                    // or staff with explicit '/allusers' permission if that's desired.
                    // Usually management of staff is Admin only.
                    if (fullPath.includes('/update-permissions')) {
                         return res.status(403).json({ success: false, message: 'Access denied. Admin only.' });
                    }

                    const permissionNeeded = getRequiredPermission(fullPath);
                    
                    // If we have a defined permission for this route, check it
                    if (permissionNeeded) {
                        if (!req.permissions.includes(permissionNeeded)) {
                            return res.status(403).json({ success: false, message: `Access denied. Permission for '${permissionNeeded}' required.` });
                        }
                    } else if (req.baseUrl.includes('/api/admin')) {
                        // Fallback for any other /api/admin route not explicitly mapped
                        return res.status(403).json({ success: false, message: 'Access denied. Admins only.' });
                    }
                }
                
                return next();
            }
        } catch (dbError) {
            // Probably not a valid ObjectId (it was a credentials string from ENV login), ignore
        }

        return res.status(401).json({ success: false, message: 'Invalid Token. Not authorized.' });

    } catch (error) {
        console.log(error);
        res.status(401).json({ success: false, message: 'Error in authentication.' });
    }
};

export default adminAuth;
