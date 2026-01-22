import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import useAuthStore from '../store/authStore';
import { toast } from 'react-hot-toast';
import { Save, ArrowLeft } from 'lucide-react';

const backendUrl = import.meta.env.VITE_BACKEND_URL;

const Address = () => {
    const navigate = useNavigate();
    const { token, user } = useAuthStore(); // Get user from auth store
    
    const [address, setAddress] = useState({
        name: '',
        phone: '',
        address: '', // Changed from street to address
        city: '',
        state: '',
        zip: '',
        country: '',
    });
    const [isSaving, setIsSaving] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setAddress((prev) => ({ ...prev, [name]: value }));
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            if (!user?._id) {
                toast.error("User not logged in.");
                setIsSaving(false);
                return;
            }

            const response = await axios.post(`${backendUrl}/api/user/add-address`, {
                userId: user._id, // Send userId
                address: address, // Send the address object
             }, {
                headers: { token },
            });

            if (response.data.success) {
                toast.success('Address added successfully!');
                // Automatically refresh profile data to show new address
                await useAuthStore.getState().getProfile(); 
                navigate('/profile', { state: { activeTab: 'addresses' }, replace: true });
            } else {
                toast.error(response.data.message || 'Failed to add address.');
            }
        } catch (error) {
            console.error('Error saving address:', error);
            toast.error(error.response?.data?.message || 'An error occurred.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-pink-50/50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-8">
                <div className="flex items-center mb-6">
                    <button onClick={() => navigate(-1)} className="mr-4 text-gray-600 hover:text-pink-500">
                        <ArrowLeft size={24} />
                    </button>
                    <h1 className="text-2xl font-bold text-gray-800">Add New Address</h1>
                </div>

                <form onSubmit={handleSave} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Contact Details</label>
                        <input type="text" name="name" placeholder="Full Name" value={address.name} onChange={handleChange} required className="form-input" />
                        <input type="tel" name="phone" placeholder="Phone Number" value={address.phone} onChange={handleChange} required className="form-input mt-2" pattern="[0-9]{10}" title="Phone number must be 10 digits." />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                        <input type="text" name="address" placeholder="Street Address, House No." value={address.address} onChange={handleChange} required className="form-input" />
                        <div className="grid grid-cols-2 gap-4 mt-2">
                            <input type="text" name="city" placeholder="City" value={address.city} onChange={handleChange} required className="form-input" />
                            <input type="text" name="state" placeholder="State" value={address.state} onChange={handleChange} required className="form-input" />
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-2">
                            <input type="text" name="zip" placeholder="ZIP Code" value={address.zip} onChange={handleChange} required className="form-input" pattern="[0-9]{6}" title="ZIP Code must be 6 digits." />
                            <input type="text" name="country" placeholder="Country" value={address.country} onChange={handleChange} required className="form-input" />
                        </div>
                    </div>
                    
                    <div className="pt-4">
                        <button type="submit" disabled={isSaving} className="w-full bg-pink-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-pink-600 transition-colors flex items-center justify-center disabled:bg-pink-300">
                            {isSaving ? 'Saving...' : <><Save size={18} className="mr-2"/> Save Address</>}
                        </button>
                    </div>
                </form>
                <style jsx>{`
                    .form-input {
                        width: 100%;
                        padding: 0.75rem;
                        border: 1px solid #d1d5db;
                        border-radius: 0.375rem;
                        box-shadow: sm;
                    }
                    .form-input:focus {
                        outline: 2px solid transparent;
                        outline-offset: 2px;
                        --tw-ring-color: #ec4899;
                        border-color: #ec4899;
                    }
                `}</style>
            </div>
        </div>
    );
};

export default Address;
