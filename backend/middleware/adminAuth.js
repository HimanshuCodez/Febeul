import userModel from '../models/userModel.js';
import jwt from 'jsonwebtoken';

const adminAuth = async (req, res, next) => {
    const { token } = req.headers;
    if (!token) {
        return res.status(401).json({ success: false, message: 'Not authorized. Login again.' });
    }
    try {
        const token_decode = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = token_decode.id; // Set userId on the request object
        next();
    } catch (error) {
        console.log(error);
        res.status(401).json({ success: false, message: 'Error in admin authentication.' });
    }
};

export default adminAuth;