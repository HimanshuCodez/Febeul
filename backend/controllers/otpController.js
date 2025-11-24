import userModel from "../models/userModel.js";
import jwt from 'jsonwebtoken';
// import msg91 from "msg91-v5";

// const msg91Instance = new msg91("YOUR_AUTH_KEY");

const createToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET)
}

const sendOTP = async (req, res) => {
    try {
        const { mobile } = req.body;
        if (!mobile || !/^\d{10}$/.test(mobile)) {
            return res.json({ success: false, message: "Invalid mobile number" });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otp_expiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiry

        let user = await userModel.findOne({ mobile });

        if (!user) {
            // To prevent creating a new user for a mobile that might be associated with an email account
            return res.json({ success: false, message: "User with this mobile number not found." });
        }

        user.otp = otp;
        user.otp_expiry = otp_expiry;
        await user.save();

        // Mock sending OTP
        console.log(`OTP for ${mobile} is ${otp}`);

        // In a real implementation, you would use msg91 to send the OTP
        // const flowData = {
        //     flow_id: "YOUR_FLOW_ID",
        //     sender: "YOUR_SENDER_ID",
        //     mobiles: `91${mobile}`,
        //     otp: otp,
        // };
        // await msg91Instance.send(flowData);

        res.json({ success: true, message: "OTP sent successfully" });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error sending OTP" });
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
            return res.json({ success: false, message: "Invalid or expired OTP" });
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

export { sendOTP, verifyOTP };
