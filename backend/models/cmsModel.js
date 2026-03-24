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
    }
}, { timestamps: true });

const cmsModel = mongoose.models.cms || mongoose.model("cms", cmsSchema);

export default cmsModel;
