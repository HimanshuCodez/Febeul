import userModel from '../models/userModel.js';
import validator from 'validator';
import { randomBytes } from 'node:crypto';
import { Resend } from 'resend';
import { issueOtp, checkOtp } from '../utils/otp.js';
import { userToken, signToken } from '../utils/authTokens.js';
const resend = new Resend(process.env.RESEND_API_KEY);

// No SMS delivery provider is configured. Do not issue or log usable codes.
const sendOTP = (_req, res) => res.status(503).json({ success: false, message: 'SMS login is unavailable. Use email login.' });
const verifyOTP = sendOTP;
const sendEmailOTP = async (req, res) => {
    try {
        const { email, purpose } = req.body;
        if (typeof email !== 'string' || !validator.isEmail(email) || !['signup', 'login'].includes(purpose)) return res.status(400).json({ success: false, message: 'Invalid email or purpose.' });
        let user = await userModel.findOne({ email });
        const temporary = user?.name === 'Temporary OTP User' && user.role === 'user';
        if ((purpose === 'signup' && user && !temporary) || (purpose === 'login' && (!user || temporary || user.isBlocked))) {
            return res.json({ success: true, message: 'If eligible, a code has been sent to your email.' });
        }
        if (!user) user = new userModel({ email, name: 'Temporary OTP User' });
        const code = await issueOtp(user, `email-${purpose}`);
        const { error } = await resend.emails.send({ from: 'noreply@febeul.com', to: email, subject: 'Your Febeul verification code', html: `<p>Your code is <strong>${code}</strong>. It expires in 5 minutes.</p>` });
        if (error) throw new Error('Email failed');
        res.json({ success: true, message: 'If eligible, a code has been sent to your email.' });
    } catch {
        res.status(500).json({ success: false, message: 'Unable to send email code.' });
    }
};
const verifyEmailOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;
        const user = typeof email === 'string' ? await userModel.findOne({ email }) : null;
        if (!user || user.name !== 'Temporary OTP User' || user.role !== 'user' || !(await checkOtp(user, otp, 'email-signup', true))) return res.status(400).json({ success: false, message: 'Invalid or expired code.' });
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
        if (!user || user.isBlocked || user.name === 'Temporary OTP User' || !(await checkOtp(user, otp, 'email-login', true))) return res.status(401).json({ success: false, message: 'Invalid or expired code.' });
        res.json({ success: true, token: userToken(user) });
    } catch {
        res.status(401).json({ success: false, message: 'Invalid or expired code.' });
    }
};
export { sendOTP, verifyOTP, sendEmailOTP, verifyEmailOTP, verifyEmailLoginOtp };
