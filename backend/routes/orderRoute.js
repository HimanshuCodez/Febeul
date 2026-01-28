import express from 'express'
import {placeOrder, placeOrderStripe, placeOrderRazorpay, allOrders, userOrders, updateStatus, verifyStripe, verifyRazorpay, getRazorpayKey, generateInvoice, getOrderById} from '../controllers/orderController.js'
import { requestRefund, updateShiprocketStatusWebhook } from '../controllers/refundController.js'; // Import new refund functions
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

// Refund System Routes
orderRouter.post('/refund-request', authUser, requestRefund);
orderRouter.post('/shiprocket-webhook', updateShiprocketStatusWebhook); // Webhook should be unauthenticated

// Invoice Generation
orderRouter.get('/invoice/:orderId', authUser, generateInvoice)
orderRouter.get('/:id', authUser, getOrderById)

export default orderRouter