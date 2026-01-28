import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import Razorpay from "razorpay";
// Assume shiprocket client/utility functions are available
// import { getShiprocketOrderStatus } from '../utils/shiprocket.js'; 

const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// --- Constants (re-defined or imported for this controller's self-sufficiency) ---
const SHIPPING_CHARGE_THRESHOLD = 499;
const DEFAULT_SHIPPING_CHARGE = 50;
const COD_CHARGE_AMOUNT = 50;
const BUYER_FAULT_CONVENIENCE_FEE = 150;

// --- Helper: Get Shiprocket Order Status ---
// This function would ideally call Shiprocket API to get the latest status
// For now, we rely on the status stored in our DB, but a real system
// would verify this with Shiprocket directly before acting.
// This is a placeholder for actual Shiprocket API call.
const getShiprocketStatusFromOrder = async (orderId) => {
    const order = await orderModel.findById(orderId);
    if (!order) {
        throw new Error("Order not found");
    }
    // In a real scenario, this would involve an API call to Shiprocket
    // For now, we'll use the stored status
    return order.shiprocketStatus;
};

// --- 1. Refund Calculation Function ---
const calculateRefundAmount = async (order, returnReason, currentShiprocketStatus) => {
    let refund = 0;
    const productAmount = order.productAmount;
    const shippingCharge = order.shippingCharge;
    const codCharge = order.codCharge;

    switch (currentShiprocketStatus) {
        case 'NEW':
        case 'PICKUP SCHEDULED':
            // CASE 1: Cancel BEFORE shipping
            // Formula: productAmount - (shippingCharge if productAmount < 499) - (codCharge if COD)
            refund = productAmount;
            if (productAmount < SHIPPING_CHARGE_THRESHOLD && order.paymentMethod !== 'COD') { // Only deduct shipping if it was initially applied and not COD
                refund -= shippingCharge; // This shippingCharge would be 50 if productAmount < 499
            }
            if (order.paymentMethod === 'COD') {
                refund -= codCharge;
            }
            break;

        case 'SHIPPED':
        case 'IN_TRANSIT':
            // CASE 2: Cancel AFTER shipping but NOT delivered
            // Formula: productAmount + codCharge (if COD)
            refund = productAmount;
            if (order.paymentMethod === 'COD') {
                refund += codCharge;
            }
            break;

        case 'DELIVERED':
        case 'RTO': // RTO is considered delivered for refund calculation purposes here if a return is requested after RTO.
            // Cases for DELIVERED / RTO
            if (!returnReason) {
                // This case should ideally not happen if admin *must* select a reason for delivered items.
                // If it does, a default conservative approach is to refund only product amount.
                refund = productAmount;
            } else if (returnReason === 'buyer_fault') {
                // CASE 4: Buyer fault return
                // Formula: productAmount - 150
                refund = productAmount - BUYER_FAULT_CONVENIENCE_FEE;
            } else if (returnReason === 'seller_fault' || returnReason === 'courier_fault') {
                // CASE 5: Seller fault OR Courier fault
                // Formula: productAmount + shippingCharge + codCharge (Full refund)
                refund = productAmount + shippingCharge + codCharge;
            }
            break;

        default:
            console.warn(`Unknown or unhandled Shiprocket status for refund calculation: ${currentShiprocketStatus}`);
            refund = 0; // Default to no refund for unhandled statuses
            break;
    }

    return Math.max(0, refund); // Ensure refund is not negative
};

// --- 3. Razorpay Prepaid Refund Function ---
const processPrepaidRefund = async (orderId, razorpayPaymentId, refundAmount) => {
    try {
        if (!razorpayPaymentId) {
            throw new Error("Razorpay Payment ID is missing for prepaid refund.");
        }
        if (refundAmount <= 0) {
            console.warn(`Refund amount is non-positive for order ${orderId}. Skipping Razorpay refund.`);
            return { success: true, message: "No amount to refund via Razorpay.", refundId: null };
        }

        const refundResponse = await razorpayInstance.payments.refund(razorpayPaymentId, {
            amount: refundAmount * 100, // Amount in paise
            speed: 'normal',
            notes: {
                order_id: orderId.toString(),
                reason: "Customer requested refund" // Can be dynamic
            }
        });

        if (refundResponse.status === 'processed' || refundResponse.status === 'pending') {
            console.log(`Razorpay refund initiated for order ${orderId}: ${refundResponse.id}`);
            return { success: true, message: "Prepaid refund initiated successfully.", refundId: refundResponse.id };
        } else {
            console.error(`Razorpay refund failed for order ${orderId}: ${refundResponse.id} - ${refundResponse.status}`);
            return { success: false, message: `Razorpay refund failed with status: ${refundResponse.status}.`, refundId: refundResponse.id };
        }
    } catch (error) {
        console.error(`Error processing prepaid refund for order ${orderId}:`, error);
        throw new Error(`Failed to process prepaid refund: ${error.message}`);
    }
};

// --- 4. COD Refund Handler (Payout Abstraction) ---
const processCodRefund = async (orderId, refundAmount, customerPayoutDetails) => {
    try {
        if (refundAmount <= 0) {
            console.warn(`Refund amount is non-positive for COD order ${orderId}. No payout needed.`);
            return { success: true, message: "No amount to refund for COD order.", refundId: null };
        }
        
        // This is where a real-world system would integrate with a payout service (e.g., Razorpay Payouts, custom bank APIs)
        // For this implementation, we will mark it for manual processing and store details.
        
        console.log(`COD refund requested for order ${orderId}. Amount: ${refundAmount}. Details:`, customerPayoutDetails);
        // Simulate a successful payout request for now
        const simulatedPayoutId = `MANUAL_PAYOUT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // In a real system, you would call a payout API here.
        // Example: await payoutService.createPayout(refundAmount, customerPayoutDetails);

        return { success: true, message: "COD refund marked for manual processing/payout.", refundId: simulatedPayoutId };

    } catch (error) {
        console.error(`Error processing COD refund for order ${orderId}:`, error);
        throw new Error(`Failed to process COD refund: ${error.message}`);
    }
};

// --- Main function to handle cancellation/return requests ---
const requestRefund = async (req, res) => {
    const { orderId, returnReason, customerPayoutDetails } = req.body;
    const userId = req.userId; // Assuming userId is available from auth middleware

    try {
        const order = await orderModel.findById(orderId).populate('userId');

        if (!order) {
            return res.json({ success: false, message: "Order not found." });
        }

        // --- Safeguards ---
        if (order.userId._id.toString() !== userId) {
            return res.json({ success: false, message: "Not authorized to request refund for this order." });
        }
        if (!order.isRefundable) {
            return res.json({ success: false, message: "Refund already processed or not eligible." });
        }
        if (order.refundDetails.status !== 'none' && order.refundDetails.status !== 'failed') {
             return res.json({ success: false, message: `Refund is already ${order.refundDetails.status}.` });
        }

        // Set refund status to pending while processing
        await orderModel.findByIdAndUpdate(orderId, { 
            'refundDetails.status': 'pending', 
            'refundDetails.requestedAt': new Date(),
            'refundDetails.reason': returnReason || 'cancelled_before_shipment' // Default reason
        });
        
        // Get current Shiprocket status (from DB or API)
        const currentShiprocketStatus = await getShiprocketStatusFromOrder(orderId);
        
        // Calculate refund amount
        const refundAmount = await calculateRefundAmount(order, returnReason, currentShiprocketStatus);
        
        let refundResult;
        if (order.paymentMethod === 'COD') {
            if (!customerPayoutDetails) {
                 await orderModel.findByIdAndUpdate(orderId, { 'refundDetails.status': 'failed', 'refundDetails.processedAt': new Date() });
                 return res.json({ success: false, message: "Customer payout details are required for COD refund." });
            }
            refundResult = await processCodRefund(orderId, refundAmount, customerPayoutDetails);
        } else { // Prepaid (Razorpay, Stripe)
            // For Stripe, we would need to integrate with Stripe Refund API here.
            // Assuming Razorpay is the primary prepaid method for now as per instructions.
            if (order.paymentMethod === 'Razorpay') {
                refundResult = await processPrepaidRefund(orderId, order.razorpayPaymentId, refundAmount);
            } else if (order.paymentMethod === 'Stripe') {
                // Placeholder for Stripe refund
                console.warn(`Stripe refund for order ${orderId} is not yet implemented.`);
                refundResult = { success: false, message: "Stripe refunds not implemented.", refundId: null };
            } else {
                refundResult = { success: false, message: "Unknown payment method for prepaid refund.", refundId: null };
            }
        }

        if (refundResult.success) {
            // Update order status based on current state (Cancelled or Returned)
            let newOrderStatus = order.orderStatus;
            if (currentShiprocketStatus === 'NEW' || currentShiprocketStatus === 'PICKUP SCHEDULED') {
                newOrderStatus = 'Cancelled';
            } else {
                newOrderStatus = 'Returned';
            }

            await orderModel.findByIdAndUpdate(orderId, {
                orderStatus: newOrderStatus,
                'shiprocketStatus': 'CANCELLED', // Assuming order is cancelled in Shiprocket too
                'refundDetails.status': 'completed', // Or 'processing' if it takes time
                'refundDetails.amount': refundAmount,
                'refundDetails.id': refundResult.refundId,
                'refundDetails.processedAt': new Date(),
                isRefundable: false, // Prevent further refunds
                isCancelled: true // Mark as cancelled
            });
            return res.json({ success: true, message: `Refund initiated successfully. Refund ID: ${refundResult.refundId}`, refundAmount: refundAmount });
        } else {
            await orderModel.findByIdAndUpdate(orderId, { 
                'refundDetails.status': 'failed',
                'refundDetails.processedAt': new Date()
            });
            return res.json({ success: false, message: refundResult.message || "Failed to initiate refund." });
        }

    } catch (error) {
        console.error("Error in requestRefund:", error);
        // Attempt to update refund status to failed if an error occurred during refund processing
        try {
            await orderModel.findByIdAndUpdate(orderId, { 
                'refundDetails.status': 'failed',
                'refundDetails.processedAt': new Date()
            });
        } catch (updateError) {
            console.error(`Failed to update refund status to 'failed' for order ${orderId}:`, updateError);
        }
        res.json({ success: false, message: `Internal server error: ${error.message}` });
    }
};


// --- Shiprocket Webhook Handler (Conceptual) ---
// This would be an API endpoint Shiprocket calls to update order statuses
// and potentially trigger further actions.
const updateShiprocketStatusWebhook = async (req, res) => {
    try {
        const { order_id, current_status, status_code, event_type, shipment_id } = req.body;
        console.log(`Shiprocket Webhook received for order ${order_id}: Status ${current_status}`);

        if (!order_id || !current_status) {
            return res.status(400).json({ success: false, message: "Missing required webhook data." });
        }

        const order = await orderModel.findOne({ 'shiprocket.orderId': order_id });
        if (!order) {
            // Also check by _id if shiprocket.orderId not set for some reason
            const orderById = await orderModel.findById(order_id);
            if (orderById) {
                order = orderById;
            } else {
                console.warn(`Shiprocket webhook: Order not found for Shiprocket order ID ${order_id}.`);
                return res.json({ success: false, message: "Order not found in DB." });
            }
        }
        
        let newOrderStatus = order.orderStatus;
        let newShiprocketStatus = current_status; // Use Shiprocket's actual status

        // Map Shiprocket status to internal orderStatus if needed
        if (current_status === 'DELIVERED') {
            newOrderStatus = 'Delivered';
            order.deliveredAt = new Date();
        } else if (current_status === 'SHIPPED' || current_status === 'IN_TRANSIT') {
            newOrderStatus = 'Shipped';
        } else if (current_status === 'RTO INITIATED' || current_status === 'RTO DELIVERED') {
            newOrderStatus = 'Returned'; // Or a specific RTO status
            newShiprocketStatus = 'RTO';
        } else if (current_status === 'CANCELLED') {
            newOrderStatus = 'Cancelled';
        }

        await orderModel.findByIdAndUpdate(order._id, {
            orderStatus: newOrderStatus,
            shiprocketStatus: newShiprocketStatus,
            deliveredAt: order.deliveredAt // Will be null if not delivered
        });

        return res.json({ success: true, message: "Shiprocket status updated." });

    } catch (error) {
        console.error("Error handling Shiprocket webhook:", error);
        res.status(500).json({ success: false, message: `Internal server error: ${error.message}` });
    }
};

export { calculateRefundAmount, processPrepaidRefund, processCodRefund, requestRefund, updateShiprocketStatusWebhook };