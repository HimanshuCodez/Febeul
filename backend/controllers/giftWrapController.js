import giftWrapModel from "../models/giftWrapModel.js";
import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';

// List all gift wraps
const listGiftWraps = async (req, res) => {
    try {
        const giftWraps = await giftWrapModel.find({});
        res.json({ success: true, data: giftWraps });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error" });
    }
}

// Add gift wrap
const addGiftWrap = async (req, res) => {
    const { name, price } = req.body;
    const imageFile = req.file;

    if (!name || !price || !imageFile) {
        if(imageFile) fs.unlinkSync(imageFile.path);
        return res.json({ success: false, message: "All fields are required." });
    }

    try {
        const imageUpload = await cloudinary.uploader.upload(imageFile.path, { folder: "giftwraps" });
        fs.unlinkSync(imageFile.path); // remove temp file

        const newGiftWrap = new giftWrapModel({
            name,
            price: Number(price),
            image: imageUpload.secure_url,
        });

        await newGiftWrap.save();
        res.json({ success: true, message: "Gift Wrap Added", data: newGiftWrap });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error adding gift wrap" });
    }
}

// Remove gift wrap
const removeGiftWrap = async (req, res) => {
    try {
        const { id } = req.body;
        const giftWrap = await giftWrapModel.findById(id);
        if (giftWrap.image) {
            const imageId = giftWrap.image.split('/').pop().replace(/\..*/, '');
            await cloudinary.uploader.destroy("giftwraps/" + imageId);
        }
        await giftWrapModel.findByIdAndDelete(id);
        res.json({ success: true, message: "Gift Wrap Removed" });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error" });
    }
}

export { listGiftWraps, addGiftWrap, removeGiftWrap };
