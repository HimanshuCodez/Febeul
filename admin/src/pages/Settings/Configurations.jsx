import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { backendUrl } from '../../App';
import { toast } from 'react-toastify';
import { Settings, Truck, CreditCard, Crown, Save, RefreshCcw, Info } from 'lucide-react';

const Configurations = ({ token }) => {
    const [settings, setSettings] = useState({
        membershipPrice: 129,
        membershipPriceOriginal: 152,
        shippingThreshold: 499,
        defaultShippingCharge: 50,
        codCharge: 50,
        expectedDeliveryDays: "5 to 7 Days"
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const response = await axios.get(`${backendUrl}/api/cms/siteSettings`);
            if (response.data.success && response.data.content) {
                setSettings({
                    membershipPrice: response.data.content.membershipPrice || 129,
                    membershipPriceOriginal: response.data.content.membershipPriceOriginal || 152,
                    shippingThreshold: response.data.content.shippingThreshold || 499,
                    defaultShippingCharge: response.data.content.defaultShippingCharge || 50,
                    codCharge: response.data.content.codCharge || 50,
                    expectedDeliveryDays: response.data.content.expectedDeliveryDays || "5 to 7 Days"
                });
            }
        } catch (error) {
            console.error("Error fetching site settings:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const response = await axios.post(`${backendUrl}/api/cms`, {
                name: 'siteSettings',
                content: settings
            }, { headers: { token } });

            if (response.data.success) {
                toast.success("Configurations updated successfully");
            } else {
                toast.error("Failed to update configurations");
            }
        } catch (error) {
            console.error("Error updating configurations:", error);
            toast.error("An error occurred while saving");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Site Configurations</h2>
                        <p className="text-gray-500 text-sm mt-1">Manage global charges, pricing, and shipping logic</p>
                    </div>
                    <div className="p-3 rounded-xl bg-purple-100 text-purple-600">
                        <Settings size={28} />
                    </div>
                </div>

                <div className="p-8 space-y-10">
                    {/* Membership Pricing */}
                    <section>
                        <div className="flex items-center gap-2 mb-6 border-b pb-2">
                            <Crown className="text-amber-500" size={20} />
                            <h3 className="font-bold text-gray-800">Luxe Membership</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-600">Selling Price (₹)</label>
                                <input
                                    type="number"
                                    value={settings.membershipPrice}
                                    onChange={(e) => setSettings({ ...settings, membershipPrice: Number(e.target.value) })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500 outline-none"
                                />
                                <p className="text-[10px] text-gray-400">The actual price customers pay for the membership.</p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-600">Original Price (₹ - for Strike-through)</label>
                                <input
                                    type="number"
                                    value={settings.membershipPriceOriginal}
                                    onChange={(e) => setSettings({ ...settings, membershipPriceOriginal: Number(e.target.value) })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-purple-500 outline-none"
                                />
                                <p className="text-[10px] text-gray-400">The strike-through price shown to indicate a discount.</p>
                            </div>
                        </div>
                    </section>

                    {/* Shipping & Thresholds */}
                    <section>
                        <div className="flex items-center gap-2 mb-6 border-b pb-2">
                            <Truck className="text-blue-500" size={20} />
                            <h3 className="font-bold text-gray-800">Shipping & Logistics</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-600">Free Shipping Threshold (₹)</label>
                                <input
                                    type="number"
                                    value={settings.shippingThreshold}
                                    onChange={(e) => setSettings({ ...settings, shippingThreshold: Number(e.target.value) })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                                <p className="text-[10px] text-gray-400">Orders above this amount get free shipping (Prepaid only).</p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-600">Standard Shipping Charge (₹)</label>
                                <input
                                    type="number"
                                    value={settings.defaultShippingCharge}
                                    onChange={(e) => setSettings({ ...settings, defaultShippingCharge: Number(e.target.value) })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                                <p className="text-[10px] text-gray-400">Standard delivery fee for orders below the threshold.</p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-600">Expected Delivery Text</label>
                                <input
                                    type="text"
                                    value={settings.expectedDeliveryDays}
                                    onChange={(e) => setSettings({ ...settings, expectedDeliveryDays: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="e.g. 5 to 7 Days"
                                />
                                <p className="text-[10px] text-gray-400">Display text for delivery timeline shown on product pages.</p>
                            </div>
                        </div>
                    </section>

                    {/* COD Settings */}
                    <section>
                        <div className="flex items-center gap-2 mb-6 border-b pb-2">
                            <CreditCard className="text-green-500" size={20} />
                            <h3 className="font-bold text-gray-800">Cash on Delivery (COD)</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-600">COD Additional Charge (₹)</label>
                                <input
                                    type="number"
                                    value={settings.codCharge}
                                    onChange={(e) => setSettings({ ...settings, codCharge: Number(e.target.value) })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-green-500 outline-none"
                                />
                                <p className="text-[10px] text-gray-400">Applied to every order that selects COD payment method.</p>
                            </div>
                        </div>
                    </section>

                    <div className="pt-8 border-t border-gray-50 flex justify-end gap-4">
                        <button
                            onClick={fetchSettings}
                            className="flex items-center gap-2 px-6 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-all font-medium text-gray-600"
                        >
                            <RefreshCcw size={18} />
                            Reset
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex items-center gap-2 px-8 py-2 rounded-xl bg-black text-white hover:bg-gray-800 transition-all font-medium disabled:bg-gray-400"
                        >
                            {isSaving ? <div className="animate-spin h-5 w-5 border-b-2 border-white rounded-full"></div> : <Save size={18} />}
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>

            <div className="mt-8 p-6 rounded-2xl bg-amber-50 border border-amber-100 flex gap-4">
                <div className="p-2 h-fit bg-amber-100 rounded-lg text-amber-600">
                    <Info size={20} />
                </div>
                <div>
                    <h4 className="font-bold text-amber-900 mb-1 text-sm italic">Warning: Critical Settings</h4>
                    <p className="text-xs text-amber-800 leading-relaxed font-medium">
                        Changes to shipping and COD charges will immediately affect the checkout calculation for all customers. 
                        The Luxe Membership price will also update in real-time on the landing page and payment gateway.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Configurations;
