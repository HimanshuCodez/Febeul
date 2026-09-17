import mongoose from 'mongoose';

const trackingHistorySchema = {
    status: { type: String },
    activity: { type: String },
    location: { type: String },
    date: { type: Date }
};

const exchangeSchema = new mongoose.Schema({
    ticketId: { type: String, required: true, unique: true }, // EX-XXXXXX
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'order', required: true },
    orderItemIndex: { type: Number, required: true }, // index into order.items this exchange is for
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true },

    // Snapshot of the ordered item, taken at request time, so the ticket can be
    // displayed without re-populating the order/product every time.
    originalItem: {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'product' },
        name: { type: String },
        image: { type: String },
        size: { type: String },
        sku: { type: String },
        price: { type: Number },
        quantity: { type: Number }
    },

    reason: { type: String, enum: ['wrong_item', 'damaged'], required: true },
    description: { type: String },
    images: { type: [String], default: [] }, // customer evidence photos

    status: {
        type: String,
        enum: [
            'REQUESTED',
            'VERIFICATION_REJECTED',
            'VERIFICATION_APPROVED',
            'PICKUP_SCHEDULED',
            'PICKUP_FAILED',
            'PICKED_UP',
            'RECEIVED_AT_WAREHOUSE',
            'QC_FAILED',
            'NEW_PRODUCT_DISPATCHED',
            'OUT_FOR_DELIVERY',
            'DELIVERED',
            'EXPIRED'
        ],
        default: 'REQUESTED'
    },
    rejectionReason: { type: String },

    windowExpiresAt: { type: Date }, // deliveredAt + 2 days, set at creation

    // Reverse pickup — courier collects the wrong/damaged item from the customer.
    reversePickup: {
        status: { type: String, enum: ['none', 'scheduled', 'failed', 'picked_up', 'in_transit', 'delivered_to_warehouse'], default: 'none' },
        shiprocketReturnOrderId: { type: String },
        shipmentId: { type: String },
        awb: { type: String },
        courier: { type: String },
        trackingUrl: { type: String },
        scheduledDate: { type: Date },
        failureReason: { type: String },
        lastTrackedAt: { type: Date },
        trackingHistory: [trackingHistorySchema]
    },

    qc: {
        result: { type: String, enum: ['PASS', 'FAIL'] },
        by: { type: String },
        date: { type: Date },
        notes: { type: String },
        photos: { type: [String], default: [] } // mandatory when result is FAIL
    },

    // What actually gets shipped back out. Defaults to originalItem's variation;
    // admin may substitute a different size/color of the same product if the
    // original is out of stock — always a free swap, no charge either way.
    replacement: {
        size: { type: String },
        sku: { type: String },
        price: { type: Number },
        substituted: { type: Boolean, default: false },
        substitutionNote: { type: String }
    },

    forwardShipment: {
        srOrderId: { type: String },
        shipmentId: { type: String },
        awb: { type: String },
        courier: { type: String },
        trackingUrl: { type: String },
        edd: { type: Date },
        dispatchedDate: { type: Date },
        lastTrackedAt: { type: Date },
        trackingHistory: [trackingHistorySchema]
    },

    // Append-only. Entries are added, never edited or deleted.
    timeline: [{
        event: { type: String },
        status: { type: String },
        note: { type: String },
        source: { type: String, enum: ['customer', 'admin', 'system', 'shiprocket_reverse', 'shiprocket_forward'], default: 'system' },
        by: { type: String },
        date: { type: Date, default: Date.now }
    }],

    closedAt: { type: Date }
}, { timestamps: true });

const exchangeModel = mongoose.models.exchange || mongoose.model('exchange', exchangeSchema);
export default exchangeModel;
