import userModel from "../models/userModel.js"

// add products to user cart
const addToCart = async (req,res) => {
    try {
        const { itemId, size, color, appliedCoupon, discountAmount } = req.body
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

        if (cartItemIndex > -1) {
            user.cartData[cartItemIndex].quantity += 1;
            // Optionally update coupon if a new one is provided
            if (appliedCoupon) {
                user.cartData[cartItemIndex].appliedCoupon = appliedCoupon;
                user.cartData[cartItemIndex].discountAmount = discountAmount || 0;
            }
        } else {
            user.cartData.push({ 
                product: itemId, 
                size, 
                color, 
                quantity: 1,
                appliedCoupon: appliedCoupon || null,
                discountAmount: discountAmount || 0
            });
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

// add gift wrap to user cart
const addGiftWrapToCart = async (req, res) => {
    try {
        const { giftWrapId } = req.body;
        const user = await userModel.findById(req.userId);

        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }

        user.giftWrap = giftWrapId;
        await user.save();
        res.json({ success: true, message: "Gift Wrap Added To Cart" });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// remove gift wrap from user cart
const removeGiftWrapFromCart = async (req, res) => {
    try {
        const user = await userModel.findById(req.userId);

        if (!user) {
            return res.json({ success: false, message: "User not found" });
        }

        user.giftWrap = null;
        await user.save();
        res.json({ success: true, message: "Gift Wrap Removed From Cart" });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// get user cart data
const getUserCart = async (req,res) => {
    try {
        const user = await userModel.findById(req.userId).populate({
            path: 'cartData.product'
        }).populate('giftWrap');
        
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
                const productObject = item.product.toObject();
                const variation = productObject.variations.find(v => v.color === item.color);
                let price = 0;
                let mrp = 0;
                if (variation) {
                    const sizeData = variation.sizes.find(s => s.size === item.size);
                    if (sizeData) {
                        price = sizeData.price;
                        mrp = sizeData.mrp;
                    }
                }

                return {
                    ...productObject,
                    quantity: item.quantity,
                    size: item.size,
                    color: item.color,
                    price: price, // Add the correct price
                    mrp: mrp,   // Add the correct mrp
                    _id: item.product._id,
                    appliedCoupon: item.appliedCoupon,
                    discountAmount: item.discountAmount
                };
            }
            return null;
        }).filter(item => item !== null);

        res.json({ success: true, cartItems: cartItems, giftWrap: user.giftWrap });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error fetching cart" });
    }
}

export { addToCart, updateCart, getUserCart, removeFromCart, addGiftWrapToCart, removeGiftWrapFromCart }
