import userModel from '../models/userModel.js';
import orderModel from '../models/orderModel.js';
import productModel from '../models/productModel.js';
import counterModel from '../models/counterModel.js';

// Resets the sequential invoice/order counter used to number invoices shown in dashboard stats.
// Does not delete any orders — analytics figures on the dashboard are computed live from the
// orders/users collections, so there is nothing else to "reset" there.
const resetDashboardStats = async (req, res) => {
    try {
        await counterModel.findOneAndUpdate(
            { id: 'invoiceId' },
            { $set: { seq: 0 } },
            { upsert: true }
        );
        res.json({ success: true, message: 'Invoice counter reset to 0.' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: 'Failed to reset dashboard stats.' });
    }
};

const resetOrders = async (req, res) => {
    try {
        const result = await orderModel.deleteMany({});
        await counterModel.findOneAndUpdate(
            { id: 'invoiceId' },
            { $set: { seq: 0 } },
            { upsert: true }
        );
        res.json({ success: true, message: `Deleted ${result.deletedCount} orders and reset invoice counter.` });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: 'Failed to reset orders.' });
    }
};

// Preserves staff/admin DB accounts so nobody locks themselves out of the admin panel.
const resetUsers = async (req, res) => {
    try {
        const result = await userModel.deleteMany({ role: { $nin: ['admin', 'staff'] } });
        res.json({ success: true, message: `Deleted ${result.deletedCount} customer accounts.` });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: 'Failed to reset users.' });
    }
};

const resetProducts = async (req, res) => {
    try {
        const result = await productModel.deleteMany({});
        res.json({ success: true, message: `Deleted ${result.deletedCount} products.` });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: 'Failed to reset products.' });
    }
};

export { resetDashboardStats, resetOrders, resetUsers, resetProducts };
