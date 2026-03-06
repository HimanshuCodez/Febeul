import jwt from 'jsonwebtoken';

const adminAuth = async (req, res, next) => {
    const { token } = req.headers;
    if (!token) {
        return res.status(401).json({ success: false, message: 'Not authorized. Login again.' });
    }
    try {
        const token_decode = jwt.verify(token, process.env.JWT_SECRET);
        
        const adminCredentials = process.env.ADMIN_EMAIL + process.env.ADMIN_PASSWORD;
        if (token_decode === adminCredentials) {
            req.role = 'admin';
            return next();
        }

        const staffEmails = process.env.STAFF_EMAILS ? process.env.STAFF_EMAILS.split(',') : [];
        const staffPasswords = process.env.STAFF_PASSWORDS ? process.env.STAFF_PASSWORDS.split(',') : [];

        // Check if token matches any staff member
        let isStaff = false;
        for (let i = 0; i < staffEmails.length; i++) {
            if (token_decode === (staffEmails[i] + staffPasswords[i])) {
                isStaff = true;
                break;
            }
        }

        // Check legacy single staff config
        if (!isStaff && token_decode === (process.env.STAFF_EMAIL + process.env.STAFF_PASSWORD)) {
            isStaff = true;
        }

        if (isStaff) {
            req.role = 'staff';
            // Restrict staff from accessing dashboard endpoints
            if (req.baseUrl.includes('/api/admin')) {
                return res.status(403).json({ success: false, message: 'Access denied. Admins only.' });
            }
            return next();
        }

        return res.status(401).json({ success: false, message: 'Invalid Token. Not authorized.' });

    } catch (error) {
        console.log(error);
        res.status(401).json({ success: false, message: 'Error in authentication.' });
    }
};

export default adminAuth;