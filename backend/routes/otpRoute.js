import express from 'express';
import { sendOTP, verifyOTP, sendEmailOTP, verifyEmailOTP, verifyEmailLoginOtp } from '../controllers/otpController.js';

const otpRouter = express.Router();

// Mobile OTP
otpRouter.post('/send-otp', sendOTP);
otpRouter.post('/verify-otp', verifyOTP);

// Email OTP
otpRouter.post('/send-email-otp', sendEmailOTP);
otpRouter.post('/verify-email-otp', verifyEmailOTP);
otpRouter.post('/verify-email-login-otp', verifyEmailLoginOtp);

export default otpRouter;
