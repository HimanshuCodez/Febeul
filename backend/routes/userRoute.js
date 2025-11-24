import express from 'express';
import { loginUser, registerUser, adminLogin, getProfile, forgotPassword, verifyPasswordOtp, resetPassword } from '../controllers/userController.js';
import authUser from '../middleware/auth.js';

const userRouter = express.Router();

userRouter.post('/register', registerUser)
userRouter.post('/login', loginUser)
userRouter.post('/admin', adminLogin)
userRouter.get('/profile', authUser, getProfile)

// Password Reset Routes
userRouter.post('/forgot-password', forgotPassword);
userRouter.post('/verify-password-otp', verifyPasswordOtp);
userRouter.post('/reset-password', resetPassword);

export default userRouter;