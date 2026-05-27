import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { backendUrl } from '../../App';
import { toast } from 'react-toastify';
import { Type, Save, RefreshCcw, Layout, Heading1, Heading2, Heading3, Smartphone } from 'lucide-react';

const TypographySettings = ({ token }) => {
    const [settings, setSettings] = useState({
        primaryFont: 'Inter',
        secondaryFont: 'Inter',
        accentFont: 'Playfair Display',
        baseFontSize: 16,
        h1Size: 48,
        h2Size: 36,
        h3Size: 24,
        mobileBaseFontSize: 14,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const fontsList = [
        'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins', 
        'Playfair Display', 'Merriweather', 'Nunito', 'Raleway', 'Ubuntu', 
        'Oswald', 'Quicksand', 'Libre Baskerville', 'Lora', 'Georgia', 'Arial', 'Verdana'
    ];

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const response = await axios.get(`${backendUrl}/api/cms/typographySettings`);
            if (response.data.success && response.data.content) {
                setSettings({
                    primaryFont: response.data.content.primaryFont || 'Inter',
                    secondaryFont: response.data.content.secondaryFont || 'Inter',
                    accentFont: response.data.content.accentFont || 'Playfair Display',
                    baseFontSize: response.data.content.baseFontSize || 16,
                    h1Size: response.data.content.h1Size || 48,
                    h2Size: response.data.content.h2Size || 36,
                    h3Size: response.data.content.h3Size || 24,
                    mobileBaseFontSize: response.data.content.mobileBaseFontSize || 14,
                });
            }
        } catch (error) {
            console.error("Error fetching typography settings:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const response = await axios.post(`${backendUrl}/api/cms`, {
                name: 'typographySettings',
                content: settings
            }, { headers: { token } });

            if (response.data.success) {
                toast.success("Typography settings updated successfully");
            } else {
                toast.error("Failed to update settings");
            }
        } catch (error) {
            console.error("Error updating typography settings:", error);
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
                        <h2 className="text-2xl font-bold text-gray-900">Typography Settings</h2>
                        <p className="text-gray-500 text-sm mt-1">Manage fonts and sizes for the entire website</p>
                    </div>
                    <div className="p-3 rounded-xl bg-indigo-100 text-indigo-600">
                        <Type size={28} />
                    </div>
                </div>

                <div className="p-8 space-y-10">
                    {/* Font Selection */}
                    <section>
                        <div className="flex items-center gap-2 mb-6 border-b pb-2">
                            <Layout className="text-indigo-500" size={20} />
                            <h3 className="font-bold text-gray-800">Font Families</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-600">Primary Font (Body)</label>
                                <select
                                    value={settings.primaryFont}
                                    onChange={(e) => setSettings({ ...settings, primaryFont: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                                >
                                    {fontsList.map(font => <option key={font} value={font}>{font}</option>)}
                                </select>
                                <p className="text-[10px] text-gray-400">Used for most of the website's body text.</p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-600">Secondary Font (UI)</label>
                                <select
                                    value={settings.secondaryFont}
                                    onChange={(e) => setSettings({ ...settings, secondaryFont: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                                >
                                    {fontsList.map(font => <option key={font} value={font}>{font}</option>)}
                                </select>
                                <p className="text-[10px] text-gray-400">Used for navigation and UI elements.</p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-600">Accent Font (Headings)</label>
                                <select
                                    value={settings.accentFont}
                                    onChange={(e) => setSettings({ ...settings, accentFont: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                                >
                                    {fontsList.map(font => <option key={font} value={font}>{font}</option>)}
                                </select>
                                <p className="text-[10px] text-gray-400">Used for headings and decorative text.</p>
                            </div>
                        </div>
                    </section>

                    {/* Font Sizes */}
                    <section>
                        <div className="flex items-center gap-2 mb-6 border-b pb-2">
                            <Type className="text-orange-500" size={20} />
                            <h3 className="font-bold text-gray-800">Font Sizes (Desktop)</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-600 flex items-center gap-1">
                                    Base Size (px)
                                </label>
                                <input
                                    type="number"
                                    value={settings.baseFontSize}
                                    onChange={(e) => setSettings({ ...settings, baseFontSize: Number(e.target.value) })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-orange-500 outline-none"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-600 flex items-center gap-1">
                                    <Heading1 size={14} /> H1 Size (px)
                                </label>
                                <input
                                    type="number"
                                    value={settings.h1Size}
                                    onChange={(e) => setSettings({ ...settings, h1Size: Number(e.target.value) })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-orange-500 outline-none"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-600 flex items-center gap-1">
                                    <Heading2 size={14} /> H2 Size (px)
                                </label>
                                <input
                                    type="number"
                                    value={settings.h2Size}
                                    onChange={(e) => setSettings({ ...settings, h2Size: Number(e.target.value) })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-orange-500 outline-none"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-600 flex items-center gap-1">
                                    <Heading3 size={14} /> H3 Size (px)
                                </label>
                                <input
                                    type="number"
                                    value={settings.h3Size}
                                    onChange={(e) => setSettings({ ...settings, h3Size: Number(e.target.value) })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-orange-500 outline-none"
                                />
                            </div>
                        </div>
                    </section>

                    {/* Responsive Settings */}
                    <section>
                        <div className="flex items-center gap-2 mb-6 border-b pb-2">
                            <Smartphone className="text-emerald-500" size={20} />
                            <h3 className="font-bold text-gray-800">Responsive Settings</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-gray-600">Mobile Base Font Size (px)</label>
                                <input
                                    type="number"
                                    value={settings.mobileBaseFontSize}
                                    onChange={(e) => setSettings({ ...settings, mobileBaseFontSize: Number(e.target.value) })}
                                    className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none"
                                />
                                <p className="text-[10px] text-gray-400">Smaller base size for improved mobile readability.</p>
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

            <div className="mt-8 p-6 rounded-2xl bg-indigo-50 border border-indigo-100 flex gap-4">
                <div className="p-2 h-fit bg-indigo-100 rounded-lg text-indigo-600">
                    <Type size={20} />
                </div>
                <div>
                    <h4 className="font-bold text-indigo-900 mb-1 text-sm italic">Pro Tip: Font Loading</h4>
                    <p className="text-xs text-indigo-800 leading-relaxed font-medium">
                        Ensure the selected fonts are properly imported in your frontend's main CSS or HTML file (e.g., via Google Fonts). 
                        Changing fonts here updates the styling variables used across the site.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default TypographySettings;
