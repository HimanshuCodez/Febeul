import mongoose from 'mongoose';

const mailHistorySchema = new mongoose.Schema({
    subject: { type: String, required: true },
    title: { type: String },
    body: { type: String },
    buttonText: { type: String },
    buttonLink: { type: String },
    imageUrl: { type: String },
    htmlContent: { type: String },
    target: { type: String, required: true },
    specificEmails: { type: String },
    recipients: [{ type: String }],
    successCount: { type: Number, default: 0 },
    failCount: { type: Number, default: 0 },
    sentBy: { type: String },
    sentAt: { type: Date, default: Date.now }
});

const mailHistoryModel = mongoose.models.mailHistory || mongoose.model('mailHistory', mailHistorySchema);

export default mailHistoryModel;
