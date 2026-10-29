import userModel from '../models/userModel.js';
import validator from 'validator';
import { randomBytes } from 'node:crypto';
import { sendTemplateEmail } from '../utils/sendTemplateEmail.js';
import { issueOtp, checkOtp, isPendingSignup } from '../utils/otp.js';
import { userToken, signToken } from '../utils/authTokens.js';

// No SMS delivery provider is configured. Do not issue or log usable codes.
const sendOTP = (_req, res) => res.status(503).json({ success: false, message: 'SMS login is unavailable. Use email login.' });
const verifyOTP = sendOTP;
const sendEmailOTP = async (req, res) => {
    try {
        const { email, purpose } = req.body;
        if (typeof email !== 'string' || !validator.isEmail(email) || !['signup', 'login'].includes(purpose)) return res.status(400).json({ success: false, message: 'Invalid email or purpose.' });
        let user = await userModel.findOne({ email });
        if (!user && purpose === 'signup') {
            // Recognize older accounts saved before emails were normalized on the model.
            const escapedEmail = email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            user = await userModel.findOne({ email: { $regex: `^${escapedEmail}$`, $options: 'i' } });
        }
        const temporary = isPendingSignup(user);
        if (purpose === 'signup' && user && !temporary) {
            return res.status(409).json({ success: false, code: 'EMAIL_ALREADY_REGISTERED', message: 'This email is already registered. Please log in instead.' });
        }
        if (purpose === 'login' && (!user || temporary || user.isBlocked)) {
            return res.json({ success: true, message: 'If eligible, a code has been sent to your email.' });
        }
        if (!user) user = new userModel({ email, name: 'Temporary OTP User' });
        const code = await issueOtp(user, `email-${purpose}`);
        const result = await sendTemplateEmail('email-otp', email, { userName: user.name === 'Temporary OTP User' ? 'Customer' : user.name, otp: code });
        if (!result.success) throw new Error('Email failed');
        res.json({ success: true, message: purpose === 'signup' ? 'Signup code sent to your email.' : 'If eligible, a code has been sent to your email.' });
    } catch {
        res.status(500).json({ success: false, message: 'Unable to send email code.' });
    }
};
const verifyEmailOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;
        const user = typeof email === 'string' ? await userModel.findOne({ email }) : null;
        if (!isPendingSignup(user) || !(await checkOtp(user, otp, 'email-signup', true))) return res.status(400).json({ success: false, message: 'Invalid or expired code.' });
        const nonce = randomBytes(32).toString('hex');
        await userModel.updateOne({ _id: user._id }, { $set: { registrationNonce: nonce, registrationExpires: new Date(Date.now() + 10 * 60_000) } });
        res.json({ success: true, registrationToken: signToken({ id: String(user._id), email, nonce }, 'registration', '10m') });
    } catch {
        res.status(400).json({ success: false, message: 'Invalid or expired code.' });
    }
};
const verifyEmailLoginOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;
        const user = typeof email === 'string' ? await userModel.findOne({ email }) : null;
        if (!user || user.isBlocked || isPendingSignup(user) || !(await checkOtp(user, otp, 'email-login', true))) return res.status(401).json({ success: false, message: 'Invalid or expired code.' });
        res.json({ success: true, token: userToken(user) });
    } catch {
        res.status(401).json({ success: false, message: 'Invalid or expired code.' });
    }
};
export { sendOTP, verifyOTP, sendEmailOTP, verifyEmailOTP, verifyEmailLoginOtp };
