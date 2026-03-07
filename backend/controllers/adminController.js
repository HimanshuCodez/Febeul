import userModel from '../models/userModel.js';
import orderModel from '../models/orderModel.js';
import productModel from '../models/productModel.js';
import mongoose from 'mongoose';
import PDFDocument from 'pdfkit';

// Helper function to calculate date ranges
const getDateRange = (range, customStart, customEnd) => {
    let endDate = new Date();
    let startDate = new Date();

    if (range === 'custom' && customStart && customEnd) {
        startDate = new Date(customStart);
        endDate = new Date(customEnd);
        // Ensure endDate includes the full day
        endDate.setHours(23, 59, 59, 999);
        return { startDate, endDate };
    }

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

export const exportReport = async (req, res) => {
    try {
        const { range, startDate: customStart, endDate: customEnd } = req.query;
        const { startDate, endDate } = getDateRange(range, customStart, customEnd);

        // Fetch all data needed for the report
        const totalUsers = await userModel.countDocuments({ createdAt: { $gte: startDate, $lte: endDate } });
        const orders = await orderModel.find({ date: { $gte: startDate.getTime(), $lte: endDate.getTime() } }).populate('userId', 'name email');
        const totalOrders = orders.length;
        const revenue = orders.reduce((acc, order) => acc + order.orderTotal, 0);
        const avgOrderValue = totalOrders > 0 ? revenue / totalOrders : 0;

        // Fetch Category Sales
        const categorySales = await orderModel.aggregate([
            { $match: { date: { $gte: startDate.getTime(), $lte: endDate.getTime() } } },
            { $unwind: '$items' },
            {
                $lookup: {
                    from: 'products',
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
            { $project: { _id: 0, name: '$_id', value: '$totalSales' } }
        ]);

        // Fetch SKU Sales for report
        const skuSales = await orderModel.aggregate([
            { $match: { date: { $gte: startDate.getTime(), $lte: endDate.getTime() } } },
            { $unwind: '$items' },
            {
                $lookup: {
                    from: 'products',
                    localField: 'items.productId',
                    foreignField: '_id',
                    as: 'productInfo'
                }
            },
            { $unwind: '$productInfo' },
            {
                $group: {
                    _id: {
                        sku: '$productInfo.variations.sku',
                        name: '$productInfo.name'
                    },
                    totalSold: { $sum: '$items.quantity' },
                    revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
                }
            },
            {
                $project: {
                    _id: 0,
                    sku: { $arrayElemAt: ["$_id.sku", 0] },
                    name: '$_id.name',
                    totalSold: 1,
                    revenue: 1
                }
            },
            { $sort: { totalSold: -1 } }
        ]);

        // Create PDF
        const doc = new PDFDocument({ margin: 50 });
        const dateString = range === 'custom' ? `${customStart}_to_${customEnd}` : range;
        const filename = `Febeul_Sales_Report_${dateString}_${new Date().toISOString().split('T')[0]}.pdf`;

        res.setHeader('Content-disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-type', 'application/pdf');

        doc.pipe(res);

        // Header
        doc.fillColor('#f9aeaf').fontSize(25).text('FEBEUL', { align: 'center' });
        doc.fillColor('#444444').fontSize(15).text('Sales Performance Report', { align: 'center' });
        doc.moveDown();
        doc.fontSize(10).text(`Reporting Period: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`, { align: 'center' });
        doc.text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
        doc.moveDown();

        // Line
        doc.moveTo(50, 150).lineTo(550, 150).strokeColor('#cccccc').stroke();
        doc.moveDown();

        // Summary Statistics
        doc.fillColor('#333333').fontSize(16).text('Summary Statistics', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(12).text(`Total Users Acquired: ${totalUsers}`);
        doc.text(`Total Orders Placed: ${totalOrders}`);
        doc.text(`Total Revenue: ₹${revenue.toLocaleString()}`);
        doc.text(`Average Order Value: ₹${avgOrderValue.toFixed(2)}`);
        doc.moveDown();

        // Category Sales
        if (categorySales.length > 0) {
            doc.fontSize(16).text('Sales by Category', { underline: true });
            doc.moveDown(0.5);
            categorySales.forEach(cat => {
                doc.fontSize(12).text(`${cat.name || 'Uncategorized'}: ₹${cat.value.toLocaleString()}`);
            });
            doc.moveDown();
        }

        // Sales by SKU Table
        doc.fontSize(16).text('Sales by SKU', { underline: true });
        doc.moveDown(0.5);

        // Table Header
        const tableTop = doc.y;
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('SKU', 50, tableTop);
        doc.text('Product Name', 150, tableTop);
        doc.text('Sold', 350, tableTop, { width: 50, align: 'right' });
        doc.text('Revenue', 450, tableTop, { width: 100, align: 'right' });
        
        doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).stroke();
        doc.font('Helvetica').fontSize(10);

        let y = tableTop + 25;
        skuSales.forEach(item => {
            if (y > 730) {
                doc.addPage();
                y = 50;
            }
            // Truncate name for a cleaner UI
            const displayName = item.name && item.name.length > 40 
                ? item.name.substring(0, 37) + '...' 
                : item.name || 'N/A';

            doc.text(item.sku || 'N/A', 50, y);
            doc.text(displayName, 150, y, { width: 180 });
            doc.text(item.totalSold.toString(), 350, y, { width: 50, align: 'right' });
            doc.text(`₹${item.revenue.toLocaleString()}`, 450, y, { width: 100, align: 'right' });
            y += 20; 
        });

        doc.end();

    } catch (error) {
        console.error('Error in exportReport:', error);
        res.status(500).json({ success: false, message: 'Error generating report.' });
    }
};

export const getDashboardStats = async (req, res) => {
    try {
        const { range, startDate: customStart, endDate: customEnd } = req.query;
        const { startDate, endDate } = getDateRange(range, customStart, customEnd);

        // Fetch total users within the range
        const totalUsers = await userModel.countDocuments({ createdAt: { $gte: startDate, $lte: endDate } });
        // Fetch total orders within the range
        const totalOrders = await orderModel.countDocuments({ date: { $gte: startDate.getTime(), $lte: endDate.getTime() } });
        // Fetch total revenue within the range
        const revenueResult = await orderModel.aggregate([
            { $match: { date: { $gte: startDate.getTime(), $lte: endDate.getTime() } } },
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
        const { range, startDate: customStart, endDate: customEnd } = req.query;
        const { startDate, endDate } = getDateRange(range, customStart, customEnd);

        const trends = await orderModel.aggregate([
            { $match: { date: { $gte: startDate.getTime(), $lte: endDate.getTime() } } },
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

export const getDailyTrends = async (req, res) => {
    try {
        const { range, startDate: customStart, endDate: customEnd } = req.query;
        const { startDate, endDate } = getDateRange(range, customStart, customEnd);

        const trends = await orderModel.aggregate([
            { $match: { date: { $gte: startDate.getTime(), $lte: endDate.getTime() } } },
            {
                $group: {
                    _id: {
                        day: { $dayOfMonth: { $toDate: "$date" } },
                        month: { $month: { $toDate: "$date" } },
                        year: { $year: { $toDate: "$date" } }
                    },
                    orders: { $sum: 1 },
                    revenue: { $sum: "$orderTotal" }
                }
            },
            {
                $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 }
            },
            {
                $project: {
                    _id: 0,
                    date: {
                        $dateToString: {
                            format: "%Y-%m-%d",
                            date: { $toDate: { $concat: [ { $toString: "$_id.year" }, "-", { $toString: "$_id.month" }, "-", { $toString: "$_id.day" } ] } }
                        }
                    },
                    orders: 1,
                    revenue: 1
                }
            }
        ]);

        // Integrate user sign-ups for daily trends
        const userTrends = await userModel.aggregate([
            { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
            {
                $group: {
                    _id: {
                        day: { $dayOfMonth: "$createdAt" },
                        month: { $month: "$createdAt" },
                        year: { $year: "$createdAt" }
                    },
                    users: { $sum: 1 }
                }
            },
            {
                $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 }
            },
            {
                $project: {
                    _id: 0,
                    date: {
                        $dateToString: {
                            format: "%Y-%m-%d",
                            date: { $toDate: { $concat: [ { $toString: "$_id.year" }, "-", { $toString: "$_id.month" }, "-", { $toString: "$_id.day" } ] } }
                        }
                    },
                    users: 1
                }
            }
        ]);

        // Merge order and user trends
        // We'll use a Map to merge them efficiently
        const mergedData = new Map();

        trends.forEach(item => {
            mergedData.set(item.date, { ...item, users: 0 });
        });

        userTrends.forEach(item => {
            if (mergedData.has(item.date)) {
                mergedData.get(item.date).users = item.users;
            } else {
                mergedData.set(item.date, { date: item.date, orders: 0, revenue: 0, users: item.users });
            }
        });

        const mergedTrends = Array.from(mergedData.values()).sort((a, b) => new Date(a.date) - new Date(b.date));

        res.json({ success: true, trends: mergedTrends });

    } catch (error) {
        console.error('Error in getDailyTrends:', error);
        res.json({ success: false, message: 'Error fetching daily trends.' });
    }
};

export const getCategorySales = async (req, res) => {
    try {
        const { range, startDate: customStart, endDate: customEnd } = req.query;
        const { startDate, endDate } = getDateRange(range, customStart, customEnd);

        // This aggregation is more complex as it requires joining orders with products to get categories
        // For simplicity, let's assume each order item has a category or we can look it up
        // A full implementation would involve:
        // 1. Matching orders by date and payment status
        // 2. Unwinding order.items
        // 3. Looking up product details for each item (to get category)
        // 4. Grouping by category and summing sales
        
        // Example dynamic aggregation (requires productModel to have a 'category' field and order items to reference product IDs)
        const dynamicSales = await orderModel.aggregate([
            { $match: { date: { $gte: startDate.getTime(), $lte: endDate.getTime() } } },
            { $unwind: '$items' },
            {
                $lookup: {
                    from: 'products', // The collection name for productModel
                    localField: 'items.productId',
                    foreignField: '_id',
                    as: 'productInfo'
                }
            },
            { $unwind: '$productInfo' }, // Only proceed with items that successfully linked to a product
            {
                $group: {
                    _id: '$productInfo.category', // Group by actual category, if product found
                    totalSales: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
                }
            },
            {
                $project: {
                    _id: 0,
                    name: '$_id',
                    value: '$totalSales'
                }
            }
        ]);
        
        const totalSalesValue = dynamicSales.reduce((acc, curr) => acc + curr.value, 0);

        const salesInPercentage = dynamicSales.map(item => ({
            name: item.name,
            value: totalSalesValue > 0 ? parseFloat(((item.value / totalSalesValue) * 100).toFixed(2)) : 0
        }));

        console.log("Category Sales sent to frontend:", salesInPercentage);

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

        const formattedOrders = recentOrders.map(order => {
            const orderDate = order.date ? new Date(order.date) : new Date();
            const isValidDate = !isNaN(orderDate.getTime());
            
            return {
                id: `#${order._id.toString().slice(-5)}`, // Short ID
                customer: order.userId ? order.userId.name || order.userId.email : 'Guest',
                amount: order.orderTotal,
                status: order.orderStatus,
                date: isValidDate ? orderDate.toLocaleDateString() : new Date().toLocaleDateString(),
                time: isValidDate 
                    ? `${Math.round((Date.now() - orderDate.getTime()) / (1000 * 60 * 60))} hours ago` 
                    : 'Recently'
            };
        });

        res.json({ success: true, orders: formattedOrders });

    } catch (error) {
        console.error('Error in getRecentOrders:', error);
        res.json({ success: false, message: 'Error fetching recent orders.' });
    }
};

export const getSkuSales = async (req, res) => {
    try {
        const { range, startDate: customStart, endDate: customEnd } = req.query;
        const { startDate, endDate } = getDateRange(range, customStart, customEnd);

        const skuSales = await orderModel.aggregate([
            { $match: { date: { $gte: startDate.getTime(), $lte: endDate.getTime() } } },
            { $unwind: '$items' },
            {
                $lookup: {
                    from: 'products',
                    localField: 'items.productId',
                    foreignField: '_id',
                    as: 'productInfo'
                }
            },
            { $unwind: '$productInfo' },
            {
                $group: {
                    _id: {
                        sku: '$productInfo.variations.sku',
                        name: '$productInfo.name'
                    },
                    totalSold: { $sum: '$items.quantity' },
                    revenue: { $sum: { $multiply: ['$items.quantity', '$items.price'] } }
                }
            },
            {
                $project: {
                    _id: 0,
                    sku: { $arrayElemAt: ["$_id.sku", 0] }, // Just taking the first SKU for simplicity if multiple variations exist
                    name: '$_id.name',
                    totalSold: 1,
                    revenue: 1
                }
            },
            { $sort: { totalSold: -1 } },
            { $limit: 10 }
        ]);

        res.json({ success: true, skuSales });

    } catch (error) {
        console.error('Error in getSkuSales:', error);
        res.json({ success: false, message: 'Error fetching SKU sales.' });
    }
};

export const getSkuStocks = async (req, res) => {
    try {
        const products = await productModel.find({});
        const skuStocks = [];

        products.forEach(product => {
            product.variations.forEach(variation => {
                const totalStock = variation.sizes.reduce((sum, size) => sum + (size.stock || 0), 0);
                skuStocks.push({
                    sku: variation.sku || 'N/A',
                    name: `${product.name} (${variation.color})`,
                    stock: totalStock
                });
            });
        });

        // Sort by stock low to high to highlight low stock items if needed, or just alphabetically
        skuStocks.sort((a, b) => b.stock - a.stock);

        res.json({ success: true, skuStocks });
    } catch (error) {
        console.error('Error in getSkuStocks:', error);
        res.json({ success: false, message: 'Error fetching SKU stocks.' });
    }
};
