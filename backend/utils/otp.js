import { createHmac, randomInt } from 'node:crypto';
import userModel from '../models/userModel.js';

const digest = (id, purpose, code) => createHmac('sha256', process.env.JWT_SECRET).update(`${id}:${purpose}:${code}`).digest('hex');
export async function issueOtp(user, purpose) {
    const code = String(randomInt(100000, 1000000));
    user.otp = digest(user._id, purpose, code);
    user.otpPurpose = purpose;
    user.otpAttempts = 0;
    user.otp_expiry = new Date(Date.now() + 5 * 60 * 1000);
    await user.save();
    return code;
}

export async function checkOtp(user, code, purpose, consume = false) {
    if (!user || typeof code !== 'string' || !/^\d{6}$/.test(code)) return false;
    const attempt = await userModel.findOneAndUpdate({
        _id: user._id, otpPurpose: purpose, otp_expiry: { $gt: new Date() }, otpAttempts: { $lt: 5 },
    }, { $inc: { otpAttempts: 1 } }, { new: true });
    if (!attempt || attempt.otp !== digest(user._id, purpose, code)) return false;
    if (!consume) return true;
    const result = await userModel.updateOne({ _id: user._id, otp: attempt.otp, otpPurpose: purpose, otp_expiry: { $gt: new Date() } }, {
        $unset: { otp: 1, otp_expiry: 1, otpPurpose: 1, otpAttempts: 1 },
    });
    return result.modifiedCount === 1;
}
