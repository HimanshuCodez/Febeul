import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    mrp: { type: Number },
    variations: [{
        color: { type: String },
        images: { type: [String] }
    }],
    category: { type: String, required: true },
    subCategory: { type: String, required: true },
    sizes: { type: Array, required: true },
    bestseller: { type: Boolean },
    date: { type: Number, required: true },
    styleCode: { type: String },
    countryOfOrigin: { type: String },
    manufacturer: { type: String },
    packer: { type: String },
    includedComponents: { type: String },
    fabric: { type: String },
    type: { type: String },
    pattern: { type: String },
    sleeveStyle: { type: String },
    sleeveLength: { type: String },
    neck: { type: String },
    hsn: { type: String },
    materialComposition: { type: String },
    careInstructions: { type: String },
    closureType: { type: String },
    materialType: { type: String },
    itemWeight: { type: String },
    itemDimensionsLxWxH: { type: String },
    netQuantity: { type: String },
    genericName: { type: String },
    averageRating: { type: Number, default: 0 },
    numOfReviews: { type: Number, default: 0 }
})

const productModel  = mongoose.models.product || mongoose.model("product",productSchema);

export default productModel