import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { backendUrl } from '../App';
import { CSVLink } from 'react-csv';
import { Download, Search, FileText, Trash2, Plus, Calendar, Tag, User, Users, Info, ChevronRight } from 'lucide-react';

const Coupons = ({ token }) => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const role = localStorage.getItem('role');
  const [searchTerm, setSearchTerm] = useState('');
  const [newCoupon, setNewCoupon] = useState({
    code: '',
    description: '',
    discountType: 'percentage',
    discountValue: '',
    minOrderAmount: '',
    minQuantity: '',
    usageLimit: '',
    usageLimitPerUser: '',
    expiryDate: '',
    isActive: true,
    userType: 'normal',
    offerType: 'none',
    applicableSKUs: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [showUsageModal, setShowUsageModal] = useState(false);
  const [usageList, setUsageList] = useState([]);
  const [selectedCouponCode, setSelectedCouponCode] = useState('');

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

  const fetchCouponUsage = async (couponId, code) => {
    try {
      const response = await axios.get(`${backendUrl}/api/coupon/usage/${couponId}`, { headers: { token } });
      if (response.data.success) {
        setUsageList(response.data.users);
        setSelectedCouponCode(code);
        setShowUsageModal(true);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error('Error fetching coupon usage:', error);
      toast.error('Failed to fetch coupon usage.');
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
    
    setIsSubmitting(true);
    try {
      const payload = {
        ...newCoupon,
        description: newCoupon.description || undefined,
        discountValue: parseFloat(newCoupon.discountValue),
        minOrderAmount: newCoupon.minOrderAmount ? parseFloat(newCoupon.minOrderAmount) : undefined,
        minQuantity: newCoupon.minQuantity ? parseInt(newCoupon.minQuantity) : undefined,
        usageLimit: newCoupon.usageLimit ? parseInt(newCoupon.usageLimit) : undefined,
        usageLimitPerUser: newCoupon.usageLimitPerUser ? parseInt(newCoupon.usageLimitPerUser) : undefined,
        applicableSKUs: newCoupon.applicableSKUs ? newCoupon.applicableSKUs.split(',').map(s => s.trim()).filter(s => s) : [],
      };
      const response = await axios.post(`${backendUrl}/api/coupon/add`, payload, { headers: { token } });
      if (response.data.success) {
        toast.success('Coupon added successfully!');
        setNewCoupon({
          code: '',
          description: '',
          discountType: 'percentage',
          discountValue: '',
          minOrderAmount: '',
          minQuantity: '',
          usageLimit: '',
          usageLimitPerUser: '',
          expiryDate: '',
          isActive: true,
          userType: 'normal',
          offerType: 'none',
          applicableSKUs: '',
        });
        fetchCoupons();
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

  const filteredCoupons = coupons.filter(coupon => 
    coupon.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (coupon.description && coupon.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getGroupedUsageData = () => {
    const grouped = usageList.reduce((acc, usage) => {
      const user = usage.userId;
      if (!user) return acc;
      const key = user._id;
      if (!acc[key]) {
        acc[key] = {
          name: user.name || 'Unknown User',
          email: user.email || 'N/A',
          mobile: user.mobile || 'N/A',
          count: 0
        };
      }
      acc[key].count += 1;
      return acc;
    }, {});
    return Object.values(grouped);
  };

  const usageTableData = getGroupedUsageData();

  const exportHeaders = [
    { label: "User Name", key: "name" },
    { label: "Email", key: "email" },
    { label: "Mobile", key: "mobile" },
    { label: "Usage Count", key: "count" }
  ];

  return (
    <div className='p-4 md:p-8 bg-[#f8fafc] min-h-screen font-sans'>
      <div className='flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4'>
        <div>
          <h2 className='text-3xl font-bold text-slate-800 tracking-tight'>Coupon Management</h2>
          <p className='text-slate-500 mt-1'>Create and manage discount codes for your customers</p>
        </div>
        <div className='flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-200 w-full md:w-auto'>
          <Search className='text-slate-400 w-5 h-5 ml-2' />
          <input 
            type="text" 
            placeholder="Search coupons..." 
            className='bg-transparent border-none focus:ring-0 text-slate-600 placeholder:text-slate-400 w-full md:w-64 py-1'
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className='grid grid-cols-1 xl:grid-cols-3 gap-8'>
        {/* Add New Coupon Form */}
        <div className='xl:col-span-1'>
          <div className='bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden sticky top-8'>
            <div className='p-6 bg-slate-50 border-b border-slate-100 flex items-center gap-2'>
              <div className='bg-pink-100 p-2 rounded-xl'>
                <Plus className='text-pink-600 w-5 h-5' />
              </div>
              <h3 className='text-lg font-bold text-slate-800'>Create New Coupon</h3>
            </div>
            <form onSubmit={handleAddCoupon} className='p-6 space-y-5'>
              <div>
                <label className='block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2'>Coupon Code *</label>
                <div className='flex gap-2'>
                  <input
                    type='text'
                    name='code'
                    value={newCoupon.code}
                    onChange={handleInputChange}
                    className='flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all uppercase'
                    placeholder='SUMMER20'
                    required
                  />
                  <button
                    type='button'
                    onClick={generateCode}
                    className='px-4 py-2 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-700 transition-all text-sm'
                  >
                    Auto
                  </button>
                </div>
              </div>

              <div>
                <label className='block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2'>Description</label>
                <textarea
                  name='description'
                  rows='2'
                  value={newCoupon.description}
                  onChange={handleInputChange}
                  className='w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all'
                  placeholder='Enter short description'
                ></textarea>
              </div>

              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label className='block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2'>Type</label>
                  <select
                    name='discountType'
                    value={newCoupon.discountType}
                    onChange={handleInputChange}
                    className='w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all appearance-none cursor-pointer'
                  >
                    <option value='percentage'>Percent %</option>
                    <option value='fixed'>Fixed ₹</option>
                  </select>
                </div>
                <div>
                  <label className='block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2'>Value *</label>
                  <input
                    type='number'
                    name='discountValue'
                    value={newCoupon.discountValue}
                    onChange={handleInputChange}
                    className='w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all'
                    placeholder='10'
                    required
                  />
                </div>
              </div>

              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label className='block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2'>User Type</label>
                  <select
                    name='userType'
                    value={newCoupon.userType}
                    onChange={handleInputChange}
                    className='w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all'
                  >
                    <option value='normal'>All Users</option>
                    <option value='luxe'>Luxe Only</option>
                  </select>
                </div>
                <div>
                  <label className='block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2'>Offer Type</label>
                  <select
                    name='offerType'
                    value={newCoupon.offerType}
                    onChange={handleInputChange}
                    className='w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all'
                  >
                    <option value='none'>None</option>
                    <option value='prepaid'>Prepaid Only</option>
                    <option value='cod'>COD Only</option>
                  </select>
                </div>
              </div>

              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label className='block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2'>Min Order ₹</label>
                  <input
                    type='number'
                    name='minOrderAmount'
                    value={newCoupon.minOrderAmount}
                    onChange={handleInputChange}
                    className='w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all'
                    placeholder='0'
                  />
                </div>
                <div>
                  <label className='block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2'>Min Quantity</label>
                  <input
                    type='number'
                    name='minQuantity'
                    value={newCoupon.minQuantity}
                    onChange={handleInputChange}
                    className='w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all'
                    placeholder='0'
                  />
                </div>
              </div>

              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <label className='block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2'>Expiry Date *</label>
                  <input
                    type='date'
                    name='expiryDate'
                    value={newCoupon.expiryDate}
                    onChange={handleInputChange}
                    className='w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all'
                    required
                  />
                </div>
                <div>
                  <label className='block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2'>Overall Limit</label>
                  <input
                    type='number'
                    name='usageLimit'
                    value={newCoupon.usageLimit}
                    onChange={handleInputChange}
                    className='w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all'
                    placeholder='∞'
                  />
                </div>
              </div>

              <div>
                <label className='block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2'>Applicable SKUs (Comma separated)</label>
                <input
                  type='text'
                  name='applicableSKUs'
                  value={newCoupon.applicableSKUs}
                  onChange={handleInputChange}
                  className='w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 outline-none transition-all'
                  placeholder='SKU1, SKU2'
                />
              </div>

              <div className='flex items-center p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer'>
                <input
                  type='checkbox'
                  id='isActive'
                  name='isActive'
                  checked={newCoupon.isActive}
                  onChange={handleInputChange}
                  className='h-5 w-5 text-pink-600 focus:ring-pink-500 border-slate-300 rounded-lg transition-all'
                />
                <label htmlFor='isActive' className='ml-3 text-sm font-bold text-slate-700 cursor-pointer'>Active & Listable</label>
              </div>

              <button
                type='submit'
                disabled={isSubmitting}
                className='w-full bg-slate-800 text-white py-4 px-6 rounded-2xl font-bold text-lg hover:bg-slate-900 transition-all shadow-lg shadow-slate-200 disabled:bg-slate-400 mt-2'
              >
                {isSubmitting ? 'Creating...' : 'Generate Coupon'}
              </button>
            </form>
          </div>
        </div>

        {/* Existing Coupons List */}
        <div className='xl:col-span-2'>
          <div className='bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden'>
            <div className='p-6 border-b border-slate-100 flex items-center justify-between'>
              <h3 className='text-lg font-bold text-slate-800 flex items-center gap-2'>
                <Tag className='text-pink-500 w-5 h-5' />
                All Active Coupons
              </h3>
              <div className='bg-slate-100 px-3 py-1 rounded-full text-xs font-bold text-slate-500'>
                {filteredCoupons.length} Coupons
              </div>
            </div>
            <div className='overflow-x-auto'>
              <table className='min-w-full divide-y divide-slate-100'>
                <thead className='bg-slate-50/50'>
                  <tr>
                    <th className='px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em]'>#</th>
                    <th className='px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em]'>Code</th>
                    <th className='px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em]'>Discount</th>
                    <th className='px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em]'>Usage</th>
                    <th className='px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em]'>Expires</th>
                    <th className='px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em]'>Status</th>
                    <th className='px-6 py-4 text-right text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em]'>Actions</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-slate-50'>
                  {filteredCoupons.map((coupon, index) => (
                    <tr key={coupon._id} className='hover:bg-slate-50/50 transition-colors group'>
                      <td className='px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-400'>
                        {index + 1}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <div 
                          className='flex items-center gap-3 cursor-pointer group/code'
                          onClick={() => fetchCouponUsage(coupon._id, coupon.code)}
                        >
                          <div className='bg-pink-50 p-2 rounded-lg group-hover/code:bg-pink-100 transition-all'>
                            <Tag className='text-pink-500 w-4 h-4' />
                          </div>
                          <div>
                            <p className='text-sm font-bold text-slate-700 uppercase group-hover/code:text-pink-600 transition-all'>{coupon.code}</p>
                            <p className='text-[10px] text-slate-400 font-medium'>{coupon.description || 'No description'}</p>
                          </div>
                        </div>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <span className='px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-xs font-bold'>
                          {coupon.discountType === 'percentage' ? `${coupon.discountValue}%` : `₹${coupon.discountValue}`}
                        </span>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <div className='flex items-center gap-2'>
                          <Users className='w-3.5 h-3.5 text-slate-400' />
                          <span className='text-xs font-bold text-slate-600'>{coupon.usageCount || 0}</span>
                          <span className='text-[10px] text-slate-400'>/ {coupon.usageLimit || '∞'}</span>
                        </div>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-xs font-bold text-slate-500'>
                        {new Date(coupon.expiryDate).toLocaleDateString()}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                          new Date(coupon.expiryDate) < new Date() || !coupon.isActive
                            ? 'bg-red-50 text-red-600'
                            : 'bg-emerald-50 text-emerald-600'
                        }`}>
                          {new Date(coupon.expiryDate) < new Date() ? 'Expired' : coupon.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-right'>
                        <div className='flex items-center justify-end gap-2'>
                          <button 
                            onClick={() => fetchCouponUsage(coupon._id, coupon.code)}
                            className='p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all'
                            title='View Usage'
                          >
                            <FileText className='w-4 h-4' />
                          </button>
                          {role !== 'staff' && (
                            <button
                              onClick={() => handleDeleteCoupon(coupon._id)}
                              className='p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all'
                              title='Delete'
                            >
                              <Trash2 className='w-4 h-4' />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredCoupons.length === 0 && (
                    <tr>
                      <td colSpan="7" className="px-6 py-12 text-center">
                        <div className='flex flex-col items-center gap-2'>
                          <div className='bg-slate-50 p-4 rounded-full'>
                            <Tag className='w-8 h-8 text-slate-300' />
                          </div>
                          <p className='text-slate-400 font-bold'>No coupons found matching your search</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Coupon Usage Modal */}
      {showUsageModal && (
        <div className='fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4'>
          <div className='bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200'>
            <div className='p-6 bg-slate-50 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4'>
              <div className='flex items-center gap-4'>
                <div className='bg-pink-100 p-3 rounded-2xl'>
                  <FileText className='text-pink-600 w-6 h-6' />
                </div>
                <div>
                  <h2 className='text-xl font-bold text-slate-800'>Coupon Usage Analytics</h2>
                  <p className='text-sm text-pink-600 font-bold flex items-center gap-1'>
                    <Tag className='w-3 h-3' /> {selectedCouponCode}
                  </p>
                </div>
              </div>
              <div className='flex items-center gap-2 w-full md:w-auto'>
                {usageTableData.length > 0 && (
                  <CSVLink 
                    data={usageTableData} 
                    headers={exportHeaders}
                    filename={`Coupon_Usage_${selectedCouponCode}.csv`}
                    className='flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-md shadow-emerald-100 w-full justify-center md:w-auto'
                  >
                    <Download className='w-4 h-4' /> Export Report
                  </CSVLink>
                )}
                <button 
                  onClick={() => setShowUsageModal(false)} 
                  className='p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-xl transition-all'
                >
                  <Plus className='w-6 h-6 rotate-45' />
                </button>
              </div>
            </div>

            <div className='p-6 overflow-y-auto flex-1 bg-white'>
              {usageTableData.length === 0 ? (
                <div className='py-20 flex flex-col items-center text-center gap-4'>
                  <div className='bg-slate-50 p-6 rounded-full'>
                    <Users className='w-12 h-12 text-slate-200' />
                  </div>
                  <div>
                    <h3 className='text-lg font-bold text-slate-700'>No Usage Recorded</h3>
                    <p className='text-slate-400 text-sm'>This coupon hasn't been used by any customers yet.</p>
                  </div>
                </div>
              ) : (
                <div className='border border-slate-100 rounded-2xl overflow-hidden'>
                  <table className='min-w-full divide-y divide-slate-100'>
                    <thead className='bg-slate-50'>
                      <tr>
                        <th className='px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider'>#</th>
                        <th className='px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider'>Customer</th>
                        <th className='px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider'>Contact Info</th>
                        <th className='px-6 py-4 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider'>Frequency</th>
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-slate-50'>
                      {usageTableData.map((usage, index) => (
                        <tr key={index} className='hover:bg-slate-50 transition-colors'>
                          <td className='px-6 py-4 whitespace-nowrap text-xs font-bold text-slate-400'>{index + 1}</td>
                          <td className='px-6 py-4 whitespace-nowrap'>
                            <div className='flex items-center gap-3'>
                              <div className='w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs uppercase'>
                                {usage.name.charAt(0)}
                              </div>
                              <span className='text-sm font-bold text-slate-700'>{usage.name}</span>
                            </div>
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap'>
                            <div className='flex flex-col gap-0.5'>
                              <span className='text-xs font-medium text-slate-600 flex items-center gap-1.5'>
                                <FileText className='w-3 h-3 text-slate-400' /> {usage.email}
                              </span>
                              <span className='text-xs font-medium text-slate-500 flex items-center gap-1.5'>
                                <Users className='w-3 h-3 text-slate-400' /> {usage.mobile}
                              </span>
                            </div>
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-center'>
                            <span className='inline-flex items-center justify-center px-3 py-1 bg-slate-100 text-slate-800 rounded-full text-xs font-bold'>
                              Used {usage.count}x
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            <div className='p-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center'>
              <p className='text-xs text-slate-400 font-medium'>
                Total unique users: <span className='text-slate-700 font-bold'>{usageTableData.length}</span>
              </p>
              <button
                onClick={() => setShowUsageModal(false)}
                className='px-6 py-2.5 bg-slate-800 text-white rounded-xl hover:bg-slate-900 transition-all font-bold text-sm shadow-md'
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Staff Details Modal */}
      {showStaffModal && selectedStaff && (
        <div className='fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4'>
          <div className='bg-white rounded-3xl shadow-2xl max-w-sm w-full border border-slate-200 overflow-hidden'>
            <div className='p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center'>
              <h2 className='text-xl font-bold text-slate-800 flex items-center gap-2'>
                <User className='text-blue-500 w-5 h-5' /> Staff Details
              </h2>
              <button onClick={() => setShowStaffModal(false)} className='p-2 text-slate-400 hover:text-slate-600 rounded-lg'>
                <Plus className='w-6 h-6 rotate-45' />
              </button>
            </div>
            <div className='p-8 flex flex-col items-center text-center'>
              <div className='w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-4 border-4 border-white shadow-lg'>
                <User className='text-blue-500 w-10 h-10' />
              </div>
              <h3 className='text-xl font-bold text-slate-800'>{selectedStaff.name || 'N/A'}</h3>
              <p className='text-sm text-slate-500 font-medium mb-6'>{selectedStaff.email}</p>
              
              <div className='w-full grid grid-cols-2 gap-4'>
                <div className='bg-slate-50 p-4 rounded-2xl border border-slate-100'>
                  <p className='text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1'>Role</p>
                  <p className='text-sm font-bold text-slate-700'>Staff Member</p>
                </div>
                <div className='bg-slate-50 p-4 rounded-2xl border border-slate-100'>
                  <p className='text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1'>Status</p>
                  <p className='text-sm font-bold text-emerald-600'>Authorized</p>
                </div>
              </div>
            </div>
            <div className='p-6 bg-slate-50 border-t border-slate-100'>
              <button
                onClick={() => setShowStaffModal(false)}
                className='w-full py-3 bg-slate-800 text-white rounded-2xl hover:bg-slate-900 transition-all font-bold shadow-md'
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Coupons;

