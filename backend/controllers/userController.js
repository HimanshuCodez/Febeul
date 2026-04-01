import validator from "validator";
import bcrypt from "bcrypt";
import jwt from 'jsonwebtoken';
import axios from 'axios';
import userModel from "../models/userModel.js";
import { Resend } from 'resend';
import { sendEmail } from '../utils/sendEmail.js'; // New import for email utility
import fs from 'fs'; // For reading email template
import path from 'path'; // Also needed here
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Re-define __dirname in this context for template path resolution
const __filenameController = fileURLToPath(import.meta.url);
const __dirnameController = dirname(__filenameController);

const resend = new Resend(process.env.RESEND_API_KEY);

const createToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET)
}

const constructWelcomeEmailHtml = (user, templateHtml) => {
    let populatedHtml = templateHtml;
    populatedHtml = populatedHtml.replace('{{userName}}', user.name || user.email);
    populatedHtml = populatedHtml.replace('{{currentYear}}', new Date().getFullYear());
    // Add any other placeholders if needed, e.g., login link
    return populatedHtml;
};

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

        if (!validator.isEmail(email)) {
            return res.json({ success: false, message: "Please enter a valid email" });
        }
        if (password.length < 6) {
            return res.json({ success: false, message: "Password must be at least 6 characters" });
        }

        let user = await userModel.findOne({ email });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        if (user) {
            // Check if it's a temporary user (from OTP process) or a fully registered user
            if (user.otp && user.otp_expiry) { // This is a temporary user
                user.name = name;
                user.password = hashedPassword;
                user.mobile = mobile;
                user.otp = undefined; // Clear OTP stuff
                user.otp_expiry = undefined;
            } else { // User exists and is not a temporary OTP user, meaning they are fully registered
                return res.json({ success: false, message: "User already exists with this email. Please log in." });
            }
        } else { // User does not exist at all, create a new one
             user = new userModel({
                name,
                email,
                mobile,
                password: hashedPassword
            });
        }
        
        const savedUser = await user.save(); // Save the updated or new user
        const token = createToken(savedUser._id);
        const userResponse = await userModel.findById(savedUser._id).select("-password");
        
        // Send Welcome Email
        try {
            if (savedUser && savedUser.email) {
                const templatePath = path.resolve(__dirnameController, '../templates/welcomeEmail.html');
                let emailTemplate = fs.readFileSync(templatePath, 'utf8');
                const htmlContent = constructWelcomeEmailHtml(savedUser, emailTemplate);
                await sendEmail(savedUser.email, 'Welcome to Febeul!', htmlContent);
            }
        } catch (emailError) {
            console.error("Error sending welcome email:", emailError);
        }
        
        res.json({ success: true, token, user: userResponse });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
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
        const { email: rawEmail, password: rawPassword } = req.body
        const email = rawEmail.trim().toLowerCase();
        const password = rawPassword.trim();

        const cleanEnv = (val) => {
            if (!val) return '';
            // 1. Remove that weird '│' and anything after it
            let cleaned = val.split('│')[0];
            // 2. Trim whitespace
            cleaned = cleaned.trim();
            // 3. Remove surrounding quotes
            cleaned = cleaned.replace(/^["'](.+)["']$/, '$1');
            // 4. Final trim
            return cleaned.trim();
        };

        // Check for primary admin
        const adminEmail = cleanEnv(process.env.ADMIN_EMAIL).toLowerCase();
        const adminPass = cleanEnv(process.env.ADMIN_PASSWORD);

        if (email === adminEmail && password === adminPass) {
            const token = jwt.sign(email + password, process.env.JWT_SECRET);
            return res.json({ success: true, token, role: 'admin' })
        }

        // Check for staff members (supporting multiple)
        const staffEmails = process.env.STAFF_EMAILS ? process.env.STAFF_EMAILS.split(',').map(e => cleanEnv(e).toLowerCase()) : [];
        const staffPasswords = process.env.STAFF_PASSWORDS ? process.env.STAFF_PASSWORDS.split(',').map(p => cleanEnv(p)) : [];

       
        
        if (staffEmails.length !== staffPasswords.length) {
            console.log("WARNING: Your STAFF_EMAILS and STAFF_PASSWORDS lists have different lengths!");
        }

        const staffIndex = staffEmails.indexOf(email);
        if (staffIndex !== -1) {
            const configuredPass = staffPasswords[staffIndex] ? staffPasswords[staffIndex].trim() : '';
            console.log(`Match found at index ${staffIndex}.`);
            console.log(`Input Password: '${password}' (len: ${password.length})`);
            console.log(`Configured Password: '${configuredPass}' (len: ${configuredPass.length})`);
            
            if (configuredPass === password) {
                const token = jwt.sign(email + password, process.env.JWT_SECRET);
                return res.json({ success: true, token, role: 'staff' })
            } else {
                console.log("Result: Password mismatch!");
            }
        }

        // Check for legacy single staff config (singular)
        const legacyStaffEmail = cleanEnv(process.env.STAFF_EMAIL).toLowerCase();
        const legacyStaffPass = cleanEnv(process.env.STAFF_PASSWORD);

        if (email && email === legacyStaffEmail && password === legacyStaffPass) {
            const token = jwt.sign(email + password, process.env.JWT_SECRET);
            return res.json({ success: true, token, role: 'staff' })
        }

        // Check Database for Staff/Admin
        const dbUser = await userModel.findOne({ email });
        if (dbUser && (dbUser.role === 'staff' || dbUser.role === 'admin')) {
            if (!dbUser.password) {
                 return res.json({ success: false, message: "User has no password set. Please reset password first." });
            }
            const isMatch = await bcrypt.compare(password, dbUser.password);
            if (isMatch) {
                const token = jwt.sign(dbUser._id.toString(), process.env.JWT_SECRET);
                return res.json({ success: true, token, role: dbUser.role, permissions: dbUser.permissions })
            }
        }

        console.log("Login failed: No match found in config.");
        console.log("------------------------");
        res.json({ success: false, message: "Invalid credentials" })

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message })
    }
}


// get user profile
const getProfile = async (req,res) => {
    try {
        let user = await userModel.findById(req.userId).select("-password -otp -otp_expiry"); // Use 'let' for reassignment
        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }

        // --- Membership Expiration Check ---
        if (user.isLuxeMember && user.luxeMembershipExpires && user.luxeMembershipExpires < new Date()) {
            user.isLuxeMember = false;
            user.luxeMembershipExpires = null;
            user.giftWrapsLeft = 0;
            await user.save(); // Save the updated user status
        }
        // --- End Membership Expiration Check ---

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

        if (!Array.isArray(user.cartData)) {
            user.cartData = [];
        }

        user.addresses.push(req.body.address);
        await user.save();
        res.json({ success: true, message: "Address added" });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error adding address" });
    }
}

// Update address for user
const updateAddress = async (req, res) => {
    try {
        const { userId, addressId, address } = req.body;
        const user = await userModel.findById(userId);
        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }

        const addressIndex = user.addresses.findIndex(addr => addr._id.toString() === addressId);
        if (addressIndex === -1) {
            return res.json({ success: false, message: "Address not found" });
        }

        user.addresses[addressIndex] = { ...user.addresses[addressIndex], ...address };
        await user.save();
        res.json({ success: true, message: "Address updated" });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error updating address" });
    }
}

// Proxy Pincode API with Fallback and Retry Logic
const pincodeProxy = async (req, res) => {
    const { zip } = req.params;
    
    // Attempt 1: Try postalpincode.in (High Detail)
    try {
        const response = await axios.get(`https://api.postalpincode.in/pincode/${zip}`, { 
            timeout: 5000,
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        if (response.data && response.data[0].Status === 'Success') {
            return res.json(response.data);
        }
    } catch (error) {
        console.error("Primary Pincode API failed, trying fallback...", error.message);
    }

    // Attempt 2: Try zippopotam.us (Highly Reliable Fallback)
    try {
        const response = await axios.get(`https://api.zippopotam.us/in/${zip}`, { timeout: 5000 });
        // Format zippopotam response to match frontend expectations
        const formattedData = [{
            Status: 'Success',
            PostOffice: response.data.places.map(place => ({
                District: place['place name'],
                State: place['state']
            }))
        }];
        return res.json(formattedData);
    } catch (error) {
        console.error("Fallback Pincode API failed:", error.message);
        return res.status(500).json({ success: false, message: "All pincode services unavailable" });
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
        const user = await userModel.findById(req.userId).populate('wishlist');
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
        const { productId } = req.body;
        const user = await userModel.findById(req.userId);

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
        const { productId } = req.body;
        const user = await userModel.findById(req.userId);
        
        user.wishlist = user.wishlist.filter((id) => id.toString() !== productId);
        await user.save();
        res.json({ success: true, message: "Removed from wishlist" });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error removing from wishlist" });
    }
};

// Decrement gift wraps for Luxe members
const decrementGiftWraps = async (req, res) => {
    try {
        const userId = req.userId;
        const user = await userModel.findById(userId);

        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }

        if (user.isLuxeMember && user.giftWrapsLeft > 0) {
            user.giftWrapsLeft -= 1;
            await user.save();
            res.json({ success: true, message: "Gift wrap count decremented", giftWrapsLeft: user.giftWrapsLeft });
        } else {
            res.json({ success: false, message: "No free gift wraps available or not a Luxe member" });
        }
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error decrementing gift wraps" });
    }
};


// Update staff permissions
const updateStaffPermissions = async (req, res) => {
    try {
        const { email, role, permissions } = req.body;
        const user = await userModel.findOne({ email });

        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }

        user.role = role;
        user.permissions = permissions;
        await user.save();

        res.json({ success: true, message: "User permissions updated successfully" });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error updating permissions" });
    }
};


export { loginUser, registerUser, adminLogin, getProfile, forgotPassword, verifyPasswordOtp, resetPassword, addAddress, updateAddress, pincodeProxy, getAllUsers, getWishlist, addToWishlist, removeFromWishlist, googleLogin, decrementGiftWraps, updateStaffPermissions }