import validator from "validator";
import bcrypt from "bcrypt";
import { userToken, envToken, envAccounts, safeEqual, verifyToken } from '../utils/authTokens.js';
import { issueOtp, checkOtp } from '../utils/otp.js';
import axios from 'axios';
import userModel from "../models/userModel.js";
import { Resend } from 'resend';
import { sendEmail } from '../utils/sendEmail.js'; // New import for email utility
import { sendTemplateEmail } from '../utils/sendTemplateEmail.js';
import fs from 'fs'; // For reading email template
import path from 'path'; // Also needed here
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Re-define __dirname in this context for template path resolution
const __filenameController = fileURLToPath(import.meta.url);
const __dirnameController = dirname(__filenameController);

const resend = new Resend(process.env.RESEND_API_KEY);

const createToken = userToken;

const constructWelcomeEmailHtml = (user, templateHtml) => {
    let populatedHtml = templateHtml;
    populatedHtml = populatedHtml.replace('{{userName}}', validator.escape(user.name || user.email || 'Customer'));
    populatedHtml = populatedHtml.replace('{{currentYear}}', new Date().getFullYear());
    // Add any other placeholders if needed, e.g., login link
    return populatedHtml;
};

// Route for user login
const loginUser = async (req, res) => {
    try {
        const { email: identifier, password } = req.body;
        if (typeof identifier !== 'string' || !identifier || typeof password !== 'string' || !password || Buffer.byteLength(password) > 72) return res.status(400).json({ success: false, message: 'Invalid credentials.' });

        const user = await userModel.findOne({
            $or: [{ email: identifier }, { mobile: identifier }]
        });

        if (!user) {
            return res.json({ success: false, message: 'Invalid credentials' })
        }

        if (user.isBlocked || !user.password) {
            return res.json({ success: false, message: "Please login with OTP or another method." });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (isMatch) {
            const token = createToken(user);
            const userResponse = await userModel.findById(user._id).select("-password");
            res.json({ success: true, token, user: userResponse });
        }
        else {
            res.json({ success: false, message: 'Invalid credentials' })
        }

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Unable to complete request." })
    }
}

// Route for user register
const registerUser = async (req, res) => {
    try {
        const { name, email, password, mobile, registrationToken } = req.body;
        if (typeof email !== 'string' || !validator.isEmail(email) || typeof password !== 'string' || password.length < 10 || Buffer.byteLength(password) > 72 || typeof name !== 'string' || !name.trim()) {
            return res.status(400).json({ success: false, message: 'Enter a valid email, name and password (10 or more characters, at most 72 bytes).' });
        }
        let proof;
        try { proof = verifyToken(registrationToken, 'registration'); } catch {
            return res.status(400).json({ success: false, message: 'Verify your email before registering.' });
        }
        if (proof.email !== email) return res.status(400).json({ success: false, message: 'Email verification does not match.' });
        const hashedPassword = await bcrypt.hash(password, 12);
        // Only a verified temporary signup record can be finalized, exactly once.
        const savedUser = await userModel.findOneAndUpdate({
            _id: proof.id, email, name: 'Temporary OTP User', role: 'user',
            registrationNonce: proof.nonce, registrationExpires: { $gt: new Date() },
        }, {
            $set: { name: name.trim(), password: hashedPassword, ...(mobile ? { mobile } : {}) },
            $unset: { registrationNonce: 1, registrationExpires: 1, otp: 1, otp_expiry: 1, otpPurpose: 1, otpAttempts: 1 },
        }, { new: true, runValidators: true });
        if (!savedUser) return res.status(400).json({ success: false, message: 'Registration verification expired or account already registered.' });
        const token = createToken(savedUser);
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
        res.json({ success: false, message: "Unable to complete request." });
    }
}

// Forgot Password
const forgotPassword = async (req, res) => {
    try {
        const { email: rawEmail, isAdminReset } = req.body;
        const email = rawEmail.trim().toLowerCase();
        const user = await userModel.findOne({ email });

        if (!user) {
            return res.json({ success: true, message: "If eligible, a code has been sent to your email." });
        }

        if (isAdminReset && (user.role !== 'admin' && user.role !== 'staff')) {
            return res.json({ success: false, message: "This email has no admin role." });
        }

        const otp = await issueOtp(user, 'password-reset');

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



        res.json({ success: true, message: "If eligible, a code has been sent to your email." });

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

        if (!(await checkOtp(user, otp, 'password-reset'))) {
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

        if (typeof newPassword !== 'string' || newPassword.length < 10 || Buffer.byteLength(newPassword) > 72) {
            return res.status(400).json({ success: false, message: 'Password must have at least 10 characters and at most 72 bytes.' });
        }
        if (!(await checkOtp(user, otp, 'password-reset', true))) {
            return res.json({ success: false, message: "Invalid or expired OTP. Please try again." });
        }
        
        await userModel.updateOne({ _id: user._id }, { $set: { password: await bcrypt.hash(newPassword, 12) }, $inc: { tokenVersion: 1 } });

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
        if (!payload.email_verified || !process.env.GOOGLE_CLIENT_ID) throw new Error('Unverified identity');
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

        if (user.isBlocked) return res.status(403).json({ success: false, message: 'Account is blocked.' });
        const token = createToken(user);
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
        const { email, password } = req.body;
        if (typeof email !== 'string' || !email || typeof password !== 'string' || !password || Buffer.byteLength(password) > 72) return res.status(400).json({ success: false, message: 'Invalid credentials' });
        const account = envAccounts().find(a => a.email === email && safeEqual(a.password, password));
        if (account) return res.json({ success: true, token: envToken(account), role: account.role, email: account.email, permissions: account.role === 'staff' ? (process.env.STAFF_PERMISSIONS || '').split(',').filter(Boolean) : [] });
        const user = await userModel.findOne({ email });
        if (user && !user.isBlocked && ['admin', 'staff'].includes(user.role) && user.password && await bcrypt.compare(password, user.password)) {
            return res.json({ success: true, token: userToken(user, 'admin'), role: user.role, permissions: user.permissions, email: user.email });
        }
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
    } catch {
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
};

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
            user.giftWrapsLeft = 0;
            await user.save(); // Save the updated user status

            if (user.email) {
                sendTemplateEmail(
                    'luxe-expired',
                    user.email,
                    { userName: user.name }
                ).catch(err => console.error("Error sending Luxe expiry email:", err));
            }
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
        const user = await userModel.findById(req.userId);
        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }

        if (!Array.isArray(user.cartData)) {
            user.cartData = [];
        }

        if (user.addresses.length >= 20) return res.status(400).json({ success: false, message: 'Address limit reached.' });
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
        const { addressId, address } = req.body;
        const userId = req.userId;
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

// Add bank account for refunds/payouts (only one allowed at a time — Flipkart/Amazon style)
const addBankAccount = async (req, res) => {
    try {
        const { accountHolderName, accountNumber, confirmAccountNumber, ifsc, bankName } = req.body;

        if (!accountHolderName?.trim() || !accountNumber?.trim() || !confirmAccountNumber?.trim() || !ifsc?.trim() || !bankName?.trim()) {
            return res.json({ success: false, message: "All fields are required" });
        }
        if (accountNumber !== confirmAccountNumber) {
            return res.json({ success: false, message: "Account numbers do not match" });
        }
        if (!/^[0-9]{9,18}$/.test(accountNumber)) {
            return res.json({ success: false, message: "Enter a valid account number" });
        }
        if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc.trim().toUpperCase())) {
            return res.json({ success: false, message: "Enter a valid IFSC code" });
        }

        const user = await userModel.findById(req.userId);
        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }

        if (user.bankAccount?.accountNumber) {
            return res.json({ success: false, message: "A bank account already exists. Remove it before adding a new one." });
        }

        user.bankAccount = {
            accountHolderName: accountHolderName.trim(),
            accountNumber: accountNumber.trim(),
            ifsc: ifsc.trim().toUpperCase(),
            bankName: bankName.trim(),
            addedAt: new Date()
        };
        await user.save();

        res.json({ success: true, message: "Bank account added", bankAccount: user.bankAccount });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error adding bank account" });
    }
}

// Remove the user's saved bank account
const removeBankAccount = async (req, res) => {
    try {
        const user = await userModel.findById(req.userId);
        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }

        user.bankAccount = undefined;
        await user.save();
        res.json({ success: true, message: "Bank account removed" });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error removing bank account" });
    }
}

// Proxy Pincode API with Fallback and Retry Logic
const pincodeProxy = async (req, res) => {
    const { zip } = req.params;
    if (!/^\d{6}$/.test(zip)) return res.status(400).json({ success: false, message: 'Invalid pincode.' });
    
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
        const users = await userModel.find({}).select("-password -otp -otp_expiry -otpPurpose -otpAttempts -registrationNonce -registrationExpires -tokenVersion -bankAccount");
        res.json({ success: true, users });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error fetching users" });
    }
}

// Get user's wishlist. Each entry is a product document plus `wishlistSku`
// (the specific colour variation the user saved); a product saved under two
// SKUs appears twice.
const getWishlist = async (req, res) => {
    try {
        const user = await userModel.findById(req.userId).populate('wishlist').populate('wishlistItems.product');
        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }

        // Lazy migration of legacy product-level entries: default to first variation's SKU.
        if (user.wishlist.length > 0) {
            for (const product of user.wishlist) {
                if (!product) continue;
                const sku = product.variations?.find((v) => v.sku)?.sku;
                if (sku && !user.wishlistItems.some((i) => i.product?._id.equals(product._id) && i.sku === sku)) {
                    user.wishlistItems.push({ product: product._id, sku });
                }
            }
            user.wishlist = [];
            await user.save();
            await user.populate('wishlistItems.product');
        }

        const wishlist = user.wishlistItems
            .filter((i) => i.product)
            .map((i) => ({ ...i.product.toObject(), wishlistSku: i.sku }));
        res.json({ success: true, wishlist });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error fetching wishlist" });
    }
};

// Add a specific product SKU to wishlist
const addToWishlist = async (req, res) => {
    try {
        const { productId, sku } = req.body;
        if (!productId || !sku) {
            return res.json({ success: false, message: "Product and SKU are required" });
        }
        const user = await userModel.findById(req.userId);

        if (!user.wishlistItems.some((i) => i.product.toString() === productId && i.sku === sku)) {
            user.wishlistItems.push({ product: productId, sku });
            await user.save();
        }
        res.json({ success: true, message: "Added to wishlist" });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error adding to wishlist" });
    }
};

// Remove a specific product SKU from wishlist
const removeFromWishlist = async (req, res) => {
    try {
        const { productId, sku } = req.body;
        const user = await userModel.findById(req.userId);

        user.wishlistItems = user.wishlistItems.filter(
            (i) => !(i.product.toString() === productId && i.sku === sku)
        );
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


// Grant one month of Luxe, preserving any remaining membership time.
const grantLuxeMembership = async (req, res) => {
    const { userId } = req.body || {};
    if (typeof userId !== 'string' || !/^[a-f\d]{24}$/i.test(userId)) {
        return res.status(400).json({ success: false, message: 'A valid user ID is required.' });
    }

    try {
        const user = await userModel.findById(userId);
        if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

        const now = new Date();
        const expiryDate = new Date(user.isLuxeMember && user.luxeMembershipExpires > now ? user.luxeMembershipExpires : now);
        const day = expiryDate.getUTCDate();
        // Clamp month-end dates, e.g. January 31 becomes February 28/29.
        expiryDate.setUTCDate(1);
        expiryDate.setUTCMonth(expiryDate.getUTCMonth() + 1);
        const lastDay = new Date(Date.UTC(expiryDate.getUTCFullYear(), expiryDate.getUTCMonth() + 1, 0)).getUTCDate();
        expiryDate.setUTCDate(Math.min(day, lastDay));

        user.isLuxeMember = true;
        user.luxeMembershipExpires = expiryDate;
        user.giftWrapsLeft = 15;
        await user.save();

        return res.json({
            success: true,
            message: 'One month of Luxe membership granted.',
            user: {
                _id: user._id,
                isLuxeMember: user.isLuxeMember,
                luxeMembershipExpires: user.luxeMembershipExpires,
                giftWrapsLeft: user.giftWrapsLeft,
            },
        });
    } catch (error) {
        console.error('Error granting Luxe membership:', error);
        return res.status(500).json({ success: false, message: 'Unable to grant Luxe membership.' });
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

        if (req.role !== 'admin' || !['user', 'staff', 'admin'].includes(role) || !Array.isArray(permissions) || permissions.some(p => typeof p !== 'string')) return res.status(403).json({ success: false, message: 'Invalid permission update.' });
        user.tokenVersion = (user.tokenVersion || 0) + 1;
        user.role = role;
        user.permissions = permissions;
        await user.save();

        res.json({ success: true, message: "User permissions updated successfully" });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error updating permissions" });
    }
};


// Block or unblock a user (admin action)
const toggleBlockUser = async (req, res) => {
    try {
        const { userId } = req.body;
        const user = await userModel.findById(userId);

        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }

        if (req.role !== 'admin' && user.role !== 'user') return res.status(403).json({ success: false, message: 'Access denied.' });
        user.isBlocked = !user.isBlocked;
        if (user.isBlocked) {
            user.blockedAt = new Date();
        } else {
            user.blockedAt = null;
            user.activeAt = new Date();
        }
        await user.save();

        res.json({ success: true, message: user.isBlocked ? "User blocked" : "User unblocked", isBlocked: user.isBlocked });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error updating block status" });
    }
};


// Send OTP for Admin Login
const sendAdminOTP = async (req, res) => {
    try {
        const { email } = req.body;
        if (typeof email !== 'string' || !validator.isEmail(email)) return res.status(400).json({ success: false, message: 'Invalid email.' });
        // Privileged OTP login is available only to explicitly provisioned database accounts.
        // Environment administrators use the password login; public signup never provisions roles.
        const user = await userModel.findOne({ email, role: { $in: ['admin', 'staff'] }, isBlocked: { $ne: true } });
        if (user) {
            const otp = await issueOtp(user, 'admin-login');
            await sendEmail(email, 'Your Admin Login OTP', `<p>Your admin login OTP is <strong>${otp}</strong>. It expires in 5 minutes.</p>`);
        }
        res.json({ success: true, message: 'If eligible, a code has been sent to your email.' });
    } catch {
        res.status(500).json({ success: false, message: 'Unable to send code.' });
    }
};
const adminOtpLogin = async (req, res) => {
    try {
        const { email, otp } = req.body;
        const user = typeof email === 'string' ? await userModel.findOne({ email }) : null;
        if (!user || user.isBlocked || !['admin', 'staff'].includes(user.role) || !(await checkOtp(user, otp, 'admin-login', true))) {
            return res.status(401).json({ success: false, message: 'Invalid or expired code.' });
        }
        res.json({ success: true, token: userToken(user, 'admin'), role: user.role, permissions: user.permissions, email: user.email });
    } catch {
        res.status(401).json({ success: false, message: 'Invalid or expired code.' });
    }
};


export { loginUser, registerUser, adminLogin, getProfile, forgotPassword, verifyPasswordOtp, resetPassword, addAddress, updateAddress, addBankAccount, removeBankAccount, pincodeProxy, getAllUsers, getWishlist, addToWishlist, removeFromWishlist, googleLogin, decrementGiftWraps, grantLuxeMembership, updateStaffPermissions, toggleBlockUser, sendAdminOTP, adminOtpLogin }
