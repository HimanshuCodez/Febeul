import validator from "validator";
import bcrypt from "bcrypt";
import jwt from 'jsonwebtoken';
import userModel from "../models/userModel.js";
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const createToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET)
}

// Route for user login
const loginUser = async (req, res) => {
    try {
        const { email: identifier, password } = req.body;

        const user = await userModel.findOne({
            $or: [{ email: identifier }, { mobile: identifier }]
        });

        if (!user) {
            return res.json({ success: false, message: "User doesn't exist" })
        }

        if (!user.password) {
            return res.json({ success: false, message: "Please login with OTP or another method." });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (isMatch) {
            const token = createToken(user._id);
            const userResponse = await userModel.findById(user._id).select("-password");
            res.json({ success: true, token, user: userResponse });
        }
        else {
            res.json({ success: false, message: 'Invalid credentials' })
        }

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message })
    }
}

// Route for user register
const registerUser = async (req, res) => {
    try {
        const { name, email, password, mobile } = req.body;

        let user = await userModel.findOne({ email });

        if (user && user.password) { // User is fully registered
            return res.json({ success: false, message: "User already exists with this email. Please log in." });
        }

        if (!validator.isEmail(email)) {
            return res.json({ success: false, message: "Please enter a valid email" })
        }
        if (password.length < 6) {
            return res.json({ success: false, message: "Password must be at least 6 characters" })
        }

        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password, salt)

        if (user) { // It's a temporary user, let's update it
            user.name = name;
            user.password = hashedPassword;
            user.mobile = mobile;
            user.otp = undefined; // Clear OTP stuff
            user.otp_expiry = undefined;
        } else { // It's a new registration without a prior temporary record
             user = new userModel({
                name,
                email,
                mobile,
                password: hashedPassword
            });
        }
        
        const savedUser = await user.save();
        const token = createToken(savedUser._id);
        const userResponse = await userModel.findById(savedUser._id).select("-password");
        res.json({ success: true, token, user: userResponse });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message })
    }
}

// Forgot Password
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await userModel.findOne({ email });

        if (!user) {
            return res.json({ success: false, message: "User with this email does not exist." });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.otp = otp;
        user.otp_expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry
        await user.save();

        // IMPORTANT: For reliable email delivery, you must replace 'onboarding@resend.dev'
        // with an email address from a domain you have verified in your Resend account.
        const { data, error } = await resend.emails.send({
            from: 'noreply@febeul.com', // Replace with your verified domain
            to: email,
            subject: 'Your Password Reset OTP',
            html: `<p>Your OTP for password reset is: <strong>${otp}</strong>. It is valid for 10 minutes.</p>`
        });

        if (error) {
            console.error({ error });
            return res.json({ success: false, message: "Failed to send OTP email." });
        }

        console.log({ data }); // Log the Resend response for debugging

        res.json({ success: true, message: "OTP sent to your email address." });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Failed to send OTP email." });
    }
};

// Verify Password Reset OTP
const verifyPasswordOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;
        const user = await userModel.findOne({ email });

        if (!user) {
            return res.json({ success: false, message: "User not found." });
        }

        if (user.otp !== otp || new Date() > user.otp_expiry) {
            return res.json({ success: false, message: "Invalid or expired OTP." });
        }

        res.json({ success: true, message: "OTP verified successfully." });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error verifying OTP." });
    }
};


// Reset Password
const resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        const user = await userModel.findOne({ email });

        if (!user) {
            return res.json({ success: false, message: "User not found." });
        }

        if (user.otp !== otp || new Date() > user.otp_expiry) {
            return res.json({ success: false, message: "Invalid or expired OTP. Please try again." });
        }
        
        if (newPassword.length < 6) {
            return res.json({ success: false, message: "Password must be at least 6 characters" })
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        user.otp = undefined;
        user.otp_expiry = undefined;
        await user.save();

        res.json({ success: true, message: "Password has been reset successfully." });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Failed to reset password." });
    }
};


import { OAuth2Client } from 'google-auth-library';
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Google login
const googleLogin = async (req, res) => {
    const { credential } = req.body;
    try {
        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        const googleId = payload['sub'];
        const email = payload['email'];
        const name = payload['name'];

        let user = await userModel.findOne({ googleId });

        if (!user) {
            // If user with googleId doesn't exist, check if a user with the same email exists
            user = await userModel.findOne({ email });

            if (user) {
                // If user with email exists, link the Google account
                user.googleId = googleId;
                await user.save();
            } else {
                // If no user exists, create a new one
                user = new userModel({
                    name,
                    email,
                    googleId,
                });
                await user.save();
            }
        }

        const token = createToken(user._id);
        const userResponse = await userModel.findById(user._id).select("-password");
        res.json({ success: true, token, user: userResponse });

    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: "Google login failed" });
    }
};

// Route for admin login
const adminLogin = async (req, res) => {
    try {
        
        const {email,password} = req.body

        if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
            const token = jwt.sign(email+password,process.env.JWT_SECRET);
            res.json({success:true,token})
        } else {
            res.json({success:false,message:"Invalid credentials"})
        }

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message })
    }
}


// get user profile
const getProfile = async (req,res) => {
    try {
        const user = await userModel.findById(req.userId).select("-password -otp -otp_expiry");
        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }
        res.json({ success: true, user: user });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error" });
    }
}

// Add address for user
const addAddress = async (req, res) => {
    try {
        const user = await userModel.findById(req.body.userId);
        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }
        user.addresses.push(req.body.address);
        await user.save();
        res.json({ success: true, message: "Address added" });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error adding address" });
    }
}

// Get all users
const getAllUsers = async (req, res) => {
    try {
        const users = await userModel.find({});
        res.json({ success: true, users });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error fetching users" });
    }
}

// Get user's wishlist
const getWishlist = async (req, res) => {
    try {
        const user = await userModel.findById(req.body.userId).populate('wishlist');
        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }
        res.json({ success: true, wishlist: user.wishlist });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error fetching wishlist" });
    }
};

// Add to wishlist
const addToWishlist = async (req, res) => {
    try {
        const { userId, productId } = req.body;
        const user = await userModel.findById(userId);
        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }
        if (!user.wishlist.includes(productId)) {
            user.wishlist.push(productId);
            await user.save();
        }
        res.json({ success: true, message: "Added to wishlist" });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error adding to wishlist" });
    }
};

// Remove from wishlist
const removeFromWishlist = async (req, res) => {
    try {
        const { userId, productId } = req.body;
        const user = await userModel.findById(userId);
        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }
        user.wishlist = user.wishlist.filter((id) => id.toString() !== productId);
        await user.save();
        res.json({ success: true, message: "Removed from wishlist" });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error removing from wishlist" });
    }
};


export { loginUser, registerUser, adminLogin, getProfile, forgotPassword, verifyPasswordOtp, resetPassword, addAddress, getAllUsers, getWishlist, addToWishlist, removeFromWishlist, googleLogin }