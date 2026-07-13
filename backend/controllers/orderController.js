import mongoose from 'mongoose';
import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import Stripe from 'stripe'
import razorpay from 'razorpay'
import { shiprocketLogin, createShiprocketOrder, trackShipment, assignShiprocketAwb } from '../utils/shiprocket.js';
import crypto from 'crypto'
import { buildInvoicePDF } from '../templates/invoiceGenerator.js'; // New import for PDF generation logic
import { sendEmail } from '../utils/sendEmail.js'; // New import for email utility
import { luxeEmailTemplate } from '../templates/luxemail.js'; // Import luxeEmailTemplate
import fs from 'fs'; // For reading email template
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';
import productModel from "../models/productModel.js";
import couponModel from "../models/couponModel.js"; // Import couponModel
import counterModel from "../models/counterModel.js"; // Import counterModel
import giftWrapModel from "../models/giftWrapModel.js"; // Import giftWrapModel

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
    
    if (paymentMethod === 'COD') {
        codCharge = siteSettings.codCharge || 50;
    }
    const user = await userModel.findById(userId); 
    const isLuxeMember = user?.isLuxeMember || false;
    const giftWrapsLeft = user?.giftWrapsLeft || 0;

    if (isLuxeMember && giftWrapData && giftWrapsLeft > 0) { 
        giftWrapPrice = 0; 
    }

    // Calculate coupon discount securely on the backend
    let couponDiscount = 0;
    let couponOfferType = 'none';

    if (couponCode) {
        const coupon = await couponModel.findOne({ code: couponCode.toUpperCase() });
        if (!coupon || !coupon.isActive || new Date(coupon.expiryDate) <= new Date()) {
            throw new Error('The coupon code provided is invalid or has expired.');
        }

        // Validate Payment Method Restriction
        if (coupon.offerType === 'prepaid' && paymentMethod === 'COD') {
            throw new Error('This coupon is only valid for prepaid orders.');
        }
        if (coupon.offerType === 'cod' && paymentMethod !== 'COD') {
            throw new Error('This coupon is only valid for Cash on Delivery orders.');
        }

        couponOfferType = coupon.offerType || 'none';
        let applicableTotal = 0;
        let currentQuantity = 0;
        const cartTotal = processedItems.reduce((total, item) => total + (item.price * item.quantity), 0);

        if (coupon.applicableSKUs && coupon.applicableSKUs.length > 0) {
            const applicableItems = processedItems.filter(item => coupon.applicableSKUs.includes(item.sku));
            if (applicableItems.length === 0) {
                throw new Error('This coupon is not applicable to any items in your cart.');
            }
            applicableTotal = applicableItems.reduce((total, item) => total + (item.price * item.quantity), 0);
            currentQuantity = applicableItems.reduce((total, item) => total + item.quantity, 0);
        } else {
            applicableTotal = cartTotal;
            currentQuantity = processedItems.reduce((total, item) => total + item.quantity, 0);
        }

        // Verify conditions
        if (applicableTotal < coupon.minOrderAmount) {
            throw new Error(`A minimum of ₹${coupon.minOrderAmount} worth of applicable items is required for this coupon.`);
        }
        if (coupon.minQuantity && currentQuantity < coupon.minQuantity) {
            throw new Error(`A minimum of ${coupon.minQuantity} applicable items is required for this coupon.`);
        }

        if (coupon.discountType === 'percentage') {
            couponDiscount = (applicableTotal * coupon.discountValue) / 100;
        } else {
            couponDiscount = coupon.discountValue;
        }
        couponDiscount = Math.min(couponDiscount, applicableTotal);
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

    return { productAmount, shippingCharge, codCharge, orderTotal, processedItems, isLuxeMember, totalCombinedDiscount, taxableValue, cgstAmount, sgstAmount, igstAmount, isDelhi, couponOfferType, couponDiscount };
};

const constructEmailHtml = (order, templateHtml) => {
    // Calculate global subtotal for pro-rating
    const subtotalBeforeCoupon = order.items.reduce((sum, i) => sum + (parseFloat(i.price) * parseFloat(i.quantity)), 0);
    const couponDiscount = parseFloat(order.couponDiscount || 0);

    // Dynamically generate item rows
    let itemRowsHtml = '';
    order.items.forEach(item => {
        const itemPrice = parseFloat(item.price || 0);
        const itemQuantity = parseFloat(item.quantity || 0);
        const itemGross = itemPrice * itemQuantity;

        // Pro-rate the coupon discount for consistent net reporting per item
        const itemProportion = subtotalBeforeCoupon > 0 ? (itemGross / subtotalBeforeCoupon) : 0;
        const itemCouponDiscount = itemProportion * couponDiscount;
        const netTotal = itemGross - itemCouponDiscount - (parseFloat(item.discountAmount || 0));

        itemRowsHtml += `
            <tr>
                <td style="padding: 20px 0; border-bottom: 1px solid #f5f5f5;">
                    <div style="font-size: 14px; font-weight: 600; color: #333333;">${item.name}</div>
                    ${item.sku ? `<div style="font-size: 11px; color: #999999; margin-top: 4px;">SKU: ${item.sku}</div>` : ''}
                </td>
                <td align="center" style="padding: 20px 0; border-bottom: 1px solid #f5f5f5; font-size: 14px; color: #666666;">${itemQuantity}</td>
                <td align="right" style="padding: 20px 0; border-bottom: 1px solid #f5f5f5; font-size: 14px; font-weight: 700; color: #333333;">₹${netTotal.toFixed(2)}</td>
            </tr>
        `;
    });

    const emailShippingCharge = parseFloat(order.shippingCharge || 0);
    const emailCodCharge = parseFloat(order.codCharge || 0);
    const emailGiftWrapPrice = parseFloat(order.giftWrap && order.giftWrap.price || 0);
    const emailProductAmount = parseFloat(order.productAmount || 0);
    const emailOrderTotal = parseFloat(order.orderTotal || 0);

    // Tax calculation following Indian Composite Supply rules (consistent with invoiceGenerator.js)
    const netProductValue = subtotalBeforeCoupon - couponDiscount;
    const ancillaryCharges = emailShippingCharge + emailCodCharge + emailGiftWrapPrice;
    const totalInclusiveAmount = netProductValue + ancillaryCharges;

    // Use a fixed 5% calculation for simple reporting in email (Detailed breakdown in PDF invoice)
    const totalTaxableValue = totalInclusiveAmount / 1.05;
    const totalTaxAmount = totalInclusiveAmount - totalTaxableValue;

    const isDelhi = order.address.state && order.address.state.trim().toLowerCase() === 'delhi';
    
    let gstRowsHtml = '';
    let gstRoundingNoteHtml = '';
    if (isDelhi) {
        const splitTax = totalTaxAmount / 2;
        const roundedCgst = splitTax;
        const roundedSgst = splitTax;
        gstRowsHtml = `
            <tr class="totals-row">
                <td style="padding: 6px 0; font-size: 14px; color: #666666;">CGST (2.5%)</td>
                <td align="right" style="padding: 6px 0; font-size: 14px; color: #666666;">₹${splitTax.toFixed(2)}</td>
            </tr>
            <tr class="totals-row">
                <td style="padding: 6px 0; font-size: 14px; color: #666666;">SGST (2.5%)</td>
                <td align="right" style="padding: 6px 0; font-size: 14px; color: #666666;">₹${splitTax.toFixed(2)}</td>
            </tr>
        `;
        gstRoundingNoteHtml = `
            <tr class="gst-rounding-note">
                <td colspan="2" style="padding: 0 0 4px; font-size: 11px; color: #999999; text-align: right;">
                    ${splitTax.toFixed(2)} rounded off to ${roundedCgst}
                </td>
            </tr>
            <tr class="gst-rounding-note">
                <td colspan="2" style="padding: 0 0 4px; font-size: 11px; color: #999999; text-align: right;">
                    ${splitTax.toFixed(2)} rounded off to ${roundedSgst}
                </td>
            </tr>
        `;
    } else {
        const roundedIgst = totalTaxAmount;
        gstRowsHtml = `
            <tr class="totals-row">
                <td style="padding: 6px 0; font-size: 14px; color: #666666;">IGST (5%)</td>
                <td align="right" style="padding: 6px 0; font-size: 14px; color: #666666;">₹${totalTaxAmount.toFixed(2)}</td>
            </tr>
        `;
        gstRoundingNoteHtml = `
            <tr class="gst-rounding-note">
                <td colspan="2" style="padding: 0 0 4px; font-size: 11px; color: #999999; text-align: right;">
                    ${totalTaxAmount.toFixed(2)} rounded off to ${roundedIgst}
                </td>
            </tr>
        `;
    }

    let couponDiscountRow = '';
    if (couponDiscount > 0) {
        let offerLabel = '';
        if (order.couponOfferType && order.couponOfferType !== 'none') {
            offerLabel = `<br><span style="font-size: 10px; font-weight: 700;">(${order.couponOfferType === 'prepaid' ? 'Prepaid Offer' : 'COD Offer'})</span>`;
        }
        couponDiscountRow = `
            <tr class="totals-row">
                <td style="padding: 6px 0; font-size: 14px; color: #666666;">Coupon Discount${offerLabel}</td>
                <td align="right" style="padding: 6px 0; color: #155724; font-size: 14px;">- ₹${couponDiscount.toFixed(2)}</td>
            </tr>
        `;
    }

    let codChargeRow = '';
    if (emailCodCharge > 0) {
        codChargeRow = `
            <tr class="totals-row">
                <td style="padding: 6px 0; font-size: 14px; color: #666666;">COD Charges</td>
                <td align="right" style="padding: 6px 0; font-size: 14px; color: #666666;">₹${emailCodCharge.toFixed(2)}</td>
            </tr>
        `;
    }

    let giftWrapRow = '';
    if (emailGiftWrapPrice > 0) {
        giftWrapRow = `
            <tr class="totals-row">
                <td style="padding: 6px 0; font-size: 14px; color: #666666;">Gift Wrap (${order.giftWrap.name})</td>
                <td align="right" style="padding: 6px 0; font-size: 14px; color: #666666;">₹${emailGiftWrapPrice.toFixed(2)}</td>
            </tr>
        `;
    }

    const orderDateFormatted = new Date(order.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const sequentialInvoice = order.invoiceNumber ? order.invoiceNumber.toString().padStart(4, '0') : order._id.toString().slice(-8).toUpperCase();
    const roundedGrandTotal = roundToNearestRupee(emailOrderTotal);
    const grandTotalRoundOff = Math.abs(emailOrderTotal - roundedGrandTotal);
    const grandTotalRoundOffHtml = grandTotalRoundOff > 0
        ? `
            <tr class="grand-total-note">
                <td colspan="2" style="padding: 0 0 4px; font-size: 11px; color: #999999; text-align: right;">
                    (Rounded off by INR ${grandTotalRoundOff.toFixed(2)})
                </td>
            </tr>
        `
        : '';

    let finalHtml = templateHtml
        .replace('{{orderId}}', order._id.toString().slice(-8).toUpperCase())
        .replace('{{orderDate}}', orderDateFormatted)
        .replace('{{invoiceNumber}}', `INV-${sequentialInvoice}`)
        .replace('{{invoiceDate}}', orderDateFormatted)
        .replace('{{paymentMethod}}', order.paymentMethod)
        .replace('{{billingAddressName}}', order.address.name)
        .replace('{{billingAddressAddress}}', order.address.address)
        .replace('{{billingAddressCity}}', order.address.city)
        .replace('{{billingAddressZip}}', order.address.zip)
        .replace('{{billingAddressCountry}}', 'India')
        .replace('{{shippingAddressName}}', order.address.name)
        .replace('{{shippingAddressAddress}}', order.address.address)
        .replace('{{shippingAddressCity}}', order.address.city)
        .replace('{{shippingAddressZip}}', order.address.zip)
        .replace('{{shippingAddressCountry}}', 'India')
        .replace('{{itemRows}}', itemRowsHtml)
        .replace('{{subtotal}}', subtotalBeforeCoupon.toFixed(2))
        .replace('{{couponDiscountRow}}', couponDiscountRow)
        .replace('{{shipping}}', emailShippingCharge > 0 ? `₹${emailShippingCharge.toFixed(2)}` : 'FREE')
        .replace('{{codChargeRow}}', codChargeRow)
        .replace('{{giftWrapRow}}', giftWrapRow)
        .replace('{{gstRows}}', gstRowsHtml)
        .replace('{{grandTotalRoundOffNote}}', grandTotalRoundOffHtml)
        .replace('{{totalAmount}}', roundedGrandTotal.toFixed(0));

    return finalHtml;
};

// Placing orders using COD Method
const placeOrder = async (req,res) => {
    
    try {
        
        const { userId, items, address, giftWrap: giftWrapData, couponCode, couponDiscount } = req.body;

        const { productAmount, shippingCharge, codCharge, orderTotal, processedItems, isLuxeMember, totalCombinedDiscount, taxableValue, cgstAmount, sgstAmount, igstAmount, couponOfferType } = await calculateOrderPricing(userId, items, 'COD', giftWrapData, couponDiscount, address.state, couponCode);

        const invoiceNumber = await getNextInvoiceNumber();

        const finalCouponCode = couponCode || (processedItems.find(item => item.appliedCoupon)?.appliedCoupon || undefined);

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
        try {
            const shiprocketToken = await shiprocketLogin();
            const shiprocketOrderData = {
                _id: order._id,
                shippingAddress: { // Ensure this matches Shiprocket's expected structure
                    name: order.address.name.split(' ')[0] || '', // First name
                    lastName: order.address.name.split(' ').slice(1).join(' ') || '.', // Last name (use dot if empty)
                    address: order.address.address,
                    address2: `${order.address.locality || ''}${order.address.landmark ? ', ' + order.address.landmark : ''}`.trim(),
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

            let awbCode = null;
            let courierName = null;

            if (shiprocketResponse && shiprocketResponse.shipment_id) {
                try {
                    const awbResponse = await assignShiprocketAwb(shiprocketResponse.shipment_id, shiprocketToken);
                    if (awbResponse && awbResponse.awb_assign_status === 1) {
                        awbCode = awbResponse.response?.data?.awb_code || null;
                        courierName = awbResponse.response?.data?.courier_name || null;
                    }
                } catch (awbError) {
                    console.log("Error assigning Shiprocket AWB for COD order:", awbError.message);
                }
            }

            order.shiprocket = {
                ourOrderId: order._id.toString(),
                srOrderId: shiprocketResponse.order_id,
                shipmentId: shiprocketResponse.shipment_id,
                awb: awbCode,
                courier: courierName,
                trackingUrl: awbCode ? `https://shiprocket.co/tracking/${awbCode}` : ''
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

        const finalCouponCode = couponCode || (processedItems.find(item => item.appliedCoupon)?.appliedCoupon || undefined);

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
            couponCode: finalCouponCode,
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

            // Check if this is a luxe membership purchase
            const isLuxeOrder = updatedOrder.items.some(item => item.name === "Febeul Luxe Membership");

            if (isLuxeOrder) {
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
                try {
                    const shiprocketToken = await shiprocketLogin();
                    const shiprocketOrderData = {
                        _id: updatedOrder._id,
                        shippingAddress: { // Ensure this matches Shiprocket's expected structure
                            name: (updatedOrder || order).address.name.split(' ')[0] || '', // First name
                            lastName: (updatedOrder || order).address.name.split(' ').slice(1).join(' ') || '.', // Last name (use dot if empty)
                            address: (updatedOrder || order).address.address,
                            address2: `${(updatedOrder || order).address.locality || ''}${(updatedOrder || order).address.landmark ? ', ' + (updatedOrder || order).address.landmark : ''}`.trim(),
                            city: (updatedOrder || order).address.city,
                            pincode: (updatedOrder || order).address.zip, // Use zip from frontend
                            state: (updatedOrder || order).address.state,
                            country: "India",
                            phone: (updatedOrder || order).address.phone,
                            email: (updatedOrder || order).userId.email
                        },
                        user: updatedOrder.userId,
                        items: updatedOrder.items,
                        totalPrice: updatedOrder.productAmount, // Use productAmount for subtotal
                        shippingCharge: updatedOrder.shippingCharge,
                        codCharge: updatedOrder.codCharge
                    };
                    const shiprocketResponse = await createShiprocketOrder(shiprocketOrderData, shiprocketToken, "Prepaid");

                    let awbCode = null;
                    let courierName = null;

                    if (shiprocketResponse && shiprocketResponse.shipment_id) {
                        try {
                            const awbResponse = await assignShiprocketAwb(shiprocketResponse.shipment_id, shiprocketToken);
                            if (awbResponse && awbResponse.awb_assign_status === 1) {
                                awbCode = awbResponse.response?.data?.awb_code || null;
                                courierName = awbResponse.response?.data?.courier_name || null;
                            }
                        } catch (awbError) {
                            console.log("Error assigning Shiprocket AWB for Stripe order:", awbError.message);
                        }
                    }

                    updatedOrder.shiprocket = {
                        ourOrderId: updatedOrder._id.toString(),
                        srOrderId: shiprocketResponse.order_id,
                        shipmentId: shiprocketResponse.shipment_id,
                        awb: awbCode,
                        courier: courierName,
                        trackingUrl: awbCode ? `https://shiprocket.co/tracking/${awbCode}` : ''
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
            }

            res.json({success: true});

            // Send Order Confirmation Email (only if NOT a membership order, as that has its own email)
            if (!isLuxeOrder) {
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

        const finalCouponCode = couponCode || (processedItems.find(item => item.appliedCoupon)?.appliedCoupon || undefined);

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
                    try {
                        const shiprocketToken = await shiprocketLogin();
                        const shiprocketOrderData = {
                            _id: order._id,
                        shippingAddress: { // Ensure this matches Shiprocket's expected structure
                                name: order.address.name.split(' ')[0] || '', // First name
                                lastName: order.address.name.split(' ').slice(1).join(' ') || '.', // Last name (use dot if empty)
                                address: order.address.address,
                                address2: `${order.address.locality || ''}${order.address.landmark ? ', ' + order.address.landmark : ''}`.trim(),
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

                        let awbCode = null;
                        let courierName = null;

                        if (shiprocketResponse && shiprocketResponse.shipment_id) {
                            try {
                                const awbResponse = await assignShiprocketAwb(shiprocketResponse.shipment_id, shiprocketToken);
                                if (awbResponse && awbResponse.awb_assign_status === 1) {
                                    awbCode = awbResponse.response?.data?.awb_code || null;
                                    courierName = awbResponse.response?.data?.courier_name || null;
                                }
                            } catch (awbError) {
                                console.log("Error assigning Shiprocket AWB for Razorpay order:", awbError.message);
                            }
                        }

                        order.shiprocket = {
                            ourOrderId: order._id.toString(),
                            srOrderId: shiprocketResponse.order_id,
                            shipmentId: shiprocketResponse.shipment_id,
                            awb: awbCode,
                            courier: courierName,
                            trackingUrl: awbCode ? `https://shiprocket.co/tracking/${awbCode}` : ''
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

        let trackingData = null;
        if (order.shiprocket && order.shiprocket.awb) {
            trackingData = await trackShipment(order.shiprocket.awb);
            
            // Sync status with Shiprocket tracking data
            if (trackingData && trackingData.tracking_data && trackingData.tracking_data.shipment_track && trackingData.tracking_data.shipment_track[0]) {
                const currentStatus = trackingData.tracking_data.shipment_track[0].current_status;
                if (currentStatus) {
                    let mappedStatus = 'UNKNOWN';
                    const statusUpper = currentStatus.toUpperCase();
                    if (statusUpper.includes('DELIVERED')) mappedStatus = 'DELIVERED';
                    else if (statusUpper.includes('OUT FOR DELIVERY') || statusUpper.includes('OUT_FOR_DELIVERY') || statusUpper.includes('OUTFORDELIVERY')) {
                        mappedStatus = 'IN_TRANSIT';
                    }
                    else if (statusUpper.includes('TRANSIT')) mappedStatus = 'IN_TRANSIT';
                    else if (statusUpper.includes('SHIPPED')) mappedStatus = 'SHIPPED';
                    else if (statusUpper.includes('PICKUP SCHEDULED') || statusUpper.includes('PICKUP_SCHEDULED')) mappedStatus = 'PICKUP SCHEDULED';
                    else if (statusUpper.includes('CANCEL')) mappedStatus = 'CANCELLED';
                    else if (statusUpper.includes('RTO') || statusUpper.includes('RETURN')) mappedStatus = 'RTO';
                    else if (statusUpper.includes('NEW')) mappedStatus = 'NEW';
                    
                    if (mappedStatus !== 'UNKNOWN' && order.shiprocketStatus !== mappedStatus) {
                        order.shiprocketStatus = mappedStatus;
                        
                        if (mappedStatus === 'DELIVERED') {
                            order.orderStatus = 'Delivered';
                            order.deliveredAt = order.deliveredAt || new Date();
                        } else if (mappedStatus === 'SHIPPED') {
                            order.orderStatus = 'Shipped';
                            order.shippedAt = order.shippedAt || new Date();
                        } else if (mappedStatus === 'CANCELLED') {
                            order.orderStatus = 'Cancelled';
                        }
                        
                        await order.save();
                    }
                }
            }
        }

        res.json({ success: true, order, trackingData });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: 'Error fetching order' });
    }
};

import { calculateRefundAmount, processPrepaidRefund, processCodRefund } from './refundController.js';

const cancelOrder = async (req, res) => {
    try {
        const { orderId, reason, bankDetails } = req.body;
        const userId = req.userId;

        const order = await orderModel.findById(orderId);

        if (!order) {
            return res.json({ success: false, message: "Order not found" });
        }

        if (order.userId.toString() !== userId) {
            return res.json({ success: false, message: "Not authorized to cancel this order" });
        }

        const nonCancellableStatuses = ['Shipped', 'Out for delivery', 'Delivered', 'Cancelled', 'Returned', 'Refunded'];
        if (nonCancellableStatuses.includes(order.orderStatus)) {
            return res.json({ success: false, message: `Order cannot be cancelled in '${order.orderStatus}' status.` });
        }

        const refundAmount = order.orderTotal || 0;
        order.refundDetails.amount = refundAmount;

        // 1. Process Refund for Prepaid Orders
        if (order.paymentMethod === 'Razorpay' && order.payment) {
            const paymentId = order.razorpayPaymentId || order.paymentDetails?.razorpay_payment_id;
            if (paymentId) {
                try {
                    // Cancellation refunds the complete paid order value.
                    const refundResult = await processPrepaidRefund(orderId, paymentId, refundAmount);

                    if (refundResult.success) {
                        order.refundDetails.status = 'completed';
                        order.refundDetails.id = refundResult.refundId;
                        order.refundDetails.processedAt = new Date();
                        order.orderStatus = 'Refunded';
                    } else {
                        // If automatic refund fails, keep an admin-visible pending log.
                        order.refundDetails.status = 'pending';
                        order.orderStatus = 'Cancelled';
                    }
                } catch (refundError) {
                    console.log("Razorpay refund failed during cancellation:", refundError.message);
                    order.refundDetails.status = 'pending';
                    order.orderStatus = 'Cancelled';
                }
            } else {
                order.refundDetails.status = 'pending';
                order.orderStatus = 'Cancelled';
            }
        } else if (order.paymentMethod === 'COD') {
            order.orderStatus = 'Cancelled';
            order.refundDetails.status = 'pending';
            if (bankDetails) {
                order.refundDetails.customerPayoutDetails = {
                    type: 'bank',
                    bankAccount: bankDetails.accountNumber,
                    ifsc: bankDetails.ifsc,
                    accountHolderName: bankDetails.accountHolderName,
                    bankName: bankDetails.bankName
                };
            }
        } else {
            order.orderStatus = 'Cancelled';
        }

        // Restore stock
        for (const item of order.items) {
            if (item.name === "Febeul Luxe Membership") continue;
            const product = await productModel.findById(item.productId);
            if (product) {
                const variation = product.variations.find(v => v.color === item.color);
                if (variation) {
                    const sizeData = variation.sizes.find(s => s.size === item.size);
                    if (sizeData) {
                        sizeData.stock += item.quantity;
                    }
                }
                await product.save();
            }
        }

        order.isCancelled = true;
        order.refundDetails.reason = reason || 'Customer requested cancellation';
        order.refundDetails.requestedAt = new Date();

        await order.save();

        res.json({ success: true, message: order.orderStatus === 'Refunded' ? "Order cancelled and refund initiated." : "Order cancelled successfully" });

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

export {verifyRazorpay, verifyStripe ,placeOrder, placeOrderStripe, placeOrderRazorpay, allOrders, userOrders, updateStatus, getRazorpayKey, generateInvoice, getOrderById, cancelOrder}
