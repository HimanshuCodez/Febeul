import userModel from '../models/userModel.js';
import jwt from 'jsonwebtoken';

const adminAuth = async (req, res, next) => {
    const { token } = req.headers;
    if (!token) {
        return res.status(401).json({ success: false, message: 'Not authorized. Login again.' });
    }
    try {
        const token_decode = jwt.verify(token, process.env.JWT_SECRET);
        const user = await userModel.findById(token_decode.id);
        if (!user || !user.isAdmin) {
            return res.status(403).json({ success: false, message: 'Not authorized for this action.' });
        }
        req.body.userId = token_decode.id;
        req.body.isAdmin = true; // Flag for admin
        next();
    } catch (error) {
        console.log(error);
        res.status(401).json({ success: false, message: 'Error in admin authentication.' });
    }
};

export default adminAuth;