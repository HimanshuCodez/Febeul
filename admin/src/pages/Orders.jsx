import React from 'react'
import { useEffect } from 'react'
import { useState } from 'react'
import axios from 'axios'
import { backendUrl, currency } from '../App'
import { toast } from 'react-toastify'
import { assets } from '../assets/assets' // Keep this if parcel_icon is still used elsewhere or as fallback

const Orders = ({ token }) => {

  const [orders, setOrders] = useState([])

  const fetchAllOrders = async () => {

    if (!token) {
      return null;
    }

    try {

      // Ensure this endpoint is correctly populating userId and items.productId
      const response = await axios.post(backendUrl + '/api/order/list', {}, { headers: { token } })
      if (response.data.success) {
        setOrders(response.data.orders.reverse())
      } else {
        toast.error(response.data.message)
      }

    } catch (error) {
      toast.error(error.message)
    }
  }

  const statusHandler = async ( event, orderId ) => {
    try {
      const response = await axios.post(backendUrl + '/api/order/status' , {orderId, status:event.target.value}, { headers: {token}})
      if (response.data.success) {
        await fetchAllOrders()
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.log(error)
      toast.error("Failed to update status");
    }
  }

  useEffect(() => {
    fetchAllOrders();
  }, [token])

  return (
    <div className='p-6 bg-gray-50 min-h-screen'>
      <h3 className='text-2xl font-semibold text-gray-800 mb-6'>All Orders</h3>
      <div className='space-y-6'>
        {
          orders.map((order, index) => (
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 items-center border border-gray-200 bg-white rounded-lg p-5 shadow-sm' key={index}>
              
              {/* Product Info */}
              <div className='col-span-1'>
                <p className='font-semibold text-gray-700 mb-2'>Products</p>
                {order.items.map((item, itemIndex) => (
                  <div key={itemIndex} className='flex items-center gap-3 mb-2'>
                    <img className='w-16 h-16 object-cover rounded' src={item.image} alt={item.name} />
                    <p className='text-sm text-gray-600'>{item.name} x {item.quantity} {item.size && `(${item.size})`}</p>
                  </div>
                ))}
              </div>

              {/* User Details */}
              <div className='col-span-1'>
                <p className='font-semibold text-gray-700 mb-2'>Customer</p>
                {order.userId && (
                  <>
                    <p className='text-sm text-gray-600'>{order.userId.name}</p>
                    <p className='text-sm text-gray-600'>{order.userId.email}</p>
                  </>
                )}
                <p className='text-sm text-gray-600 mt-2 font-semibold'>Shipping Address</p>
                <p className='text-xs text-gray-600'>{order.address.firstName + " " + order.address.lastName}</p>
                <p className='text-xs text-gray-600'>{order.address.street + ","}</p>
                <p className='text-xs text-gray-600'>{order.address.city + ", " + order.address.state + ", " + order.address.country + ", " + order.address.zipcode}</p>
                <p className='text-xs text-gray-600'>{order.address.phone}</p>
              </div>

              {/* Order Details */}
              <div className='col-span-1'>
                <p className='font-semibold text-gray-700 mb-2'>Order Details</p>
                <p className='text-sm text-gray-600'>Items: {order.items.length}</p>
                <p className='text-sm text-gray-600'>Method: {order.paymentMethod}</p>
                <p className='text-sm text-gray-600'>Payment: { order.payment ? 'Done' : 'Pending' }</p>
                <p className='text-sm text-gray-600'>Date: {new Date(order.date).toLocaleDateString()}</p>
              </div>

              {/* Total Amount */}
              <div className='col-span-1'>
                <p className='font-semibold text-gray-700 mb-2'>Total</p>
                <p className='text-xl font-bold text-gray-800'>{currency}{order.amount}</p>
              </div>

              {/* Status */}
              <div className='col-span-1 flex justify-center lg:justify-end'>
                <select onChange={(event)=>statusHandler(event,order._id)} value={order.status} className='p-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-pink-500'>
                  <option value="Order Placed">Order Placed</option>
                  <option value="Packing">Packing</option>
                  <option value="Shipped">Shipped</option>
                  <option value="Out for delivery">Out for delivery</option>
                  <option value="Delivered">Delivered</option>
                </select>
              </div>
            </div>
          ))
        }
      </div>
    </div>
  )
}

export default Orders