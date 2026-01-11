import express from 'express';
import { loginUser, registerUser, adminLogin, getProfile, forgotPassword, verifyPasswordOtp, resetPassword, addAddress, getAllUsers, getWishlist, addToWishlist, removeFromWishlist } from '../controllers/userController.js';
import authUser from '../middleware/auth.js';

const userRouter = express.Router();

userRouter.post('/register', registerUser)
userRouter.post('/login', loginUser)
userRouter.post('/admin', adminLogin)
userRouter.get('/profile', authUser, getProfile)
userRouter.post('/add-address', authUser, addAddress)
userRouter.post('/allusers', authUser, getAllUsers)

// Password Reset Routes
userRouter.post('/forgot-password', forgotPassword);
userRouter.post('/verify-password-otp', verifyPasswordOtp);
userRouter.post('/reset-password', resetPassword);

// Wishlist Routes
userRouter.post('/wishlist', authUser, getWishlist);
userRouter.post('/wishlist/add', authUser, addToWishlist);
userRouter.post('/wishlist/remove', authUser, removeFromWishlist);

export default userRouter;