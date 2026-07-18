import axios from "axios";

let shiprocketToken = null;

export const shiprocketLogin = async () => {
  if (shiprocketToken) {
    return shiprocketToken;
  }

  try {
    const res = await axios.post(
      "https://apiv2.shiprocket.in/v1/external/auth/login",
      {
        email: process.env.SHIPROCKET_EMAIL,
        password: process.env.SHIPROCKET_PASSWORD,
      }
    );
    shiprocketToken = res.data.token;
    // Token is valid for ~10 days, this is a simple in-memory cache
    // A more robust solution would use Redis or a similar store
    setTimeout(() => {
        shiprocketToken = null;
    }, 9 * 24 * 60 * 60 * 1000); // Reset after 9 days
    return shiprocketToken;
  } catch (error) {
    console.error("Error logging in to Shiprocket:", error.response ? error.response.data : error.message);
    throw new Error("Failed to login to Shiprocket");
  }
};

export const createShiprocketOrder = async (order, token, paymentMethod) => {
    try {
        const response = await axios.post(
          "https://apiv2.shiprocket.in/v1/external/orders/create/adhoc",
          {
            order_id: order._id.toString(),
            order_date: new Date(),
            pickup_location: "warehouse", // Make sure this location is configured in your Shiprocket panel
            billing_customer_name: order.shippingAddress.name,
            billing_last_name: order.shippingAddress.lastName, 
            billing_address: order.shippingAddress.address,
            billing_address_2: order.shippingAddress.address2 || "", 
            billing_city: order.shippingAddress.city,
            billing_pincode: order.shippingAddress.pincode,
            billing_state: order.shippingAddress.state,
            billing_country: order.shippingAddress.country,
            billing_email: order.shippingAddress.email,
            billing_phone: order.shippingAddress.phone,
      
            shipping_is_billing: true,
      
            order_items: order.items.map(item => ({
              name: item.name,
              sku: item.name, // Using name for SKU as per user's instruction
              units: item.quantity,
              selling_price: item.price,
              hsn: "" // Add HSN code if available
            })),
      
            payment_method: paymentMethod,
            sub_total: order.totalPrice,
            length: 10,
            breadth: 10,
            height: 5,
            weight: 0.5 // in kgs
          },
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );
      
        return response.data;
    } catch (error) {
        console.error("Error creating Shiprocket order:", error.response ? error.response.data : error.message);
        throw new Error("Failed to create Shiprocket order");
    }
};

export const trackShipment = async (awb) => {
    try {
        const token = await shiprocketLogin();
        const response = await axios.get(
            `https://apiv2.shiprocket.in/v1/external/courier/track/awb/${awb}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );
        return response.data;
    } catch (error) {
        console.error("Error tracking Shiprocket shipment:", error.response ? error.response.data : error.message);
        return null;
    }
};

export const assignShiprocketAwb = async (shipmentId, token) => {
    try {
        const response = await axios.post(
            "https://apiv2.shiprocket.in/v1/external/courier/assign/awb",
            {
                shipment_id: shipmentId
            },
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );
        return response.data;
    } catch (error) {
        console.error("Error assigning Shiprocket AWB:", error.response ? error.response.data : error.message);
        return null;
    }
};

// Cancels one or more Shiprocket orders (identified by Shiprocket's own
// order_id, i.e. `shiprocket.srOrderId` on our order document — NOT our
// Mongo _id). Shiprocket rejects cancellation once a shipment has already
// been picked up by the courier, so callers should only attempt this while
// the shipment is still in an early (NEW/PICKUP SCHEDULED) state.
export const cancelShiprocketOrder = async (shiprocketOrderIds) => {
    try {
        const token = await shiprocketLogin();
        const ids = (Array.isArray(shiprocketOrderIds) ? shiprocketOrderIds : [shiprocketOrderIds])
            .filter(Boolean)
            .map(id => Number(id) || id);
        if (ids.length === 0) return null;

        const response = await axios.post(
            "https://apiv2.shiprocket.in/v1/external/orders/cancel",
            { ids },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return response.data;
    } catch (error) {
        console.error("Error cancelling Shiprocket order:", error.response ? error.response.data : error.message);
        return null;
    }
};

// Schedules a reverse pickup (return) — Shiprocket picks the item up from
// the customer's delivery address and brings it back to our warehouse.
// `order` must carry the same shape used by createShiprocketOrder (see
// buildShiprocketOrderPayload below): address fields + items + totals.
export const createReturnOrder = async (order) => {
    try {
        const token = await shiprocketLogin();
        const addr = order.shippingAddress;

        const warehouseName = process.env.WAREHOUSE_NAME || 'Febeul Warehouse';
        const warehouseAddress = process.env.WAREHOUSE_ADDRESS || '';
        const warehouseCity = process.env.WAREHOUSE_CITY || '';
        const warehouseState = process.env.WAREHOUSE_STATE || '';
        const warehousePincode = process.env.WAREHOUSE_PINCODE || '';
        const warehouseCountry = process.env.WAREHOUSE_COUNTRY || 'India';
        const warehouseEmail = process.env.WAREHOUSE_EMAIL || addr.email;
        const warehousePhone = process.env.WAREHOUSE_PHONE || addr.phone;

        const response = await axios.post(
            "https://apiv2.shiprocket.in/v1/external/orders/create/return",
            {
                order_id: `RET-${order._id.toString()}`,
                order_date: new Date().toISOString().slice(0, 19).replace('T', ' '),
                channel_id: "",

                // Pickup happens FROM the customer (reverse of a normal shipment)
                pickup_customer_name: addr.name,
                pickup_last_name: addr.lastName || '.',
                pickup_address: addr.address,
                pickup_address_2: addr.address2 || '',
                pickup_city: addr.city,
                pickup_pincode: addr.pincode,
                pickup_state: addr.state,
                pickup_country: addr.country || 'India',
                pickup_email: addr.email,
                pickup_phone: addr.phone,

                // Delivery (destination) is our warehouse
                shipping_customer_name: warehouseName,
                shipping_address: warehouseAddress,
                shipping_city: warehouseCity,
                shipping_pincode: warehousePincode,
                shipping_state: warehouseState,
                shipping_country: warehouseCountry,
                shipping_email: warehouseEmail,
                shipping_phone: warehousePhone,

                order_items: order.items.map(item => ({
                    name: item.name,
                    sku: item.sku || item.name,
                    units: item.quantity,
                    selling_price: item.price,
                    qc_enable: false
                })),

                payment_method: "PREPAID",
                sub_total: order.totalPrice,
                length: 10,
                breadth: 10,
                height: 5,
                weight: 0.5
            },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return response.data;
    } catch (error) {
        console.error("Error creating Shiprocket return order:", error.response ? error.response.data : error.message);
        return null;
    }
};

// Builds the address/items payload createShiprocketOrder expects, from one
// of our populated order documents (order.address is the customer's shipping
// address, order.userId must be populated for the email field).
export const buildShiprocketOrderPayload = (order) => ({
    _id: order._id,
    shippingAddress: {
        name: order.address.name.split(' ')[0] || '',
        lastName: order.address.name.split(' ').slice(1).join(' ') || '.',
        address: order.address.address,
        address2: `${order.address.locality || ''}${order.address.landmark ? ', ' + order.address.landmark : ''}`.trim(),
        city: order.address.city,
        pincode: order.address.zip,
        state: order.address.state,
        country: "India",
        phone: order.address.phone,
        email: order.userId.email
    },
    user: order.userId,
    items: order.items,
    totalPrice: order.productAmount,
    shippingCharge: order.shippingCharge,
    codCharge: order.codCharge
});

// Creates a Shiprocket order for `order` and assigns an AWB in one step.
// Used for every payment path (COD, Stripe, Razorpay) so the shipment
// creation logic — and its failure handling — lives in exactly one place.
// Returns the `shiprocket` sub-document fields to assign onto the order, or
// null if Shiprocket order creation itself failed (AWB assignment failing is
// tolerated — the shipment still exists, just without a courier yet).
export const createAndAssignShipment = async (order, paymentMethodLabel) => {
    try {
        const token = await shiprocketLogin();
        const payload = buildShiprocketOrderPayload(order);
        const shiprocketResponse = await createShiprocketOrder(payload, token, paymentMethodLabel);

        if (!shiprocketResponse || !shiprocketResponse.order_id) return null;

        let awbCode = null;
        let courierName = null;

        if (shiprocketResponse.shipment_id) {
            try {
                const awbResponse = await assignShiprocketAwb(shiprocketResponse.shipment_id, token);
                if (awbResponse && awbResponse.awb_assign_status === 1) {
                    awbCode = awbResponse.response?.data?.awb_code || null;
                    courierName = awbResponse.response?.data?.courier_name || null;
                }
            } catch (awbError) {
                console.log(`Error assigning Shiprocket AWB for ${paymentMethodLabel} order:`, awbError.message);
            }
        }

        return {
            ourOrderId: order._id.toString(),
            srOrderId: shiprocketResponse.order_id,
            shipmentId: shiprocketResponse.shipment_id,
            awb: awbCode,
            courier: courierName,
            trackingUrl: awbCode ? `https://shiprocket.co/tracking/${awbCode}` : '',
            lastTrackedAt: new Date(),
            trackingHistory: [{
                status: 'NEW',
                activity: 'Order created with courier partner',
                date: new Date()
            }]
        };
    } catch (error) {
        console.log(`Error with Shiprocket (${paymentMethodLabel}):`, error.message);
        return null;
    }
};

