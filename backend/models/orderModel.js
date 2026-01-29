import mongoose from 'mongoose'

const orderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },
    items: [{
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'product', required: true },
        quantity: { type: Number, required: true },
        size: { type: String },
        name: { type: String, required: true}, // Adding name for easier access without populating
        image: { type: String, required: true}, // Adding image for easier access without populating
        price: { type: Number, required: true }
    }],
    orderTotal: { type: Number, required: true }, // Renamed from 'amount' for clarity
    productAmount: { type: Number, default: 0 }, // Sum of product prices only
    shippingCharge: { type: Number, default: 0 },
    codCharge: { type: Number, default: 0 },
    razorpayPaymentId: { type: String }, // For prepaid refunds
    address: { type: Object, required: true },
    orderStatus: { type: String, enum: ['Order Placed', 'Processing', 'Confirmed', 'Shipped', 'Out for delivery', 'Delivered', 'Cancelled', 'Returned', 'Refund Initiated', 'Refunded', 'Failed'], default:'Order Placed' },
    shiprocketStatus: { type: String, enum: ['NEW', 'PICKUP SCHEDULED', 'SHIPPED', 'IN_TRANSIT', 'DELIVERED', 'RTO', 'CANCELLED', 'UNKNOWN'], default: 'NEW' }, // Shiprocket status
    shippedAt: { type: Date },
    deliveredAt: { type: Date },
    paymentMethod: { type: String, required: true, enum: ['COD', 'Stripe', 'Razorpay'] },
    payment: { type: Boolean, required: true , default: false },
    paymentDetails: { type: Object },
    date: {type: Number, required:true},

    // Refund details
    refundDetails: {
        status: { type: String, enum: ['none', 'pending', 'initiated', 'processing', 'completed', 'failed'], default: 'none' },
        amount: { type: Number, default: 0 },
        id: { type: String }, // Razorpay refund ID
        reason: { type: String },
        images: { type: [String], default: [] }, // Added images for refund request
        requestedAt: { type: Date },
        processedAt: { type: Date },
        customerPayoutDetails: { // For COD refunds
            type: { type: String, enum: ['upi', 'bank'] },
            upiId: { type: String },
            bankAccount: { type: String },
            ifsc: { type: String },
            accountHolderName: { type: String }
        }
    },
    // To prevent double refunds or conflicting operations
    isRefundable: { type: Boolean, default: true }, 
    isCancelled: { type: Boolean, default: false },
    shiprocket: {
        orderId: { type: String },
        shipmentId: { type: String },
        awb: { type: String },
        courier: { type: String },
        trackingUrl: { type: String }
    }
})

const orderModel = mongoose.models.order || mongoose.model('order',orderSchema)
export default orderModel;