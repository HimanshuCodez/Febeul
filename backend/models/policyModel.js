import mongoose from "mongoose";

const policySchema = new mongoose.Schema({
    policyName: {
        type: String,
        required: true,
        unique: true
    },
    content: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    pageTitle: {
        type: String,
        required: true
    },
    creator: {
        name: { type: String },
        email: { type: String },
        role: { type: String }
    }
}, { timestamps: true });

const policyModel = mongoose.models.policy || mongoose.model("policy", policySchema);

export default policyModel;
