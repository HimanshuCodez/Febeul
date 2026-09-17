import { v2 as cloudinary } from 'cloudinary';
import exchangeModel from '../models/exchangeModel.js';
import orderModel from '../models/orderModel.js';
import productModel from '../models/productModel.js';
import { createReturnOrder, createExchangeForwardOrder, buildShiprocketOrderPayload } from '../utils/shiprocket.js';
import {
    EXCHANGE_WINDOW_DAYS,
    getExchangeSettings,
    buildAdminExchangeView,
    sanitizeExchangeForCustomer,
    appendExchangeHistory,
    applyWindowExpiry,
    EXCHANGE_TAB_DEFS
} from '../utils/exchangeStatus.js';

const actorOf = (req) => req.userName || req.userEmail || 'admin';

const generateTicketId = async () => {
    let ticketId;
    let isUnique = false;
    while (!isUnique) {
        ticketId = `EX-${Math.floor(100000 + Math.random() * 900000)}`;
        const existing = await exchangeModel.findOne({ ticketId });
        if (!existing) isUnique = true;
    }
    return ticketId;
};

const OPEN_TERMINAL_STATUSES = ['VERIFICATION_REJECTED', 'QC_FAILED', 'DELIVERED', 'EXPIRED'];

// Resolves a product's variation (by sku) + a specific size entry.
// order.items doesn't persist `color` (schema gap — see productModel/orderModel),
// so sku (persisted per color-variation) + size is the reliable lookup.
const findVariationSize = (product, sku, size) => {
    const variation = product.variations.find(v => v.sku === sku);
    if (!variation) return null;
    return variation.sizes.find(s => s.size === size) || null;
};

// --- Customer: create a request -------------------------------------------
const requestExchange = async (req, res) => {
    try {
        const { orderId, orderItemIndex, reason, description } = req.body;
        const userId = req.userId;
        const files = req.files || [];

        if (!['wrong_item', 'damaged'].includes(reason)) {
            return res.json({ success: false, message: 'Please select a valid reason.' });
        }
        if (files.length < 1 || files.length > 4) {
            return res.json({ success: false, message: 'Please upload 1 to 4 photos as evidence.' });
        }

        const order = await orderModel.findById(orderId);
        if (!order) return res.json({ success: false, message: 'Order not found.' });
        if (order.userId.toString() !== userId) return res.json({ success: false, message: 'Unauthorized.' });

        if (order.orderStatus !== 'Delivered' || !order.deliveredAt) {
            return res.json({ success: false, message: 'Only delivered orders are eligible for exchange.' });
        }

        const windowMs = EXCHANGE_WINDOW_DAYS * 24 * 60 * 60 * 1000;
        if ((Date.now() - new Date(order.deliveredAt).getTime()) > windowMs) {
            return res.json({ success: false, message: 'Exchange window expired.' });
        }

        const itemIndex = Number(orderItemIndex);
        const item = order.items[itemIndex];
        if (!item) return res.json({ success: false, message: 'Order item not found.' });

        // The two flows are mutually exclusive on the same order — a customer
        // who already has a return/refund in progress can't also open an exchange.
        if (order.refundDetails?.status && !['none', 'rejected'].includes(order.refundDetails.status)) {
            return res.json({ success: false, message: 'This order already has an active return/refund request.' });
        }

        const existing = await exchangeModel.findOne({
            orderId,
            orderItemIndex: itemIndex,
            status: { $nin: OPEN_TERMINAL_STATUSES }
        });
        if (existing) return res.json({ success: false, message: 'An exchange request is already open for this item.' });

        const imageUrls = [];
        for (const file of files) {
            const result = await cloudinary.uploader.upload(file.path, { resource_type: 'image' });
            imageUrls.push(result.secure_url);
        }

        const ticketId = await generateTicketId();
        const requestedAt = new Date();

        const exchange = new exchangeModel({
            ticketId,
            orderId,
            orderItemIndex: itemIndex,
            userId,
            originalItem: {
                productId: item.productId,
                name: item.name,
                image: item.image,
                size: item.size,
                sku: item.sku,
                price: item.price,
                quantity: item.quantity
            },
            reason,
            description: description || '',
            images: imageUrls,
            windowExpiresAt: new Date(new Date(order.deliveredAt).getTime() + windowMs)
        });

        appendExchangeHistory(exchange, {
            event: 'EXCHANGE_CREATED',
            status: 'REQUESTED',
            note: `Customer requested an exchange — ${reason === 'wrong_item' ? 'wrong item delivered' : 'damaged/defective product'}`,
            by: 'customer',
            source: 'customer'
        });

        await exchange.save();
        res.json({ success: true, message: 'Exchange request submitted.', ticketId: exchange.ticketId });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// --- Customer: view own exchange(s) ----------------------------------------
const getMyExchange = async (req, res) => {
    try {
        const { orderId, itemIndex } = req.params;
        const exchange = await exchangeModel.findOne({ orderId, orderItemIndex: Number(itemIndex), userId: req.userId });
        if (!exchange) return res.json({ success: false, message: 'No exchange found.' });

        if (applyWindowExpiry(exchange)) await exchange.save();

        const settings = await getExchangeSettings();
        res.json({ success: true, exchange: sanitizeExchangeForCustomer(exchange, settings) });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

const cancelExchangeRequest = async (req, res) => {
    try {
        const { ticketId } = req.body;
        const exchange = await exchangeModel.findOne({ ticketId, userId: req.userId });
        if (!exchange) return res.json({ success: false, message: 'Exchange not found.' });
        if (exchange.status !== 'REQUESTED') {
            return res.json({ success: false, message: 'This request can no longer be cancelled.' });
        }

        exchange.status = 'VERIFICATION_REJECTED';
        exchange.rejectionReason = 'Cancelled by customer';
        exchange.closedAt = new Date();
        appendExchangeHistory(exchange, {
            event: 'EXCHANGE_CANCELLED',
            status: 'VERIFICATION_REJECTED',
            note: 'Cancelled by customer before verification.',
            by: 'customer',
            source: 'customer'
        });
        await exchange.save();
        res.json({ success: true, message: 'Exchange request cancelled.' });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// --- Admin: queue listing ---------------------------------------------------
const listExchanges = async (req, res) => {
    try {
        const exchanges = await exchangeModel.find({})
            .populate('userId', 'name email')
            .sort({ createdAt: -1 });

        let anyExpired = false;
        for (const exchange of exchanges) {
            if (applyWindowExpiry(exchange)) anyExpired = true;
        }
        if (anyExpired) {
            await Promise.all(exchanges.filter(e => e.isModified()).map(e => e.save()));
        }

        const rows = exchanges.map(exchange => ({
            ...exchange.toObject(),
            view: buildAdminExchangeView(exchange)
        }));

        const counts = EXCHANGE_TAB_DEFS.reduce((acc, tab) => {
            acc[tab.key] = rows.filter(row => row.view.bucket === tab.key).length;
            return acc;
        }, { all: rows.length });

        res.json({ success: true, exchanges: rows, counts });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

const getExchange = async (req, res) => {
    try {
        const exchange = await exchangeModel.findById(req.params.id).populate('userId', 'name email');
        if (!exchange) return res.json({ success: false, message: 'Exchange not found.' });
        if (applyWindowExpiry(exchange)) await exchange.save();
        res.json({ success: true, exchange, view: buildAdminExchangeView(exchange) });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

const loadExchange = async (id) => {
    const exchange = await exchangeModel.findById(id);
    if (!exchange) return { error: 'Exchange not found.' };
    return { exchange };
};

const respondWithExchange = async (res, exchange, message) => {
    await exchange.save();
    return res.json({ success: true, message, exchange, view: buildAdminExchangeView(exchange) });
};

// --- Admin: verification -----------------------------------------------------
const verifyExchange = async (req, res) => {
    try {
        const { exchangeId, decision, rejectionReason } = req.body;
        const { exchange, error } = await loadExchange(exchangeId);
        if (error) return res.json({ success: false, message: error });

        if (exchange.status !== 'REQUESTED') {
            return res.json({ success: false, message: 'This request has already been verified.' });
        }

        if (decision === 'approve') {
            exchange.status = 'VERIFICATION_APPROVED';
            appendExchangeHistory(exchange, {
                event: 'VERIFICATION_APPROVED',
                status: 'VERIFICATION_APPROVED',
                note: 'Exchange approved.',
                by: actorOf(req),
                source: 'admin'
            });
            return respondWithExchange(res, exchange, 'Exchange approved.');
        }

        if (decision === 'reject') {
            if (!rejectionReason || !rejectionReason.toString().trim()) {
                return res.json({ success: false, message: 'A rejection reason is required.' });
            }
            exchange.status = 'VERIFICATION_REJECTED';
            exchange.rejectionReason = rejectionReason.toString().trim();
            exchange.closedAt = new Date();
            appendExchangeHistory(exchange, {
                event: 'VERIFICATION_REJECTED',
                status: 'VERIFICATION_REJECTED',
                note: exchange.rejectionReason,
                by: actorOf(req),
                source: 'admin'
            });
            return respondWithExchange(res, exchange, 'Exchange rejected.');
        }

        res.json({ success: false, message: 'Invalid decision.' });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// --- Admin: schedule reverse pickup (manual trigger) ------------------------
const schedulePickup = async (req, res) => {
    try {
        const { exchangeId } = req.body;
        const { exchange, error } = await loadExchange(exchangeId);
        if (error) return res.json({ success: false, message: error });

        if (!['VERIFICATION_APPROVED', 'PICKUP_FAILED'].includes(exchange.status)) {
            return res.json({ success: false, message: 'Approve this exchange before scheduling a pickup.' });
        }

        const order = await orderModel.findById(exchange.orderId).populate('userId', 'email');
        if (!order) return res.json({ success: false, message: 'Original order not found.' });

        // _id is overridden to the exchange's own id (not the order's) so the
        // resulting Shiprocket order_id — `EXCR-<exchangeId>` — lets the webhook
        // route the update straight back to this exchange ticket.
        const pickupPayload = buildShiprocketOrderPayload({ ...order.toObject(), _id: exchange._id, items: [exchange.originalItem] });
        const returnResponse = await createReturnOrder(pickupPayload, 'EXCR-');

        if (!returnResponse || !returnResponse.order_id) {
            exchange.reversePickup.status = 'failed';
            exchange.reversePickup.failureReason = 'Shiprocket did not accept the reverse pickup.';
            appendExchangeHistory(exchange, {
                event: 'PICKUP_SCHEDULING_FAILED',
                status: 'PICKUP_FAILED',
                note: 'Courier did not accept the reverse pickup — arrange collection manually.',
                by: actorOf(req),
                source: 'admin'
            });
            exchange.status = 'PICKUP_FAILED';
            return respondWithExchange(res, exchange, 'Pickup could not be scheduled — see failure reason.');
        }

        exchange.reversePickup.status = 'scheduled';
        exchange.reversePickup.shiprocketReturnOrderId = returnResponse.order_id;
        exchange.reversePickup.shipmentId = returnResponse.shipment_id;
        exchange.reversePickup.scheduledDate = new Date();
        exchange.status = 'PICKUP_SCHEDULED';
        appendExchangeHistory(exchange, {
            event: 'PICKUP_SCHEDULED',
            status: 'PICKUP_SCHEDULED',
            note: 'Reverse pickup scheduled with the courier.',
            by: actorOf(req),
            source: 'admin'
        });

        return respondWithExchange(res, exchange, 'Pickup scheduled.');
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// --- Admin: warehouse receipt (manual scan) ---------------------------------
const markReceived = async (req, res) => {
    try {
        const { exchangeId, note } = req.body;
        const { exchange, error } = await loadExchange(exchangeId);
        if (error) return res.json({ success: false, message: error });

        if (!['PICKUP_SCHEDULED', 'PICKUP_FAILED', 'PICKED_UP'].includes(exchange.status)) {
            return res.json({ success: false, message: 'This exchange is not awaiting warehouse receipt.' });
        }

        exchange.reversePickup.status = 'delivered_to_warehouse';
        exchange.status = 'RECEIVED_AT_WAREHOUSE';
        // Timestamp is always server-generated — never accepted from the client —
        // so "received" can never be backfilled to an arbitrary date.
        appendExchangeHistory(exchange, {
            event: 'RECEIVED_AT_WAREHOUSE',
            status: 'RECEIVED_AT_WAREHOUSE',
            note: note || 'Old product received at warehouse.',
            by: actorOf(req),
            source: 'admin'
        });

        return respondWithExchange(res, exchange, 'Marked as received. Quality check is now pending.');
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// --- Admin: quality check ----------------------------------------------------
const submitQC = async (req, res) => {
    try {
        const { exchangeId, result, notes } = req.body;
        const { exchange, error } = await loadExchange(exchangeId);
        if (error) return res.json({ success: false, message: error });

        if (exchange.status !== 'RECEIVED_AT_WAREHOUSE') {
            return res.json({ success: false, message: 'Mark the item as received before running a quality check.' });
        }
        if (!['PASS', 'FAIL'].includes(result)) {
            return res.json({ success: false, message: 'Quality check result must be PASS or FAIL.' });
        }

        const files = req.files || [];
        if (result === 'FAIL' && files.length === 0) {
            return res.json({ success: false, message: 'At least one photo is required to record a QC failure.' });
        }

        const photoUrls = [];
        for (const file of files) {
            const uploaded = await cloudinary.uploader.upload(file.path, { resource_type: 'image' });
            photoUrls.push(uploaded.secure_url);
        }

        exchange.qc = {
            result,
            by: actorOf(req),
            date: new Date(),
            notes: notes || '',
            photos: photoUrls
        };

        if (result === 'FAIL') {
            exchange.status = 'QC_FAILED';
            exchange.closedAt = new Date();
        }
        // On PASS the exchange stays at RECEIVED_AT_WAREHOUSE (customer sees
        // nothing new — QC is internal-only) until admin dispatches the replacement.

        appendExchangeHistory(exchange, {
            event: 'QUALITY_CHECK',
            status: result === 'PASS' ? 'QC_PASS' : 'QC_FAILED',
            note: `Quality check ${result}${notes ? ` — ${notes}` : ''}${photoUrls.length ? ` (${photoUrls.length} photo${photoUrls.length > 1 ? 's' : ''})` : ''}`,
            by: actorOf(req),
            source: 'admin'
        });

        return respondWithExchange(res, exchange, `Quality check recorded as ${result}.`);
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// --- Admin: QC failed → hand off to the existing refund pipeline ------------
const redirectToRefund = async (req, res) => {
    try {
        const { exchangeId } = req.body;
        const { exchange, error } = await loadExchange(exchangeId);
        if (error) return res.json({ success: false, message: error });

        if (exchange.status !== 'QC_FAILED') {
            return res.json({ success: false, message: 'Only a QC-failed exchange can be redirected to refund.' });
        }

        const order = await orderModel.findById(exchange.orderId);
        if (!order) return res.json({ success: false, message: 'Original order not found.' });

        if (order.refundDetails?.status && !['none', 'rejected'].includes(order.refundDetails.status)) {
            return res.json({ success: false, message: 'This order already has an active return/refund request.' });
        }

        order.refundDetails.status = 'pending';
        order.refundDetails.requestType = 'refund';
        order.refundDetails.reason = `Exchange ${exchange.ticketId} failed quality check${exchange.qc?.notes ? ` — ${exchange.qc.notes}` : ''}`;
        order.refundDetails.images = exchange.qc?.photos?.length ? exchange.qc.photos : exchange.images;
        order.refundDetails.requestedAt = new Date();
        await order.save();

        appendExchangeHistory(exchange, {
            event: 'REDIRECTED_TO_REFUND',
            status: 'QC_FAILED',
            note: 'Exchange could not be completed — order sent to the Refund Requests queue.',
            by: actorOf(req),
            source: 'admin'
        });

        return respondWithExchange(res, exchange, 'Order moved to Refund Requests.');
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

// --- Admin: dispatch the replacement -----------------------------------------
const dispatchReplacement = async (req, res) => {
    try {
        const { exchangeId, overrideSku, overrideSize, substitutionNote } = req.body;
        const { exchange, error } = await loadExchange(exchangeId);
        if (error) return res.json({ success: false, message: error });

        if (exchange.status !== 'RECEIVED_AT_WAREHOUSE' || exchange.qc?.result !== 'PASS') {
            return res.json({ success: false, message: 'The replacement can only be dispatched after a passed quality check.' });
        }

        const order = await orderModel.findById(exchange.orderId).populate('userId', 'email');
        if (!order) return res.json({ success: false, message: 'Original order not found.' });

        const product = await productModel.findById(exchange.originalItem.productId);
        if (!product) return res.json({ success: false, message: 'Product not found.' });

        const isSubstitution = !!(overrideSku || overrideSize);
        const targetSku = overrideSku || exchange.originalItem.sku;
        const targetSize = overrideSize || exchange.originalItem.size;

        const sizeData = findVariationSize(product, targetSku, targetSize);
        if (!sizeData) return res.json({ success: false, message: 'That variation does not exist for this product.' });
        if (sizeData.stock < exchange.originalItem.quantity) {
            return res.json({ success: false, message: `Insufficient stock (${sizeData.stock} available). Pick a different variation.` });
        }

        sizeData.stock -= exchange.originalItem.quantity;
        await product.save();

        exchange.replacement = {
            size: targetSize,
            sku: targetSku,
            price: exchange.originalItem.price, // free swap — no charge either way, per business policy
            substituted: isSubstitution,
            substitutionNote: isSubstitution ? (substitutionNote || '') : ''
        };

        const forwardResponse = await createExchangeForwardOrder(exchange, order);
        if (!forwardResponse || !forwardResponse.order_id) {
            // Roll back the stock decrement — the dispatch never actually happened.
            sizeData.stock += exchange.originalItem.quantity;
            await product.save();
            return res.json({ success: false, message: 'Shiprocket did not accept the replacement shipment. Nothing was dispatched.' });
        }

        exchange.forwardShipment.srOrderId = forwardResponse.order_id;
        exchange.forwardShipment.shipmentId = forwardResponse.shipment_id;
        exchange.forwardShipment.dispatchedDate = new Date();
        exchange.status = 'NEW_PRODUCT_DISPATCHED';

        appendExchangeHistory(exchange, {
            event: 'NEW_PRODUCT_DISPATCHED',
            status: 'NEW_PRODUCT_DISPATCHED',
            note: isSubstitution
                ? `Replacement dispatched (substituted size ${targetSize})${substitutionNote ? ` — ${substitutionNote}` : ''}`
                : 'Replacement dispatched.',
            by: actorOf(req),
            source: 'admin'
        });

        return respondWithExchange(res, exchange, 'Replacement dispatched.');
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: error.message });
    }
};

export {
    requestExchange,
    getMyExchange,
    cancelExchangeRequest,
    listExchanges,
    getExchange,
    verifyExchange,
    schedulePickup,
    markReceived,
    submitQC,
    redirectToRefund,
    dispatchReplacement
};
