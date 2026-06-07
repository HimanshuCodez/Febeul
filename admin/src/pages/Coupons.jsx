import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { backendUrl } from '../App';
import { CSVLink } from 'react-csv';
import { 
  Download, Search, FileText, Trash2, Plus, 
  Calendar, Tag, User, Users, Info, 
  ChevronRight, Edit, X, CheckCircle2, AlertCircle, TrendingUp 
} from 'lucide-react';

const Coupons = ({ token }) => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const role = localStorage.getItem('role');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingCouponId, setEditingCouponId] = useState(null);
  const [showFormModal, setShowFormModal] = useState(false);
  
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
    specificUsers: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showUsageModal, setShowUsageModal] = useState(false);
  const [usageList, setUsageList] = useState([]);
  const [selectedCouponCode, setSelectedCouponCode] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [allUsageData, setAllUsageData] = useState([]);

  const fetchAllUsage = async () => {
    if (!token) return;
    try {
      const response = await axios.get(`${backendUrl}/api/coupon/usage-all`, { headers: { token } });
      if (response.data.success) {
        setAllUsageData(response.data.allUsage);
      }
    } catch (error) {
      console.error('Error fetching all usage:', error);
    }
  };

  const fetchCoupons = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const response = await axios.get(`${backendUrl}/api/coupon/list`, { headers: { token } });
      if (response.data.success) {
        setCoupons(response.data.coupons);
        fetchAllUsage();
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

  const resetForm = () => {
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
      specificUsers: '',
    });
    setEditingCouponId(null);
    setShowFormModal(false);
  };

  const handleEditClick = (coupon) => {
    setEditingCouponId(coupon._id);
    setNewCoupon({
      code: coupon.code,
      description: coupon.description || '',
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      minOrderAmount: coupon.minOrderAmount || '',
      minQuantity: coupon.minQuantity || '',
      usageLimit: coupon.usageLimit || '',
      usageLimitPerUser: coupon.usageLimitPerUser || '',
      expiryDate: coupon.expiryDate ? new Date(coupon.expiryDate).toISOString().split('T')[0] : '',
      isActive: coupon.isActive,
      userType: coupon.userType || 'normal',
      offerType: coupon.offerType || 'none',
      applicableSKUs: coupon.applicableSKUs ? coupon.applicableSKUs.join(', ') : '',
      specificUsers: coupon.specificUsers ? coupon.specificUsers.join(', ') : '',
    });
    setShowFormModal(true);
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewCoupon((prev) => ({ ...prev, code: result }));
  };

  const handleSubmit = async (e) => {
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
        id: editingCouponId || undefined,
        description: newCoupon.description || undefined,
        discountValue: parseFloat(newCoupon.discountValue),
        minOrderAmount: newCoupon.minOrderAmount ? parseFloat(newCoupon.minOrderAmount) : 0,
        minQuantity: newCoupon.minQuantity ? parseInt(newCoupon.minQuantity) : 0,
        usageLimit: newCoupon.usageLimit ? parseInt(newCoupon.usageLimit) : undefined,
        usageLimitPerUser: newCoupon.usageLimitPerUser ? parseInt(newCoupon.usageLimitPerUser) : undefined,
        applicableSKUs: newCoupon.applicableSKUs ? newCoupon.applicableSKUs.split(',').map(s => s.trim()).filter(s => s) : [],
        specificUsers: newCoupon.specificUsers ? newCoupon.specificUsers.split(',').map(s => s.trim()).filter(s => s) : [],
      };

      const endpoint = editingCouponId ? `${backendUrl}/api/coupon/update` : `${backendUrl}/api/coupon/add`;
      const response = await axios.post(endpoint, payload, { headers: { token } });

      if (response.data.success) {
        toast.success(editingCouponId ? 'Coupon updated successfully!' : 'Coupon added successfully!');
        resetForm();
        fetchCoupons();
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error('Error submitting coupon:', error);
      toast.error(error.response?.data?.message || 'Failed to process coupon.');
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

  const stats = {
    total: coupons.length,
    active: coupons.filter(c => c.isActive && new Date(c.expiryDate) > new Date()).length,
    expired: coupons.filter(c => new Date(c.expiryDate) < new Date()).length,
    totalUsage: coupons.reduce((acc, curr) => acc + (curr.usageCount || 0), 0)
  };

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

  const allExportHeaders = [
    { label: "User Name", key: "name" },
    { label: "Email", key: "email" },
    { label: "Mobile", key: "mobile" },
    { label: "Coupon Code", key: "couponCode" },
    { label: "Usage Count", key: "count" }
  ];

  const couponExportHeaders = [
    { label: "Code", key: "code" },
    { label: "Description", key: "description" },
    { label: "Discount Type", key: "discountType" },
    { label: "Discount Value", key: "discountValue" },
    { label: "Min Order Amount", key: "minOrderAmount" },
    { label: "Min Quantity", key: "minQuantity" },
    { label: "Usage Limit", key: "usageLimit" },
    { label: "Usage Count", key: "usageCount" },
    { label: "Expiry Date", key: "expiryDate" },
    { label: "Status", key: "isActive" },
    { label: "User Type", key: "userType" },
    { label: "Offer Type", key: "offerType" },
    { label: "Applicable SKUs", key: "applicableSKUs" }
  ];

  const couponsForExport = coupons.map(c => ({
    ...c,
    isActive: c.isActive ? 'Active' : 'Inactive',
    expiryDate: new Date(c.expiryDate).toLocaleDateString(),
    applicableSKUs: c.applicableSKUs ? c.applicableSKUs.join(', ') : ''
  }));

  return (
    <div className='p-4 md:p-8 bg-[#f8fafc] min-h-screen font-sans'>
      {/* Header Section */}
      <div className='flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-4'>
        <div>
          <h2 className='text-3xl font-bold text-slate-800 tracking-tight'>Coupon Management</h2>
          <p className='text-slate-500 mt-1 font-medium'>Create, track and manage discount rewards</p>
        </div>
        <div className='flex flex-wrap items-center gap-3'>
          <CSVLink 
            data={couponsForExport} 
            headers={couponExportHeaders}
            filename={`Coupons_List_${new Date().toISOString().split('T')[0]}.csv`}
            className='flex items-center gap-2 bg-white text-slate-700 px-5 py-3 rounded-2xl font-bold border border-slate-200 hover:bg-slate-50 transition-all shadow-sm active:scale-95 text-sm'
          >
            <Download className='w-4 h-4' /> Export Coupons
          </CSVLink>
          {allUsageData.length > 0 && (
            <CSVLink 
              data={allUsageData} 
              headers={allExportHeaders}
              filename={`All_Coupons_Usage_${new Date().toISOString().split('T')[0]}.csv`}
              className='flex items-center gap-2 bg-emerald-600 text-white px-5 py-3 rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 active:scale-95 text-sm'
            >
              <Download className='w-4 h-4' /> Export All Usage
            </CSVLink>
          )}
          <button 
            onClick={() => { resetForm(); setShowFormModal(true); }}
            className='flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-2xl font-bold hover:bg-black transition-all shadow-lg shadow-slate-200 active:scale-95 text-sm'
          >
            <Plus className='w-5 h-5' /> Create New Coupon
          </button>
        </div>
      </div>

      {/* Stats Section */}
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8'>
        <div className='bg-white p-6 rounded-3xl border border-slate-100 shadow-sm'>
          <div className='flex items-center justify-between mb-4'>
            <div className='bg-blue-50 p-2 rounded-xl text-blue-600'><Tag size={20} /></div>
            <span className='text-[10px] font-bold text-slate-400 uppercase tracking-wider'>Total</span>
          </div>
          <p className='text-2xl font-black text-slate-800'>{stats.total}</p>
          <p className='text-sm text-slate-500 font-medium'>Total Coupons</p>
        </div>
        <div className='bg-white p-6 rounded-3xl border border-slate-100 shadow-sm'>
          <div className='flex items-center justify-between mb-4'>
            <div className='bg-emerald-50 p-2 rounded-xl text-emerald-600'><CheckCircle2 size={20} /></div>
            <span className='text-[10px] font-bold text-slate-400 uppercase tracking-wider'>Live</span>
          </div>
          <p className='text-2xl font-black text-slate-800'>{stats.active}</p>
          <p className='text-sm text-slate-500 font-medium'>Active & Valid</p>
        </div>
        <div className='bg-white p-6 rounded-3xl border border-slate-100 shadow-sm'>
          <div className='flex items-center justify-between mb-4'>
            <div className='bg-rose-50 p-2 rounded-xl text-rose-600'><AlertCircle size={20} /></div>
            <span className='text-[10px] font-bold text-slate-400 uppercase tracking-wider'>Expired</span>
          </div>
          <p className='text-2xl font-black text-slate-800'>{stats.expired}</p>
          <p className='text-sm text-slate-500 font-medium'>Ended Validity</p>
        </div>
        <div className='bg-white p-6 rounded-3xl border border-slate-100 shadow-sm'>
          <div className='flex items-center justify-between mb-4'>
            <div className='bg-amber-50 p-2 rounded-xl text-amber-600'><TrendingUp size={20} /></div>
            <span className='text-[10px] font-bold text-slate-400 uppercase tracking-wider'>Usage</span>
          </div>
          <p className='text-2xl font-black text-slate-800'>{stats.totalUsage}</p>
          <p className='text-sm text-slate-500 font-medium'>Total Redeems</p>
        </div>
      </div>

      {/* Toolbar & List */}
      <div className='bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden'>
        <div className='p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-slate-50/50'>
          <div className='relative w-full md:w-96'>
            <Search className='absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4' />
            <input 
              type="text" 
              placeholder="Search by code or description..." 
              className='w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 outline-none transition-all text-sm font-medium'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className='flex items-center gap-2'>
            <span className='text-xs font-bold text-slate-400 mr-2'>{filteredCoupons.length} Results</span>
          </div>
        </div>

        <div className='overflow-x-auto'>
          <table className='min-w-full divide-y divide-slate-100'>
            <thead className='bg-white'>
              <tr>
                <th className='px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em]'>#</th>
                <th className='px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em]'>Coupon Detail</th>
                <th className='px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em]'>Reward</th>
                <th className='px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em]'>Usage</th>
                <th className='px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em]'>Created</th>
                <th className='px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em]'>Expiry</th>
                <th className='px-6 py-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em]'>Status</th>
                <th className='px-6 py-4 text-right text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em]'>Actions</th>
              </tr>
            </thead>
            <tbody className='divide-y divide-slate-50'>
              {filteredCoupons.map((coupon, index) => {
                const isExpired = new Date(coupon.expiryDate) < new Date();
                const isInactive = !coupon.isActive;
                
                return (
                  <tr key={coupon._id} className='hover:bg-slate-50/50 transition-colors group'>
                    <td className='px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-400'>
                      {index + 1}
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <div className='flex items-center gap-3'>
                        <div className={`p-2 rounded-xl ${isExpired ? 'bg-slate-100 text-slate-400' : 'bg-pink-50 text-pink-500'}`}>
                          <Tag size={16} />
                        </div>
                        <div>
                          <p className={`text-sm font-bold uppercase tracking-tight ${isExpired || isInactive ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                            {coupon.code}
                          </p>
                          <p className='text-[10px] text-slate-400 font-bold max-w-[200px] truncate'>
                            {coupon.description || 'Global Discount Coupon'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-black ${isExpired || isInactive ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-600'}`}>
                        {coupon.discountType === 'percentage' ? `${coupon.discountValue}%` : `₹${coupon.discountValue}`}
                      </span>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <div className='flex items-center gap-2'>
                        <div className='w-full bg-slate-100 h-1.5 rounded-full overflow-hidden max-w-[60px]'>
                          <div 
                            className={`h-full rounded-full ${isExpired ? 'bg-slate-300' : 'bg-slate-800'}`} 
                            style={{ width: `${Math.min(((coupon.usageCount || 0) / (coupon.usageLimit || 100)) * 100, 100)}%` }}
                          />
                        </div>
                        <span className='text-[11px] font-black text-slate-600'>{coupon.usageCount || 0}</span>
                        <span className='text-[10px] text-slate-400 font-bold'>/ {coupon.usageLimit || '∞'}</span>
                      </div>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <p className='text-xs font-bold text-slate-600'>{coupon.createdAt ? new Date(coupon.createdAt).toLocaleDateString() : 'N/A'}</p>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <p className='text-xs font-bold text-slate-600'>{new Date(coupon.expiryDate).toLocaleDateString()}</p>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap'>
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                        isExpired ? 'bg-rose-50 text-rose-500' : isInactive ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-600'
                      }`}>
                        {isExpired ? 'Expired' : isInactive ? 'Hidden' : 'Live'}
                      </span>
                    </td>
                    <td className='px-6 py-4 whitespace-nowrap text-right'>
                      <div className='flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all'>
                        <button 
                          onClick={() => handleEditClick(coupon)}
                          className='p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all'
                          title='Edit'
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={() => fetchCouponUsage(coupon._id, coupon.code)}
                          className='p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all'
                          title='Analytics'
                        >
                          <FileText size={16} />
                        </button>
                        {role !== 'staff' && (
                          <button
                            onClick={() => handleDeleteCoupon(coupon._id)}
                            className='p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all'
                            title='Delete'
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredCoupons.length === 0 && !loading && (
                <tr>
                  <td colSpan="8" className="px-6 py-20 text-center">
                    <div className='flex flex-col items-center gap-3'>
                      <div className='bg-slate-50 p-6 rounded-full'><Tag size={40} className='text-slate-200' /></div>
                      <div>
                        <p className='text-slate-800 font-bold'>No coupons found</p>
                        <p className='text-slate-400 text-sm'>Try adjusting your search or create a new one.</p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Form Modal */}
      {showFormModal && (
        <div className='fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 overflow-y-auto'>
          <div className='bg-white rounded-[32px] shadow-2xl max-w-2xl w-full border border-slate-200 my-8'>
            <div className='p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 rounded-t-[32px]'>
              <div className='flex items-center gap-3'>
                <div className='bg-slate-900 p-2.5 rounded-xl text-white'>
                  {editingCouponId ? <Edit size={20} /> : <Plus size={20} />}
                </div>
                <div>
                  <h3 className='text-xl font-black text-slate-900'>{editingCouponId ? 'Edit Reward Code' : 'New Discount Reward'}</h3>
                  <p className='text-xs text-slate-500 font-bold'>Set up your discount parameters below</p>
                </div>
              </div>
              <button onClick={resetForm} className='p-2 hover:bg-slate-200 rounded-xl text-slate-400 transition-all'>
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className='p-8 space-y-6'>
              <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                <div className='space-y-2'>
                  <label className='block text-[11px] font-black text-slate-400 uppercase tracking-widest'>Reward Code *</label>
                  <div className='flex gap-2'>
                    <input
                      type='text'
                      name='code'
                      value={newCoupon.code}
                      onChange={handleInputChange}
                      className='flex-1 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 outline-none transition-all uppercase font-bold text-slate-800'
                      placeholder='SUMMER25'
                      required
                    />
                    {!editingCouponId && (
                      <button
                        type='button'
                        onClick={generateCode}
                        className='px-4 py-2 bg-slate-200 text-slate-700 font-bold rounded-2xl hover:bg-slate-300 transition-all text-xs'
                      >
                        Auto
                      </button>
                    )}
                  </div>
                </div>

                <div className='space-y-2'>
                  <label className='block text-[11px] font-black text-slate-400 uppercase tracking-widest'>Discount Reward *</label>
                  <div className='flex bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden'>
                    <select
                      name='discountType'
                      value={newCoupon.discountType}
                      onChange={handleInputChange}
                      className='bg-transparent p-3.5 border-r border-slate-200 outline-none text-sm font-bold text-slate-600 cursor-pointer'
                    >
                      <option value='percentage'>%</option>
                      <option value='fixed'>₹</option>
                    </select>
                    <input
                      type='number'
                      name='discountValue'
                      value={newCoupon.discountValue}
                      onChange={handleInputChange}
                      className='flex-1 p-3.5 bg-transparent outline-none font-bold text-slate-800'
                      placeholder='0.00'
                      required
                    />
                  </div>
                </div>
              </div>

              <div className='space-y-2'>
                <label className='block text-[11px] font-black text-slate-400 uppercase tracking-widest'>Display Description</label>
                <textarea
                  name='description'
                  rows='2'
                  value={newCoupon.description}
                  onChange={handleInputChange}
                  className='w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-slate-900/5 focus:border-slate-900 outline-none transition-all font-medium text-slate-700'
                  placeholder='Describe the benefit for customers...'
                ></textarea>
              </div>

              <div className='grid grid-cols-2 gap-6'>
                <div className='space-y-2'>
                  <label className='block text-[11px] font-black text-slate-400 uppercase tracking-widest'>Audience</label>
                  <select
                    name='userType'
                    value={newCoupon.userType}
                    onChange={handleInputChange}
                    className='w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-700'
                  >
                    <option value='normal'>Public (All Users)</option>
                    <option value='luxe'>Exclusive (Luxe Only)</option>
                  </select>
                </div>
                <div className='space-y-2'>
                  <label className='block text-[11px] font-black text-slate-400 uppercase tracking-widest'>Method</label>
                  <select
                    name='offerType'
                    value={newCoupon.offerType}
                    onChange={handleInputChange}
                    className='w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-700'
                  >
                    <option value='none'>Any Payment</option>
                    <option value='prepaid'>Online Only</option>
                    <option value='cod'>COD Only</option>
                  </select>
                </div>
              </div>

              <div className='grid grid-cols-2 gap-6'>
                <div className='space-y-2'>
                  <label className='block text-[11px] font-black text-slate-400 uppercase tracking-widest'>Expiry *</label>
                  <input
                    type='date'
                    name='expiryDate'
                    value={newCoupon.expiryDate}
                    onChange={handleInputChange}
                    className='w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-700'
                    required
                  />
                </div>
                <div className='space-y-2'>
                  <label className='block text-[11px] font-black text-slate-400 uppercase tracking-widest'>Max Redeems</label>
                  <input
                    type='number'
                    name='usageLimit'
                    value={newCoupon.usageLimit}
                    onChange={handleInputChange}
                    className='w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-700'
                    placeholder='Unlimited'
                  />
                </div>
              </div>

              <div className='grid grid-cols-2 gap-6'>
                <div className='space-y-2'>
                  <label className='block text-[11px] font-black text-slate-400 uppercase tracking-widest'>Min Order ₹</label>
                  <input
                    type='number'
                    name='minOrderAmount'
                    value={newCoupon.minOrderAmount}
                    onChange={handleInputChange}
                    className='w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-700'
                    placeholder='0'
                  />
                </div>
                <div className='space-y-2'>
                  <label className='block text-[11px] font-black text-slate-400 uppercase tracking-widest'>Min Qty</label>
                  <input
                    type='number'
                    name='minQuantity'
                    value={newCoupon.minQuantity}
                    onChange={handleInputChange}
                    className='w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-700'
                    placeholder='0'
                  />
                </div>
              </div>

              <div className='space-y-2'>
                <label className='block text-[11px] font-black text-slate-400 uppercase tracking-widest'>SKU Restrictions</label>
                <input
                  type='text'
                  name='applicableSKUs'
                  value={newCoupon.applicableSKUs}
                  onChange={handleInputChange}
                  className='w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-medium text-slate-700'
                  placeholder='e.g. FB-TSHIRT-01, FB-JEANS-02'
                />
              </div>

              <div className='space-y-2'>
                <label className='block text-[11px] font-black text-slate-400 uppercase tracking-widest'>Specific User Restriction (Emails/IDs)</label>
                <input
                  type='text'
                  name='specificUsers'
                  value={newCoupon.specificUsers}
                  onChange={handleInputChange}
                  className='w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-medium text-slate-700'
                  placeholder='e.g. loyal@example.com, user_id_123'
                />
              </div>

              <div className='flex items-center p-4 bg-slate-50 rounded-2xl border border-slate-200 cursor-pointer hover:bg-slate-100 transition-all'>
                <input
                  type='checkbox'
                  id='isActive'
                  name='isActive'
                  checked={newCoupon.isActive}
                  onChange={handleInputChange}
                  className='h-6 w-6 text-slate-900 focus:ring-slate-900/10 border-slate-300 rounded-lg cursor-pointer'
                />
                <label htmlFor='isActive' className='ml-4 text-sm font-black text-slate-700 cursor-pointer'>Make this coupon active and listable immediately</label>
              </div>

              <div className='pt-4 flex gap-4'>
                <button
                  type='button'
                  onClick={resetForm}
                  className='flex-1 bg-slate-100 text-slate-600 py-4 px-6 rounded-2xl font-black hover:bg-slate-200 transition-all'
                >
                  Discard
                </button>
                <button
                  type='submit'
                  disabled={isSubmitting}
                  className='flex-[2] bg-slate-900 text-white py-4 px-6 rounded-2xl font-black shadow-xl shadow-slate-900/10 hover:bg-black transition-all disabled:bg-slate-400'
                >
                  {isSubmitting ? 'Syncing...' : (editingCouponId ? 'Save Changes' : 'Initialize Reward')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Coupon Usage Modal */}
      {showUsageModal && (
        <div className='fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4'>
          <div className='bg-white rounded-[32px] shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden border border-slate-200'>
            <div className='p-8 bg-slate-50 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4'>
              <div className='flex items-center gap-4'>
                <div className='bg-white p-3 rounded-2xl border border-slate-200 shadow-sm'>
                  <TrendingUp className='text-slate-900 w-6 h-6' />
                </div>
                <div>
                  <h2 className='text-xl font-black text-slate-800'>Redemption Analytics</h2>
                  <p className='text-sm text-slate-500 font-bold flex items-center gap-1.5'>
                    <Tag size={12} className='text-pink-500' /> {selectedCouponCode}
                  </p>
                </div>
              </div>
              <div className='flex items-center gap-3 w-full md:w-auto'>
                {usageTableData.length > 0 && (
                  <CSVLink 
                    data={usageTableData} 
                    headers={exportHeaders}
                    filename={`Coupon_Usage_${selectedCouponCode}.csv`}
                    className='flex items-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-black text-xs hover:bg-emerald-700 transition-all shadow-md'
                  >
                    <Download className='w-4 h-4' /> Export CSV
                  </CSVLink>
                )}
                <button 
                  onClick={() => setShowUsageModal(false)} 
                  className='p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-xl transition-all'
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className='p-8 overflow-y-auto flex-1 bg-white'>
              {usageTableData.length === 0 ? (
                <div className='py-20 flex flex-col items-center text-center gap-4'>
                  <div className='bg-slate-50 p-8 rounded-full'>
                    <Users className='w-16 h-12 text-slate-200' />
                  </div>
                  <div>
                    <h3 className='text-xl font-black text-slate-700'>No Data Yet</h3>
                    <p className='text-slate-400 text-sm font-medium'>This code hasn't been redeemed by any customers.</p>
                  </div>
                </div>
              ) : (
                <div className='border border-slate-100 rounded-[24px] overflow-hidden'>
                  <table className='min-w-full divide-y divide-slate-100'>
                    <thead className='bg-slate-50/50'>
                      <tr>
                        <th className='px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest'>#</th>
                        <th className='px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest'>Customer</th>
                        <th className='px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest'>Identity</th>
                        <th className='px-6 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest'>Frequency</th>
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-slate-50'>
                      {usageTableData.map((usage, index) => (
                        <tr key={index} className='hover:bg-slate-50/50 transition-colors'>
                          <td className='px-6 py-4 whitespace-nowrap text-xs font-bold text-slate-400'>{index + 1}</td>
                          <td className='px-6 py-4 whitespace-nowrap'>
                            <div className='flex items-center gap-3'>
                              <div className='w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-white font-black text-xs uppercase'>
                                {usage.name.charAt(0)}
                              </div>
                              <span className='text-sm font-black text-slate-700'>{usage.name}</span>
                            </div>
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap'>
                            <div className='flex flex-col'>
                              <span className='text-xs font-bold text-slate-600'>{usage.email}</span>
                              <span className='text-[10px] font-bold text-slate-400'>{usage.mobile}</span>
                            </div>
                          </td>
                          <td className='px-6 py-4 whitespace-nowrap text-center'>
                            <span className='inline-flex items-center justify-center px-4 py-1.5 bg-slate-100 text-slate-900 rounded-xl text-[11px] font-black'>
                              {usage.count} Redeems
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            <div className='p-8 bg-slate-50 border-t border-slate-100 flex justify-between items-center'>
              <p className='text-xs text-slate-400 font-bold'>
                Unique Redeemers: <span className='text-slate-900 font-black'>{usageTableData.length}</span>
              </p>
              <button
                onClick={() => setShowUsageModal(false)}
                className='px-8 py-3 bg-slate-900 text-white rounded-2xl hover:bg-black transition-all font-black text-sm shadow-xl shadow-slate-900/10'
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Coupons;
