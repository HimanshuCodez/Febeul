import { v2 as cloudinary } from "cloudinary"
import productModel from "../models/productModel.js"

// function for add product
const addProduct = async (req, res) => {
    try {
        const { name, description, category, subCategory, sizes, bestseller, styleCode, countryOfOrigin, manufacturer, packer, includedComponents, fabric, type, pattern, sleeveStyle, sleeveLength, neck, hsn, materialComposition, careInstructions, closureType, materialType, itemWeight, itemDimensionsLxWxH, netQuantity, genericName, variations: variationsJSON } = req.body;
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
                            images: imagesUrl,
                            sizes: variation.sizes.map(s => ({ // Process sizes array
                                size: s.size,
                                price: Number(s.price),
                                mrp: Number(s.mrp)
                            }))
                        };
                    }));
                
                    const productData = {
                        name,
                        description,
                        category,
                        subCategory,
                        bestseller: bestseller === "true" ? true : false,
                        variations: processedVariations,
                        date: Date.now(),            styleCode,
            countryOfOrigin,
            manufacturer,
            packer,
            includedComponents,
            fabric,
            type,
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
        const { category, type, subCategory, search } = req.query; // Extract query parameters
        let filter = {};

        if (category) {
            filter.category = { $regex: new RegExp(category.replace(/-/g, ' '), 'i') }; // Case-insensitive match, handle kebab-case
        }
        if (type) {
            filter.type = { $regex: new RegExp(type.replace(/-/g, ' '), 'i') }; // Case-insensitive match, handle kebab-case
        }
        if (subCategory) {
            filter.subCategory = { $regex: new RegExp(subCategory.replace(/-/g, ' '), 'i') }; // Case-insensitive match, handle kebab-case
        }
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { type: { $regex: search, $options: 'i' } },
                { fabric: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { category: { $regex: search, $options: 'i' } },
            ];
        }

        const products = await productModel.find(filter); // Apply filters
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
        const { productId, name, description, category, subCategory, bestseller, styleCode, countryOfOrigin, manufacturer, packer, includedComponents, fabric, type, pattern, sleeveStyle, sleeveLength, neck, hsn, materialComposition, careInstructions, closureType, materialType, itemWeight, itemDimensionsLxWxH, netQuantity, genericName, variations: variationsJSON } = req.body;
        
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
                images: [...existingImages, ...newImagesUrl],
                sizes: variation.sizes.map(s => ({ // Process sizes array
                    size: s.size,
                    price: Number(s.price),
                    mrp: Number(s.mrp)
                }))
            };
        }));
        
        product.name = name;
        product.description = description;
        product.category = category;
        product.subCategory = subCategory;
        product.bestseller = bestseller;
        product.styleCode = styleCode;
        product.countryOfOrigin = countryOfOrigin;
        product.manufacturer = manufacturer;
        product.packer = packer;
        product.includedComponents = includedComponents;
        product.fabric = fabric;
        product.type = type;
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

const getMenuFilters = async (req,res) => {
    try {
        const categories = await productModel.distinct("category")
        const types = await productModel.distinct("type")
        const fabrics = await productModel.distinct("fabric")
        const sizes = await productModel.distinct("variations.sizes.size")
        const colors = await productModel.distinct("variations.color")

        res.json({success:true,data:{categories,types,fabrics,sizes,colors}})
    } catch (error) {
        console.log(error)
        res.json({success:false,message:error.message})
    }
}

export { listProducts, addProduct, removeProduct, singleProduct, updateProduct, getSimilarProducts, getMenuFilters }