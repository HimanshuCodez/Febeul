import userModel from "../models/userModel.js";
import jwt from 'jsonwebtoken';
import { Resend } from 'resend';
import bcrypt from "bcrypt";

const resend = new Resend(process.env.RESEND_API_KEY);

const createToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET)
}

const sendOTP = async (req, res) => {
    try {
        const { mobile, purpose } = req.body;
        if (!mobile || !/^\d{10}$/.test(mobile)) {
            return res.json({ success: false, message: "Invalid mobile number" });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otp_expiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry

        let user = await userModel.findOne({ mobile });

        if (purpose === 'signup') {
            if (user && user.password && user.name !== 'Temporary OTP User') {
                return res.json({ success: false, message: "User already registered. Please login." });
            }
        } else if (purpose === 'login') {
            if (!user) {
                return res.json({ success: false, message: "User not found. Please sign up." });
            }
        }

        if (!user && purpose === 'signup') {
             const tempPassword = Math.random().toString(36).slice(-8); 
             const hashedPassword = await bcrypt.hash(tempPassword, 10); 
             user = new userModel({ 
                 mobile,
                 email: `temp_${mobile}@febeul.com`, // Temporary email for schema
                 name: 'Temporary OTP User', 
                 password: hashedPassword 
             });
        }

        if (user) {
            user.otp = otp;
            user.otp_expiry = otp_expiry;
            if (user.name === 'Temporary OTP User') {
                await user.save({ validateBeforeSave: false });
            } else {
                await user.save();
            }
            console.log(`OTP for ${mobile} is ${otp}`);
            res.json({ success: true, message: "OTP sent successfully" });
        } else {
             res.json({ success: false, message: "User not found." });
        }

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error sending OTP" });
    }
};

const sendEmailOTP = async (req, res) => {
    try {
        const { email, purpose } = req.body;
        if (!email) {
            return res.json({ success: false, message: "Email is required" });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otp_expiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry

        let user = await userModel.findOne({ email });

        if (purpose === 'signup') {
            // Check if user exists and is fully registered
            if (user && (user.password || user.googleId) && user.name !== 'Temporary OTP User') {
                return res.json({ success: false, message: "User already exists with this email. Please login." });
            }
        } else if (purpose === 'login') {
             if (!user) {
                return res.json({ success: false, message: "User not found. Please sign up." });
             }
        }

        const isNewUser = !user; 

        if (isNewUser) {
            const tempPassword = Math.random().toString(36).slice(-8); 
            const hashedPassword = await bcrypt.hash(tempPassword, 10); 
            user = new userModel({ 
                email,
                name: 'Temporary OTP User', 
                password: hashedPassword 
            });
        }

        user.otp = otp;
        user.otp_expiry = otp_expiry;
        
        if (user.name === 'Temporary OTP User') {
            await user.save({ validateBeforeSave: false });
        } else {
            await user.save();
        }

        const { data, error } = await resend.emails.send({
            from: 'noreply@febeul.com',
            to: email,
            subject: 'Your Febeul Login/Signup OTP',
            html: `<p>Your OTP is: <strong>${otp}</strong>. It is valid for 5 minutes.</p>`
        });
        
        if (error) {
            console.error({ error });
            return res.json({ success: false, message: "Error sending email OTP" });
        }
        
        console.log({ data }); // Log the Resend response for debugging

        res.json({ success: true, message: "OTP sent successfully to your email." });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: `Caught an exception in sendEmailOTP: ${error.message}` });
    }
};

const verifyOTP = async (req, res) => {
    try {
        const { mobile, otp } = req.body;

        if (!mobile || !/^\d{10}$/.test(mobile) || !otp || !/^\d{6}$/.test(otp)) {
            return res.json({ success: false, message: "Invalid mobile number or OTP" });
        }

        const user = await userModel.findOne({ mobile });

        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }

        if (user.otp !== otp || new Date() > user.otp_expiry) {
            return res.json({ success: false, message: "Invalid or expired OTP." });
        }

        user.otp = undefined;
        user.otp_expiry = undefined;
        await user.save();

        const token = createToken(user._id);
        res.json({ success: true, token });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error verifying OTP" });
    }
};

const verifyEmailOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) {
            return res.json({ success: false, message: "Email and OTP are required" });
        }

        const user = await userModel.findOne({ email });
        if (!user) {
            return res.json({ success: false, message: "User not found." });
        }

        if (user.otp !== otp || new Date() > user.otp_expiry) {
            return res.json({ success: false, message: "Invalid or expired OTP." });
        }
        
        // OTP is verified, but not cleared yet. The registration process will finalize the user details.
        res.json({ success: true, message: "Email verified successfully." });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error verifying email OTP" });
    }
};

const verifyEmailLoginOtp = async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) {
            return res.json({ success: false, message: "Email and OTP are required" });
        }
        
        const user = await userModel.findOne({ email });

        if (!user || !user.password) { // Ensure it's a registered user
            return res.json({ success: false, message: "User not registered. Please sign up first." });
        }

        if (user.otp !== otp || new Date() > user.otp_expiry) {
            return res.json({ success: false, message: "Invalid or expired OTP." });
        }

        user.otp = undefined;
        user.otp_expiry = undefined;
        await user.save();
        
        const token = createToken(user._id);
        res.json({ success: true, token });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error verifying email login OTP" });
    }
}

export { sendOTP, verifyOTP, sendEmailOTP, verifyEmailOTP, verifyEmailLoginOtp };
