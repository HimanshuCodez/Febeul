import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import useAuthStore from '../store/authStore';
import { toast } from 'react-hot-toast';
import { Save, ArrowLeft, Search, ChevronDown } from 'lucide-react';

const backendUrl = import.meta.env.VITE_BACKEND_URL;

// Hardcoded data for Indian states and cities (for demonstration)
const countries = [
    "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Antigua and Barbuda", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan",
    "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi",
    "Cabo Verde", "Cambodia", "Cameroon", "Canada", "Central African Republic", "Chad", "Chile", "China", "Colombia", "Comoros", "Congo", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czech Republic",
    "Denmark", "Djibouti", "Dominica", "Dominican Republic",
    "East Timor", "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia",
    "Fiji", "Finland", "France",
    "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana",
    "Haiti", "Honduras", "Hungary",
    "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy", "Ivory Coast",
    "Jamaica", "Japan", "Jordan",
    "Kazakhstan", "Kenya", "Kiribati", "Korea, North", "Korea, South", "Kosovo", "Kuwait", "Kyrgyzstan",
    "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg",
    "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar",
    "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Macedonia", "Norway",
    "Oman",
    "Pakistan", "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal",
    "Qatar",
    "Romania", "Russia", "Rwanda",
    "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe", "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "Somalia", "South Africa", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria",
    "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey", "Turkmenistan", "Tuvalu",
    "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan",
    "Vanuatu", "Vatican City", "Venezuela", "Vietnam",
    "Yemen",
    "Zambia", "Zimbabwe"
];

const Address = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { token, user, getStateServiceability } = useAuthStore(); // Get user from auth store
    
    const [address, setAddress] = useState({
        name: '',
        phone: '',
        alternatePhone: '',
        address: '', // House No., Building Name
        locality: '', // Road name, Area, Colony
        landmark: '',
        city: '',
        state: '',
        zip: '',
        country: 'India', // Default to India
        addressType: 'Home', // Home, Business, Other
        saturdayDelivery: true,
        sundayDelivery: true,
    });
    
    const [isSaving, setIsSaving] = useState(false);
    const [isPincodeLoading, setPincodeLoading] = useState(false);
    const [isWeekendAccordionOpen, setIsWeekendAccordionOpen] = useState(false);

    // Searchable Country States
    const [countrySearch, setCountrySearch] = useState("");
    const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
    const countryDropdownRef = useRef(null);

    const isEditMode = !!(location.state?.address);

    useEffect(() => {
        if (location.state?.address) {
            setAddress(location.state.address);
        }
    }, [location.state]);

    const filteredCountries = countries.filter(c => 
        c.toLowerCase().includes(countrySearch.toLowerCase())
    );

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target)) {
                setIsCountryDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Fetch City/State from Pincode
    useEffect(() => {
        const fetchPincodeDetails = async () => {
            if (address.zip.length === 6 && address.country === 'India' && !isEditMode) {
                setPincodeLoading(true);
                try {
                  const response = await axios.get(`${backendUrl}/api/user/pincode-check/${address.zip}`);
                  const data = response.data[0];
                  if (data.Status === 'Success' && data.PostOffice && data.PostOffice.length > 0) {
                        const { District, State } = data.PostOffice[0];
                        setAddress(prev => ({
                            ...prev,
                            city: District,
                            state: State
                        }));
                        toast.success(`Detected: ${District}, ${State}`);

                        const zoneInfo = getStateServiceability(State);
                        if (zoneInfo && zoneInfo.active === false) {
                            toast.error('This pincode is not currently serviceable.');
                        }
                    }
                } catch (error) {
                    console.error("Pincode API error:", error);
                } finally {
                    setPincodeLoading(false);
                }
            }
        };

        fetchPincodeDetails();
    }, [address.zip, address.country, isEditMode]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setAddress((prev) => {
            if (name === 'state') {
                return { ...prev, state: value, city: '' };
            }
            return { ...prev, [name]: value };
        });
    };

    const handleCountrySelect = (c) => {
        setAddress(prev => ({ ...prev, country: c }));
        setCountrySearch("");
        setIsCountryDropdownOpen(false);
    };

    const handleSave = async (e) => {
        e.preventDefault();

        const zoneInfo = getStateServiceability(address.state);
        if (zoneInfo && zoneInfo.active === false) {
            toast.error('This pincode is not currently serviceable.');
            return;
        }

        setIsSaving(true);
        try {
            if (!user?._id) {
                toast.error("User not logged in.");
                setIsSaving(false);
                return;
            }

            let response;
            if (isEditMode) {
                const { _id, ...addressData } = address;
                response = await axios.post(`${backendUrl}/api/user/update-address`, {
                    userId: user._id,
                    addressId: _id,
                    address: addressData
                }, {
                    headers: { token }
                });
            } else {
                response = await axios.post(`${backendUrl}/api/user/add-address`, {
                    userId: user._id,
                    address: address
                }, {
                    headers: { token }
                });
            }

            if (response.data.success) {
                toast.success(isEditMode ? 'Address updated successfully!' : 'Address added successfully!');
                await useAuthStore.getState().getProfile(); 
                navigate('/profile', { state: { activeTab: 'addresses' }, replace: true });
            } else {
                toast.error(response.data.message || 'Failed to save address.');
            }
        } catch (error) {
            console.error('Error saving address:', error);
            toast.error(error.response?.data?.message || 'An error occurred.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50/50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-100/40 overflow-hidden">
                <div className="flex items-center p-6 md:p-8 bg-white border-b border-slate-100">
                    <button onClick={() => navigate(-1)} className="mr-4 p-2.5 rounded-xl text-slate-600 hover:text-[#e8767a] hover:bg-rose-50/50 transition-all">
                        <ArrowLeft size={20} />
                    </button>
                    <h1 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                        {isEditMode ? 'Edit Address' : 'Add New Address'}
                    </h1>
                </div>

                <form onSubmit={handleSave} className="p-6 md:p-10 space-y-8">
                    {/* Form Fields Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Contact Section */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                                <div className="w-1.5 h-4 bg-[#e8767a] rounded-full"></div>
                                <h2 className="text-sm font-black text-slate-700 uppercase tracking-widest">Contact Details</h2>
                            </div>
                            
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Full Name</label>
                                <input type="text" name="name" placeholder="Receiver's name" value={address.name} onChange={handleChange} required className="form-input" />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Phone Number</label>
                                    <input type="tel" name="phone" placeholder="10-digit number" value={address.phone} onChange={handleChange} required className="form-input" pattern="[0-9]{10}" title="Phone number must be 10 digits." />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Alt. Phone (Optional)</label>
                                    <input type="tel" name="alternatePhone" placeholder="10-digit number" value={address.alternatePhone} onChange={handleChange} className="form-input" pattern="[0-9]{10}" title="Phone number must be 10 digits." />
                                </div>
                            </div>
                        </div>

                        {/* Address Section */}
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                                <div className="w-1.5 h-4 bg-[#e8767a] rounded-full"></div>
                                <h2 className="text-sm font-black text-slate-700 uppercase tracking-widest">Address Details</h2>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 ml-1">House No., Building Name</label>
                                <input type="text" name="address" placeholder="e.g. Flat 101, Sunshine Apts" value={address.address} onChange={handleChange} required className="form-input" />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Road name, Area, Colony</label>
                                <input type="text" name="locality" placeholder="e.g. MG Road, HSR Layout" value={address.locality} onChange={handleChange} required className="form-input" />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Nearby Landmark (Optional)</label>
                                <input type="text" name="landmark" placeholder="e.g. Near Apollo Hospital" value={address.landmark} onChange={handleChange} className="form-input" />
                            </div>
                        </div>
                    </div>

                    {/* Location Selection Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-100">
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 ml-1">ZIP Code</label>
                            <input type="text" name="zip" placeholder="ZIP" value={address.zip} onChange={handleChange} required className="form-input" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 ml-1">City</label>
                            <input type="text" name="city" placeholder="City" value={address.city} onChange={handleChange} required className="form-input" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 ml-1">State</label>
                            <input type="text" name="state" placeholder="State" value={address.state} onChange={handleChange} required className="form-input" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Country</label>
                            <div className="relative" ref={countryDropdownRef}>
                                <div 
                                    className="form-input flex items-center justify-between cursor-pointer"
                                    onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                                >
                                    <span className="truncate">{address.country || "Country"}</span>
                                    <ChevronDown size={14} className={`text-slate-400 transition-transform ${isCountryDropdownOpen ? 'rotate-180' : ''}`} />
                                </div>

                                {isCountryDropdownOpen && (
                                    <div className="absolute bottom-full mb-1 left-0 w-full bg-white border border-slate-150 rounded-xl shadow-xl z-[60] overflow-hidden flex flex-col max-h-60">
                                        <div className="p-2 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                                            <Search size={14} className="text-slate-400" />
                                            <input 
                                                type="text" 
                                                placeholder="Search..." 
                                                className="bg-transparent border-none outline-none text-xs w-full"
                                                value={countrySearch}
                                                onChange={(e) => setCountrySearch(e.target.value)}
                                                autoFocus
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        </div>
                                        <div className="overflow-y-auto flex-1">
                                            {filteredCountries.length > 0 ? (
                                                filteredCountries.map((c) => (
                                                    <div 
                                                        key={c} 
                                                        className={`px-3 py-2 text-xs cursor-pointer hover:bg-rose-50/50 transition-colors ${address.country === c ? 'bg-rose-50 text-[#e8767a] font-black' : 'text-slate-600'}`}
                                                        onClick={() => handleCountrySelect(c)}
                                                    >
                                                        {c}
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="px-3 py-2 text-xs text-slate-400">Not found</div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6 border-t border-slate-100">
                        {/* Address Type Section */}
                        <div className="space-y-4">
                            <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Save Address As</h2>
                            <div className="flex flex-wrap gap-3">
                                {['Home', 'Business', 'Other'].map((type) => (
                                    <label key={type} className="flex items-center cursor-pointer group">
                                        <input
                                            type="radio"
                                            name="addressType"
                                            value={type}
                                            checked={address.addressType === type}
                                            onChange={handleChange}
                                            className="sr-only"
                                        />
                                        <div className={`px-5 py-2.5 rounded-xl border text-xs font-black uppercase tracking-widest transition-all duration-200 ${
                                            address.addressType === type 
                                                ? 'bg-[#e8767a] border-[#e8767a] text-white shadow-lg shadow-rose-100 scale-105' 
                                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                                        }`}>
                                            {type === 'Home' ? 'House/Apartment' : type}
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Weekend Delivery Section */}
                        <div className="space-y-4">
                            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/30">
                                <button 
                                    type="button"
                                    onClick={() => setIsWeekendAccordionOpen(!isWeekendAccordionOpen)}
                                    className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                                >
                                    <div className="text-left">
                                        <label className="block text-xs font-black text-slate-600 uppercase tracking-wider">Weekend Deliveries</label>
                                        <p className="text-[10px] text-slate-400 font-medium tracking-tight">Prefer deliveries on Saturdays or Sundays?</p>
                                    </div>
                                    <ChevronDown size={18} className={`text-slate-400 transition-transform duration-300 ${isWeekendAccordionOpen ? 'rotate-180' : ''}`} />
                                </button>
                                
                                {isWeekendAccordionOpen && (
                                    <div className="p-4 bg-white border-t border-slate-100 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="flex flex-col gap-2">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Saturdays</span>
                                                <div className="flex bg-slate-50 rounded-xl p-1 border border-slate-100">
                                                    <button 
                                                        type="button"
                                                        onClick={() => setAddress(prev => ({ ...prev, saturdayDelivery: true }))}
                                                        className={`flex-1 py-1.5 text-[10px] font-black rounded-lg transition-all ${address.saturdayDelivery ? 'bg-white text-[#e8767a] shadow-sm font-black' : 'text-slate-500'}`}
                                                    >
                                                        YES
                                                    </button>
                                                    <button 
                                                        type="button"
                                                        onClick={() => setAddress(prev => ({ ...prev, saturdayDelivery: false }))}
                                                        className={`flex-1 py-1.5 text-[10px] font-black rounded-lg transition-all ${!address.saturdayDelivery ? 'bg-white text-[#e8767a] shadow-sm font-black' : 'text-slate-500'}`}
                                                    >
                                                        NO
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="flex flex-col gap-2">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">Sundays</span>
                                                <div className="flex bg-slate-50 rounded-xl p-1 border border-slate-100">
                                                    <button 
                                                        type="button"
                                                        onClick={() => setAddress(prev => ({ ...prev, sundayDelivery: true }))}
                                                        className={`flex-1 py-1.5 text-[10px] font-black rounded-lg transition-all ${address.sundayDelivery ? 'bg-white text-[#e8767a] shadow-sm font-black' : 'text-slate-500'}`}
                                                    >
                                                        YES
                                                    </button>
                                                    <button 
                                                        type="button"
                                                        onClick={() => setAddress(prev => ({ ...prev, sundayDelivery: false }))}
                                                        className={`flex-1 py-1.5 text-[10px] font-black rounded-lg transition-all ${!address.sundayDelivery ? 'bg-white text-[#e8767a] shadow-sm font-black' : 'text-slate-500'}`}
                                                    >
                                                        NO
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    <div className="pt-8 flex justify-end border-t border-slate-100">
                        <button type="submit" disabled={isSaving} className="w-full md:w-auto min-w-[200px] bg-slate-900 hover:bg-black text-white font-bold py-3.5 px-8 rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95 disabled:bg-slate-300 disabled:shadow-none flex items-center justify-center text-xs uppercase tracking-widest font-black">
                            {isSaving ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    <span>Saving...</span>
                                </div>
                            ) : (
                                <><Save size={16} className="mr-2"/> Save Address</>
                            )}
                        </button>
                    </div>
                </form>
                <style jsx>{`
                    .form-input {
                        width: 100%;
                        padding: 0.75rem 1rem;
                        background-color: #f8fafc;
                        border: 1px solid #e2e8f0;
                        border-radius: 0.75rem;
                        font-size: 0.8125rem;
                        font-weight: 500;
                        color: #334155;
                        transition: all 0.2s;
                    }
                    .form-input:hover {
                        background-color: #f1f5f9;
                    }
                    .form-input:focus {
                        outline: none;
                        background-color: white;
                        border-color: #e8767a;
                        box-shadow: 0 0 0 4px rgba(232, 118, 122, 0.1);
                    }
                    .form-input::placeholder {
                        color: #94a3b8;
                    }
                `}</style>
            </div>
        </div>
    );
};

export default Address;


