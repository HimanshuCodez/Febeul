import userModel from '../models/userModel.js';
import orderModel from '../models/orderModel.js';
import productModel from '../models/productModel.js';
import mongoose from 'mongoose';

// Helper function to calculate date ranges
const getDateRange = (range) => {
    const endDate = new Date();
    let startDate = new Date();

    switch (range) {
        case '7days':
            startDate.setDate(endDate.getDate() - 7);
            break;
        case '30days':
            startDate.setDate(endDate.getDate() - 30);
            break;
        case '90days':
            startDate.setDate(endDate.getDate() - 90);
            break;
        case 'year':
            startDate.setFullYear(endDate.getFullYear() - 1);
            break;
        default: // 30days as default
            startDate.setDate(endDate.getDate() - 30);
            break;
    }
    return { startDate, endDate };
};

export const getDashboardStats = async (req, res) => {
    try {
        const { range } = req.query;
        const { startDate, endDate } = getDateRange(range);

        // Fetch total users within the range
        const totalUsers = await userModel.countDocuments({ createdAt: { $gte: startDate, $lte: endDate } });
        // Fetch total orders within the range
        const totalOrders = await orderModel.countDocuments({ date: { $gte: startDate.getTime(), $lte: endDate.getTime() } });
        // Fetch total revenue within the range
        const revenueResult = await orderModel.aggregate([
            { $match: { date: { $gte: startDate.getTime(), $lte: endDate.getTime() }, payment: true } },
            { $group: { _id: null, totalRevenue: { $sum: '$orderTotal' } } }
        ]);
        const revenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;

        // Calculate average order value
        const avgOrderValue = totalOrders > 0 ? revenue / totalOrders : 0;

        // Placeholder for change calculation (requires fetching previous period data)
        const userChange = '+0%'; // Example
        const userChangeType = 'up'; // Example
        const orderChange = '+0%'; // Example
        const orderChangeType = 'up'; // Example
        const revenueChange = '+0%'; // Example
        const revenueChangeType = 'up'; // Example
        const avgOrderValueChange = '+0%'; // Example
        const avgOrderValueChangeType = 'up'; // Example

        res.json({
            success: true,
            stats: {
                totalUsers, totalOrders, revenue, avgOrderValue,
                userChange, userChangeType, orderChange, orderChangeType,
                revenueChange, revenueChangeType, avgOrderValueChange, avgOrderValueChangeType
            }
        });

    } catch (error) {
        console.error('Error in getDashboardStats:', error);
        res.json({ success: false, message: 'Error fetching dashboard stats.' });
    }
};

export const getMonthlyTrends = async (req, res) => {
    try {
        const { range } = req.query;
        const { startDate, endDate } = getDateRange(range);

        const trends = await orderModel.aggregate([
            { $match: { date: { $gte: startDate.getTime(), $lte: endDate.getTime() }, payment: true } },
            {
                $group: {
                    _id: {
                        month: { $month: { $toDate: "$date" } },
                        year: { $year: { $toDate: "$date" } }
                    },
                    orders: { $sum: 1 },
                    revenue: { $sum: "$orderTotal" }
                }
            },
            {
                $sort: { "_id.year": 1, "_id.month": 1 }
            },
            {
                $project: {
                    _id: 0,
                    month: {
                        $dateToString: {
                            format: "%b",
                            date: { $toDate: { $concat: [ { $toString: "$_id.year" }, "-", { $toString: "$_id.month" }, "-01" ] } }
                        }
                    },
                    orders: 1,
                    revenue: 1
                }
            }
        ]);

        // Integrate user sign-ups for monthly trends
        const userTrends = await userModel.aggregate([
            { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
            {
                $group: {
                    _id: {
                        month: { $month: "$createdAt" },
                        year: { $year: "$createdAt" }
                    },
                    users: { $sum: 1 }
                }
            },
            {
                $sort: { "_id.year": 1, "_id.month": 1 }
            },
            {
                $project: {
                    _id: 0,
                    month: {
                        $dateToString: {
                            format: "%b",
                            date: { $toDate: { $concat: [ { $toString: "$_id.year" }, "-", { $toString: "$_id.month" }, "-01" ] } }
                        }
                    },
                    users: 1
                }
            }
        ]);

        // Merge order and user trends
        const mergedTrends = trends.map(orderTrend => {
            const userTrend = userTrends.find(ut => ut.month === orderTrend.month);
            return { ...orderTrend, users: userTrend ? userTrend.users : 0 };
        });


        res.json({ success: true, trends: mergedTrends });

    } catch (error) {
        console.error('Error in getMonthlyTrends:', error);
        res.json({ success: false, message: 'Error fetching monthly trends.' });
    }
};

export const getCategorySales = async (req, res) => {
    try {
        const { range } = req.query;
        const { startDate, endDate } = getDateRange(range);

        // This aggregation is more complex as it requires joining orders with products to get categories
        // For simplicity, let's assume each order item has a category or we can look it up
        // A full implementation would involve:
        // 1. Matching orders by date and payment status
        // 2. Unwinding order.items
        // 3. Looking up product details for each item (to get category)
        // 4. Grouping by category and summing sales
        
        // Example dynamic aggregation (requires productModel to have a 'category' field and order items to reference product IDs)
        const dynamicSales = await orderModel.aggregate([
            { $match: { date: { $gte: startDate.getTime(), $lte: endDate.getTime() }, payment: true } },
            { $unwind: '$items' },
            {
                $lookup: {
                    from: 'products', // The collection name for productModel
                    localField: 'items.productId',
                    foreignField: '_id',
                    as: 'productInfo'
                }
            },
            { $unwind: '$productInfo' },
            {
                $group: {
                    _id: '$productInfo.category',
                    totalSales: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
                }
            },
            {
                $project: {
                    _id: 0,
                    name: '$_id',
                    value: '$totalSales' // Value here would be absolute sales, frontend converts to percentage
                }
            }
        ]);

        // If categories are stored as sub-documents in productModel, this would be more direct.
        // For now, converting absolute sales to percentages for frontend display might be needed on frontend.
        // Or, calculate percentage here:
        const totalSalesValue = dynamicSales.reduce((sum, item) => sum + item.value, 0);
        const salesInPercentage = dynamicSales.map(item => ({
            name: item.name,
            value: totalSalesValue > 0 ? parseFloat(((item.value / totalSalesValue) * 100).toFixed(2)) : 0
        }));

        res.json({ success: true, sales: salesInPercentage });

    } catch (error) {
        console.error('Error in getCategorySales:', error);
        res.json({ success: false, message: 'Error fetching category sales.' });
    }
};

export const getRecentOrders = async (req, res) => {
    try {
        const recentOrders = await orderModel.find({})
            .sort({ date: -1 })
            .limit(10)
            .populate('userId', 'name email') // Populate user details
            .select('_id orderTotal orderStatus date userId') // Select relevant fields

        const formattedOrders = recentOrders.map(order => ({
            id: `#${order._id.toString().slice(-5)}`, // Short ID
            customer: order.userId ? order.userId.name || order.userId.email : 'Guest',
            amount: order.orderTotal,
            status: order.orderStatus,
            time: `${Math.round((Date.now() - order.date) / (1000 * 60 * 60))} hours ago` // Simple time diff
        }));

        res.json({ success: true, orders: formattedOrders });

    } catch (error) {
        console.error('Error in getRecentOrders:', error);
        res.json({ success: false, message: 'Error fetching recent orders.' });
    }
};
