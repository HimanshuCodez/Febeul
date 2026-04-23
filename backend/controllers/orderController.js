import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import Stripe from 'stripe'
import razorpay from 'razorpay'
import { shiprocketLogin, createShiprocketOrder } from '../utils/shiprocket.js';
import crypto from 'crypto'
import { buildInvoicePDF } from '../templates/invoiceGenerator.js'; // New import for PDF generation logic
import { sendEmail } from '../utils/sendEmail.js'; // New import for email utility
import fs from 'fs'; // For reading email template
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';
import productModel from "../models/productModel.js";
import couponModel from "../models/couponModel.js"; // Import couponModel
import counterModel from "../models/counterModel.js"; // Import counterModel

// Define pricing constants
const SHIPPING_CHARGE_THRESHOLD = 499;
const DEFAULT_SHIPPING_CHARGE = 50;
const COD_CHARGE_AMOUNT = 50; // This will act as the COD fee / base shipping for non-luxe below threshold

// Re-define __dirname in this context for template path resolution
const __filenameController = fileURLToPath(import.meta.url);
const __dirnameController = dirname(__filenameController);

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
const calculateOrderPricing = async (userId, items, paymentMethod, giftWrapData, couponDiscount = 0, userState = 'Delhi', couponCode) => {
    let productAmount = 0;
    let totalItemDiscount = 0;

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
                productId: "60d5ecb8b3b1c8e1e8e8e8e8", // Dummy valid ObjectId for membership
                quantity: item.quantity,
                name: item.name,
                image: "https://res.cloudinary.com/dv5p6v6jx/image/upload/v1715414841/membership_icon.png", // Default image or handle in frontend
                price: mPrice,
                sku: "LUXE-MEMBERSHIP",
                discountAmount: 0
            };
        }

        const product = await productModel.findById(item.productId);
        if (!product) {
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
        totalItemDiscount += (item.discountAmount || 0);

        return { 
            productId: item.productId,
            quantity: item.quantity,
            size: item.size,
            name: product.name,
            image: product.variations.find(v => v.color === item.color)?.images[0] || '',
            price: itemPrice,
            color: item.color,
            sku: product.variations.find(v => v.color === item.color)?.sku || '',
            discountAmount: item.discountAmount || 0,
            appliedCoupon: item.appliedCoupon || null
        };
    }));

    let giftWrapPrice = giftWrapData ? parseFloat(giftWrapData.price || 0) : 0;

    let shippingCharge = 0;
    let codCharge = 0; 
    
    // Determine COD charge based on paymentMethod
    if (paymentMethod === 'COD') {
        codCharge = siteSettings.codCharge || 50;
    }
    const user = await userModel.findById(userId); // Fetch user to check luxe status
    const isLuxeMember = user?.isLuxeMember || false;

    if (isLuxeMember && giftWrapData) { // If user is luxe and gift wrap is requested
        giftWrapPrice = 0; // Luxe members get gift wrap for free
    }

    // Calculate coupon offer type if couponCode is provided
    let couponOfferType = 'none';
    if (couponCode) {
        const coupon = await couponModel.findOne({ code: couponCode.toUpperCase() });
        if (coupon) {
            couponOfferType = coupon.offerType || 'none';
        }
    }

    // Calculate shipping charge based on frontend logic
    // Calculate shipping based on discounted total
    const discountedProductAmount = productAmount - totalItemDiscount;

    const isMembershipOrder = items.every(item => item.name === "Febeul Luxe Membership");

    if (!isMembershipOrder && paymentMethod !== 'COD' && !isLuxeMember && discountedProductAmount < (siteSettings.shippingThreshold || 499)) {
        shippingCharge = siteSettings.defaultShippingCharge || 50;
    }
    
    if (isMembershipOrder) {
        shippingCharge = 0;
        codCharge = 0;
    }
    
    // Calculate subtotal for GST (discountedProductAmount - couponDiscount)
    const discountedAmount = discountedProductAmount - couponDiscount;
    
    // Extract GST from the inclusive amount (5% GST)
    // Formula: Base = Inclusive / 1.05
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

    // Recalculate orderTotal - GST is already included in the product prices
    const totalCombinedDiscount = totalItemDiscount + couponDiscount;
    const orderTotal = (productAmount - totalCombinedDiscount) + shippingCharge + codCharge + giftWrapPrice;

    return { productAmount, shippingCharge, codCharge, orderTotal, processedItems, isLuxeMember, totalCombinedDiscount, taxableValue, cgstAmount, sgstAmount, igstAmount, isDelhi, couponOfferType };
};

const constructEmailHtml = (order, templateHtml) => {
    // Dynamically generate item rows
    let itemRowsHtml = '';
    order.items.forEach(item => {
        const itemPrice = parseFloat(item.price || 0); 
        const itemQuantity = parseFloat(item.quantity || 0);
        const itemTotal = parseFloat(itemPrice * itemQuantity || 0);
        
        // Taxable calculation matching invoiceGenerator.js: Base = Inclusive / 1.05
        const itemTaxable = itemTotal / 1.05;

        itemRowsHtml += `
            <tr style="border-bottom: 1px solid #eeeeee;">
                <td style="padding: 12px 8px; vertical-align: top;">
                    <div style="font-weight: 600; color: #333333;">${item.name}</div>
                    ${item.sku ? `<div style="font-size: 11px; color: #666666; margin-top: 4px;">SKU: ${item.sku}</div>` : ''}
                </td>
                <td style="padding: 12px 8px; text-align: center; vertical-align: top; color: #666666;">${itemQuantity}</td>
                <td style="padding: 12px 8px; text-align: right; vertical-align: top; color: #666666;">₹${itemPrice.toFixed(2)}</td>
                <td style="padding: 12px 8px; text-align: right; vertical-align: top; color: #666666;">₹${itemTaxable.toFixed(2)}</td>
                <td style="padding: 12px 8px; text-align: right; vertical-align: top; font-weight: 600; color: #333333;">₹${itemTotal.toFixed(2)}</td>
            </tr>
        `;
    });

    const emailShippingCharge = parseFloat(order.shippingCharge || 0);
    const emailCodCharge = parseFloat(order.codCharge || 0);
    const emailGiftWrapPrice = parseFloat(order.giftWrap && order.giftWrap.price || 0);
    const emailProductAmount = parseFloat(order.productAmount || 0);
    const emailCouponDiscount = parseFloat(order.couponDiscount || 0);
    const emailOrderTotal = parseFloat(order.orderTotal || 0);
    const emailDiscountedAmount = emailProductAmount - emailCouponDiscount;
    
    // Use stored GST values from order
    const emailTaxableValue = parseFloat(order.taxableValue || 0);
    const emailCgst = parseFloat(order.cgstAmount || 0);
    const emailSgst = parseFloat(order.sgstAmount || 0);
    const emailIgst = parseFloat(order.igstAmount || 0);

    let gstRowsHtml = '';
    if (emailIgst > 0) {
        gstRowsHtml = `
            <tr>
                <td style="text-align: right; font-weight: bold; color: #333333; padding: 5px 10px; font-size: 11px;">IGST (5%):</td>
                <td style="text-align: right; color: #333333; padding: 5px 10px; font-size: 11px;">₹${emailIgst.toFixed(2)}</td>
            </tr>
        `;
    } else {
        gstRowsHtml = `
            <tr>
                <td style="text-align: right; font-weight: bold; color: #333333; padding: 5px 10px; font-size: 11px;">CGST (2.5%):</td>
                <td style="text-align: right; color: #333333; padding: 5px 10px; font-size: 11px;">₹${emailCgst.toFixed(2)}</td>
            </tr>
            <tr>
                <td style="text-align: right; font-weight: bold; color: #333333; padding: 5px 10px; font-size: 11px;">SGST (2.5%):</td>
                <td style="text-align: right; color: #333333; padding: 5px 10px; font-size: 11px;">₹${emailSgst.toFixed(2)}</td>
            </tr>
        `;
    }

    let giftWrapRowHtml = '';
    if (emailGiftWrapPrice > 0) {
        giftWrapRowHtml = `
            <tr>
                <td style="text-align: right; font-weight: bold; color: #333333; padding: 5px 10px; font-size: 11px;">Gift Wrap:</td>
                <td style="text-align: right; color: #333333; padding: 5px 10px; font-size: 11px;">₹${emailGiftWrapPrice.toFixed(2)}</td>
            </tr>
        `;
    }

    let codChargeRowHtml = '';
    if (emailCodCharge > 0) {
        codChargeRowHtml = `
            <tr>
                <td style="text-align: right; font-weight: bold; color: #333333; padding: 5px 10px; font-size: 11px;">COD Charges:</td>
                <td style="text-align: right; color: #333333; padding: 5px 10px; font-size: 11px;">₹${emailCodCharge.toFixed(2)}</td>
            </tr>
        `;
    }
    
    let couponDiscountRowHtml = '';
    if (emailCouponDiscount > 0) {
        couponDiscountRowHtml = `
            <tr>
                <td style="text-align: right; font-weight: bold; color: #155724; padding: 5px 10px; font-size: 11px;">Coupon Discount:</td>
                <td style="text-align: right; color: #155724; font-weight: bold; padding: 5px 10px; font-size: 11px;">- ₹${emailCouponDiscount.toFixed(2)}</td>
            </tr>
        `;
        if (order.couponOfferType && order.couponOfferType !== 'none') {
            const offerLabel = order.couponOfferType === 'prepaid' ? 'Prepaid Offer' : 'COD Offer';
            couponDiscountRowHtml += `
                <tr>
                    <td style="text-align: right; font-weight: bold; color: #155724; padding: 5px 10px; font-size: 10px;">(Applied ${offerLabel})</td>
                    <td></td>
                </tr>
            `;
        }
    }

    // Populate template placeholders
    let populatedHtml = templateHtml;
    populatedHtml = populatedHtml.replace('{{userName}}', order.userId.name || 'Customer');
    populatedHtml = populatedHtml.replace('{{orderId}}', order._id.toString());
    const sequentialInvoice = order.invoiceNumber ? order.invoiceNumber.toString().padStart(4, '0') : order._id.toString().slice(-8).toUpperCase();
    populatedHtml = populatedHtml.replace('{{invoiceNumber}}', `INV-${sequentialInvoice}`);
    populatedHtml = populatedHtml.replace('{{invoiceDate}}', new Date(order.date).toLocaleDateString());
    populatedHtml = populatedHtml.replace('{{orderDate}}', new Date(order.date).toLocaleDateString());
    populatedHtml = populatedHtml.replace('{{totalAmount}}', emailOrderTotal.toFixed(2));
    populatedHtml = populatedHtml.replace('{{itemRows}}', itemRowsHtml);
    populatedHtml = populatedHtml.replace('{{subtotal}}', emailProductAmount.toFixed(2));
    populatedHtml = populatedHtml.replace('{{shipping}}', emailShippingCharge > 0 ? `₹${emailShippingCharge.toFixed(2)}` : 'FREE');
    populatedHtml = populatedHtml.replace('{{codChargeRow}}', codChargeRowHtml);
    populatedHtml = populatedHtml.replace('{{giftWrapRow}}', giftWrapRowHtml);
    populatedHtml = populatedHtml.replace('{{gstRows}}', gstRowsHtml);
    populatedHtml = populatedHtml.replace('{{couponDiscountRow}}', couponDiscountRowHtml);
    populatedHtml = populatedHtml.replace('{{shippingAddressName}}', order.address.name);
    populatedHtml = populatedHtml.replace('{{shippingAddressAddress}}', order.address.address);
    populatedHtml = populatedHtml.replace('{{shippingAddressCity}}', order.address.city);
    populatedHtml = populatedHtml.replace('{{shippingAddressZip}}', order.address.zip);
    populatedHtml = populatedHtml.replace('{{shippingAddressCountry}}', order.address.country);
    populatedHtml = populatedHtml.replace('{{shippingAddressPhone}}', order.address.phone);
    populatedHtml = populatedHtml.replace('{{billingAddressName}}', order.address.name);
    populatedHtml = populatedHtml.replace('{{billingAddressAddress}}', order.address.address);
    populatedHtml = populatedHtml.replace('{{billingAddressCity}}', order.address.city);
    populatedHtml = populatedHtml.replace('{{billingAddressZip}}', order.address.zip);
    populatedHtml = populatedHtml.replace('{{billingAddressCountry}}', order.address.country);
    populatedHtml = populatedHtml.replace('{{paymentMethod}}', order.paymentMethod);
    populatedHtml = populatedHtml.replace('{{paymentStatus}}', order.payment ? 'Paid' : 'Pending');
    populatedHtml = populatedHtml.replace('{{paymentStatusClass}}', order.payment ? 'paid' : 'pending');
    populatedHtml = populatedHtml.replace('{{orderTrackingLink}}', `https://febeul.onrender.com/track/${order._id}`);
    populatedHtml = populatedHtml.replace('{{currentYear}}', new Date().getFullYear());

    return populatedHtml;
};

// Placing orders using COD Method
const placeOrder = async (req,res) => {
    
    try {
        
        const { userId, items, address, giftWrap: giftWrapData, couponCode, couponDiscount } = req.body;

        const { productAmount, shippingCharge, codCharge, orderTotal, processedItems, isLuxeMember, totalCombinedDiscount, taxableValue, cgstAmount, sgstAmount, igstAmount, couponOfferType } = await calculateOrderPricing(userId, items, 'COD', giftWrapData, couponDiscount, address.state, couponCode);

        const invoiceNumber = await getNextInvoiceNumber();

        const orderData = {
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
            couponCode,
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

        // Update coupon usage
        if (couponCode) {
            await couponModel.updateOne(
                { code: couponCode },
                { 
                    $inc: { usageCount: 1 },
                    $push: { usersWhoUsed: { userId } }
                }
            );
        }

        const order = await orderModel.findById(newOrder._id).populate('userId');

        // Shiprocket integration
        try {
            const shiprocketToken = await shiprocketLogin();
            const shiprocketOrderData = {
                _id: order._id,
                shippingAddress: { // Ensure this matches Shiprocket's expected structure
                    name: order.address.name.split(' ')[0] || '', // First name
                    lastName: order.address.name.split(' ').slice(1).join(' ') || '', // Last name
                    address: order.address.address,
                    city: order.address.city,
                    pincode: order.address.zip, // Use zip from frontend
                    state: order.address.state,
                    country: "India",
                    phone: order.address.phone,
                    email: order.userId.email // Assuming userId is populated and has email
                },
                user: order.userId,
                items: order.items,
                totalPrice: order.productAmount,
            };
            const shiprocketResponse = await createShiprocketOrder(shiprocketOrderData, shiprocketToken, "COD");

            order.shiprocket = {
                ourOrderId: order._id.toString(),
                srOrderId: shiprocketResponse.order_id,
                shipmentId: shiprocketResponse.shipment_id,
                awb: shiprocketResponse.awb_code,
                courier: shiprocketResponse.courier_name,
                trackingUrl: `https://shiprocket.co/tracking/${shiprocketResponse.awb_code}`
            };
            order.orderStatus = "Processing";
            order.shiprocketStatus = "NEW";
            await order.save();

        } catch (error) {
            console.log("Error with Shiprocket:", error.message);
            // If shiprocket fails, the order is still placed, but not shipped.
        }

        res.json({success:true,message:"Order Placed", order: newOrder})

        // Send Order Confirmation Email
        try {
            const populatedOrder = await orderModel.findById(newOrder._id).populate('userId').populate('items.productId', 'price');
            if (populatedOrder && populatedOrder.userId && populatedOrder.userId.email) {
                const templatePath = path.resolve(__dirnameController, '../templates/orderConfirmationEmail.html');
                let emailTemplate = fs.readFileSync(templatePath, 'utf8');
                const htmlContent = constructEmailHtml(populatedOrder, emailTemplate);
                await sendEmail(populatedOrder.userId.email, `Febeul Order Confirmed - #${populatedOrder._id.toString().slice(-8).toUpperCase()}`, htmlContent);
            }
        } catch (emailError) {
            console.error("Error sending order confirmation email for COD order:", emailError);
        }


    } catch (error) {
        console.log(error)
        res.json({success:false,message:error.message})
    }

}

// Placing orders using Stripe Method
const placeOrderStripe = async (req,res) => {
    try {
        
        const { userId, items, address, currency, giftWrap: giftWrapData, couponDiscount, couponCode } = req.body;
        const { origin } = req.headers;

        const { productAmount, shippingCharge, codCharge, orderTotal, processedItems, isLuxeMember, taxableValue, cgstAmount, sgstAmount, igstAmount, couponOfferType } = await calculateOrderPricing(userId, items, 'Stripe', giftWrapData, couponDiscount, address.state, couponCode);

        const invoiceNumber = await getNextInvoiceNumber();

        const orderData = {
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
            couponCode,
            couponOfferType,
            couponDiscount,
            invoiceNumber,
            taxableValue,
            cgstAmount,
            sgstAmount,
            igstAmount
        }

        const newOrder = new orderModel(orderData)
        await newOrder.save()

        const line_items = processedItems.map((item) => ({
            price_data: {
                currency:currency,
                product_data: {
                    name:item.name
                },
                unit_amount: Math.round(item.price * 100)
            },
            quantity: item.quantity
        }));

        // Add shipping charge to line_items if applicable
        if (shippingCharge > 0) {
            line_items.push({
                price_data: {
                    currency:currency,
                    product_data: {
                        name:'Shipping Charge'
                    },
                    unit_amount: Math.round(shippingCharge * 100)
                },
                quantity: 1
            });
        }

        // Add gift wrap charge to line_items if applicable
        if (giftWrapData && giftWrapData.price > 0) {
            line_items.push({
                price_data: {
                    currency: currency,
                    product_data: {
                        name: 'Gift Wrap'
                    },
                    unit_amount: Math.round(giftWrapData.price * 100)
                },
                quantity: 1
            });
        }

        const session = await stripe.checkout.sessions.create({
            success_url: `${origin}/verify?success=true&orderId=${newOrder._id}`,
            cancel_url:  `${origin}/verify?success=false&orderId=${newOrder._id}`,
            line_items,
            mode: 'payment',
        })

        if (req.body.couponCode) {
            await couponModel.updateOne(
                { code: req.body.couponCode },
                { 
                    $inc: { usageCount: 1 },
                    $push: { usersWhoUsed: { userId } }
                }
            );
        }

        res.json({success:true,session_url:session.url});
    } catch (error) {
        console.log(error)
        res.json({success:false,message:error.message})
    }
}

// Verify Stripe 
const verifyStripe = async (req,res) => {

    const { orderId, success, userId } = req.body

    try {
        if (success === "true") {
            // Retrieve the order to get full details before updating
            const order = await orderModel.findById(orderId).populate('userId');
            if (!order) {
                return res.json({ success: false, message: "Order not found" });
            }

            // Update order with payment success and confirmed status
            await orderModel.findByIdAndUpdate(orderId, {
                payment: true,
                // Assuming paymentDetails might contain stripe's charge ID or equivalent if needed
                orderStatus: 'Confirmed' 
            });
            // Re-fetch the updated order for further processing
            const updatedOrder = await orderModel.findById(orderId).populate('userId');

            await userModel.findByIdAndUpdate(userId, { cartData: [] });

            // Decrease stock
            await decreaseStock(updatedOrder.items);

            // Decrement giftWrapsLeft if Luxe member used a gift wrap
            if (updatedOrder.isLuxeMemberAtTimeOfOrder && updatedOrder.giftWrap) {
                await userModel.findByIdAndUpdate(userId, { $inc: { giftWrapsLeft: -1 } });
            }

            // Shiprocket integration
            try {
                const shiprocketToken = await shiprocketLogin();
                const shiprocketOrderData = {
                    _id: updatedOrder._id,
                    shippingAddress: { // Ensure this matches Shiprocket's expected structure
                        name: updatedOrder.address.name.split(' ')[0] || '', // First name
                        lastName: updatedOrder.address.name.split(' ').slice(1).join(' ') || '', // Last name
                        address: updatedOrder.address.address,
                        city: updatedOrder.address.city,
                        pincode: updatedOrder.address.zip, // Use zip from frontend
                        state: updatedOrder.address.state,
                        country: "India",
                        phone: updatedOrder.address.phone,
                        email: updatedOrder.userId.email
                    },
                    user: updatedOrder.userId,
                    items: updatedOrder.items,
                    totalPrice: updatedOrder.productAmount, // Use productAmount for subtotal
                    shippingCharge: updatedOrder.shippingCharge,
                    codCharge: updatedOrder.codCharge
                };
                const shiprocketResponse = await createShiprocketOrder(shiprocketOrderData, shiprocketToken, "Prepaid");

                updatedOrder.shiprocket = {
                    ourOrderId: updatedOrder._id.toString(),
                    srOrderId: shiprocketResponse.order_id,
                    shipmentId: shiprocketResponse.shipment_id,
                    awb: shiprocketResponse.awb_code,
                    courier: shiprocketResponse.courier_name,
                    trackingUrl: `https://shiprocket.co/tracking/${shiprocketResponse.awb_code}`
                };
                updatedOrder.orderStatus = "Confirmed"; // The order is paid and confirmed
                updatedOrder.shiprocketStatus = "NEW"; // It's a new order for Shiprocket
                updatedOrder.shippedAt = new Date(); // Set shippedAt timestamp
                await updatedOrder.save(); // Save after all updates
            } catch (error) {
                console.log("Error with Shiprocket:", error.message);
                // If shiprocket fails, update order status accordingly but don't fail the entire payment verification
                await orderModel.findByIdAndUpdate(orderId, { orderStatus: 'Confirmed', shiprocketStatus: 'NEW' }); // Keep Confirmed status if Shiprocket fails
            }

            res.json({success: true});

            // Send Order Confirmation Email
            try {
                const populatedOrder = await orderModel.findById(orderId).populate('userId');
                if (populatedOrder && populatedOrder.userId && populatedOrder.userId.email) {
                    const templatePath = path.resolve(__dirnameController, '../templates/orderConfirmationEmail.html');
                    let emailTemplate = fs.readFileSync(templatePath, 'utf8');
                    const htmlContent = constructEmailHtml(populatedOrder, emailTemplate);
                    await sendEmail(populatedOrder.userId.email, `Febeul Order Confirmed - #${populatedOrder._id.toString().slice(-8).toUpperCase()}`, htmlContent);
                }
            } catch (emailError) {
                console.error("Error sending order confirmation email for Stripe order:", emailError);
            }

        } else {
            await orderModel.findByIdAndDelete(orderId)
            res.json({success:false})
        }
        
    } catch (error) {
        console.log(error)
        res.json({success:false,message:error.message})
    }

}

// Placing orders using Razorpay Method
const placeOrderRazorpay = async (req,res) => {
    try {
        
        const { userId, items, address, currency = "INR", giftWrap: giftWrapData, couponCode, couponDiscount } = req.body;

        const { productAmount, shippingCharge, codCharge, orderTotal, processedItems, isLuxeMember, totalCombinedDiscount, taxableValue, cgstAmount, sgstAmount, igstAmount, couponOfferType } = await calculateOrderPricing(userId, items, 'Razorpay', giftWrapData, couponDiscount, address.state, couponCode);

        const invoiceNumber = await getNextInvoiceNumber();

        const orderData = {
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
            couponCode,
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

        if (couponCode) {
            await couponModel.updateOne(
                { code: couponCode },
                { 
                    $inc: { usageCount: 1 },
                    $push: { usersWhoUsed: { userId } }
                }
            );
        }

        const options = {
            amount: Math.round(orderTotal * 100), // Use calculated orderTotal
            currency: currency.toUpperCase(),
            receipt : newOrder._id.toString()
        }

        await razorpayInstance.orders.create(options, (error,order)=>{
            if (error) {
                console.log(error)
                return res.json({success:false, message: error})
            }
            res.json({success:true,order})
        })

    } catch (error) {
        console.log(error)
        res.json({success:false,message:error.message})
    }
}

const verifyRazorpay = async (req,res) => {
    try {
        
        const { userId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body

        const body = razorpay_order_id + "|" + razorpay_payment_id;

        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        if (expectedSignature === razorpay_signature) {
            const orderInfo = await razorpayInstance.orders.fetch(razorpay_order_id);
            if (orderInfo.status === 'paid') {
                await orderModel.findByIdAndUpdate(orderInfo.receipt, { 
                    payment: true, 
                    paymentDetails: { razorpay_order_id, razorpay_payment_id, razorpay_signature },
                    razorpayPaymentId: razorpay_payment_id, // Store Razorpay Payment ID
                    orderStatus: 'Confirmed' // Update status to Confirmed after successful payment
                });
                
                const order = await orderModel.findById(orderInfo.receipt).populate('userId');

                // Check if this is a luxe membership purchase
                const isLuxeOrder = order.items.some(item => item.name === "Febeul Luxe Membership");

                if (isLuxeOrder) {
                    const expiryDate = new Date();
                    expiryDate.setMonth(expiryDate.getMonth() + 1);
                    await userModel.findByIdAndUpdate(userId, {
                        isLuxeMember: true,
                        luxeMembershipExpires: expiryDate,
                        giftWrapsLeft: 15, // Initialize gift wraps
                        cartData: [] 
                    });
                } else {
                    await userModel.findByIdAndUpdate(userId, { cartData: [] });

                    // Decrease stock
                    await decreaseStock(order.items);

                    // Decrement giftWrapsLeft if Luxe member used a gift wrap on a non-luxe order
                    if (order.isLuxeMemberAtTimeOfOrder && order.giftWrap) {
                        await userModel.findByIdAndUpdate(userId, { $inc: { giftWrapsLeft: -1 } });
                    }

                    // Shiprocket integration
                    try {
                        const shiprocketToken = await shiprocketLogin();
                        const shiprocketOrderData = {
                            _id: order._id,
                            shippingAddress: { // Ensure this matches Shiprocket's expected structure
                                name: order.address.name.split(' ')[0] || '', // First name
                                lastName: order.address.name.split(' ').slice(1).join(' ') || '', // Last name
                                address: order.address.address,
                                city: order.address.city,
                                pincode: order.address.zip, // Use zip from frontend
                                state: order.address.state,
                                country: "India",
                                phone: order.address.phone,
                                email: order.userId.email // Assuming userId is populated and has email
                            },
                            user: order.userId,
                            items: order.items,
                            totalPrice: order.productAmount, // Use productAmount for subtotal
                            shippingCharge: order.shippingCharge, // Pass shippingCharge to shiprocket
                            codCharge: order.codCharge // Pass codCharge to shiprocket
                        };
                        const shiprocketResponse = await createShiprocketOrder(shiprocketOrderData, shiprocketToken, "Prepaid");

                        order.shiprocket = {
                            ourOrderId: order._id.toString(),
                            srOrderId: shiprocketResponse.order_id,
                            shipmentId: shiprocketResponse.shipment_id,
                            awb: shiprocketResponse.awb_code,
                            courier: shiprocketResponse.courier_name,
                            trackingUrl: `https://shiprocket.co/tracking/${shiprocketResponse.awb_code}`
                        };
                                                order.orderStatus = "Confirmed"; // The order is paid and confirmed
                                                order.shiprocketStatus = "NEW"; // It's a new order for Shiprocket
                                                order.shippedAt = new Date(); // Set shippedAt timestamp
                                                await order.save();
                    } catch (error) {
                        console.log("Error with Shiprocket:", error.message);
                        // If shiprocket fails, the order is still placed, but not shipped.
                        // You might want to add more robust error handling here, like a retry mechanism.
                    }

                    // Send Order Confirmation Email
                    try {
                        const populatedOrder = await orderModel.findById(orderInfo.receipt).populate('userId');
                        if (populatedOrder && populatedOrder.userId && populatedOrder.userId.email) {
                            const templatePath = path.resolve(__dirnameController, '../templates/orderConfirmationEmail.html');
                            let emailTemplate = fs.readFileSync(templatePath, 'utf8');
                            const htmlContent = constructEmailHtml(populatedOrder, emailTemplate);
                            await sendEmail(populatedOrder.userId.email, `Febeul Order Confirmed - #${populatedOrder._id.toString().slice(-8).toUpperCase()}`, htmlContent);
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
        console.log(error)
        res.json({success:false,message:error.message})
    }
}


// All Orders data for Admin Panel
const allOrders = async (req,res) => {

    try {
        
        const orders = await orderModel.find({})
            .populate('userId', 'name email isLuxeMember') // Populate user name, email and luxe status
            .populate('items.productId', 'name variations'); // Populate product name and variations

        res.json({success:true,orders})

    } catch (error) {
        console.log(error)
        res.json({success:false,message:error.message})
    }

}

// User Order Data For Forntend
const userOrders = async (req,res) => {
    try {
        const userId = req.userId; // Get userId from auth middleware
        if (!userId) { // Basic check for safety
            return res.json({ success: false, message: 'User ID not found in token' });
        }
        const orders = await orderModel.find({ userId })
        res.json({success:true,orders})

    } catch (error) {
        console.log(error)
        res.json({success:false,message:error.message})
    }
}

// update order status from Admin Panel
const updateStatus = async (req,res) => {
    try {
        
        const { orderId, orderStatus } = req.body

        await orderModel.findByIdAndUpdate(orderId, { orderStatus })
        res.json({success:true,message:'Status Updated'})

    } catch (error) {
        console.log(error)
        res.json({success:false,message:error.message})
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
        const order = await orderModel.findById(orderId).populate('userId', 'email isLuxeMember');

        if (!order) {
            return res.json({ success: false, message: 'Order not found.' });
        }

        buildInvoicePDF(order, res);

    } catch (error) {
        console.error("Error in generateInvoice function:", error); // More specific error log
        res.json({ success: false, message: 'Error generating invoice' });
    }
};

const getOrderById = async (req, res) => {
    try {
        const order = await orderModel.findById(req.params.id).populate('userId', 'name email'); // Populate userId
        if (!order) {
            return res.json({ success: false, message: 'Order not found' });
        }
        res.json({ success: true, order });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: 'Error fetching order' });
    }
};

export {verifyRazorpay, verifyStripe ,placeOrder, placeOrderStripe, placeOrderRazorpay, allOrders, userOrders, updateStatus, getRazorpayKey, generateInvoice, getOrderById}