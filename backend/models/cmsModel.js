import mongoose from "mongoose";

const cmsSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true
    },
    content: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    creator: {
        name: { type: String },
        email: { type: String },
        role: { type: String }
    }
}, { timestamps: true });

const cmsModel = mongoose.models.cms || mongoose.model("cms", cmsSchema);

export default cmsModel;
