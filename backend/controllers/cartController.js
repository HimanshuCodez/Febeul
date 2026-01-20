import userModel from "../models/userModel.js"

// add products to user cart
const addToCart = async (req,res) => {
    try {
        if (!user.cartData) { 
            user.cartData = [];
        } else {
            // Filter out any malformed cartData entries before proceeding
            user.cartData = user.cartData.filter(item => 
                item && item.product && item.size && item.color && item.quantity !== undefined
            );
        }
        
        const cartItemIndex = user.cartData.findIndex(item => item && item.product && item.product.toString() === itemId && item.size === size && item.color === color);

        if (cartItemIndex > -1) {
            user.cartData[cartItemIndex].quantity += 1;
        } else {
            user.cartData.push({ product: itemId, size, color, quantity: 1 });
        }

        await user.save();
        res.json({ success: true, message: "Added To Cart" })
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// update user cart
const updateCart = async (req,res) => {
    try {
        const { itemId, size, quantity, color } = req.body
        const user = await userModel.findById(req.userId)

        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }

        if (!user.cartData) { 
            user.cartData = [];
        } else {
            // Filter out any malformed cartData entries before proceeding
            user.cartData = user.cartData.filter(item => 
                item && item.product && item.size && item.color && item.quantity !== undefined
            );
        }
        
        const cartItemIndex = user.cartData.findIndex(item => item && item.product && item.product.toString() === itemId && item.size === size && item.color === color);

        if (quantity === 0) {
            if (cartItemIndex > -1) {
                user.cartData.splice(cartItemIndex, 1);
            }
        } else {
            if (cartItemIndex > -1) {
                user.cartData[cartItemIndex].quantity = quantity;
            }
        }

        await user.save();
        res.json({ success: true, message: "Cart Updated" })
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: error.message })
    }
}

// remove products from user cart
const removeFromCart = async (req, res) => {
    try {
        const { itemId, size, color } = req.body;
        const user = await userModel.findById(req.userId);

        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }
        
        if (!user.cartData) { 
            user.cartData = [];
        } else {
            user.cartData = user.cartData.filter(item => 
                item && item.product && item.size && item.color && item.quantity !== undefined
            );
        }
        
        const cartItemIndex = user.cartData.findIndex(item => item && item.product && item.product.toString() === itemId && item.size === size && item.color === color);

        if (cartItemIndex > -1) {
            user.cartData.splice(cartItemIndex, 1);
        }

        await user.save();
        res.json({ success: true, message: "Removed From Cart" });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error" });
    }
};

// get user cart data
const getUserCart = async (req,res) => {
    try {
        const user = await userModel.findById(req.userId).populate({
            path: 'cartData.product'
        });
        
        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }

        if (!user.cartData) { 
            user.cartData = [];
        } else {
            // Filter out any malformed cartData entries before proceeding
            user.cartData = user.cartData.filter(item => 
                item && item.product && item.size && item.color && item.quantity !== undefined
            );
        }

        // The cartItems are now populated with product details
        const cartItems = user.cartData.map(item => {
            if (item.product) {
                return {
                    ...item.product.toObject(),
                    quantity: item.quantity,
                    size: item.size,
                    color: item.color,
                    _id: item.product._id // ensure the product's _id is what we use as the main identifier
                };
            }
            return null;
        }).filter(item => item !== null);

        res.json({ success: true, cartItems: cartItems });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error fetching cart" });
    }
}

export { addToCart, updateCart, getUserCart, removeFromCart }
