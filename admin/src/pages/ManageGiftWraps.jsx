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
        <div className='w-full'>
            <form onSubmit={onSubmitHandler} className='flex flex-col items-start gap-4 p-4 border rounded-md'>
                <h2 className='text-xl font-semibold'>Add Gift Wrap</h2>
                <div className='flex flex-col sm:flex-row gap-4 w-full'>
                    <div className='flex-1'>
                        <p className='mb-2'>Name</p>
                        <input onChange={(e) => setName(e.target.value)} value={name} type="text" placeholder='e.g. Classic Red' className='w-full px-3 py-2' required />
                    </div>
                    <div className='flex-1'>
                        <p className='mb-2'>Price</p>
                        <input onChange={(e) => setPrice(e.target.value)} value={price} type="number" placeholder='e.g. 30' className='w-full px-3 py-2' required />
                    </div>
                </div>
                <div>
                    <p className='mb-2'>Upload Image</p>
                    <label>
                        <img className='w-24 cursor-pointer' src={image ? URL.createObjectURL(image) : assets.upload_area} alt="" />
                        <input onChange={(e) => setImage(e.target.files[0])} type="file" hidden required />
                    </label>
                </div>
                <button type="submit" className='bg-black text-white px-4 py-2 rounded-md'>ADD</button>
            </form>

            <div className='mt-8'>
                <h2 className='text-xl font-semibold mb-4'>Existing Gift Wraps</h2>
                <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4'>
                    {giftWraps.map((item) => (
                        <div key={item._id} className='relative border rounded-md p-2'>
                            <img src={item.image} alt={item.name} className='w-full h-auto aspect-square object-cover rounded-md' />
                            <p className='mt-2 font-semibold'>{item.name}</p>
                            <p>₹{item.price}</p>
                            {role !== 'staff' && (
                                <p onClick={() => handleRemove(item._id)} className='absolute top-2 right-2 cursor-pointer bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center'>x</p>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Staff Details Modal */}
            {showStaffModal && selectedStaff && (
                <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4'>
                    <div className='bg-white p-6 rounded-lg shadow-xl max-w-sm w-full'>
                        <div className='flex justify-between items-center mb-4'>
                            <h2 className='text-xl font-bold text-gray-800'>Staff Details</h2>
                            <button onClick={() => setShowStaffModal(false)} className='text-gray-500 hover:text-gray-700 font-bold text-xl'>×</button>
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
                                className='px-6 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors font-medium text-sm'
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
