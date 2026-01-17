import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import Stripe from 'stripe'
import razorpay from 'razorpay'
import PDFDocument from 'pdfkit'; // Import PDFDocument
import path from 'path'; // Add this import
import { shiprocketLogin, createShiprocketOrder } from '../utils/shiprocket.js';
import crypto from 'crypto'

// global variables
const currency = 'inr'
const deliveryCharge = 10

// gateway initialize
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const razorpayInstance = new razorpay({
    key_id : process.env.RAZORPAY_KEY_ID,
    key_secret : process.env.RAZORPAY_KEY_SECRET,
})

// Placing orders using COD Method
const placeOrder = async (req,res) => {
    
    try {
        
        const { userId, items, amount, address} = req.body;

        const orderData = {
            userId,
            items,
            address,
            amount,
            paymentMethod:"COD",
            payment:false,
            date: Date.now()
        }

        const newOrder = new orderModel(orderData)
        await newOrder.save()

        await userModel.findByIdAndUpdate(userId,{cartData:{}})

        const order = await orderModel.findById(newOrder._id).populate('userId');

        // Shiprocket integration
        try {
            const shiprocketToken = await shiprocketLogin();
            const shiprocketOrderData = {
                _id: order._id,
                shippingAddress: { // Ensure this matches Shiprocket's expected structure
                    name: order.address.name.split(' ')[0] || '', // First name
                    lastName: order.address.name.split(' ').slice(1).join(' ') || '', // Last name
                    address: order.address.address,
                    city: order.address.city,
                    pincode: order.address.zip, // Use zip from frontend
                    state: "Delhi", // Default or fetch state from pincode/city
                    country: "India",
                    phone: order.address.phone,
                    email: order.userId.email // Assuming userId is populated and has email
                },
                user: order.userId,
                items: order.items,
                totalPrice: order.amount,
            };
            const shiprocketResponse = await createShiprocketOrder(shiprocketOrderData, shiprocketToken, "COD");

            order.shiprocket = {
                orderId: shiprocketResponse.order_id,
                shipmentId: shiprocketResponse.shipment_id,
                awb: shiprocketResponse.awb_code,
                courier: shiprocketResponse.courier_name,
                trackingUrl: `https://shiprocket.co/tracking/${shiprocketResponse.awb_code}`
            };
            order.orderStatus = "SHIPPED";
            await order.save();

        } catch (error) {
            console.log("Error with Shiprocket:", error.message);
            // If shiprocket fails, the order is still placed, but not shipped.
        }

        res.json({success:true,message:"Order Placed", order: newOrder})


    } catch (error) {
        console.log(error)
        res.json({success:false,message:error.message})
    }

}

// Placing orders using Stripe Method
const placeOrderStripe = async (req,res) => {
    try {
        
        const { userId, items, amount, address} = req.body
        const { origin } = req.headers;

        const orderData = {
            userId,
            items,
            address,
            amount,
            paymentMethod:"Stripe",
            payment:false,
            date: Date.now()
        }

        const newOrder = new orderModel(orderData)
        await newOrder.save()

        const line_items = items.map((item) => ({
            price_data: {
                currency:currency,
                product_data: {
                    name:item.name
                },
                unit_amount: Math.round(item.price * 100)
            },
            quantity: item.quantity
        }))

        line_items.push({
            price_data: {
                currency:currency,
                product_data: {
                    name:'Delivery Charges'
                },
                unit_amount: Math.round(deliveryCharge * 100)
            },
            quantity: 1
        })

        const session = await stripe.checkout.sessions.create({
            success_url: `${origin}/verify?success=true&orderId=${newOrder._id}`,
            cancel_url:  `${origin}/verify?success=false&orderId=${newOrder._id}`,
            line_items,
            mode: 'payment',
        })

        res.json({success:true,session_url:session.url});

    } catch (error) {
        console.log(error)
        res.json({success:false,message:error.message})
    }
}

// Verify Stripe 
const verifyStripe = async (req,res) => {

    const { orderId, success, userId } = req.body

    try {
        if (success === "true") {
            await orderModel.findByIdAndUpdate(orderId, {payment:true});
            await userModel.findByIdAndUpdate(userId, {cartData: {}})

            const order = await orderModel.findById(orderId).populate('userId');

            // Shiprocket integration
            try {
                const shiprocketToken = await shiprocketLogin();
                const shiprocketOrderData = {
                    _id: order._id,
                    shippingAddress: order.address,
                    user: order.userId,
                    items: order.items,
                    totalPrice: order.amount,
                };
                const shiprocketResponse = await createShiprocketOrder(shiprocketOrderData, shiprocketToken);

                order.shiprocket = {
                    orderId: shiprocketResponse.order_id,
                    shipmentId: shiprocketResponse.shipment_id,
                    awb: shiprocketResponse.awb_code,
                    courier: shiprocketResponse.courier_name,
                    trackingUrl: `https://shiprocket.co/tracking/${shiprocketResponse.awb_code}`
                };
                order.orderStatus = "SHIPPED";
                await order.save();

            } catch (error) {
                console.log("Error with Shiprocket:", error.message);
                // If shiprocket fails, the order is still placed, but not shipped.
            }

            res.json({success: true});
        } else {
            await orderModel.findByIdAndDelete(orderId)
            res.json({success:false})
        }
        
    } catch (error) {
        console.log(error)
        res.json({success:false,message:error.message})
    }

}

// Placing orders using Razorpay Method
const placeOrderRazorpay = async (req,res) => {
    try {
        
        const { userId, items, amount, address} = req.body

        const orderData = {
            userId,
            items,
            address,
            amount,
            paymentMethod:"Razorpay",
            payment:false,
            date: Date.now()
        }

        const newOrder = new orderModel(orderData)
        await newOrder.save()

        const options = {
            amount: Math.round(amount * 100),
            currency: currency.toUpperCase(),
            receipt : newOrder._id.toString()
        }

        await razorpayInstance.orders.create(options, (error,order)=>{
            if (error) {
                console.log(error)
                return res.json({success:false, message: error})
            }
            res.json({success:true,order})
        })

    } catch (error) {
        console.log(error)
        res.json({success:false,message:error.message})
    }
}

const verifyRazorpay = async (req,res) => {
    try {
        
        const { userId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body

        const body = razorpay_order_id + "|" + razorpay_payment_id;

        const expectedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest('hex');

        if (expectedSignature === razorpay_signature) {
            const orderInfo = await razorpayInstance.orders.fetch(razorpay_order_id);
            if (orderInfo.status === 'paid') {
                await orderModel.findByIdAndUpdate(orderInfo.receipt, { payment: true, paymentDetails: { razorpay_order_id, razorpay_payment_id, razorpay_signature } });
                
                const order = await orderModel.findById(orderInfo.receipt).populate('userId');

                // Check if this is a luxe membership purchase
                const isLuxeOrder = order.items.some(item => item.name === "Febeul Luxe Membership");

                if (isLuxeOrder) {
                    const expiryDate = new Date();
                    expiryDate.setMonth(expiryDate.getMonth() + 1);
                    await userModel.findByIdAndUpdate(userId, {
                        isLuxeMember: true,
                        luxeMembershipExpires: expiryDate,
                        cartData: {} 
                    });
                } else {
                    await userModel.findByIdAndUpdate(userId, { cartData: {} });

                    // Shiprocket integration
                    try {
                        const shiprocketToken = await shiprocketLogin();
                        const shiprocketOrderData = {
                            _id: order._id,
                            shippingAddress: { // Ensure this matches Shiprocket's expected structure
                                name: order.address.name.split(' ')[0] || '', // First name
                                lastName: order.address.name.split(' ').slice(1).join(' ') || '', // Last name
                                address: order.address.address,
                                city: order.address.city,
                                pincode: order.address.zip, // Use zip from frontend
                                state: "Delhi", // Default or fetch state from pincode/city
                                country: "India",
                                phone: order.address.phone,
                                email: order.userId.email // Assuming userId is populated and has email
                            },
                            user: order.userId,
                            items: order.items,
                            totalPrice: order.amount,
                        };
                        const shiprocketResponse = await createShiprocketOrder(shiprocketOrderData, shiprocketToken, "Prepaid");

                        order.shiprocket = {
                            orderId: shiprocketResponse.order_id,
                            shipmentId: shiprocketResponse.shipment_id,
                            awb: shiprocketResponse.awb_code,
                            courier: shiprocketResponse.courier_name,
                            trackingUrl: `https://shiprocket.co/tracking/${shiprocketResponse.awb_code}`
                        };
                        order.orderStatus = "SHIPPED";
                        await order.save();

                    } catch (error) {
                        console.log("Error with Shiprocket:", error.message);
                        // If shiprocket fails, the order is still placed, but not shipped.
                        // You might want to add more robust error handling here, like a retry mechanism.
                    }
                }

                res.json({ success: true, message: "Payment Successful" });
            } else {
                res.json({ success: false, message: 'Payment Not Completed on Razorpay' });
            }
        } else {
            res.json({ success: false, message: 'Payment Verification Failed' });
        }

    } catch (error) {
        console.log(error)
        res.json({success:false,message:error.message})
    }
}


// All Orders data for Admin Panel
const allOrders = async (req,res) => {

    try {
        
        const orders = await orderModel.find({})
            .populate('userId', 'name email') // Populate user name and email
            .populate('items.productId', 'name variations'); // Populate product name and variations

        res.json({success:true,orders})

    } catch (error) {
        console.log(error)
        res.json({success:false,message:error.message})
    }

}

// User Order Data For Forntend
const userOrders = async (req,res) => {
    try {
        
        const { userId } = req.body

        const orders = await orderModel.find({ userId })
        res.json({success:true,orders})

    } catch (error) {
        console.log(error)
        res.json({success:false,message:error.message})
    }
}

// update order status from Admin Panel
const updateStatus = async (req,res) => {
    try {
        
        const { orderId, orderStatus } = req.body

        await orderModel.findByIdAndUpdate(orderId, { orderStatus })
        res.json({success:true,message:'Status Updated'})

    } catch (error) {
        console.log(error)
        res.json({success:false,message:error.message})
    }
}

const getRazorpayKey = (req,res) => {
    res.json({success:true,key:process.env.RAZORPAY_KEY_ID})
}

// Generate Invoice
const generateInvoice = async (req, res) => {
    try {
        const { orderId } = req.params;
        // Populate userId for email and items.productId for product details (especially price)
        const order = await orderModel.findById(orderId).populate('userId', 'email').populate('items.productId', 'price');

        if (!order) {
            return res.json({ success: false, message: 'Order not found.' });
        }

        // Create a new PDF document
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const filename = `Invoice_${order._id}.pdf`; // Changed orderStatus to order._id for simpler filename

        // Set response headers for PDF download
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

        // Pipe the PDF into the response
        doc.pipe(res);

        // --- Invoice Content ---

        // Company Header with Logo
        const logoPath = path.resolve(__dirname, '../../frontend/public/removebgLogo.png');
        doc.image(logoPath, 50, 40, { width: 100 }); // x, y, options
        doc.fontSize(20).font('Helvetica-Bold').text('INVOICE', 0, 60, { align: 'right' });
        doc.fontSize(10).font('Helvetica').text('FEBEUL', 0, 85, { align: 'right' });
        doc.text('Your Slogan Here', 0, 100, { align: 'right' }); // Placeholder for slogan
        doc.moveDown(4); // Move down enough to clear header content

        // Order Details and Billing Information
        doc.fontSize(12).font('Helvetica-Bold').text('Invoice Details:', 50, doc.y);
        doc.font('Helvetica').fontSize(10);
        doc.text(`Invoice #: ${order._id.toString()}`, 50, doc.y + 15);
        doc.text(`Order Date: ${new Date(order.date).toLocaleDateString()}`, 50, doc.y + 30);
        doc.text(`Payment Method: ${order.paymentMethod}`, 50, doc.y + 45);
        doc.moveDown(4);

        doc.fontSize(12).font('Helvetica-Bold').text('Billed To:', 50, doc.y);
        doc.font('Helvetica').fontSize(10);
        doc.text(`${order.address.name}`, 50, doc.y + 15);
        doc.text(`${order.address.address}`, 50, doc.y + 30);
        doc.text(`${order.address.city}, ${order.address.zip}`, 50, doc.y + 45);
        doc.text(`${order.address.country}`, 50, doc.y + 60);
        doc.text(`Phone: ${order.address.phone}`, 50, doc.y + 75);
        if (order.userId && order.userId.email) {
            doc.text(`Email: ${order.userId.email}`, 50, doc.y + 90);
        }
        doc.moveDown(2);


        // Items Table Headers
        const tableTop = doc.y;
        const itemColX = 50;
        const qtyColX = 320;
        const priceColX = 390;
        const totalColX = 480;

        doc.font('Helvetica-Bold')
           .fontSize(10)
           .text('Item', itemColX, tableTop, { width: qtyColX - itemColX - 10 })
           .text('Qty', qtyColX, tableTop, { width: priceColX - qtyColX - 10, align: 'right' })
           .text('Price', priceColX, tableTop, { width: totalColX - priceColX - 10, align: 'right' })
           .text('Total', totalColX, tableTop, { width: 50, align: 'right' });
        
        doc.font('Helvetica').fontSize(10); // Reset font and size
        doc.moveDown(0.5);
        doc.strokeColor('#aaaaaa').lineWidth(0.5).moveTo(itemColX, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
        doc.moveDown();

        // Items Table Rows
        order.items.forEach(item => {
            const itemPrice = item.productId ? item.productId.price : 0; // Use price from populated productId
            const itemTotal = itemPrice * item.quantity;
            
            doc.text(`${item.name}`, itemColX, doc.y, { width: qtyColX - itemColX - 10, continued: true })
               .text(`${item.quantity}`, qtyColX, doc.y, { width: priceColX - qtyColX - 10, align: 'right', continued: true })
               .text(`₹${itemPrice.toFixed(2)}`, priceColX, doc.y, { width: totalColX - priceColX - 10, align: 'right', continued: true })
               .text(`₹${itemTotal.toFixed(2)}`, totalColX, doc.y, { width: 50, align: 'right' });
            doc.moveDown();
        });
        doc.moveDown();
        doc.strokeColor('#aaaaaa').lineWidth(0.5).moveTo(itemColX, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
        doc.moveDown();

        // Totals Calculation (replicated from frontend logic in Checkout.jsx)
        const invoiceItemSubtotal = order.items.reduce((sum, item) => sum + ((item.productId ? item.productId.price : 0) * item.quantity), 0);
        const invoiceShippingCost = order.paymentMethod === 'COD' ? 50 : 0; 
        const invoiceGiftWrapPrice = order.giftWrap ? order.giftWrap.price : 0;

        const totalsLabelX = 350; // Start x for labels
        const totalsValueX = 480; // Start x for values
        const totalsWidth = 100; // Width for values
        
        doc.font('Helvetica').fontSize(10);
        doc.text(`Subtotal:`, totalsLabelX, doc.y, { width: totalsWidth, align: 'right' });
        doc.text(`₹${invoiceItemSubtotal.toFixed(2)}`, totalsValueX, doc.y - doc.heightOfString('Subtotal:'), { width: 50, align: 'right' });
        doc.moveDown();
        
        if (invoiceShippingCost > 0) {
            doc.text(`Shipping:`, totalsLabelX, doc.y, { width: totalsWidth, align: 'right' });
            doc.text(`₹${invoiceShippingCost.toFixed(2)}`, totalsValueX, doc.y - doc.heightOfString('Shipping:'), { width: 50, align: 'right' });
            doc.moveDown();
        } else {
            doc.text(`Shipping:`, totalsLabelX, doc.y, { width: totalsWidth, align: 'right' });
            doc.text(`FREE`, totalsValueX, doc.y - doc.heightOfString('Shipping:'), { width: 50, align: 'right' });
            doc.moveDown();
        }

        if (invoiceGiftWrapPrice > 0) {
            doc.text(`Gift Wrap:`, totalsLabelX, doc.y, { width: totalsWidth, align: 'right' });
            doc.text(`₹${invoiceGiftWrapPrice.toFixed(2)}`, totalsValueX, doc.y - doc.heightOfString('Gift Wrap:'), { width: 50, align: 'right' });
            doc.moveDown();
        }

        doc.font('Helvetica-Bold').fontSize(12).text(`Total:`, totalsLabelX, doc.y, { width: totalsWidth, align: 'right' });
        doc.text(`₹${order.amount.toFixed(2)}`, totalsValueX, doc.y - doc.heightOfString('Total:'), { width: 50, align: 'right' });
        doc.moveDown();

        // Thank You message
        doc.fontSize(10).font('Helvetica').text('Thank you for your purchase!', 50, doc.page.height - 50, { align: 'center', width: doc.page.width - 100 });
        doc.text('We appreciate your business.', 50, doc.page.height - 35, { align: 'center', width: doc.page.width - 100 });

        // Finalize PDF
        doc.end();

    } catch (error) {
        console.log(error);
        res.json({ success: false, message: 'Error generating invoice' });
    }
};

export {verifyRazorpay, verifyStripe ,placeOrder, placeOrderStripe, placeOrderRazorpay, allOrders, userOrders, updateStatus, getRazorpayKey, generateInvoice}