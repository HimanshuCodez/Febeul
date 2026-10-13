import { authInput, authRateLimit } from '../middleware/security.js';
import { requireTurnstile } from '../middleware/turnstile.js';
import express from 'express';
import { sendOTP, verifyOTP, sendEmailOTP, verifyEmailOTP, verifyEmailLoginOtp } from '../controllers/otpController.js';

const otpRouter = express.Router();

// Mobile OTP
otpRouter.post('/send-otp', authInput, authRateLimit, sendOTP);
otpRouter.post('/verify-otp', authInput, authRateLimit, verifyOTP);

// Email OTP
otpRouter.post('/send-email-otp', authInput, requireTurnstile, authRateLimit, sendEmailOTP);
otpRouter.post('/verify-email-otp', authInput, requireTurnstile, authRateLimit, verifyEmailOTP);
otpRouter.post('/verify-email-login-otp', authInput, requireTurnstile, authRateLimit, verifyEmailLoginOtp);

export default otpRouter;
