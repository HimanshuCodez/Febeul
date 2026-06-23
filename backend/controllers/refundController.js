import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import Razorpay from "razorpay";
import { v2 as cloudinary } from "cloudinary";

const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const BUYER_FAULT_CONVENIENCE_FEE = 150;

// --- 1. Refund Calculation Function ---
const calculateRefundAmount = async (order, returnReason, currentShiprocketStatus) => {
    let refund = 0;
    const productAmount = order.productAmount;
    const shippingCharge = order.shippingCharge;
    const codCharge = order.codCharge;

    const cmsModel = (await import('../models/cmsModel.js')).default;
    const siteSettingsDoc = await cmsModel.findOne({ name: 'siteSettings' });
    const siteSettings = siteSettingsDoc?.content || {
        membershipPrice: 129,
        shippingThreshold: 499,
        defaultShippingCharge: 50,
        codCharge: 50
    };

    switch (currentShiprocketStatus) {
        case 'NEW':
        case 'PICKUP SCHEDULED':
            refund = productAmount;
            if (productAmount < (siteSettings.shippingThreshold || 499) && order.paymentMethod !== 'COD') {
                refund -= shippingCharge;
            }
            if (order.paymentMethod === 'COD') {
                refund -= codCharge;
            }
            break;

        case 'SHIPPED':
        case 'IN_TRANSIT':
            refund = productAmount;
            if (order.paymentMethod === 'COD') {
                refund += codCharge;
            }
            break;

        case 'DELIVERED':
        case 'RTO':
            if (!returnReason) {
                refund = productAmount;
            } else if (returnReason === 'buyer_fault') {
                refund = productAmount - BUYER_FAULT_CONVENIENCE_FEE;
            } else if (returnReason === 'seller_fault' || returnReason === 'courier_fault') {
                refund = productAmount + shippingCharge + codCharge;
            }
            break;

        default:
            refund = 0;
            break;
    }

    return Math.max(0, refund);
};

// --- 3. Razorpay Prepaid Refund Function ---
const processPrepaidRefund = async (orderId, razorpayPaymentId, refundAmount) => {
    try {
        if (!razorpayPaymentId) {
            throw new Error("Razorpay Payment ID is missing for prepaid refund.");
        }
        if (refundAmount <= 0) {
            return { success: true, message: "No amount to refund via Razorpay.", refundId: null };
        }

        const refundResponse = await razorpayInstance.payments.refund(razorpayPaymentId, {
            amount: Math.round(refundAmount * 100),
            speed: 'normal',
            notes: {
                order_id: orderId.toString(),
                reason: "Customer requested refund"
            }
        });

        if (refundResponse.status === 'processed' || refundResponse.status === 'pending') {
            return { success: true, message: "Prepaid refund initiated successfully.", refundId: refundResponse.id };
        } else {
            return { success: false, message: `Razorpay refund failed with status: ${refundResponse.status}.`, refundId: refundResponse.id };
        }
    } catch (error) {
        throw new Error(`Failed to process prepaid refund: ${error.message}`);
    }
};

// --- 4. COD Refund Handler ---
const processCodRefund = async (orderId, refundAmount, customerPayoutDetails) => {
    try {
        if (refundAmount <= 0) {
            return { success: true, message: "No amount to refund for COD order.", refundId: null };
        }
        const simulatedPayoutId = `MANUAL_PAYOUT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        return { success: true, message: "COD refund marked for manual processing/payout.", refundId: simulatedPayoutId };
    } catch (error) {
        throw new Error(`Failed to process COD refund: ${error.message}`);
    }
};


// --- 5. Admin Approve Refund Handler ---
const approveRefund = async (req, res) => {
    const { orderId, returnReason, manualRefundAmount } = req.body;

    try {
        const order = await orderModel.findById(orderId).populate('userId');
        if (!order) {
            return res.json({ success: false, message: "Order not found." });
        }

        if (order.refundDetails.status === 'completed') {
            return res.json({ success: false, message: "Refund has already been completed." });
        }

        let refundAmount = manualRefundAmount !== undefined ? parseFloat(manualRefundAmount) : await calculateRefundAmount(order, returnReason || order.refundDetails.reason, order.shiprocketStatus || 'UNKNOWN');

        let refundResult = { success: false };

        if (order.paymentMethod === 'Razorpay') {
            const paymentId = order.razorpayPaymentId || order.paymentDetails?.razorpay_payment_id;
            if (!paymentId) return res.json({ success: false, message: "Razorpay Payment ID not found." });
            refundResult = await processPrepaidRefund(orderId, paymentId, refundAmount);
        } else if (order.paymentMethod === 'COD') {
            refundResult = await processCodRefund(orderId, refundAmount, order.refundDetails.customerPayoutDetails);
        } else {
            refundResult = { success: false, message: "Manual refund required for this payment method." };
        }

        if (refundResult.success) {
            order.orderStatus = 'Refunded';
            order.refundDetails.status = 'completed';
            order.refundDetails.amount = refundAmount;
            order.refundDetails.id = refundResult.refundId;
            order.refundDetails.processedAt = new Date();
            order.isRefundable = false;
            await order.save();
            return res.json({ success: true, message: `Refund successful. Amount: ₹${refundAmount}` });
        }
        res.json({ success: false, message: refundResult.message });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// --- 6. Admin Reject Refund Handler ---
const rejectRefund = async (req, res) => {
    const { orderId, rejectionReason } = req.body;
    try {
        if (!rejectionReason) return res.json({ success: false, message: "Rejection reason is required." });
        const order = await orderModel.findById(orderId);
        if (!order) return res.json({ success: false, message: "Order not found." });

        order.refundDetails.status = 'rejected';
        order.refundDetails.rejectionReason = rejectionReason;
        if (order.orderStatus === 'Refund Initiated') order.orderStatus = 'Delivered';
        await order.save();
        res.json({ success: true, message: "Refund request rejected." });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// --- 7. Request Refund Handler ---
const requestRefund = async (req, res) => {
    const { orderId, reason, payoutDetails } = req.body;
    const userId = req.userId;
    const uploadedImages = req.files;

    try {
        const order = await orderModel.findById(orderId);
        if (!order) return res.json({ success: false, message: "Order not found." });
        if (order.userId.toString() !== userId) return res.json({ success: false, message: "Unauthorized." });

        const isDelivered = order.orderStatus === 'Delivered';
        if (isDelivered) {
            if (uploadedImages && uploadedImages.length !== 4) return res.json({ success: false, message: "Please upload exactly 4 images." });
            const threeDays = 3 * 24 * 60 * 60 * 1000;
            if ((new Date() - new Date(order.deliveredAt)) > threeDays) return res.json({ success: false, message: "Return window closed." });
        }

        const imageUrls = [];
        if (uploadedImages) {
            for (const file of uploadedImages) {
                const result = await cloudinary.uploader.upload(file.path, { resource_type: 'image' });
                imageUrls.push(result.secure_url);
            }
        }

        const updateData = {
            'refundDetails.status': 'pending',
            'refundDetails.reason': reason,
            'refundDetails.images': imageUrls,
            'refundDetails.requestedAt': new Date(),
        };
        if (isDelivered) updateData.orderStatus = 'Refund Initiated';
        if (order.paymentMethod === 'COD' && payoutDetails) updateData['refundDetails.customerPayoutDetails'] = JSON.parse(payoutDetails);

        await orderModel.findByIdAndUpdate(orderId, updateData);
        res.json({ success: true, message: "Request submitted successfully." });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

const updateShiprocketStatusWebhook = async (req, res) => {
    try {
        const { order_id, current_status } = req.body;
        const statusText = (current_status || '').toString().trim().toUpperCase();
        const order = await orderModel.findOne({
            $or: [
                { 'shiprocket.srOrderId': order_id },
                { 'shiprocket.ourOrderId': order_id },
                { 'shiprocket.shipmentId': order_id }
            ]
        }) || await orderModel.findById(order_id);
        if (!order) return res.json({ success: false, message: "Order not found." });

        if (statusText === 'DELIVERED') {
            order.orderStatus = 'Delivered';
            order.deliveredAt = new Date();
            order.shiprocketStatus = 'DELIVERED';
        } else if (statusText === 'OUT FOR DELIVERY' || statusText === 'OUT_FOR_DELIVERY') {
            order.orderStatus = 'Out for delivery';
            order.shiprocketStatus = 'IN_TRANSIT';
        } else if (['SHIPPED', 'IN_TRANSIT', 'IN TRANSIT'].includes(statusText)) {
            order.orderStatus = 'Shipped';
            order.shiprocketStatus = statusText === 'SHIPPED' ? 'SHIPPED' : 'IN_TRANSIT';
        } else if (statusText === 'PICKUP SCHEDULED' || statusText === 'PICKUP_SCHEDULED') {
            order.orderStatus = 'Processing';
            order.shiprocketStatus = 'PICKUP SCHEDULED';
        } else if (statusText.includes('RTO')) {
            order.orderStatus = 'Returned';
            order.shiprocketStatus = 'RTO';
        } else if (statusText === 'CANCELLED') {
            order.orderStatus = 'Cancelled';
            order.shiprocketStatus = 'CANCELLED';
        } else {
            order.shiprocketStatus = 'UNKNOWN';
        }

        await order.save();
        res.json({ success: true, message: "Status updated." });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

export { calculateRefundAmount, processPrepaidRefund, processCodRefund, requestRefund, approveRefund, rejectRefund, updateShiprocketStatusWebhook };
