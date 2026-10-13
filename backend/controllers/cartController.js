import userModel from "../models/userModel.js"
import { applyItemCoupons } from '../utils/itemCoupons.js';

// add products to user cart
const addToCart = async (req,res) => {
    try {
        const { itemId, size, color, appliedCoupon } = req.body
        if (appliedCoupon != null && (typeof appliedCoupon !== 'string' || appliedCoupon.length > 100)) return res.status(400).json({ success: false, message: 'Invalid coupon code.' });
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
            if (user.cartData[cartItemIndex].quantity >= 99) return res.status(400).json({ success: false, message: 'Quantity limit reached.' });
            user.cartData[cartItemIndex].quantity += 1;
            // Optionally update coupon if a new one is provided
            if (appliedCoupon) {
                user.cartData[cartItemIndex].appliedCoupon = appliedCoupon;
                user.cartData[cartItemIndex].discountAmount = 0;
            }
        } else {
            if (user.cartData.length >= 100) return res.status(400).json({ success: false, message: 'Cart limit reached.' });
            user.cartData.push({ 
                product: itemId, 
                size, 
                color, 
                quantity: 1,
                appliedCoupon: appliedCoupon || null,
                discountAmount: 0
            });
        }

        await user.save();
        res.json({ success: true, message: "Added To Cart" })
    } catch (error) {
        console.log(error)
        res.json({ success: false, message: "Unable to complete request." })
    }
}

// update user cart
const updateCart = async (req,res) => {
    try {
        const { itemId, size, quantity, color } = req.body
        if (!Number.isSafeInteger(quantity) || quantity < 0 || quantity > 99) return res.status(400).json({ success: false, message: 'Invalid quantity.' });
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
        res.json({ success: false, message: "Unable to complete request." })
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
        res.json({ success: false, message: "Unable to complete request." });
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
        res.json({ success: false, message: "Unable to complete request." });
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
                    sku: variation?.sku || '',
                    _id: item.product._id,
                    appliedCoupon: item.appliedCoupon,
                    discountAmount: 0
                };
            }
            return null;
        }).filter(item => item !== null);

        await applyItemCoupons(cartItems, user, undefined, { strict: false });
        res.json({ success: true, cartItems: cartItems, giftWrap: user.giftWrap });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error fetching cart" });
    }
}

export { addToCart, updateCart, getUserCart, removeFromCart, addGiftWrapToCart, removeGiftWrapFromCart }
