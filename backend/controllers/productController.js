import { v2 as cloudinary } from "cloudinary"
import productModel from "../models/productModel.js"

// function for add product
const addProduct = async (req, res) => {
    try {

        const { name, description, price, mrp, category, subCategory, sizes, bestseller, styleCode, countryOfOrigin, manufacturer, packer, includedComponents, color, fabric, pattern, sleeveStyle, sleeveLength, neck, hsn, materialComposition, careInstructions, closureType, materialType, itemWeight, itemDimensionsLxWxH, netQuantity, genericName } = req.body

        const image1 = req.files.image1 && req.files.image1[0]
        const image2 = req.files.image2 && req.files.image2[0]
        const image3 = req.files.image3 && req.files.image3[0]
        const image4 = req.files.image4 && req.files.image4[0]
        const image5 = req.files.image5 && req.files.image5[0]
        const image6 = req.files.image6 && req.files.image6[0]

        const images = [image1, image2, image3, image4, image5, image6].filter((item) => item !== undefined)

        let imagesUrl = await Promise.all(
            images.map(async (item) => {
                let result = await cloudinary.uploader.upload(item.path, { resource_type: 'image' });
                return result.secure_url
            })
        )

        const productData = {
            name,
            description,
            category,
            price: Number(price),
            mrp: Number(mrp),
            subCategory,
            bestseller: bestseller === "true" ? true : false,
            sizes: JSON.parse(sizes),
            image: imagesUrl,
            date: Date.now(),
            styleCode,
            countryOfOrigin,
            manufacturer,
            packer,
            includedComponents,
            color,
            fabric,
            pattern,
            sleeveStyle,
            sleeveLength,
            neck,
            hsn,
            materialComposition,
            careInstructions,
            closureType,
            materialType,
            itemWeight,
            itemDimensionsLxWxH,
            netQuantity,
            genericName
        }

        console.log(productData);

        const product = new productModel(productData);
        await product.save()

        res.json({ success: true, message: "Product Added" })

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// function for list product
const listProducts = async (req, res) => {
    try {
        
        const products = await productModel.find({});
        res.json({success:true,products})

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// function for removing product
const removeProduct = async (req, res) => {
    try {
        
        await productModel.findByIdAndDelete(req.body.id)
        res.json({success:true,message:"Product Removed"})

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// function for single product info
const singleProduct = async (req, res) => {
    try {
        
        const { productId } = req.body
        const product = await productModel.findById(productId)
        res.json({success:true,product})

    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// function for updating product
const updateProduct = async (req, res) => {
    try {
        const { productId, name, description, price, mrp, category, subCategory, sizes, bestseller, styleCode, countryOfOrigin, manufacturer, packer, includedComponents, color, fabric, pattern, sleeveStyle, sleeveLength, neck, hsn, materialComposition, careInstructions, closureType, materialType, itemWeight, itemDimensionsLxWxH, netQuantity, genericName } = req.body;

        const product = await productModel.findById(productId);

        if (!product) {
            return res.json({ success: false, message: "Product not found" });
        }

        product.name = name;
        product.description = description;
        product.price = price;
        product.mrp = mrp;
        product.category = category;
        product.subCategory = subCategory;
        product.sizes = JSON.parse(sizes);
        product.bestseller = bestseller;
        product.styleCode = styleCode;
        product.countryOfOrigin = countryOfOrigin;
        product.manufacturer = manufacturer;
        product.packer = packer;
        product.includedComponents = includedComponents;
        product.color = color;
        product.fabric = fabric;
        product.pattern = pattern;
        product.sleeveStyle = sleeveStyle;
        product.sleeveLength = sleeveLength;
        product.neck = neck;
        product.hsn = hsn;
        product.materialComposition = materialComposition;
        product.careInstructions = careInstructions;
        product.closureType = closureType;
        product.materialType = materialType;
        product.itemWeight = itemWeight;
        product.itemDimensionsLxWxH = itemDimensionsLxWxH;
        product.netQuantity = netQuantity;
        product.genericName = genericName;

        await product.save();

        res.json({ success: true, message: "Product updated" });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

export { listProducts, addProduct, removeProduct, singleProduct, updateProduct }