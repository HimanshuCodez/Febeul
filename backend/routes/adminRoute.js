import express from 'express';
import adminAuth from '../middleware/adminAuth.js';
import * as adminController from '../controllers/adminController.js';

const adminRouter = express.Router();

console.log('Admin Router Registered');

adminRouter.get('/dashboard-stats', adminAuth, adminController.getDashboardStats);
adminRouter.get('/monthly-trends', adminAuth, adminController.getMonthlyTrends);
adminRouter.get('/category-sales', adminAuth, adminController.getCategorySales);
adminRouter.get('/recent-orders', adminAuth, adminController.getRecentOrders);
adminRouter.get('/sku-sales', adminAuth, adminController.getSkuSales);
adminRouter.get('/export-report', adminAuth, adminController.exportReport);

export default adminRouter;