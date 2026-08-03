import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import Razorpay from "razorpay";
import { v2 as cloudinary } from "cloudinary";
import { createReturnOrder, buildShiprocketOrderPayload, cancelShiprocketOrder } from "../utils/shiprocket.js";
import { sendEmail } from "../utils/sendEmail.js";
import { returnRequestCreatedEmailTemplate, refundProcessedEmailTemplate } from "../templates/returnEmail.js";

const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const BUYER_FAULT_CONVENIENCE_FEE = 150;
const MAX_RETURNS_BEFORE_BLOCK = 5;

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
        // The Razorpay Node SDK throws errors shaped like
        // { statusCode, error: { description, code, ... } } rather than a
        // standard Error with a top-level .message, so error.message is
        // undefined here — surface the actual gateway description instead.
        const description = error?.error?.description || error?.description || error.message || "Unknown Razorpay error";
        throw new Error(`Failed to process prepaid refund: ${description}`);
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
    const { orderId, returnReason, manualRefundAmount, adminRefundComment, isPartialRefund } = req.body;

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
            order.refundDetails.adminRefundComment = adminRefundComment || "";
            order.refundDetails.isPartialRefund = isPartialRefund || (refundAmount < order.orderTotal);
            order.isRefundable = false;

            // Only a physical-item "return" (as opposed to a money-only "refund"
            // claim, e.g. item never arrived) has anything for the courier to
            // collect. Best-effort: refund still succeeds even if scheduling
            // fails, but the failure reason is recorded so admin can arrange
            // pickup manually.
            const needsPickup = order.refundDetails.requestType === 'return' && order.refundDetails.pickup.status === 'none';
            if (needsPickup) {
                try {
                    const payload = buildShiprocketOrderPayload(order);
                    const returnResponse = await createReturnOrder(payload);

                    if (returnResponse && returnResponse.order_id) {
                        order.refundDetails.pickup.status = 'scheduled';
                        order.refundDetails.pickup.shiprocketReturnOrderId = returnResponse.order_id;
                        order.refundDetails.pickup.shipmentId = returnResponse.shipment_id;
                        order.refundDetails.pickup.scheduledDate = new Date();
                    } else {
                        order.refundDetails.pickup.status = 'failed';
                        order.refundDetails.pickup.failureReason = 'Shiprocket did not return a valid return order.';
                    }
                } catch (pickupError) {
                    console.log("Error scheduling Shiprocket reverse pickup:", pickupError.message);
                    order.refundDetails.pickup.status = 'failed';
                    order.refundDetails.pickup.failureReason = pickupError.message;
                }
            }

            await order.save();

            if (order.userId?.email) {
                sendEmail(
                    order.userId.email,
                    'Your Febeul Refund Has Been Processed',
                    refundProcessedEmailTemplate(order.userId.name || 'Customer', order._id, refundAmount, order.paymentMethod)
                );
            }

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
    const { orderId, reason, payoutDetails, requestType } = req.body;
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
            'refundDetails.requestType': requestType === 'return' ? 'return' : 'refund',
            'refundDetails.images': imageUrls,
            'refundDetails.requestedAt': new Date(),
        };
        if (isDelivered) updateData.orderStatus = 'Refund Initiated';
        if (order.paymentMethod === 'COD' && payoutDetails) updateData['refundDetails.customerPayoutDetails'] = JSON.parse(payoutDetails);

        await orderModel.findByIdAndUpdate(orderId, updateData);

        const returnCount = await orderModel.countDocuments({ userId, 'refundDetails.status': { $ne: 'none' } });
        if (returnCount > MAX_RETURNS_BEFORE_BLOCK) {
            await userModel.findByIdAndUpdate(userId, { isBlocked: true, blockedAt: new Date() });
        }

        const user = await userModel.findById(userId);
        if (user?.email) {
            sendEmail(
                user.email,
                'We Received Your Request',
                returnRequestCreatedEmailTemplate(user.name || 'Customer', order._id, updateData['refundDetails.requestType'])
            );
        }

        res.json({ success: true, message: "Request submitted successfully." });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// --- 8. Auto-refund a prepaid order once Shiprocket confirms the courier
// has fully returned it to origin (RTO_DELIVERED). Mirrors the instant
// refund already done for pre-ship cancellations, closing the gap where an
// RTO'd prepaid order would otherwise sit unrefunded until an admin noticed
// it. Idempotent against webhook redelivery via the refundDetails.status
// guard. Called from shiprocketWebhookController.js.
const autoRefundOnCourierReturn = async (order) => {
    try {
        if (order.paymentMethod !== 'Razorpay' || !order.payment || order.refundDetails.status !== 'none') {
            return;
        }

        const paymentId = order.razorpayPaymentId || order.paymentDetails?.razorpay_payment_id;
        if (!paymentId) return;

        const refundAmount = order.orderTotal || 0;
        const refundResult = await processPrepaidRefund(order._id, paymentId, refundAmount);

        if (!refundResult.success) {
            console.log("Auto-refund on courier RTO failed:", refundResult.message);
            return;
        }

        order.refundDetails.status = 'completed';
        order.refundDetails.requestType = 'courier_return';
        order.refundDetails.amount = refundAmount;
        order.refundDetails.id = refundResult.refundId;
        order.refundDetails.processedAt = new Date();
        order.refundDetails.reason = order.refundDetails.reason || 'Courier returned the parcel to origin (RTO)';
        order.isRefundable = false;
        await order.save();

        const user = await userModel.findById(order.userId);
        if (user?.email) {
            sendEmail(
                user.email,
                'Your Febeul Refund Has Been Processed',
                refundProcessedEmailTemplate(user.name || 'Customer', order._id, refundAmount, order.paymentMethod)
            );
        }
    } catch (error) {
        console.log("Error auto-refunding courier return:", error.message);
    }
};

// --- 9. Customer Cancels Their Own Return/Refund Request ---
// Allowed only while the courier hasn't collected the item yet — i.e. before
// refundDetails.pickup.status reaches 'picked_up'.
const cancelReturnRequest = async (req, res) => {
    const { orderId } = req.body;
    const userId = req.userId;

    try {
        const order = await orderModel.findById(orderId);
        if (!order) return res.json({ success: false, message: "Order not found." });
        if (order.userId.toString() !== userId) return res.json({ success: false, message: "Unauthorized." });

        const cancellableRequestStatuses = ['pending', 'initiated', 'processing'];
        const cancellablePickupStatuses = ['none', 'scheduled', 'failed'];

        if (!cancellableRequestStatuses.includes(order.refundDetails.status)) {
            return res.json({ success: false, message: "This request can no longer be cancelled." });
        }
        if (!cancellablePickupStatuses.includes(order.refundDetails.pickup?.status)) {
            return res.json({ success: false, message: "The courier has already picked up this item, so the request can't be cancelled anymore." });
        }

        if (order.refundDetails.pickup?.shiprocketReturnOrderId) {
            try {
                await cancelShiprocketOrder([order.refundDetails.pickup.shiprocketReturnOrderId]);
            } catch (shiprocketError) {
                console.log("Error cancelling Shiprocket reverse pickup:", shiprocketError.message);
            }
        }

        if (order.orderStatus === 'Refund Initiated') {
            order.orderStatus = 'Delivered';
        }
        order.refundDetails.status = 'none';
        order.refundDetails.requestType = undefined;
        order.refundDetails.reason = undefined;
        order.refundDetails.images = [];
        order.refundDetails.customerPayoutDetails = undefined;
        order.refundDetails.pickup = { status: 'none' };

        await order.save();
        res.json({ success: true, message: "Your request has been cancelled." });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

export { calculateRefundAmount, processPrepaidRefund, processCodRefund, requestRefund, approveRefund, rejectRefund, autoRefundOnCourierReturn, cancelReturnRequest };
