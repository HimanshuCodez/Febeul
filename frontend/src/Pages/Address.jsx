import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import useAuthStore from '../store/authStore';
import { toast } from 'react-hot-toast';
import { Save, ArrowLeft, Search, ChevronDown } from 'lucide-react';

const backendUrl = import.meta.env.VITE_BACKEND_URL;

// Hardcoded data for Indian states and cities (for demonstration)
const statesAndCities = {
// ... (statesAndCities content)
};

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
    const { token, user } = useAuthStore(); // Get user from auth store
    
    const [address, setAddress] = useState({
        name: '',
        phone: '',
        address: '', // Changed from street to address
        nearby: '',
        city: '',
        state: '',
        zip: '',
        country: 'India', // Default to India
    });
    const [isSaving, setIsSaving] = useState(false);
    const [isPincodeLoading, setPincodeLoading] = useState(false);

    // Searchable Country States
    const [countrySearch, setCountrySearch] = useState("");
    const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
    const countryDropdownRef = useRef(null);

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
// ... (fetchPincodeDetails useEffect)
    useEffect(() => {
        const fetchPincodeDetails = async () => {
            if (address.zip.length === 6 && address.country === 'India') {
                setPincodeLoading(true);
                try {
                    const response = await axios.get(`https://api.postalpincode.in/pincode/${address.zip}`);
                    const data = response.data[0];

                    if (data.Status === 'Success' && data.PostOffice && data.PostOffice.length > 0) {
                        const { District, State } = data.PostOffice[0];
                        setAddress(prev => ({
                            ...prev,
                            city: District,
                            state: State
                        }));
                        toast.success(`Detected: ${District}, ${State}`);
                    }
                } catch (error) {
                    console.error("Pincode API error:", error);
                } finally {
                    setPincodeLoading(false);
                }
            }
        };

        fetchPincodeDetails();
    }, [address.zip, address.country]);

    const handleChange = (e) => {
// ... (handleChange implementation)
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
// ... (handleSave implementation)
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
                        <input type="text" name="nearby" placeholder="Nearby Landmark (Optional)" value={address.nearby} onChange={handleChange} className="form-input mt-2" />
                        
                        <div className="grid grid-cols-2 gap-4 mt-2">
                            {/* State Selection */}
                            {address.country === 'India' ? (
                                <select name="state" value={address.state} onChange={handleChange} required className="form-input">
                                    <option value="">Select State</option>
                                    {Object.keys(statesAndCities).map((stateName) => (
                                        <option key={stateName} value={stateName}>{stateName}</option>
                                    ))}
                                </select>
                            ) : (
                                <input type="text" name="state" placeholder="State/Province" value={address.state} onChange={handleChange} required className="form-input" />
                            )}

                            {/* City Selection */}
                            {address.country === 'India' && address.state && statesAndCities[address.state] ? (
                                <select name="city" value={address.city} onChange={handleChange} required className="form-input">
                                    <option value="">Select City</option>
                                    {statesAndCities[address.state].map((cityName) => (
                                        <option key={cityName} value={cityName}>{cityName}</option>
                                    ))}
                                </select>
                            ) : (
                                <input type="text" name="city" placeholder="City" value={address.city} onChange={handleChange} required className="form-input" />
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-2">
                            <input type="text" name="zip" placeholder="ZIP Code" value={address.zip} onChange={handleChange} required className="form-input" />
                            
                            {/* Searchable Country Dropdown */}
                            <div className="relative" ref={countryDropdownRef}>
                                <div 
                                    className="form-input flex items-center justify-between cursor-pointer"
                                    onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                                >
                                    <span className="truncate">{address.country || "Select Country"}</span>
                                    <ChevronDown size={16} className={`transition-transform ${isCountryDropdownOpen ? 'rotate-180' : ''}`} />
                                </div>

                                {isCountryDropdownOpen && (
                                    <div className="absolute bottom-full mb-1 left-0 w-full bg-white border border-gray-300 rounded-lg shadow-xl z-[60] overflow-hidden flex flex-col max-h-60">
                                        <div className="p-2 border-b bg-gray-50 flex items-center gap-2">
                                            <Search size={14} className="text-gray-400" />
                                            <input 
                                                type="text" 
                                                placeholder="Search country..." 
                                                className="bg-transparent border-none outline-none text-sm w-full"
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
                                                        className={`px-3 py-2 text-sm cursor-pointer hover:bg-pink-50 transition-colors ${address.country === c ? 'bg-pink-100 text-pink-700 font-medium' : ''}`}
                                                        onClick={() => handleCountrySelect(c)}
                                                    >
                                                        {c}
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="px-3 py-2 text-sm text-gray-500">No country found</div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    <div className="pt-4">
                        <button type="submit" disabled={isSaving} className="w-full bg-pink-500 text-white font-bold py-3 px-4 rounded-lg hover:bg-pink-600 transition-colors flex items-center justify-center disabled:bg-pink-300">
                            {isSaving ? 'Saving...' : <><Save size={18} className="mr-2"/> Save Address</>}
                        </button>
                    </div>
                </form>
// ... (rest of the file)
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
