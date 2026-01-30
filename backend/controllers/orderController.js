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
import productModel from "../models/productModel.js";

// Define pricing constants
const SHIPPING_CHARGE_THRESHOLD = 499;
const DEFAULT_SHIPPING_CHARGE = 50;
const COD_CHARGE_AMOUNT = 50; // This will act as the COD fee / base shipping for non-luxe below threshold

// Re-define __dirname in this context for template path resolution
const __filenameController = fileURLToPath(import.meta.url);
const __dirnameController = dirname(__filenameController);

// gateway initialize
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY)

const razorpayInstance = new razorpay({
    key_id : process.env.RAZORPAY_KEY_ID,
    key_secret : process.env.RAZORPAY_KEY_SECRET,
})

// Helper to get item price from product variations
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

// Helper function to calculate all pricing components
const calculateOrderPricing = async (userId, items, paymentMethod, giftWrapData) => {
    let productAmount = 0;
    const processedItems = await Promise.all(items.map(async (item) => {
        const product = await productModel.findById(item.productId);
        if (!product) {
            throw new Error(`Product not found for ID: ${item.productId}`);
        }
        const itemPrice = getItemPrice(product, item.color, item.size); 
        productAmount += itemPrice * item.quantity;

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

    const giftWrapPrice = giftWrapData ? parseFloat(giftWrapData.price || 0) : 0;

    let shippingCharge = 0;
    let codCharge = 0;
    const user = await userModel.findById(userId); // Fetch user to check luxe status
    const isLuxeMember = user?.isLuxeMember || false;

    if (paymentMethod === 'COD') {
        codCharge = COD_CHARGE_AMOUNT; // COD charge always applies for COD orders
        // For Luxe members, COD charge is the only extra cost
        // For non-Luxe, if productAmount is below threshold, 50 shipping is also applied
        if (!isLuxeMember && productAmount < SHIPPING_CHARGE_THRESHOLD) {
            shippingCharge = DEFAULT_SHIPPING_CHARGE;
        }
    } else { // Prepaid orders
        if (!isLuxeMember && productAmount < SHIPPING_CHARGE_THRESHOLD) {
            shippingCharge = DEFAULT_SHIPPING_CHARGE;
        }
    }
    
    const orderTotal = productAmount + shippingCharge + codCharge + giftWrapPrice;

    return { productAmount, shippingCharge, codCharge, orderTotal, processedItems };
};

const constructEmailHtml = (order, templateHtml) => {
    // Dynamically generate item rows
    let itemRowsHtml = '';
    order.items.forEach(item => {
        const itemPrice = parseFloat(item.price || 0); 
        const itemQuantity = parseFloat(item.quantity || 0);
        const itemTotal = parseFloat(itemPrice * itemQuantity || 0);

        itemRowsHtml += `
            <tr>
                <td>${item.name}</td>
                <td>${itemQuantity}</td>
                <td>₹${itemPrice.toFixed(2)}</td>
                <td>₹${itemTotal.toFixed(2)}</td>
            </tr>
        `;
    });

    const emailShippingCharge = parseFloat(order.shippingCharge || 0);
    const emailCodCharge = parseFloat(order.codCharge || 0);
    const emailGiftWrapPrice = parseFloat(order.giftWrap && order.giftWrap.price || 0);
    const emailProductAmount = parseFloat(order.productAmount || 0);
    const emailOrderTotal = parseFloat(order.orderTotal || 0);

    let giftWrapRowHtml = '';
    if (emailGiftWrapPrice > 0) {
        giftWrapRowHtml = `
            <tr>
                <td colspan="3" style="text-align:right;">Gift Wrap:</td>
                <td>₹${emailGiftWrapPrice.toFixed(2)}</td>
            </tr>
        `;
    }

    let codChargeRowHtml = '';
    if (emailCodCharge > 0) {
        codChargeRowHtml = `
            <tr>
                <td colspan="3" style="text-align:right;">COD Charges:</td>
                <td>₹${emailCodCharge.toFixed(2)}</td>
            </tr>
        `;
    }

    // Populate template placeholders
    let populatedHtml = templateHtml;
    populatedHtml = populatedHtml.replace('{{userName}}', order.userId.name || 'Customer');
    populatedHtml = populatedHtml.replace('{{orderId}}', order._id.toString());
    populatedHtml = populatedHtml.replace('{{orderDate}}', new Date(order.date).toLocaleDateString());
    populatedHtml = populatedHtml.replace('{{totalAmount}}', emailOrderTotal.toFixed(2));
    populatedHtml = populatedHtml.replace('{{itemRows}}', itemRowsHtml);
    populatedHtml = populatedHtml.replace('{{subtotal}}', emailProductAmount.toFixed(2));
    populatedHtml = populatedHtml.replace('{{shipping}}', emailShippingCharge > 0 ? `₹${emailShippingCharge.toFixed(2)}` : 'FREE');
    populatedHtml = populatedHtml.replace('{{codChargeRow}}', codChargeRowHtml);
    populatedHtml = populatedHtml.replace('{{giftWrapRow}}', giftWrapRowHtml);
    populatedHtml = populatedHtml.replace('{{shippingAddressName}}', order.address.name);
    populatedHtml = populatedHtml.replace('{{shippingAddressAddress}}', order.address.address);
    populatedHtml = populatedHtml.replace('{{shippingAddressCity}}', order.address.city);
    populatedHtml = populatedHtml.replace('{{shippingAddressZip}}', order.address.zip);
    populatedHtml = populatedHtml.replace('{{shippingAddressCountry}}', order.address.country);
    populatedHtml = populatedHtml.replace('{{shippingAddressPhone}}', order.address.phone);
    populatedHtml = populatedHtml.replace('{{paymentMethod}}', order.paymentMethod);
    populatedHtml = populatedHtml.replace('{{paymentStatus}}', order.payment ? 'Paid' : 'Pending');
    populatedHtml = populatedHtml.replace('{{orderTrackingLink}}', `https://febeul.onrender.com/track/${order._id}`);
    populatedHtml = populatedHtml.replace('{{currentYear}}', new Date().getFullYear());

    return populatedHtml;
};

// Placing orders using COD Method
const placeOrder = async (req,res) => {
    
    try {
        
        const { userId, items, address, giftWrap: giftWrapData } = req.body;

        const { productAmount, shippingCharge, codCharge, orderTotal, processedItems } = await calculateOrderPricing(userId, items, 'COD', giftWrapData);

        const orderData = {
            userId,
            items: processedItems,
            orderTotal: orderTotal, // Use backend calculated total
            productAmount,
            shippingCharge,
            codCharge,
            address,
            paymentMethod:"COD",
            payment:false,
            date: Date.now(),
            giftWrap: giftWrapData
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
                totalPrice: order.productAmount,
            };
            const shiprocketResponse = await createShiprocketOrder(shiprocketOrderData, shiprocketToken, "COD");

            order.shiprocket = {
                ourOrderId: order._id.toString(),
                srOrderId: shiprocketResponse.order_id,
                shipmentId: shiprocketResponse.shipment_id,
                awb: shiprocketResponse.awb_code,
                courier: shiprocketResponse.courier_name,
                trackingUrl: `https://shiprocket.co/tracking/${shiprocketResponse.awb_code}`
            };
            order.orderStatus = "Processing";
            order.shiprocketStatus = "NEW";
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
        
        const { userId, items, address, currency, giftWrap: giftWrapData } = req.body;
        const { origin } = req.headers;

        const { productAmount, shippingCharge, codCharge, orderTotal, processedItems } = await calculateOrderPricing(userId, items, 'Stripe', giftWrapData);

        const orderData = {
            userId,
            items: processedItems,
            orderTotal: orderTotal,
            productAmount,
            shippingCharge,
            codCharge,
            address,
            paymentMethod:"Stripe",
            payment:false,
            date: Date.now(),
            giftWrap: giftWrapData
        }

        const newOrder = new orderModel(orderData)
        await newOrder.save()

        const line_items = processedItems.map((item) => ({
            price_data: {
                currency:currency,
                product_data: {
                    name:item.name
                },
                unit_amount: Math.round(item.price * 100)
            },
            quantity: item.quantity
        }));

        // Add shipping charge to line_items if applicable
        if (shippingCharge > 0) {
            line_items.push({
                price_data: {
                    currency:currency,
                    product_data: {
                        name:'Shipping Charge'
                    },
                    unit_amount: Math.round(shippingCharge * 100)
                },
                quantity: 1
            });
        }

        // Add gift wrap charge to line_items if applicable
        if (giftWrapData && giftWrapData.price > 0) {
            line_items.push({
                price_data: {
                    currency: currency,
                    product_data: {
                        name: 'Gift Wrap'
                    },
                    unit_amount: Math.round(giftWrapData.price * 100)
                },
                quantity: 1
            });
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
            // Retrieve the order to get full details before updating
            const order = await orderModel.findById(orderId).populate('userId');
            if (!order) {
                return res.json({ success: false, message: "Order not found" });
            }

            // Update order with payment success and confirmed status
            await orderModel.findByIdAndUpdate(orderId, {
                payment: true,
                // Assuming paymentDetails might contain stripe's charge ID or equivalent if needed
                orderStatus: 'Confirmed' 
            });
            // Re-fetch the updated order for further processing
            const updatedOrder = await orderModel.findById(orderId).populate('userId');

            await userModel.findByIdAndUpdate(userId, { cartData: [] });

            // Shiprocket integration
            try {
                const shiprocketToken = await shiprocketLogin();
                const shiprocketOrderData = {
                    _id: updatedOrder._id,
                    shippingAddress: { // Ensure this matches Shiprocket's expected structure
                        name: updatedOrder.address.name.split(' ')[0] || '', // First name
                        lastName: updatedOrder.address.name.split(' ').slice(1).join(' ') || '', // Last name
                        address: updatedOrder.address.address,
                        city: updatedOrder.address.city,
                        pincode: updatedOrder.address.zip, // Use zip from frontend
                        state: updatedOrder.address.state,
                        country: "India",
                        phone: updatedOrder.address.phone,
                        email: updatedOrder.userId.email
                    },
                    user: updatedOrder.userId,
                    items: updatedOrder.items,
                    totalPrice: updatedOrder.productAmount, // Use productAmount for subtotal
                    shippingCharge: updatedOrder.shippingCharge,
                    codCharge: updatedOrder.codCharge
                };
                const shiprocketResponse = await createShiprocketOrder(shiprocketOrderData, shiprocketToken, "Prepaid");

                updatedOrder.shiprocket = {
                    ourOrderId: updatedOrder._id.toString(),
                    srOrderId: shiprocketResponse.order_id,
                    shipmentId: shiprocketResponse.shipment_id,
                    awb: shiprocketResponse.awb_code,
                    courier: shiprocketResponse.courier_name,
                    trackingUrl: `https://shiprocket.co/tracking/${shiprocketResponse.awb_code}`
                };
                updatedOrder.orderStatus = "Confirmed"; // The order is paid and confirmed
                updatedOrder.shiprocketStatus = "NEW"; // It's a new order for Shiprocket
                updatedOrder.shippedAt = new Date(); // Set shippedAt timestamp
                await updatedOrder.save(); // Save after all updates
            } catch (error) {
                console.log("Error with Shiprocket:", error.message);
                // If shiprocket fails, update order status accordingly but don't fail the entire payment verification
                await orderModel.findByIdAndUpdate(orderId, { orderStatus: 'Confirmed', shiprocketStatus: 'NEW' }); // Keep Confirmed status if Shiprocket fails
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
        
        const { userId, items, address, currency, giftWrap: giftWrapData } = req.body;

        const { productAmount, shippingCharge, codCharge, orderTotal, processedItems } = await calculateOrderPricing(userId, items, 'Razorpay', giftWrapData);

        const orderData = {
            userId,
            items: processedItems,
            orderTotal: orderTotal, // Use backend calculated amount
            productAmount,
            shippingCharge,
            codCharge,
            address,
            paymentMethod:"Razorpay",
            payment:false,
            date: Date.now(),
            giftWrap: giftWrapData
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
                await orderModel.findByIdAndUpdate(orderInfo.receipt, { 
                    payment: true, 
                    paymentDetails: { razorpay_order_id, razorpay_payment_id, razorpay_signature },
                    razorpayPaymentId: razorpay_payment_id, // Store Razorpay Payment ID
                    orderStatus: 'Confirmed' // Update status to Confirmed after successful payment
                });
                
                const order = await orderModel.findById(orderInfo.receipt).populate('userId');

                // Check if this is a luxe membership purchase
                const isLuxeOrder = order.items.some(item => item.name === "Febeul Luxe Membership");

                if (isLuxeOrder) {
                    const expiryDate = new Date();
                    expiryDate.setMonth(expiryDate.getMonth() + 1);
                    await userModel.findByIdAndUpdate(userId, {
                        isLuxeMember: true,
                        luxeMembershipExpires: expiryDate,
                        giftWrapsLeft: 15, // Initialize gift wraps
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
                            totalPrice: order.productAmount, // Use productAmount for subtotal
                            shippingCharge: order.shippingCharge, // Pass shippingCharge to shiprocket
                            codCharge: order.codCharge // Pass codCharge to shiprocket
                        };
                        const shiprocketResponse = await createShiprocketOrder(shiprocketOrderData, shiprocketToken, "Prepaid");

                        order.shiprocket = {
                            ourOrderId: order._id.toString(),
                            srOrderId: shiprocketResponse.order_id,
                            shipmentId: shiprocketResponse.shipment_id,
                            awb: shiprocketResponse.awb_code,
                            courier: shiprocketResponse.courier_name,
                            trackingUrl: `https://shiprocket.co/tracking/${shiprocketResponse.awb_code}`
                        };
                                                order.orderStatus = "Confirmed"; // The order is paid and confirmed
                                                order.shiprocketStatus = "NEW"; // It's a new order for Shiprocket
                                                order.shippedAt = new Date(); // Set shippedAt timestamp
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
        const order = await orderModel.findById(req.params.id).populate('userId', 'name email'); // Populate userId
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