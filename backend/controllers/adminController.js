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
        const doc = new PDFDocument({ 
            margin: 50,
            size: 'A4',
            bufferPages: false, // Ensure we write directly to the stream
            info: {
                Title: 'Febeul Sales Report',
                Author: 'Febeul Admin'
            }
        });

        const dateString = range === 'custom' ? `${customStart}_to_${customEnd}` : range;
        const filename = `Febeul_Sales_Report_${dateString}_${new Date().toISOString().split('T')[0]}.pdf`;

        res.setHeader('Content-disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-type', 'application/pdf');

        doc.pipe(res);

        // --- Helper: Draw Background ---
        const drawBackground = () => {
            doc.save();
            doc.rect(0, 0, doc.page.width, doc.page.height).fill('#f9fafb');
            doc.restore();
        };

        // Initial Background
        drawBackground();

        // --- Header ---
        doc.fillColor('#f9aeaf').font('Helvetica-Bold').fontSize(28).text('FEBEUL', 50, 40);
        doc.fillColor('#4b5563').font('Helvetica').fontSize(10).text('SALES PERFORMANCE REPORT', 50, 72);
        
        // Date Range & Generation Info
        doc.fillColor('#9ca3af').fontSize(8);
        doc.text(`Period: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`, 50, 45, { align: 'right' });
        doc.text(`Generated: ${new Date().toLocaleString()}`, 50, 56, { align: 'right' });

        doc.moveTo(50, 90).lineTo(545, 90).strokeColor('#e5e7eb').lineWidth(0.5).stroke();

        // --- Summary Cards ---
        const drawCard = (x, y, width, height, title, value, color1) => {
            doc.save();
            doc.roundedRect(x, y, width, height, 8).fillColor('#ffffff').fill();
            doc.roundedRect(x, y, 4, height, 2).fillColor(color1).fill(); // Left border accent (fixed radius)
            
            doc.fillColor('#6b7280').font('Helvetica-Bold').fontSize(7).text(title.toUpperCase(), x + 12, y + 15);
            doc.fillColor('#111827').font('Helvetica-Bold').fontSize(14).text(value, x + 12, y + 30);
            doc.restore();
        };

        const cardWidth = 118;
        const cardHeight = 60;
        const cardY = 105;
        const gap = 8;

        drawCard(50, cardY, cardWidth, cardHeight, 'Total Users', (totalUsers || 0).toLocaleString(), '#f9aeaf');
        drawCard(50 + cardWidth + gap, cardY, cardWidth, cardHeight, 'Total Orders', (totalOrders || 0).toLocaleString(), '#e88b8d');
        drawCard(50 + (cardWidth + gap) * 2, cardY, cardWidth, cardHeight, 'Revenue', `₹${(revenue || 0).toLocaleString()}`, '#d66a6c');
        drawCard(50 + (cardWidth + gap) * 3, cardY, cardWidth, cardHeight, 'Avg Order', `₹${(avgOrderValue || 0).toFixed(2)}`, '#c44a4d');

        // --- Category Sales Section ---
        let currentY = 185;
        doc.fillColor('#111827').font('Helvetica-Bold').fontSize(12).text('Sales by Category', 50, currentY);
        currentY += 20;

        if (categorySales.length > 0) {
            const maxValue = Math.max(...categorySales.map(c => c.value || 0));
            categorySales.forEach((cat, index) => {
                const barWidth = 380;
                const progress = maxValue > 0 ? ((cat.value || 0) / maxValue) * barWidth : 0;

                doc.fillColor('#4b5563').font('Helvetica').fontSize(9).text(cat.name || 'Uncategorized', 50, currentY);
                doc.fillColor('#6b7280').font('Helvetica-Bold').text(`₹${(cat.value || 0).toLocaleString()}`, 450, currentY, { width: 95, align: 'right' });
                
                currentY += 12;
                doc.roundedRect(50, currentY, barWidth, 4, 2).fillColor('#f3f4f6').fill();
                if (progress > 0) {
                    doc.roundedRect(50, currentY, progress, 4, 2).fillColor(index % 2 === 0 ? '#f9aeaf' : '#e88b8d').fill();
                }
                
                currentY += 18;
            });
        } else {
            doc.fillColor('#9ca3af').font('Helvetica-Oblique').fontSize(9).text('No category data available.', 50, currentY);
            currentY += 20;
        }

        // --- SKU Sales Table ---
        doc.fillColor('#111827').font('Helvetica-Bold').fontSize(12).text('Top 15 Selling SKUs', 50, currentY);
        currentY += 20;

        // Table Header
        doc.save();
        doc.roundedRect(50, currentY, 495, 20, 4).fillColor('#f9aeaf').fill();
        doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(8);
        doc.text('SKU', 60, currentY + 6);
        doc.text('PRODUCT NAME', 150, currentY + 6);
        doc.text('SOLD', 380, currentY + 6, { width: 50, align: 'right' });
        doc.text('REVENUE', 450, currentY + 6, { width: 85, align: 'right' });
        doc.restore();

        currentY += 25;

        // Limit to Top 15
        const topSkuSales = skuSales.slice(0, 15);

        topSkuSales.forEach((item, index) => {
            // Zebra Striping
            if (index % 2 !== 0) {
                doc.save();
                doc.rect(50, currentY - 4, 495, 20).fillColor('#f9fafb').fill();
                doc.restore();
            }

            const displayName = item.name && item.name.length > 50 
                ? item.name.substring(0, 47) + '...' 
                : item.name || 'N/A';

            doc.fillColor('#4b5563').font('Helvetica').fontSize(8);
            doc.font('Helvetica-Bold').text(item.sku || 'N/A', 60, currentY);
            doc.font('Helvetica').text(displayName, 150, currentY, { width: 220 });
            doc.text(item.totalSold.toString(), 380, currentY, { width: 50, align: 'right' });
            doc.fillColor('#111827').font('Helvetica-Bold').text(`₹${item.revenue.toLocaleString()}`, 450, currentY, { width: 85, align: 'right' });

            currentY += 20;
        });

        // --- Footer ---
        doc.fillColor('#9ca3af').fontSize(7);
        doc.text(
            'Febeul Sales Summary | Confidential | www.febeul.com',
            50,
            doc.page.height - 30,
            { align: 'center', width: doc.page.width - 100 }
        );

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
            .populate('items.productId', 'variations') // Populate product variations for SKU fallback
            .select('_id orderTotal orderStatus date userId items') // Select relevant fields including items

        const formattedOrders = recentOrders.map(order => {
            const orderDate = order.date ? new Date(order.date) : new Date();
            const isValidDate = !isNaN(orderDate.getTime());

            // Extract SKUs from items with fallback logic
            const skus = order.items && order.items.length > 0 
                ? order.items.map(item => {
                    if (item.sku) return item.sku;
                    
                    // Fallback: try to find SKU in populated productInfo variations
                    if (item.productId && item.productId.variations) {
                        const variation = item.productId.variations.find(v => 
                            v.images && v.images.includes(item.image)
                        );
                        if (variation) return variation.sku;
                    }
                    return 'N/A';
                }).join(', ')
                : 'N/A';

            return {
                id: `#${order._id}`, // Full ID as in Orders.jsx
                skus: skus, // Replace customer with skus
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
