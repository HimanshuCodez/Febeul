import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import Stripe from 'stripe'
import razorpay from 'razorpay'
import { shiprocketLogin, createShiprocketOrder } from '../utils/shiprocket.js';
import crypto from 'crypto'
import { buildInvoicePDF } from '../templates/invoiceGenerator.js'; // New import for PDF generation logic
import { sendEmail } from '../utils/sendEmail.js'; // New import for email utility
import fs from 'fs'; // For reading email template
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';

// Re-define __dirname in this context for template path resolution
const __filenameController = fileURLToPath(import.meta.url);
const __dirnameController = dirname(__filenameController);

// gateway initialize
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const razorpayInstance = new razorpay({
    key_id : process.env.RAZORPAY_KEY_ID,
    key_secret : process.env.RAZORPAY_KEY_SECRET,
})

const constructEmailHtml = (order, templateHtml) => {
    // Dynamically generate item rows
    let itemRowsHtml = '';
    order.items.forEach(item => {
        // Ensure itemPrice is a float, default to 0
        const itemPrice = parseFloat(item.price || 0); 
        // Ensure quantity is a float, default to 0
        const itemQuantity = parseFloat(item.quantity || 0);
        const itemTotal = parseFloat(itemPrice * itemQuantity || 0); // Ensure itemTotal is a float, default to 0

        itemRowsHtml += `
            <tr>
                <td>${item.name}</td>
                <td>${itemQuantity}</td>
                <td>₹${itemPrice.toFixed(2)}</td>
                <td>₹${itemTotal.toFixed(2)}</td>
            </tr>
        `;
    });

    const emailShippingCost = parseFloat(order.paymentMethod === 'COD' ? 50 : 0); // Ensure it's a number
    const emailGiftWrapPrice = parseFloat(order.giftWrap && order.giftWrap.price || 0); // Safely get price, default to 0
    
    let giftWrapRowHtml = '';
    if (emailGiftWrapPrice > 0) {
        giftWrapRowHtml = `
            <tr>
                <td colspan="3" style="text-align:right;">Gift Wrap:</td>
                <td>₹${emailGiftWrapPrice.toFixed(2)}</td>
            </tr>
        `;
    }

    // Ensure order.amount is a number
    const orderAmount = parseFloat(order.amount || 0);

    // Populate template placeholders
    let populatedHtml = templateHtml;
    populatedHtml = populatedHtml.replace('{{userName}}', order.userId.name || 'Customer');
    populatedHtml = populatedHtml.replace('{{orderId}}', order._id.toString());
    populatedHtml = populatedHtml.replace('{{orderDate}}', new Date(order.date).toLocaleDateString());
    populatedHtml = populatedHtml.replace('{{totalAmount}}', orderAmount.toFixed(2)); // Use orderAmount
    populatedHtml = populatedHtml.replace('{{itemRows}}', itemRowsHtml);
    populatedHtml = populatedHtml.replace('{{subtotal}}', (orderAmount - emailShippingCost - emailGiftWrapPrice).toFixed(2)); // Use orderAmount
    populatedHtml = populatedHtml.replace('{{shipping}}', emailShippingCost > 0 ? `₹${emailShippingCost.toFixed(2)}` : 'FREE');
    populatedHtml = populatedHtml.replace('{{giftWrapRow}}', giftWrapRowHtml);
    populatedHtml = populatedHtml.replace('{{shippingAddressName}}', order.address.name);
    populatedHtml = populatedHtml.replace('{{shippingAddressAddress}}', order.address.address);
    populatedHtml = populatedHtml.replace('{{shippingAddressCity}}', order.address.city);
    populatedHtml = populatedHtml.replace('{{shippingAddressZip}}', order.address.zip);
    populatedHtml = populatedHtml.replace('{{shippingAddressCountry}}', order.address.country);
    populatedHtml = populatedHtml.replace('{{shippingAddressPhone}}', order.address.phone);
    populatedHtml = populatedHtml.replace('{{paymentMethod}}', order.paymentMethod);
    populatedHtml = populatedHtml.replace('{{paymentStatus}}', order.payment ? 'Paid' : 'Pending');
    populatedHtml = populatedHtml.replace('{{orderTrackingLink}}', `https://febeul.onrender.com/track/${order._id}`); // Placeholder, adjust as needed
    populatedHtml = populatedHtml.replace('{{currentYear}}', new Date().getFullYear());

    return populatedHtml;
};

// Placing orders using COD Method
const placeOrder = async (req,res) => {
    
    try {
        
        const { userId, items, address} = req.body; // Remove `amount` from destructuring

        // Function to get item price based on product, color, and size
        const getItemPrice = (product, color, size) => {
            const variation = product.variations.find(v => v.color === color);
            if (variation) {
                const sizeData = variation.sizes.find(s => s.size === size);
                if (sizeData) {
                    return sizeData.price;
                }
            }
            return 0; // Default to 0 if not found
        };

        let orderTotal = 0;
        const processedItems = await Promise.all(items.map(async (item) => {
            const product = await productModel.findById(item.productId);
            if (!product) {
                throw new Error(`Product not found for ID: ${item.productId}`);
            }
            const itemPrice = getItemPrice(product, item.color, item.size);
            orderTotal += itemPrice * item.quantity;

            return {
                productId: item.productId,
                quantity: item.quantity,
                size: item.size,
                name: product.name, // Use backend product name
                image: product.variations.find(v => v.color === item.color)?.images[0] || '', // Get image from backend
                price: itemPrice,
                color: item.color
            };
        }));

        // Apply gift wrap price if any
        const giftWrapPrice = req.body.giftWrap ? parseFloat(req.body.giftWrap.price || 0) : 0;
        orderTotal += giftWrapPrice;

        // For COD, add COD shipping charge
        const shippingCost = 50; // Assuming COD_SHIPPING_CHARGE is 50.00
        orderTotal += shippingCost;

        const orderData = {
            userId,
            items: processedItems,
            amount: orderTotal, // Use backend calculated amount
            address,
            paymentMethod:"COD",
            payment:false,
            date: Date.now(),
            giftWrap: req.body.giftWrap // Add gift wrap data
        }

        const newOrder = new orderModel(orderData)
        await newOrder.save()

        await userModel.findByIdAndUpdate(userId,{cartData:[]})

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
                    state: order.address.state,
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

        // Send Order Confirmation Email
        try {
            const populatedOrder = await orderModel.findById(newOrder._id).populate('userId').populate('items.productId', 'price');
            if (populatedOrder && populatedOrder.userId && populatedOrder.userId.email) {
                const templatePath = path.resolve(__dirnameController, '../templates/orderConfirmationEmail.html');
                let emailTemplate = fs.readFileSync(templatePath, 'utf8');
                const htmlContent = constructEmailHtml(populatedOrder, emailTemplate);
                await sendEmail(populatedOrder.userId.email, `Febeul Order Confirmed - #${populatedOrder._id.toString().slice(-8).toUpperCase()}`, htmlContent);
            }
        } catch (emailError) {
            console.error("Error sending order confirmation email for COD order:", emailError);
        }


    } catch (error) {
        console.log(error)
        res.json({success:false,message:error.message})
    }

}

// Placing orders using Stripe Method
const placeOrderStripe = async (req,res) => {
    try {
        
        const { userId, items, address, currency} = req.body; // Removed 'amount'
        const { origin } = req.headers;

        let orderTotal = 0;
        const processedItems = await Promise.all(items.map(async (item) => {
            const product = await productModel.findById(item.productId);
            if (!product) {
                throw new Error(`Product not found for ID: ${item.productId}`);
            }
            const itemPrice = getItemPrice(product, item.color, item.size);
            orderTotal += itemPrice * item.quantity;

            return {
                productId: item.productId,
                quantity: item.quantity,
                size: item.size,
                name: product.name,
                image: product.variations.find(v => v.color === item.color)?.images[0] || '',
                price: itemPrice,
                color: item.color
            };
        }));

        const giftWrapPrice = req.body.giftWrap ? parseFloat(req.body.giftWrap.price || 0) : 0;
        orderTotal += giftWrapPrice;

        // Stripe orders don't have COD shipping, so shipping is STANDARD_SHIPPING_CHARGE (0)
        const shippingCost = 0; 
        orderTotal += shippingCost;

        const orderData = {
            userId,
            items: processedItems,
            address,
            amount: orderTotal,
            paymentMethod:"Stripe",
            payment:false,
            date: Date.now(),
            giftWrap: req.body.giftWrap
        }

        const newOrder = new orderModel(orderData)
        await newOrder.save()

        const line_items = processedItems.map((item) => ({ // Use processedItems here
            price_data: {
                currency:currency,
                product_data: {
                    name:item.name
                },
                unit_amount: Math.round(item.price * 100)
            },
            quantity: item.quantity
        }))

        // Add delivery charges to line_items.
        const deliveryCharge = 0; 
        if (deliveryCharge > 0) { 
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
        }

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
            await userModel.findByIdAndUpdate(userId, {cartData: []})

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

            // Send Order Confirmation Email
            try {
                const populatedOrder = await orderModel.findById(orderId).populate('userId');
                if (populatedOrder && populatedOrder.userId && populatedOrder.userId.email) {
                    const templatePath = path.resolve(__dirnameController, '../templates/orderConfirmationEmail.html');
                    let emailTemplate = fs.readFileSync(templatePath, 'utf8');
                    const htmlContent = constructEmailHtml(populatedOrder, emailTemplate);
                    await sendEmail(populatedOrder.userId.email, `Febeul Order Confirmed - #${populatedOrder._id.toString().slice(-8).toUpperCase()}`, htmlContent);
                }
            } catch (emailError) {
                console.error("Error sending order confirmation email for Stripe order:", emailError);
            }

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
        
        const { userId, items, address, currency} = req.body; // Removed 'amount'

        let orderTotal = 0;
        const processedItems = await Promise.all(items.map(async (item) => {
            const product = await productModel.findById(item.productId);
            if (!product) {
                throw new Error(`Product not found for ID: ${item.productId}`);
            }
            const itemPrice = getItemPrice(product, item.color, item.size);
            orderTotal += itemPrice * item.quantity;

            return {
                productId: item.productId,
                quantity: item.quantity,
                size: item.size,
                name: product.name,
                image: product.variations.find(v => v.color === item.color)?.images[0] || '',
                price: itemPrice,
                color: item.color
            };
        }));

        const giftWrapPrice = req.body.giftWrap ? parseFloat(req.body.giftWrap.price || 0) : 0;
        orderTotal += giftWrapPrice;

        const shippingCost = 0; // Razorpay typically prepaid, so no COD charge
        orderTotal += shippingCost;

        const orderData = {
            userId,
            items: processedItems,
            address,
            amount: orderTotal,
            paymentMethod:"Razorpay",
            payment:false,
            date: Date.now(),
            giftWrap: req.body.giftWrap
        }

        const newOrder = new orderModel(orderData)
        await newOrder.save()

        const options = {
            amount: Math.round(orderTotal * 100), // Use calculated orderTotal
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
                        cartData: [] 
                    });
                } else {
                    await userModel.findByIdAndUpdate(userId, { cartData: [] });

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
                                state: order.address.state,
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

                    // Send Order Confirmation Email
                    try {
                        const populatedOrder = await orderModel.findById(orderInfo.receipt).populate('userId');
                        if (populatedOrder && populatedOrder.userId && populatedOrder.userId.email) {
                            const templatePath = path.resolve(__dirnameController, '../templates/orderConfirmationEmail.html');
                            let emailTemplate = fs.readFileSync(templatePath, 'utf8');
                            const htmlContent = constructEmailHtml(populatedOrder, emailTemplate);
                            await sendEmail(populatedOrder.userId.email, `Febeul Order Confirmed - #${populatedOrder._id.toString().slice(-8).toUpperCase()}`, htmlContent);
                        }
                    } catch (emailError) {
                        console.error("Error sending order confirmation email for Razorpay order:", emailError);
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
        const userId = req.userId; // Get userId from auth middleware
        if (!userId) { // Basic check for safety
            return res.json({ success: false, message: 'User ID not found in token' });
        }
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
        const order = await orderModel.findById(orderId).populate('userId', 'email');

        if (!order) {
            return res.json({ success: false, message: 'Order not found.' });
        }

        buildInvoicePDF(order, res);

    } catch (error) {
        console.error("Error in generateInvoice function:", error); // More specific error log
        res.json({ success: false, message: 'Error generating invoice' });
    }
};

const getOrderById = async (req, res) => {
    try {
        const order = await orderModel.findById(req.params.id);
        if (!order) {
            return res.json({ success: false, message: 'Order not found' });
        }
        res.json({ success: true, order });
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: 'Error fetching order' });
    }
};

export {verifyRazorpay, verifyStripe ,placeOrder, placeOrderStripe, placeOrderRazorpay, allOrders, userOrders, updateStatus, getRazorpayKey, generateInvoice, getOrderById}