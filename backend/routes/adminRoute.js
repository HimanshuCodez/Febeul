import express from 'express';
import adminAuth from '../middleware/adminAuth.js';
import { getDashboardStats, getMonthlyTrends, getCategorySales, getRecentOrders } from '../controllers/adminController.js';

const adminRouter = express.Router();

adminRouter.get('/dashboard-stats', adminAuth, getDashboardStats);
adminRouter.get('/monthly-trends', adminAuth, getMonthlyTrends);
adminRouter.get('/category-sales', adminAuth, getCategorySales);
adminRouter.get('/recent-orders', adminAuth, getRecentOrders);

export default adminRouter;