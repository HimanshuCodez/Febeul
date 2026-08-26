import express from 'express';
import adminAuth from '../middleware/adminAuth.js';
import { resetDashboardStats, resetOrders, resetUsers, resetProducts } from '../controllers/resetController.js';

const resetRouter = express.Router();

resetRouter.post('/dashboard-stats', adminAuth, resetDashboardStats);
resetRouter.post('/orders', adminAuth, resetOrders);
resetRouter.post('/users', adminAuth, resetUsers);
resetRouter.post('/products', adminAuth, resetProducts);

export default resetRouter;
