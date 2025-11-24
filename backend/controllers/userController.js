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
            const token = createToken(user._id)
            res.json({ success: true, token })
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

        const existingEmail = await userModel.findOne({ email });
        if (existingEmail) {
            return res.json({ success: false, message: "User already exists with this email" })
        }

        const existingMobile = await userModel.findOne({ mobile });
        if (existingMobile) {
            return res.json({ success: false, message: "User already exists with this mobile number" })
        }

        if (!validator.isEmail(email)) {
            return res.json({ success: false, message: "Please enter a valid email" })
        }
        if (password.length < 6) {
            return res.json({ success: false, message: "Password must be at least 6 characters" })
        }

        const salt = await bcrypt.genSalt(10)
        const hashedPassword = await bcrypt.hash(password, salt)

        const newUser = new userModel({
            name,
            email,
            mobile,
            password: hashedPassword
        })

        const user = await newUser.save()
        const token = createToken(user._id)
        res.json({ success: true, token })

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

        await resend.emails.send({
            from: 'onboarding@resend.dev',
            to: email,
            subject: 'Your Password Reset OTP',
            html: `<p>Your OTP for password reset is: <strong>${otp}</strong>. It is valid for 10 minutes.</p>`
        });

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
        const user = await userModel.findById(req.body.userId).select("-password -otp -otp_expiry");
        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }
        res.json({ success: true, user: user });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error" });
    }
}


export { loginUser, registerUser, adminLogin, getProfile, forgotPassword, verifyPasswordOtp, resetPassword }