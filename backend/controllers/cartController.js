import userModel from "../models/userModel.js"
import productModel from "../models/productModel.js";

// add products to user cart
const addToCart = async (req,res) => {
    try {
        const { userId, itemId, size } = req.body
        const userData = await userModel.findById(userId)
        let cartData = await userData.cartData;

        if (cartData[itemId]) {
            if (cartData[itemId][size]) {
                cartData[itemId][size] += 1
            }
            else {
                cartData[itemId][size] = 1
            }
        } else {
            cartData[itemId] = {}
            cartData[itemId][size] = 1
        }

        await userModel.findByIdAndUpdate(userId, {cartData})
        res.json({ success: true, message: "Added To Cart" })
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// update user cart
const updateCart = async (req,res) => {
    try {
        const { userId ,itemId, size, quantity } = req.body
        const userData = await userModel.findById(userId)
        let cartData = await userData.cartData;

        if (quantity === 0) {
            delete cartData[itemId][size];
            if (Object.keys(cartData[itemId]).length === 0) {
                delete cartData[itemId];
            }
        } else {
            cartData[itemId][size] = quantity
        }

        await userModel.findByIdAndUpdate(userId, {cartData})
        res.json({ success: true, message: "Cart Updated" })
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// remove products from user cart
const removeFromCart = async (req, res) => {
    try {
        const { userId, itemId, size } = req.body;
        const userData = await userModel.findById(userId);
        let cartData = userData.cartData;

        if (cartData[itemId] && cartData[itemId][size]) {
            delete cartData[itemId][size];
            if (Object.keys(cartData[itemId]).length === 0) {
                delete cartData[itemId];
            }
        }

        await userModel.findByIdAndUpdate(userId, { cartData });
        res.json({ success: true, message: "Removed From Cart" });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error" });
    }
};

// get user cart data
const getUserCart = async (req,res) => {
    try {
        const userData = await userModel.findById(req.body.userId);
        let cartData = await userData.cartData;
        
        if (!cartData || Object.keys(cartData).length === 0) {
            return res.json({ success: true, cartItems: [] });
        }

        const product_ids = Object.keys(cartData);
        const products = await productModel.find({_id: {$in: product_ids}});

        let cart_items = [];

        products.forEach(product => {
            const product_id_str = product._id.toString();
            if (cartData[product_id_str]) {
                Object.keys(cartData[product_id_str]).forEach(size => {
                    cart_items.push({
                        ...product.toObject(),
                        _id: product_id_str, // ensure _id is a string
                        quantity: cartData[product_id_str][size],
                        size: size
                    });
                });
            }
        });

        res.json({ success: true, cartItems: cart_items });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error fetching cart" });
    }
}

export { addToCart, updateCart, getUserCart, removeFromCart }
