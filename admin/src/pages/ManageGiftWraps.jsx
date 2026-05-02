import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { backendUrl } from '../App';
import { toast } from 'react-toastify';
import { assets } from '../assets/assets';

const ManageGiftWraps = ({ token }) => {
    const [giftWraps, setGiftWraps] = useState([]);
    const [name, setName] = useState("");
    const [price, setPrice] = useState("");
    const [image, setImage] = useState(null);
    const [showUsageModal, setShowUsageModal] = useState(false);
    const [usageList, setUsageList] = useState([]);
    const [selectedWrapName, setSelectedWrapName] = useState('');
    const [showStaffModal, setShowStaffModal] = useState(false);
    const [selectedStaff, setSelectedStaff] = useState(null);
    const role = localStorage.getItem('role');

    const fetchGiftWraps = async () => {
        try {
            const response = await axios.get(backendUrl + '/api/giftwrap/list');
            if (response.data.success) {
                setGiftWraps(response.data.data);
            } else {
                toast.error(response.data.message);
            }
        } catch (error) {
            toast.error(error.message);
        }
    };

    const fetchGiftWrapUsage = async (id, wrapName) => {
        try {
            const response = await axios.get(`${backendUrl}/api/giftwrap/usage/${id}`, { headers: { token } });
            if (response.data.success) {
                setUsageList(response.data.users);
                setSelectedWrapName(wrapName);
                setShowUsageModal(true);
            } else {
                toast.error(response.data.message);
            }
        } catch (error) {
            console.error('Error fetching gift wrap usage:', error);
            toast.error('Failed to fetch gift wrap usage.');
        }
    };

    useEffect(() => {
        fetchGiftWraps();
    }, []);

    const onSubmitHandler = async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append("name", name);
        formData.append("price", price);
        formData.append("image", image);

        try {
            const response = await axios.post(backendUrl + '/api/giftwrap/add', formData, { headers: { token } });
            if (response.data.success) {
                toast.success(response.data.message);
                setName("");
                setPrice("");
                setImage(null);
                fetchGiftWraps();
            } else {
                toast.error(response.data.message);
            }
        } catch (error) {
            toast.error(error.message);
        }
    };

    const handleRemove = async (id) => {
        if (!window.confirm('Are you sure you want to remove this gift wrap?')) return;
        try {
            const response = await axios.post(backendUrl + '/api/giftwrap/remove', { id }, { headers: { token } });
            if (response.data.success) {
                toast.success(response.data.message);
                fetchGiftWraps();
            } else {
                toast.error(response.data.message);
            }
        } catch (error) {
            toast.error(error.message);
        }
    };

    return (
        <div className='w-full p-4'>
            <form onSubmit={onSubmitHandler} className='flex flex-col items-start gap-4 p-6 bg-white shadow-md rounded-lg border'>
                <h2 className='text-2xl font-bold text-gray-800 mb-2'>Add Gift Wrap</h2>
                <div className='flex flex-col sm:flex-row gap-4 w-full'>
                    <div className='flex-1'>
                        <p className='mb-1 font-medium text-gray-700'>Name</p>
                        <input onChange={(e) => setName(e.target.value)} value={name} type="text" placeholder='e.g. Classic Red' className='w-full px-3 py-2 border rounded-md' required />
                    </div>
                    <div className='flex-1'>
                        <p className='mb-1 font-medium text-gray-700'>Price (₹)</p>
                        <input onChange={(e) => setPrice(e.target.value)} value={price} type="number" placeholder='e.g. 30' className='w-full px-3 py-2 border rounded-md' required />
                    </div>
                </div>
                <div>
                    <p className='mb-1 font-medium text-gray-700'>Upload Image</p>
                    <label className='block'>
                        <img className='w-32 h-32 object-cover border-2 border-dashed border-gray-300 rounded-md cursor-pointer hover:border-pink-400 transition-colors' src={image ? URL.createObjectURL(image) : assets.upload_area} alt="" />
                        <input onChange={(e) => setImage(e.target.files[0])} type="file" hidden required />
                    </label>
                </div>
                <button type="submit" className='bg-pink-500 hover:bg-pink-600 text-white font-bold py-2 px-6 rounded-md transition-colors shadow-sm'>ADD GIFT WRAP</button>
            </form>

            <div className='mt-12'>
                <h2 className='text-2xl font-bold text-gray-800 mb-6'>Existing Gift Wraps</h2>
                <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6'>
                    {giftWraps.map((item) => (
                        <div key={item._id} className='relative bg-white border rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group'>
                            <div className='relative'>
                                <img src={item.image} alt={item.name} className='w-full aspect-square object-cover' />
                                {role !== 'staff' && (
                                    <button 
                                        onClick={() => handleRemove(item._id)} 
                                        className='absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md'
                                        title="Remove Gift Wrap"
                                    >
                                        ×
                                    </button>
                                )}
                            </div>
                            <div className='p-3'>
                                <p className='font-bold text-gray-800 text-lg cursor-pointer hover:text-pink-500 transition-colors truncate' onClick={() => fetchGiftWrapUsage(item._id, item.name)}>{item.name}</p>
                                <p className='text-pink-600 font-bold'>₹{item.price}</p>
                                {item.creator && (
                                    <p 
                                        onClick={() => { if(item.creator.role === 'staff') { setSelectedStaff(item.creator); setShowStaffModal(true); } }}
                                        className={`mt-2 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${item.creator.role === 'staff' ? 'bg-blue-100 text-blue-700 cursor-pointer hover:bg-blue-200' : 'bg-gray-100 text-gray-600'} inline-block`}
                                    >
                                        {item.creator.role || 'Admin'}
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Usage Modal */}
            {showUsageModal && (
                <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4'>
                    <div className='bg-white p-6 rounded-lg shadow-xl max-w-md w-full max-h-[80vh] flex flex-col'>
                        <div className='flex justify-between items-center mb-4'>
                            <div>
                                <h2 className='text-xl font-bold text-gray-800'>Gift Wrap Usage</h2>
                                <p className='text-sm text-pink-600 font-semibold'>{selectedWrapName}</p>
                            </div>
                            <button onClick={() => setShowUsageModal(false)} className='text-gray-500 hover:text-gray-700 font-bold text-2xl'>×</button>
                        </div>
                        <div className='overflow-y-auto flex-1'>
                            {usageList.length === 0 ? (
                                <p className='text-center py-8 text-gray-500'>No users have used this gift wrap style yet.</p>
                            ) : (
                                <div className='space-y-3'>
                                    <p className='text-xs font-bold text-gray-400 uppercase tracking-wider mb-2'>Users who successfully placed orders</p>
                                    {usageList.map((usage, index) => (
                                        <div key={index} className='flex flex-col p-3 bg-gray-50 rounded-lg border border-gray-100'>
                                            <span className='text-sm font-bold text-gray-800'>{usage.userId?.name || 'Unknown User'}</span>
                                            <span className='text-xs text-gray-500'>{usage.userId?.email || 'N/A'}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className='mt-6 flex justify-end'>
                            <button
                                onClick={() => setShowUsageModal(false)}
                                className='px-6 py-2 bg-pink-500 text-white rounded-md hover:bg-pink-600 transition-colors font-bold'
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Staff Details Modal */}
            {showStaffModal && selectedStaff && (
                <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4'>
                    <div className='bg-white p-6 rounded-lg shadow-xl max-w-sm w-full'>
                        <div className='flex justify-between items-center mb-4'>
                            <h2 className='text-xl font-bold text-gray-800'>Staff Details</h2>
                            <button onClick={() => setShowStaffModal(false)} className='text-gray-500 hover:text-gray-700 font-bold text-2xl'>×</button>
                        </div>
                        <div className='space-y-3'>
                            <div className='flex flex-col'>
                                <span className='text-xs font-semibold text-gray-500 uppercase'>Name</span>
                                <span className='text-sm font-medium text-gray-800'>{selectedStaff.name || 'N/A'}</span>
                            </div>
                            <div className='flex flex-col'>
                                <span className='text-xs font-semibold text-gray-500 uppercase'>Email</span>
                                <span className='text-sm font-medium text-gray-800'>{selectedStaff.email}</span>
                            </div>
                        </div>
                        <div className='mt-6 flex justify-end'>
                            <button
                                onClick={() => setShowStaffModal(false)}
                                className='px-6 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-900 transition-colors font-medium text-sm'
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

export default ManageGiftWraps;
