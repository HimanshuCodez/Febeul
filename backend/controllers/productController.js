import { v2 as cloudinary } from "cloudinary"
import productModel from "../models/productModel.js"

// function for add product
const addProduct = async (req, res) => {
    try {
        const { name, description, price, mrp, category, subCategory, sizes, bestseller, styleCode, countryOfOrigin, manufacturer, packer, includedComponents, fabric, pattern, sleeveStyle, sleeveLength, neck, hsn, materialComposition, careInstructions, closureType, materialType, itemWeight, itemDimensionsLxWxH, netQuantity, genericName, variations: variationsJSON } = req.body;
        const variations = JSON.parse(variationsJSON);
        const files = req.files;

        let processedVariations = await Promise.all(variations.map(async (variation, v_idx) => {
            const imageFiles = files.filter(file => file.fieldname === `variations[${v_idx}][images]`);
            let imagesUrl = await Promise.all(
                imageFiles.map(async (item) => {
                    let result = await cloudinary.uploader.upload(item.path, { resource_type: 'image' });
                    return result.secure_url;
                })
            );
            return {
                color: variation.color,
                images: imagesUrl
            };
        }));

        const productData = {
            name,
            description,
            category,
            price: Number(price),
            mrp: Number(mrp),
            subCategory,
            bestseller: bestseller === "true" ? true : false,
            sizes: JSON.parse(sizes),
            variations: processedVariations,
            date: Date.now(),
            styleCode,
            countryOfOrigin,
            manufacturer,
            packer,
            includedComponents,
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
        };

        const product = new productModel(productData);
        await product.save();

        res.json({ success: true, message: "Product Added" });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
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
        const { productId, name, description, price, mrp, category, subCategory, sizes, bestseller, styleCode, countryOfOrigin, manufacturer, packer, includedComponents, fabric, pattern, sleeveStyle, sleeveLength, neck, hsn, materialComposition, careInstructions, closureType, materialType, itemWeight, itemDimensionsLxWxH, netQuantity, genericName, variations: variationsJSON } = req.body;
        
        const product = await productModel.findById(productId);
        if (!product) {
            return res.json({ success: false, message: "Product not found" });
        }

        const variations = JSON.parse(variationsJSON);
        const files = req.files;

        // Handle image deletions from cloudinary
        const incomingImageUrls = new Set(variations.flatMap(v => v.images).filter(img => typeof img === 'string'));
        const existingImageUrls = product.variations.flatMap(v => v.images);
        
        for (const imageUrl of existingImageUrls) {
            if (!incomingImageUrls.has(imageUrl)) {
                const publicId = imageUrl.split('/').pop().split('.')[0];
                await cloudinary.uploader.destroy(publicId);
            }
        }

        let processedVariations = await Promise.all(variations.map(async (variation, v_idx) => {
            const newImageFiles = files.filter(file => file.fieldname === `variations[${v_idx}][images]`);
            
            let newImagesUrl = await Promise.all(
                newImageFiles.map(async (item) => {
                    let result = await cloudinary.uploader.upload(item.path, { resource_type: 'image' });
                    return result.secure_url;
                })
            );

            const existingImages = variation.images ? variation.images.filter(img => typeof img === 'string') : [];

            return {
                color: variation.color,
                images: [...existingImages, ...newImagesUrl]
            };
        }));
        
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
        product.variations = processedVariations;

        await product.save();

        res.json({ success: true, message: "Product updated" });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// function for getting similar products
const getSimilarProducts = async (req, res) => {
    try {
        const { productId } = req.params;
        const product = await productModel.findById(productId);

        if (!product) {
            return res.json({ success: false, message: "Product not found" });
        }

        const similarProducts = await productModel.find({
            category: product.category,
            _id: { $ne: productId } // Exclude the current product
        }).limit(5); // Limit to 5 similar products

        res.json({ success: true, products: similarProducts });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
}

export { listProducts, addProduct, removeProduct, singleProduct, updateProduct, getSimilarProducts }