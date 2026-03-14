import jwt from 'jsonwebtoken';

const adminAuth = async (req, res, next) => {
    const { token } = req.headers;
    if (!token) {
        return res.status(401).json({ success: false, message: 'Not authorized. Login again.' });
    }
    try {
        const token_decode = jwt.verify(token, process.env.JWT_SECRET);
        
        // 1. Check Primary Admin (ENV)
        const adminCredentials = process.env.ADMIN_EMAIL + process.env.ADMIN_PASSWORD;
        if (token_decode === adminCredentials) {
            req.role = 'admin';
            return next();
        }

        // 2. Check Staff Members (ENV)
        const staffEmails = process.env.STAFF_EMAILS ? process.env.STAFF_EMAILS.split(',') : [];
        const staffPasswords = process.env.STAFF_PASSWORDS ? process.env.STAFF_PASSWORDS.split(',') : [];
        let isStaffEnv = false;
        for (let i = 0; i < staffEmails.length; i++) {
            if (token_decode === (staffEmails[i] + staffPasswords[i])) {
                isStaffEnv = true;
                break;
            }
        }
        // Legacy single staff check
        if (!isStaffEnv && token_decode === (process.env.STAFF_EMAIL + process.env.STAFF_PASSWORD)) {
            isStaffEnv = true;
        }

        if (isStaffEnv) {
            req.role = 'staff';
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
                req.permissions = user.permissions;
                
                // If they are database-staff, still restrict /api/admin if that's the policy
                if (user.role === 'staff' && req.baseUrl.includes('/api/admin')) {
                    return res.status(403).json({ success: false, message: 'Access denied. Admins only.' });
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