import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { backendUrl } from '../App'; // Assuming backendUrl is available from App.jsx or similar shared context

const Coupons = ({ token }) => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newCoupon, setNewCoupon] = useState({
    code: '',
    description: '',
    discountType: 'percentage', // 'percentage' or 'fixed'
    discountValue: '',
    minOrderAmount: '',
    usageLimit: '', // overall limit
    usageLimitPerUser: '',
    expiryDate: '',
    isActive: true,
    userType: 'normal', // 'normal' or 'luxe'
    applicableSKUs: '', // Comma-separated SKUs
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCoupons = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const response = await axios.get(`${backendUrl}/api/coupon/list`, { headers: { token } });
      if (response.data.success) {
        setCoupons(response.data.coupons);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error('Error fetching coupons:', error);
      toast.error('Failed to fetch coupons.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setNewCoupon((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewCoupon((prev) => ({ ...prev, code: result }));
  };

  const handleAddCoupon = async (e) => {
    e.preventDefault();
    if (!token) {
      toast.error('Authentication token is missing.');
      return;
    }
    if (!newCoupon.code || !newCoupon.discountValue || !newCoupon.expiryDate) {
      toast.error('Please fill in all required fields (Code, Discount Value, Expiry Date).');
      return;
    }
    if (isNaN(parseFloat(newCoupon.discountValue)) || parseFloat(newCoupon.discountValue) <= 0) {
      toast.error('Discount Value must be a positive number.');
      return;
    }
    if (newCoupon.discountType === 'percentage' && parseFloat(newCoupon.discountValue) > 100) {
      toast.error('Percentage discount cannot exceed 100.');
      return;
    }
    if (newCoupon.minOrderAmount && isNaN(parseFloat(newCoupon.minOrderAmount))) {
      toast.error('Minimum Order Amount must be a number.');
      return;
    }
    if (newCoupon.usageLimit && isNaN(parseInt(newCoupon.usageLimit))) {
      toast.error('Usage Limit must be an integer.');
      return;
    }
    if (newCoupon.usageLimitPerUser && isNaN(parseInt(newCoupon.usageLimitPerUser))) {
      toast.error('Usage Limit Per User must be an integer.');
      return;
    }

    setIsSubmitting(true);
    try {
              const payload = {
              ...newCoupon,
              description: newCoupon.description || undefined,
              discountValue: parseFloat(newCoupon.discountValue),
              minOrderAmount: newCoupon.minOrderAmount ? parseFloat(newCoupon.minOrderAmount) : undefined,
              usageLimit: newCoupon.usageLimit ? parseInt(newCoupon.usageLimit) : undefined,
              usageLimitPerUser: newCoupon.usageLimitPerUser ? parseInt(newCoupon.usageLimitPerUser) : undefined,
              applicableSKUs: newCoupon.applicableSKUs ? newCoupon.applicableSKUs.split(',').map(s => s.trim()).filter(s => s) : [],
            };      const response = await axios.post(`${backendUrl}/api/coupon/add`, payload, { headers: { token } });
      if (response.data.success) {
        toast.success('Coupon added successfully!');
        setNewCoupon({
          code: '',
          description: '',
          discountType: 'percentage',
          discountValue: '',
          minOrderAmount: '',
          usageLimit: '',
          usageLimitPerUser: '',
          expiryDate: '',
          isActive: true,
          userType: 'normal',
          applicableSKUs: '',
        });
        fetchCoupons(); // Refresh the list
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error('Error adding coupon:', error);
      toast.error(error.response?.data?.message || 'Failed to add coupon.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCoupon = async (couponId) => {
    if (!window.confirm('Are you sure you want to delete this coupon?')) return;
    if (!token) {
      toast.error('Authentication token is missing.');
      return;
    }
    try {
      const response = await axios.post(`${backendUrl}/api/coupon/remove`, { id: couponId }, { headers: { token } });
      if (response.data.success) {
        toast.success('Coupon deleted successfully!');
        fetchCoupons();
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error('Error deleting coupon:', error);
      toast.error('Failed to delete coupon.');
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, [token]);

  return (
    <div className='p-6 bg-gray-50 min-h-screen'>
      <h2 className='text-3xl font-semibold text-gray-800 mb-8'>Coupon Management</h2>

      {/* Add New Coupon Form */}
      <div className='bg-white rounded-lg shadow-md p-8 mb-8'>
        <h3 className='text-xl font-bold text-gray-700 mb-6'>Add New Coupon</h3>
        <form onSubmit={handleAddCoupon} className='grid grid-cols-1 md:grid-cols-2 gap-6'>
          <div>
            <label htmlFor='code' className='block text-sm font-medium text-gray-700 mb-1'>Coupon Code *</label>
            <div className='flex'>
              <input
                type='text'
                id='code'
                name='code'
                value={newCoupon.code}
                onChange={handleInputChange}
                className='flex-1 p-2 border border-gray-300 rounded-l-md focus:ring-pink-500 focus:border-pink-500'
                placeholder='e.g., FLAT100'
                required
              />
              <button
                type='button'
                onClick={generateCode}
                className='px-4 py-2 bg-pink-500 text-white font-medium rounded-r-md hover:bg-pink-600 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2'
              >
                Generate
              </button>
            </div>
          </div>

          <div>
            <label htmlFor='description' className='block text-sm font-medium text-gray-700 mb-1'>Description (Optional)</label>
            <textarea
              id='description'
              name='description'
              rows='3'
              value={newCoupon.description}
              onChange={handleInputChange}
              className='w-full p-2 border border-gray-300 rounded-md focus:ring-pink-500 focus:border-pink-500'
              placeholder='e.g., Get flat 10% off on all orders'
            ></textarea>
          </div>

          <div>
            <label htmlFor='discountType' className='block text-sm font-medium text-gray-700 mb-1'>Discount Type</label>
            <select
              id='discountType'
              name='discountType'
              value={newCoupon.discountType}
              onChange={handleInputChange}
              className='w-full p-2 border border-gray-300 rounded-md focus:ring-pink-500 focus:border-pink-500'
            >
              <option value='percentage'>Percentage (%)</option>
              <option value='fixed'>Fixed Amount</option>
            </select>
          </div>

          <div>
            <label htmlFor='userType' className='block text-sm font-medium text-gray-700 mb-1'>User Type</label>
            <select
              id='userType'
              name='userType'
              value={newCoupon.userType}
              onChange={handleInputChange}
              className='w-full p-2 border border-gray-300 rounded-md focus:ring-pink-500 focus:border-pink-500'
            >
              <option value='normal'>Normal Users</option>
              <option value='luxe'>Luxe Members</option>
            </select>
          </div>

          <div>
            <label htmlFor='discountValue' className='block text-sm font-medium text-gray-700 mb-1'>Discount Value *</label>
            <input
              type='number'
              id='discountValue'
              name='discountValue'
              value={newCoupon.discountValue}
              onChange={handleInputChange}
              className='w-full p-2 border border-gray-300 rounded-md focus:ring-pink-500 focus:border-pink-500'
              placeholder='e.g., 10 (for 10% or $10)'
              min='0.01'
              step='0.01'
              required
            />
          </div>

          <div>
            <label htmlFor='expiryDate' className='block text-sm font-medium text-gray-700 mb-1'>Expiry Date *</label>
            <input
              type='date'
              id='expiryDate'
              name='expiryDate'
              value={newCoupon.expiryDate}
              onChange={handleInputChange}
              className='w-full p-2 border border-gray-300 rounded-md focus:ring-pink-500 focus:border-pink-500'
              required
            />
          </div>

          <div>
            <label htmlFor='minOrderAmount' className='block text-sm font-medium text-gray-700 mb-1'>Minimum Order Amount (Optional)</label>
            <input
              type='number'
              id='minOrderAmount'
              name='minOrderAmount'
              value={newCoupon.minOrderAmount}
              onChange={handleInputChange}
              className='w-full p-2 border border-gray-300 rounded-md focus:ring-pink-500 focus:border-pink-500'
              placeholder='e.g., 500'
              min='0'
              step='0.01'
            />
          </div>

          <div>
            <label htmlFor='usageLimit' className='block text-sm font-medium text-gray-700 mb-1'>Overall Usage Limit (Optional)</label>
            <input
              type='number'
              id='usageLimit'
              name='usageLimit'
              value={newCoupon.usageLimit}
              onChange={handleInputChange}
              className='w-full p-2 border border-gray-300 rounded-md focus:ring-pink-500 focus:border-pink-500'
              placeholder='e.g., 100'
              min='1'
              step='1'
            />
          </div>

          <div>
            <label htmlFor='usageLimitPerUser' className='block text-sm font-medium text-gray-700 mb-1'>Usage Limit Per User (Optional)</label>
            <input
              type='number'
              id='usageLimitPerUser'
              name='usageLimitPerUser'
              value={newCoupon.usageLimitPerUser}
              onChange={handleInputChange}
              className='w-full p-2 border border-gray-300 rounded-md focus:ring-pink-500 focus:border-pink-500'
              placeholder='e.g., 1'
              min='1'
              step='1'
            />
          </div>

          <div className='md:col-span-2'>
            <label htmlFor='applicableSKUs' className='block text-sm font-medium text-gray-700 mb-1'>Applicable SKUs (Optional)</label>
            <input
              type='text'
              id='applicableSKUs'
              name='applicableSKUs'
              value={newCoupon.applicableSKUs}
              onChange={handleInputChange}
              className='w-full p-2 border border-gray-300 rounded-md focus:ring-pink-500 focus:border-pink-500'
              placeholder='e.g., SKU1,SKU2,SKU3 (comma-separated)'
            />
            <p className='text-xs text-gray-500 mt-1'>Leave blank to apply to all products.</p>
          </div>

          <div className='col-span-1 md:col-span-2 flex items-center'>
            <input
              type='checkbox'
              id='isActive'
              name='isActive'
              checked={newCoupon.isActive}
              onChange={handleInputChange}
              className='h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded'
            />
            <label htmlFor='isActive' className='ml-2 block text-sm text-gray-900'>Is Active</label>
          </div>

          <div className='md:col-span-2'>
            <button
              type='submit'
              disabled={isSubmitting}
              className='w-full bg-pink-500 text-white py-3 px-6 rounded-md font-semibold text-lg hover:bg-pink-600 transition-colors focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 disabled:bg-gray-400'
            >
              {isSubmitting ? 'Adding Coupon...' : 'Add Coupon'}
            </button>
          </div>
        </form>
      </div>

      {/* Existing Coupons List */}
      <div className='bg-white rounded-lg shadow-md p-8'>
        <h3 className='text-xl font-bold text-gray-700 mb-6'>Existing Coupons</h3>
        {loading ? (
          <p>Loading coupons...</p>
        ) : coupons.length === 0 ? (
          <p>No coupons found.</p>
        ) : (
          <div className='overflow-x-auto'>
            <table className='min-w-full divide-y divide-gray-200'>
              <thead className='bg-gray-50'>
                <tr>
                  <th scope='col' className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>Code</th>
                  <th scope='col' className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>Description</th>
                  <th scope='col' className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>Discount</th>
                  <th scope='col' className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>Min Order</th>
                   <th scope='col' className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>Applicable SKUs</th>
                  <th scope='col' className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>Usage Limit</th>
                  <th scope='col' className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>Per User</th>
                  <th scope='col' className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>Expires On</th>
                  <th scope='col' className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>Status</th>
                  <th scope='col' className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>User Type</th>
                  <th scope='col' className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>Actions</th>
                </tr>
              </thead>
              <tbody className='bg-white divide-y divide-gray-200'>
                {coupons.map((coupon) => (
                  <tr key={coupon._id}>
                    <td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900'>{coupon.code}</td>
                    <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>{coupon.description || 'N/A'}</td>
                    <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                      {coupon.discountType === 'percentage' ? `${coupon.discountValue}%` : `₹${coupon.discountValue.toFixed(2)}`}
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                      {coupon.minOrderAmount ? `₹${coupon.minOrderAmount.toFixed(2)}` : 'N/A'}
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                      {coupon.applicableSKUs && coupon.applicableSKUs.length > 0 ? coupon.applicableSKUs.join(', ') : 'All'}
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                      {coupon.usageLimit ? coupon.usageLimit : 'Unlimited'}
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                      {coupon.usageLimitPerUser ? coupon.usageLimitPerUser : 'Unlimited'}
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                      {new Date(coupon.expiryDate).toLocaleDateString()}
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-sm'>
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        new Date(coupon.expiryDate) < new Date() || !coupon.isActive
                          ? 'bg-red-100 text-red-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {new Date(coupon.expiryDate) < new Date() ? 'Expired' : coupon.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>{coupon.userType ? coupon.userType.charAt(0).toUpperCase() + coupon.userType.slice(1) : 'N/A'}</td>
                    <td className='px-6 py-4 whitespace-nowrap text-right text-sm font-medium'>
                      <button
                        onClick={() => handleDeleteCoupon(coupon._id)}
                        className='text-red-600 hover:text-red-900 ml-4'
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Coupons;
