import { validateItems, couponDiscountFor, ownsOrder, stripePaymentMatches, razorpayPaymentMatches } from '../utils/checkoutSecurity.js';
import { applyItemCoupons } from '../utils/itemCoupons.js';
import { cancelCustomerOrder as cancelOrder, cancelAdminOrder } from './cancellationController.js';
import { safeEqual } from '../utils/authTokens.js';
import { allowedOrigins } from '../middleware/security.js';
import mongoose from 'mongoose';
import { afterPaymentResponse } from '../analytics/service.js';
import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import Stripe from 'stripe'
import razorpay from 'razorpay'
import { createAndAssignShipment } from '../utils/shiprocket.js';
import { syncOrderTracking, syncOrdersTracking } from '../utils/orderTrackingSync.js';
import { syncReturnTracking, syncReturnsTracking } from '../utils/returnTrackingSync.js';
import { getReturnSettings, sanitizeOrderForCustomer, sanitizeOrdersForCustomer } from '../utils/returnStatus.js';
import exchangeModel from '../models/exchangeModel.js';
import { getExchangeSettings, sanitizeExchangesForCustomer, applyWindowExpiry } from '../utils/exchangeStatus.js';
import { buildAdminOrderTracking } from '../utils/adminOrderTracking.js';
import crypto from 'crypto'
import { buildInvoicePDF } from '../templates/invoiceGenerator.js'; // New import for PDF generation logic
import { sendEmail } from '../utils/sendEmail.js'; // New import for email utility
import { luxeEmailTemplate } from '../templates/luxemail.js'; // Import luxeEmailTemplate
import { getOrderConfirmationEmail } from '../utils/orderEmailTemplate.js';
import productModel from "../models/productModel.js";
import couponModel from "../models/couponModel.js"; // Import couponModel
import counterModel from "../models/counterModel.js"; // Import counterModel
import giftWrapModel from "../models/giftWrapModel.js"; // Import giftWrapModel

// Define pricing constants
const SHIPPING_CHARGE_THRESHOLD = 499;
const DEFAULT_SHIPPING_CHARGE = 50;
const COD_CHARGE_AMOUNT = 50; // This will act as the COD fee / base shipping for non-luxe below threshold

// gateway initialize
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const razorpayInstance = new razorpay({
    key_id : process.env.RAZORPAY_KEY_ID,
    key_secret : process.env.RAZORPAY_KEY_SECRET,
})

// Helper function to get next sequential invoice number
const getNextInvoiceNumber = async () => {
    const counter = await counterModel.findOneAndUpdate(
        { id: 'invoiceId' },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
    );
    return counter.seq;
};

// Random (not sequential) 8-digit customer/admin-facing order reference — retries on the rare collision
const generateOrderItemId = async () => {
    let id;
    let exists = true;
    while (exists) {
        id = String(Math.floor(10000000 + Math.random() * 90000000));
        exists = await orderModel.exists({ orderItemId: id });
    }
    return id;
};

const roundToNearestRupee = (value) => Math.round(Number(value) || 0);

// Helper to get item size data from product variations
const getSizeData = (product, color, size) => {
    const variation = product.variations.find(v => v.color === color);
    if (variation) {
        return variation.sizes.find(s => s.size === size);
    }
    return null;
};

// Helper function to decrease stock
const decreaseStock = async (items) => {
    for (const item of items) {
        if (item.name === "Febeul Luxe Membership") continue;
        const product = await productModel.findById(item.productId);
        if (product) {
            const variation = product.variations.find(v => v.color === item.color);
            if (variation) {
                const sizeData = variation.sizes.find(s => s.size === item.size);
                if (sizeData) {
                    sizeData.stock -= item.quantity;
                    if (sizeData.stock < 0) sizeData.stock = 0;
                }
            }
            await product.save();
        }
    }
};

// Helper function to calculate all pricing components
const calculateOrderPricing = async (userId, items, paymentMethod, giftWrapData, providedCouponDiscount = 0, userState = 'Delhi', couponCode) => {
    validateItems(items, paymentMethod);
    let productAmount = 0;

    // Fetch dynamic site settings
    const cmsModel = (await import('../models/cmsModel.js')).default;
    const siteSettingsDoc = await cmsModel.findOne({ name: 'siteSettings' });
    const siteSettings = siteSettingsDoc?.content || {
        membershipPrice: 129,
        shippingThreshold: 499,
        defaultShippingCharge: 50,
        codCharge: 50
    };

    const processedItems = await Promise.all(items.map(async (item) => {
        if (item.name === "Febeul Luxe Membership") {
            const mPrice = siteSettings.membershipPrice || 129;
            productAmount += mPrice * item.quantity;
            return {
                productId: "60d5ecb8b3b1c8e1e8e8e8e8", 
                quantity: item.quantity,
                name: item.name,
                image: "https://res.cloudinary.com/dv5p6v6jx/image/upload/v1715414841/membership_icon.png",
                price: mPrice,
                sku: "LUXE-MEMBERSHIP",
                discountAmount: 0
            };
        }

        const product = await productModel.findById(item.productId);
        if (!product || product.isActive === false) {
            throw new Error(`Product not found for ID: ${item.productId}`);
        }
        
        const sizeData = getSizeData(product, item.color, item.size);
        if (!sizeData) {
            throw new Error(`Size ${item.size} not found for product ${product.name} in color ${item.color}`);
        }

        if (sizeData.stock < item.quantity) {
            throw new Error(`Insufficient stock for ${product.name} (Color: ${item.color}, Size: ${item.size}). Available: ${sizeData.stock}`);
        }

        const itemPrice = sizeData.price;
        productAmount += itemPrice * item.quantity;


        return { 
            productId: item.productId,
            quantity: item.quantity,
            size: item.size,
            name: product.name,
            image: product.variations.find(v => v.color === item.color)?.images[0] || '',
            price: itemPrice,
            color: item.color,
            sku: product.variations.find(v => v.color === item.color)?.sku || '',
            hsn: product.hsn || '',
            discountAmount: 0,
            appliedCoupon: item.appliedCoupon || null
        };
    }));

    let giftWrapPrice = 0;
    if (giftWrapData) {
        if (typeof giftWrapData._id !== 'string' || !/^[a-f\d]{24}$/i.test(giftWrapData._id)) throw new Error('Invalid gift wrap.');
        const wrap = await giftWrapModel.findById(giftWrapData._id);
        if (!wrap || !Number.isFinite(wrap.price) || wrap.price < 0) throw new Error('Invalid gift wrap.');
        giftWrapPrice = wrap.price;
        // Store only authoritative gift-wrap properties.
        for (const key of Object.keys(giftWrapData)) delete giftWrapData[key];
        Object.assign(giftWrapData, { _id: String(wrap._id), name: wrap.name, image: wrap.image, price: wrap.price });
    }

    const user = await userModel.findById(userId); 
    const isLuxeMember = !!(user?.isLuxeMember && new Date(user.luxeMembershipExpires) > new Date());
    if (!user || user.isBlocked) throw new Error('Invalid customer.');
    const giftWrapsLeft = user?.giftWrapsLeft || 0;

    let shippingCharge = 0;
    let codCharge = 0; 
    
    if (paymentMethod === 'COD' && !isLuxeMember) {
        codCharge = siteSettings.codCharge || 50;
    }

    if (isLuxeMember && giftWrapData && giftWrapsLeft > 0) { 
        giftWrapPrice = 0; 
    }

    if (giftWrapData) giftWrapData.price = giftWrapPrice;
    let couponDiscount = 0;
    let couponOfferType = 'none';
    // Recalculate product coupons from current prices and eligibility; ignore submitted discounts.
    const { totalDiscount: totalItemDiscount, codes: itemCodes } = await applyItemCoupons(processedItems, user, paymentMethod);
    if (couponCode) {
        if (typeof couponCode !== 'string' || couponCode.length > 100) throw new Error('Invalid coupon code.');
        const coupon = await couponModel.findOne({ code: couponCode.toUpperCase() });
        // A product coupon repeated as the order code must not be deducted twice.
        if (!itemCodes.includes(couponCode.toUpperCase())) couponDiscount = couponDiscountFor(coupon, processedItems, user, paymentMethod);
        couponOfferType = coupon?.offerType || 'none';
    }

    const discountedProductAmount = productAmount - totalItemDiscount;
    const isMembershipOrder = items.every(item => item.name === "Febeul Luxe Membership");

    if (!isMembershipOrder && paymentMethod !== 'COD' && !isLuxeMember && discountedProductAmount < (siteSettings.shippingThreshold || 499)) {
        shippingCharge = siteSettings.defaultShippingCharge || 50;
    }
    
    if (isMembershipOrder) {
        shippingCharge = 0;
        codCharge = 0;
    }
    
    const discountedAmount = discountedProductAmount - couponDiscount;
    const taxableValue = discountedAmount / 1.05;
    const totalGst = discountedAmount - taxableValue;
    
    const isDelhi = userState?.trim().toLowerCase() === 'delhi';
    let cgstAmount = 0;
    let sgstAmount = 0;
    let igstAmount = 0;

    if (isDelhi) {
        cgstAmount = totalGst / 2;
        sgstAmount = totalGst / 2;
    } else {
        igstAmount = totalGst;
    }

    const totalCombinedDiscount = totalItemDiscount + couponDiscount;
    const orderTotal = (productAmount - totalCombinedDiscount) + shippingCharge + codCharge + giftWrapPrice;

    if (!Number.isFinite(orderTotal) || orderTotal <= 0 || orderTotal > 1000000) {
        throw new Error('Order amount must be greater than ₹0.');
    }

    return { productAmount, shippingCharge, codCharge, orderTotal, processedItems, isLuxeMember, totalCombinedDiscount, taxableValue, cgstAmount, sgstAmount, igstAmount, isDelhi, couponOfferType, couponDiscount };
};

const recordMembershipCoupon = async (order, userId) => {
    for (const code of new Set([order.couponCode, ...order.items.map(i => i.appliedCoupon)].filter(Boolean).map(c => c.toUpperCase()))) {
        await couponModel.updateOne({ code }, { $inc: { usageCount: 1 }, $push: { usersWhoUsed: { userId: new mongoose.Types.ObjectId(userId) } } });
    }
};

// Placing orders using COD Method
const placeOrder = async (req,res) => {
    
    try {
        
        const { items, address, giftWrap: giftWrapData, couponCode, couponDiscount } = req.body;
        const userId = req.userId;

        const { productAmount, shippingCharge, codCharge, orderTotal, processedItems, isLuxeMember, totalCombinedDiscount, taxableValue, cgstAmount, sgstAmount, igstAmount, couponOfferType } = await calculateOrderPricing(userId, items, 'COD', giftWrapData, couponDiscount, address.state, couponCode);

        const invoiceNumber = await getNextInvoiceNumber();
        const orderItemId = await generateOrderItemId();

        const finalCouponCode = couponCode || (processedItems.find(item => item.appliedCoupon)?.appliedCoupon || undefined);

        const orderData = {
            orderItemId,
            userId,
            items: processedItems,
            orderTotal: orderTotal, // Use backend calculated total
            productAmount,
            shippingCharge,
            codCharge,
            address,
            paymentMethod:"COD",
            payment:false,
            date: Date.now(),
            giftWrap: giftWrapData,
            couponCode: finalCouponCode,
            couponOfferType,
            couponDiscount: totalCombinedDiscount,
            invoiceNumber,
            taxableValue,
            cgstAmount,
            sgstAmount,
            igstAmount
        }

        const newOrder = new orderModel(orderData)
        await newOrder.save()

        // Decrease stock
        await decreaseStock(processedItems);

        await userModel.findByIdAndUpdate(userId,{cartData:[]})
        
        // Decrement giftWrapsLeft if Luxe member used a gift wrap
        if (isLuxeMember && giftWrapData) {
            await userModel.findByIdAndUpdate(userId, { $inc: { giftWrapsLeft: -1 } });
        }

        // Update gift wrap usage
        if (giftWrapData && giftWrapData._id) {
            await giftWrapModel.findByIdAndUpdate(giftWrapData._id, {
                $push: { usersWhoUsed: { userId: new mongoose.Types.ObjectId(userId) } }
            });
        }

        // Update coupon usage
        const usedCoupons = new Set();
        if (finalCouponCode) {
            usedCoupons.add(finalCouponCode.toUpperCase());
        }
        if (processedItems && Array.isArray(processedItems)) {
            processedItems.forEach(item => {
                if (item.appliedCoupon) {
                    usedCoupons.add(item.appliedCoupon.toUpperCase());
                }
            });
        }
        for (const code of usedCoupons) {
            await couponModel.updateOne(
                { code: code },
                { 
                    $inc: { usageCount: 1 },
                    $push: { usersWhoUsed: { userId: new mongoose.Types.ObjectId(userId) } }
                }
            );
        }

        const order = await orderModel.findById(newOrder._id).populate('userId');

        // Shiprocket integration
        const shiprocketData = await createAndAssignShipment(order, "COD");
        if (shiprocketData) {
            order.shiprocket = shiprocketData;
            order.orderStatus = "Processing";
            order.shiprocketStatus = "NEW";
            await order.save();
        }
        // If Shiprocket fails, the order is still placed, but not shipped yet.

        res.json({success:true,message:"Order Placed", order: newOrder})

        // Send Order Confirmation Email
        try {
            const populatedOrder = await orderModel.findById(newOrder._id).populate('userId').populate('items.productId', 'price');
            if (populatedOrder && populatedOrder.userId && populatedOrder.userId.email) {
                const { subject, html } = await getOrderConfirmationEmail(populatedOrder);
                await sendEmail(populatedOrder.userId.email, subject, html);
            }
        } catch (emailError) {
            console.error("Error sending order confirmation email for COD order:", emailError);
        }


    } catch (error) {
        console.error('Order request failed', { name: error?.name, code: error?.code })
        res.json({success:false,message:"Unable to process order. Check your items and payment details."})
    }

}

// Placing orders using Stripe Method
const placeOrderStripe = async (req,res) => {
    try {
        
        const { items, address, currency, giftWrap: giftWrapData, couponDiscount, couponCode } = req.body;
        const userId = req.userId;
        const origin = process.env.STOREFRONT_URL || allowedOrigins()[0];
        if (!origin || !/^https:\/\//.test(origin)) throw new Error('Checkout origin is not configured.');

        const { productAmount, shippingCharge, codCharge, orderTotal, processedItems, isLuxeMember, totalCombinedDiscount, taxableValue, cgstAmount, sgstAmount, igstAmount, couponOfferType } = await calculateOrderPricing(userId, items, 'Stripe', giftWrapData, couponDiscount, address.state, couponCode);

        const invoiceNumber = await getNextInvoiceNumber();
        const orderItemId = await generateOrderItemId();

        const finalCouponCode = couponCode || (processedItems.find(item => item.appliedCoupon)?.appliedCoupon || undefined);

        const orderData = {
            orderItemId,
            userId,
            items: processedItems,
            orderTotal: orderTotal,
            productAmount,
            shippingCharge,
            codCharge,
            address,
            paymentMethod:"Stripe",
            payment:false,
            date: Date.now(),
            giftWrap: giftWrapData,
            isLuxeMemberAtTimeOfOrder: isLuxeMember, // Store this for later verification
            couponCode: finalCouponCode,
            couponOfferType,
            couponDiscount: totalCombinedDiscount,
            invoiceNumber,
            taxableValue,
            cgstAmount,
            sgstAmount,
            igstAmount
        }

        const newOrder = new orderModel(orderData)
        await newOrder.save()

        const line_items = [{ price_data: { currency: 'inr', product_data: { name: `Febeul order ${orderItemId}` }, unit_amount: Math.round(orderTotal * 100) }, quantity: 1 }];

        const session = await stripe.checkout.sessions.create({
            success_url: `${origin}/verify?success=true&orderId=${newOrder._id}`,
            cancel_url:  `${origin}/verify?success=false&orderId=${newOrder._id}`,
            line_items,
            mode: 'payment',
            client_reference_id: String(newOrder._id),
        })

        // Record the session id now, while we have it for free from the create
        // call — verifyStripe has no other way to look up which Stripe
        // session/payment_intent belongs to this order, since success_url only
        // carries orderId, not the session id, back to us.
        await orderModel.findByIdAndUpdate(newOrder._id, { paymentDetails: { stripeSessionId: session.id } });

        res.json({success:true,session_url:session.url});
    } catch (error) {
        console.error('Order request failed', { name: error?.name, code: error?.code })
        res.json({success:false,message:"Unable to process order. Check your items and payment details."})
    }
}

// Verify Stripe 
const verifyStripe = async (req,res) => {

    const { orderId, success } = req.body
        const userId = req.userId;

    try {
        const order = await orderModel.findById(orderId).populate('userId');
        if (!ownsOrder(order, userId) || order.paymentMethod !== 'Stripe') return res.status(404).json({ success: false, message: 'Order not found.' });
        if (success === "true") {
            if (order.payment) return res.json({ success: true, message: 'Payment already verified.' });
            if (order.orderStatus === 'Cancelled' || !order.paymentDetails?.stripeSessionId) return res.status(400).json({ success: false, message: 'Order cannot be confirmed.' });
            const checkoutSession = await stripe.checkout.sessions.retrieve(order.paymentDetails.stripeSessionId);
            if (!stripePaymentMatches(order, checkoutSession)) return res.status(400).json({ success: false, message: 'Payment has not been confirmed.' });
            const analyticsStripeProof = { gateway: 'stripe', id: checkoutSession.id, payment_status: checkoutSession.payment_status, amount_total: checkoutSession.amount_total, currency: checkoutSession.currency };
            const claimed = await orderModel.findOneAndUpdate({ _id: orderId, userId, payment: false, isCancelled: { $ne: true }, orderStatus: { $ne: 'Cancelled' } }, {
                $set: { payment: true, orderStatus: 'Confirmed', 'paymentDetails.stripePaymentIntentId': checkoutSession.payment_intent },
            });
            if (!claimed) return res.json({ success: true, message: 'Payment already verified.' });
            // Re-fetch the updated order for further processing
            const updatedOrder = await orderModel.findById(orderId).populate('userId');
            afterPaymentResponse(req, res, updatedOrder, analyticsStripeProof, !order.payment);

            // Check if this is a luxe membership purchase
            const isLuxeOrder = updatedOrder.items.some(item => item.name === "Febeul Luxe Membership");

            if (isLuxeOrder) {
                await recordMembershipCoupon(updatedOrder, userId);
                const expiryDate = new Date();
                expiryDate.setMonth(expiryDate.getMonth() + 1);
                await userModel.findByIdAndUpdate(userId, {
                    isLuxeMember: true,
                    luxeMembershipExpires: expiryDate,
                    giftWrapsLeft: 15, // Initialize gift wraps
                    cartData: [] 
                });

                // Send Luxe Welcome Email
                try {
                    if (updatedOrder.userId && updatedOrder.userId.email) {
                        const emailContent = luxeEmailTemplate(updatedOrder.userId.name || 'Luxe Member', expiryDate);
                        await sendEmail(updatedOrder.userId.email, "Welcome to Febeul Luxe - Your Elite Membership is Active", emailContent);
                    }
                } catch (emailErr) {
                    console.error("Error sending Luxe welcome email (Stripe):", emailErr);
                }
            } else {
                await userModel.findByIdAndUpdate(userId, { cartData: [] });

                // Decrease stock
                await decreaseStock(updatedOrder.items);

                // Decrement giftWrapsLeft if Luxe member used a gift wrap
                if (updatedOrder.isLuxeMemberAtTimeOfOrder && updatedOrder.giftWrap) {
                    await userModel.findByIdAndUpdate(userId, { $inc: { giftWrapsLeft: -1 } });
                }

                // Update gift wrap usage
                if (updatedOrder.giftWrap && updatedOrder.giftWrap._id) {
                    await giftWrapModel.findByIdAndUpdate(updatedOrder.giftWrap._id, {
                        $push: { usersWhoUsed: { userId: new mongoose.Types.ObjectId(userId) } }
                    });
                }

                // Update coupon usage
                const usedCoupons = new Set();
                if (updatedOrder.couponCode) {
                    usedCoupons.add(updatedOrder.couponCode.toUpperCase());
                }
                if (updatedOrder.items && Array.isArray(updatedOrder.items)) {
                    updatedOrder.items.forEach(item => {
                        if (item.appliedCoupon) {
                            usedCoupons.add(item.appliedCoupon.toUpperCase());
                        }
                    });
                }
                for (const code of usedCoupons) {
                    await couponModel.updateOne(
                        { code: code },
                        { 
                            $inc: { usageCount: 1 },
                            $push: { usersWhoUsed: { userId: new mongoose.Types.ObjectId(userId) } }
                        }
                    );
                }

                // Shiprocket integration
                const shiprocketData = await createAndAssignShipment(updatedOrder, "Prepaid");
                if (shiprocketData) {
                    updatedOrder.shiprocket = shiprocketData;
                }
                updatedOrder.orderStatus = "Confirmed"; // The order is paid and confirmed
                updatedOrder.shiprocketStatus = "NEW"; // It's a new order for Shiprocket
                await updatedOrder.save();
            }

            res.json({success: true});

            // Send Order Confirmation Email (only if NOT a membership order, as that has its own email)
            if (!isLuxeOrder) {
                try {
                    const populatedOrder = await orderModel.findById(orderId).populate('userId');
                    if (populatedOrder && populatedOrder.userId && populatedOrder.userId.email) {
                        const { subject, html } = await getOrderConfirmationEmail(populatedOrder);
                        await sendEmail(populatedOrder.userId.email, subject, html);
                    }
                } catch (emailError) {
                    console.error("Error sending order confirmation email for Stripe order:", emailError);
                }
            }

        } else {
            // A browser cancellation is not proof that payment failed. Retain the record for reconciliation.
            res.json({success:false})
        }
        
    } catch (error) {
        console.error('Order request failed', { name: error?.name, code: error?.code })
        res.json({success:false,message:"Unable to process order. Check your items and payment details."})
    }

}

// Placing orders using Razorpay Method
const placeOrderRazorpay = async (req,res) => {
    try {
        
        const { items, address, currency = "INR", giftWrap: giftWrapData, couponCode, couponDiscount } = req.body;
        const userId = req.userId;

        const { productAmount, shippingCharge, codCharge, orderTotal, processedItems, isLuxeMember, totalCombinedDiscount, taxableValue, cgstAmount, sgstAmount, igstAmount, couponOfferType } = await calculateOrderPricing(userId, items, 'Razorpay', giftWrapData, couponDiscount, address.state, couponCode);

        const invoiceNumber = await getNextInvoiceNumber();
        const orderItemId = await generateOrderItemId();

        const finalCouponCode = couponCode || (processedItems.find(item => item.appliedCoupon)?.appliedCoupon || undefined);

        const orderData = {
            orderItemId,
            userId,
            items: processedItems,
            orderTotal: orderTotal, // Use backend calculated amount
            productAmount,
            shippingCharge,
            codCharge,
            address,
            paymentMethod:"Razorpay",
            payment:false,
            date: Date.now(),
            giftWrap: giftWrapData,
            isLuxeMemberAtTimeOfOrder: isLuxeMember, // Store this for later verification
            couponCode: finalCouponCode,
            couponOfferType,
            couponDiscount: totalCombinedDiscount,
            invoiceNumber,
            taxableValue,
            cgstAmount,
            sgstAmount,
            igstAmount
        }

        const newOrder = new orderModel(orderData)
        await newOrder.save()

        const options = {
            amount: Math.round(orderTotal * 100), // Use calculated orderTotal
            currency: 'INR',
            receipt : newOrder._id.toString()
        }

        const gatewayOrder = await razorpayInstance.orders.create(options);
        await orderModel.updateOne({ _id: newOrder._id }, { $set: { paymentDetails: { razorpay_order_id: gatewayOrder.id } } });
        res.json({ success: true, order: gatewayOrder });

    } catch (error) {
        console.error('Order request failed', { name: error?.name, code: error?.code })
        res.json({success:false,message:"Unable to process order. Check your items and payment details."})
    }
}

const verifyRazorpay = async (req,res) => {
    try {
        
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body
        const userId = req.userId;

        if (![razorpay_order_id, razorpay_payment_id, razorpay_signature].every(v => typeof v === 'string' && v.length > 0 && v.length < 200)) return res.status(400).json({ success: false, message: 'Invalid payment proof.' });
        const body = razorpay_order_id + "|" + razorpay_payment_id;

        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        if (safeEqual(expectedSignature, razorpay_signature)) {
            const orderInfo = await razorpayInstance.orders.fetch(razorpay_order_id);
            if (orderInfo.status === 'paid') {
                const pendingOrder = await orderModel.findById(orderInfo.receipt);
                if (!ownsOrder(pendingOrder, userId) || pendingOrder.paymentMethod !== 'Razorpay') return res.status(404).json({ success: false, message: 'Order not found.' });
                if (pendingOrder.payment) return res.json({ success: true, message: 'Payment already verified.' });
                if (pendingOrder.orderStatus === 'Cancelled') return res.status(400).json({ success: false, message: 'Order cannot be confirmed.' });
                const paymentInfo = await razorpayInstance.payments.fetch(razorpay_payment_id);
                if (!razorpayPaymentMatches(pendingOrder, orderInfo, paymentInfo)) return res.status(400).json({ success: false, message: 'Payment verification failed.' });
                const bankRRN = paymentInfo.acquirer_data?.rrn;
                const analyticsPreviousOrder = await orderModel.findOneAndUpdate({ _id: pendingOrder._id, userId, payment: false, isCancelled: { $ne: true }, orderStatus: { $ne: 'Cancelled' } }, { $set: {
                    payment: true, paymentDetails: { razorpay_order_id, razorpay_payment_id }, razorpayPaymentId: razorpay_payment_id,
                    ...(bankRRN ? { bankRRN } : {}), orderStatus: 'Confirmed',
                } });
                if (!analyticsPreviousOrder) return res.json({ success: true, message: 'Payment already verified.' });

                const order = await orderModel.findById(orderInfo.receipt).populate('userId');
                afterPaymentResponse(req, res, order, { gateway: 'razorpay', status: orderInfo.status, receipt: orderInfo.receipt, amount_paid: orderInfo.amount_paid, currency: orderInfo.currency }, !analyticsPreviousOrder?.payment);

                // Check if this is a luxe membership purchase
                const isLuxeOrder = order.items.some(item => item.name === "Febeul Luxe Membership");

                if (isLuxeOrder) {
                    await recordMembershipCoupon(order, userId);
                    const expiryDate = new Date();
                    expiryDate.setMonth(expiryDate.getMonth() + 1);
                    await userModel.findByIdAndUpdate(userId, {
                        isLuxeMember: true,
                        luxeMembershipExpires: expiryDate,
                        giftWrapsLeft: 15, // Initialize gift wraps
                        cartData: [] 
                    });

                    // Send Luxe Welcome Email
                    try {
                        const luxeUser = await userModel.findById(userId);
                        if (luxeUser && luxeUser.email) {
                            const emailContent = luxeEmailTemplate(luxeUser.name || 'Luxe Member', expiryDate);
                            await sendEmail(luxeUser.email, "Welcome to Febeul Luxe - Your Elite Membership is Active", emailContent);
                        }
                    } catch (emailErr) {
                        console.error("Error sending Luxe welcome email:", emailErr);
                    }
                } else {
                    await userModel.findByIdAndUpdate(userId, { cartData: [] });

                    // Update coupon usage
                    const usedCoupons = new Set();
                    if (order.couponCode) {
                        usedCoupons.add(order.couponCode.toUpperCase());
                    }
                    if (order.items && Array.isArray(order.items)) {
                        order.items.forEach(item => {
                            if (item.appliedCoupon) {
                                usedCoupons.add(item.appliedCoupon.toUpperCase());
                            }
                        });
                    }
                    for (const code of usedCoupons) {
                        await couponModel.updateOne(
                            { code: code },
                            { 
                                $inc: { usageCount: 1 },
                                $push: { usersWhoUsed: { userId: new mongoose.Types.ObjectId(userId) } }
                            }
                        );
                    }

                    // Decrease stock
                    await decreaseStock(order.items);

                    // Decrement giftWrapsLeft if Luxe member used a gift wrap on a non-luxe order
                    if (order.isLuxeMemberAtTimeOfOrder && order.giftWrap) {
                        await userModel.findByIdAndUpdate(userId, { $inc: { giftWrapsLeft: -1 } });
                    }

                    // Update gift wrap usage
                    if (order.giftWrap && order.giftWrap._id) {
                        await giftWrapModel.findByIdAndUpdate(order.giftWrap._id, {
                            $push: { usersWhoUsed: { userId: new mongoose.Types.ObjectId(userId) } }
                        });
                    }

                    // Shiprocket integration
                    const shiprocketData = await createAndAssignShipment(order, "Prepaid");
                    if (shiprocketData) {
                        order.shiprocket = shiprocketData;
                    }
                    order.orderStatus = "Confirmed"; // The order is paid and confirmed
                    order.shiprocketStatus = "NEW"; // It's a new order for Shiprocket
                    await order.save();

                    // Send Order Confirmation Email
                    try {
                        const populatedOrder = await orderModel.findById(orderInfo.receipt).populate('userId');
                        if (populatedOrder && populatedOrder.userId && populatedOrder.userId.email) {
                            const { subject, html } = await getOrderConfirmationEmail(populatedOrder);
                            await sendEmail(populatedOrder.userId.email, subject, html);
                        }
                    } catch (emailError) {
                        console.error("Error sending order confirmation email for Razorpay order:", emailError);
                    }
                }

                res.json({ success: true, message: "Payment Successful" });
            } else {
                res.json({ success: false, message: 'Payment Not Completed on Razorpay' });
            }
        } else {
            res.json({ success: false, message: 'Payment Verification Failed' });
        }

    } catch (error) {
        console.error('Order request failed', { name: error?.name, code: error?.code })
        res.json({success:false,message:"Unable to process order. Check your items and payment details."})
    }
}


// Orders created for Razorpay/Stripe are written to the DB before payment is
// confirmed (so the gateway has a receipt to reconcile against). If the user
// abandons the checkout/payment sheet, that record is left behind with
// payment:false — this filter keeps those unpaid attempts out of the visible
// order lists until verifyRazorpay/verifyStripe confirms payment. COD orders
// are unaffected since payment:false is their normal, expected state.
const PLACED_ORDER_FILTER = { $or: [ { paymentMethod: 'COD' }, { payment: true } ] };

// All Orders data for Admin Panel
const allOrders = async (req,res) => {

    try {

        const orders = await orderModel.find({ $or: [PLACED_ORDER_FILTER, { isCancelled: true }, { orderStatus: 'Cancelled' }] })
            .populate('userId', 'name email isLuxeMember') // Populate user name, email and luxe status
            .populate('items.productId', 'name variations'); // Populate product name and variations

        // Keep the admin list in step with the Shiprocket panel — an order
        // shipped there shows as 'Shipped' here without waiting on a webhook.
        // Same throttled+capped sync the storefront uses, so a big order list
        // doesn't turn into a burst of Shiprocket calls.
        await syncOrdersTracking(orders);
        await syncReturnsTracking(orders);
        const exchanges = orders.length ? await exchangeModel.find({ orderId: { $in: orders.map(order => order._id) } }) : [];
        await Promise.all(exchanges.filter(exchange => applyWindowExpiry(exchange)).map(exchange => exchange.save()));
        const [returnSettings, exchangeSettings] = await Promise.all([getReturnSettings(), getExchangeSettings()]);
        const exchangesByOrder = new Map();
        for (const exchange of exchanges) {
            const key = String(exchange.orderId);
            if (!exchangesByOrder.has(key)) exchangesByOrder.set(key, []);
            exchangesByOrder.get(key).push(exchange);
        }
        const trackedOrders = orders.map(order => ({
            ...order.toObject(),
            tracking: buildAdminOrderTracking(order, exchangesByOrder.get(String(order._id)) || [], returnSettings, exchangeSettings),
        }));
        res.json({ success: true, orders: trackedOrders })

    } catch (error) {
        console.error('Order request failed', { name: error?.name, code: error?.code })
        res.json({success:false,message:"Unable to process order. Check your items and payment details."})
    }

}

// User Order Data For Forntend
const userOrders = async (req,res) => {
    try {
        const userId = req.userId; // Get userId from auth middleware
        if (!userId) { // Basic check for safety
            return res.json({ success: false, message: 'User ID not found in token' });
        }
        const orders = await orderModel.find({ userId, ...PLACED_ORDER_FILTER })

        // The order list is the first place a customer looks after being told
        // "your order has shipped", so refresh in-flight shipments here too
        // rather than only on the detail page. Throttled + capped inside the
        // util, and settled/cancelled orders are skipped entirely.
        await syncOrdersTracking(orders);
        // Same treatment for the return leg, so a collected parcel shows as
        // picked up here without waiting on a webhook.
        await syncReturnsTracking(orders);

        // Never serialise a raw order to a customer: refundDetails carries the
        // return journey's internal vocabulary (critical, investigation, lost,
        // claim) which must not exist anywhere in the response, visible or not.
        const settings = await getReturnSettings();
        const customerOrders = sanitizeOrdersForCustomer(orders, settings);
        // Fetch exchanges once for this customer's visible orders so the list
        // can show the same current status as the detail page.
        const exchanges = orders.length ? await exchangeModel.find({ userId, orderId: { $in: orders.map(order => order._id) } }) : [];
        const expired = exchanges.filter(exchange => applyWindowExpiry(exchange));
        await Promise.all(expired.map(exchange => exchange.save()));
        const exchangeSettings = exchanges.length ? await getExchangeSettings() : undefined;
        const exchangesByOrder = new Map();
        for (const exchange of sanitizeExchangesForCustomer(exchanges, exchangeSettings)) {
            const key = String(exchange.orderId);
            if (!exchangesByOrder.has(key)) exchangesByOrder.set(key, []);
            exchangesByOrder.get(key).push(exchange);
        }
        for (const order of customerOrders) order.exchanges = exchangesByOrder.get(String(order._id)) || [];
        res.json({ success: true, orders: customerOrders })

    } catch (error) {
        console.error('Order request failed', { name: error?.name, code: error?.code })
        res.json({success:false,message:"Unable to process order. Check your items and payment details."})
    }
}

// update order status from Admin Panel
const updateStatus = async (req,res) => {
    try {
        
        const { orderId, orderStatus } = req.body
        if (!mongoose.isValidObjectId(orderId) || !orderModel.schema.path('orderStatus').enumValues.includes(orderStatus)) return res.status(400).json({ success: false, message: 'Invalid order or status.' });
        if (orderStatus === 'Cancelled') return cancelAdminOrder(req, res);
        const order = await orderModel.findOneAndUpdate({ _id: orderId, isCancelled: { $ne: true }, 'refundDetails.requestType': { $ne: 'cancellation' }, orderStatus: { $ne: 'Cancelled' } }, { orderStatus }, { runValidators: true });
        if (!order) return res.status(409).json({ success: false, message: 'Cancelled orders cannot be reopened or marked refunded manually.' });
        res.json({success:true,message:'Status Updated'})

    } catch (error) {
        console.error('Order request failed', { name: error?.name, code: error?.code })
        res.json({success:false,message:"Unable to process order. Check your items and payment details."})
    }
}

const getRazorpayKey = (req,res) => {
    res.json({success:true,key:process.env.RAZORPAY_KEY_ID})
}

// Generate Invoice
const generateInvoice = async (req, res) => {
    try {
        const { orderId } = req.params;
        // Populate userId for email and items.productId for product details (especially price)
        const order = await orderModel.findOne({ _id: orderId, userId: req.userId }).populate('userId', 'email isLuxeMember');

        if (!order) {
            return res.json({ success: false, message: 'Order not found.' });
        }

        // Older orders were saved before HSN was snapshotted — fill it from the product
        const missingHsnIds = order.items.filter(i => !i.hsn && i.productId).map(i => i.productId);
        let hsnByProductId = {};
        if (missingHsnIds.length > 0) {
            const products = await productModel.find({ _id: { $in: missingHsnIds } }).select('hsn');
            hsnByProductId = Object.fromEntries(products.map(p => [p._id.toString(), p.hsn]));
        }
        const invoiceOrder = order.toObject();
        invoiceOrder.items = invoiceOrder.items.map(i => ({
            ...i,
            hsn: i.hsn || hsnByProductId[i.productId?.toString()] || ''
        }));

        buildInvoicePDF(invoiceOrder, res);

    } catch (error) {
        console.error("Error in generateInvoice function:", error); // More specific error log
        res.json({ success: false, message: 'Error generating invoice' });
    }
};

const getOrderById = async (req, res) => {
    try {
        const order = await orderModel.findOne({ _id: req.params.id, userId: req.userId }).populate('userId', 'name email'); // Populate userId
        if (!order) {
            return res.json({ success: false, message: 'Order not found' });
        }

        // Re-read the shipment from Shiprocket (throttled inside the util) so
        // an admin clicking "Ship Now" in the Shiprocket panel is reflected
        // here even when no webhook was delivered for it.
        // `?refresh=1` forces the poll, bypassing the staleness window.
        const forceRefresh = req.query.refresh === '1';
        const { trackingData } = await syncOrderTracking(order, { force: forceRefresh });
        // The return leg gets the same treatment — this is the page a customer
        // sits on waiting for "picked up" to appear.
        await syncReturnTracking(order, { force: forceRefresh });

        // Sanitized: refundDetails.returnTracking is dropped entirely and
        // replaced with a customer-safe `returnStatus`, so internal statuses
        // can't surface in view-source even where the UI never renders them.
        const settings = await getReturnSettings();
        const sanitizedOrder = sanitizeOrderForCustomer(order, settings);

        // Exchanges are per line-item (unlike the whole-order return above), so
        // they're attached as an array rather than a single object.
        const exchanges = await exchangeModel.find({ orderId: order._id, userId: order.userId._id || order.userId });
        let anyExpired = false;
        for (const exchange of exchanges) {
            if (applyWindowExpiry(exchange)) anyExpired = true;
        }
        if (anyExpired) await Promise.all(exchanges.filter(e => e.isModified()).map(e => e.save()));
        const exchangeSettings = await getExchangeSettings();
        sanitizedOrder.exchanges = sanitizeExchangesForCustomer(exchanges, exchangeSettings);

        res.json({
            success: true,
            order: sanitizedOrder,
            trackingData: trackingData ? { tracking_data: trackingData } : null
        });
    } catch (error) {
        console.error('Order request failed', { name: error?.name, code: error?.code });
        res.json({ success: false, message: 'Error fetching order' });
    }
};


export {verifyRazorpay, verifyStripe ,placeOrder, placeOrderStripe, placeOrderRazorpay, allOrders, userOrders, updateStatus, getRazorpayKey, generateInvoice, getOrderById, cancelOrder}
