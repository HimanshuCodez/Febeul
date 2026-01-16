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
            pickup_location: "Primary", // Make sure this location is configured in your Shiprocket panel
            billing_customer_name: order.shippingAddress.name,
            billing_last_name: order.shippingAddress.lastName, 
            billing_address: order.shippingAddress.address,
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
