import express from 'express'
import {placeOrder, placeOrderStripe, placeOrderRazorpay, allOrders, userOrders, updateStatus, verifyStripe, verifyRazorpay, getRazorpayKey, generateInvoice, getOrderById, cancelOrder} from '../controllers/orderController.js'
import { requestRefund } from '../controllers/refundController.js'; // Import new refund functions
import { handleWebhook } from '../controllers/shiprocketWebhookController.js';
import adminAuth  from '../middleware/adminAuth.js'
import authUser from '../middleware/auth.js'

const orderRouter = express.Router()

orderRouter.get('/get-key', getRazorpayKey)

// Admin Features
orderRouter.post('/list',adminAuth,allOrders)
orderRouter.post('/status',adminAuth,updateStatus)

// Payment Features
orderRouter.post('/place',authUser,placeOrder)
orderRouter.post('/stripe',authUser,placeOrderStripe)
orderRouter.post('/razorpay',authUser,placeOrderRazorpay)

// User Feature 
orderRouter.post('/userorders',authUser,userOrders)

// verify payment
orderRouter.post('/verifyStripe',authUser, verifyStripe)
orderRouter.post('/verifyRazorpay',authUser, verifyRazorpay)

// Cancel Order
orderRouter.post('/cancel', authUser, cancelOrder)

// Refund System Routes
orderRouter.post('/refund-request', authUser, requestRefund);
orderRouter.post('/shiprocket-webhook', handleWebhook); // Legacy URL, now backed by the same authenticated handler as /api/tracking/tracking-updates

// Invoice Generation
orderRouter.get('/invoice/:orderId', authUser, generateInvoice)
orderRouter.get('/:id', authUser, getOrderById)

export default orderRouter