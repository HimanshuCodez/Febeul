import express from 'express';
import adminAuth from '../middleware/adminAuth.js';
import * as adminController from '../controllers/adminController.js';
import { updateStaffPermissions } from '../controllers/userController.js';

const adminRouter = express.Router();

adminRouter.get('/dashboard-stats', adminAuth, adminController.getDashboardStats);
adminRouter.get('/monthly-trends', adminAuth, adminController.getMonthlyTrends);
adminRouter.get('/daily-trends', adminAuth, adminController.getDailyTrends);
adminRouter.get('/category-sales', adminAuth, adminController.getCategorySales);
adminRouter.get('/recent-orders', adminAuth, adminController.getRecentOrders);
adminRouter.get('/sku-sales', adminAuth, adminController.getSkuSales);
adminRouter.get('/sku-stocks', adminAuth, adminController.getSkuStocks);
adminRouter.get('/export-report', adminAuth, adminController.exportReport);
adminRouter.post('/send-marketing-mail', adminAuth, adminController.sendMarketingMail);
adminRouter.post('/update-permissions', adminAuth, updateStaffPermissions);

export default adminRouter;