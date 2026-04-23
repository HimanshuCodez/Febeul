import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { backendUrl } from '../../App';
import { toast } from 'react-toastify';
import { Image, Maximize, ZoomIn, LayoutGrid, Save, RefreshCcw } from 'lucide-react';

const ImageOptimize = ({ token }) => {
    const [settings, setSettings] = useState({
        productMainMaxHeight: 450,
        productMainMaxWidth: 100, // Percentage
        productAspectRatio: 'auto',
        productZoomLevel: 250,
        thumbnailSize: 64,
        variationSize: 48,
        imageObjectFit: 'contain'
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const response = await axios.get(`${backendUrl}/api/cms/imageSettings`);
            if (response.data.success && response.data.content) {
                setSettings({
                    productMainMaxHeight: response.data.content.productMainMaxHeight || 450,
                    productMainMaxWidth: response.data.content.productMainMaxWidth || 100,
                    productAspectRatio: response.data.content.productAspectRatio || 'auto',
                    productZoomLevel: response.data.content.productZoomLevel || 250,
                    thumbnailSize: response.data.content.thumbnailSize || 64,
                    variationSize: response.data.content.variationSize || 48,
                    imageObjectFit: response.data.content.imageObjectFit || 'contain'
                });
            }
        } catch (error) {
            console.error("Error fetching image settings:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const response = await axios.post(`${backendUrl}/api/cms`, {
                name: 'imageSettings',
                content: settings
            }, { headers: { token } });

            if (response.data.success) {
                toast.success("Image settings updated successfully");
            } else {
                toast.error("Failed to update settings");
            }
        } catch (error) {
            console.error("Error updating image settings:", error);
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
                        <h2 className="text-2xl font-bold text-gray-900">Image Optimization</h2>
                        <p className="text-gray-500 text-sm mt-1">Configure product image display properties</p>
                    </div>
                    <div className="p-3 rounded-xl bg-blue-100 text-blue-600">
                        <Image size={28} />
                    </div>
                </div>

                <div className="p-8 space-y-8">
                    {/* Main Image Dimensions */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-4">
                            <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                                <Maximize size={18} className="text-blue-500" />
                                Max Height (px)
                            </label>
                            <input
                                type="number"
                                value={settings.productMainMaxHeight}
                                onChange={(e) => setSettings({ ...settings, productMainMaxHeight: Number(e.target.value) })}
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                placeholder="e.g. 450"
                            />
                            <p className="text-[10px] text-gray-400">Limits the height of the main product image.</p>
                        </div>

                        <div className="space-y-4">
                            <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                                <Maximize size={18} className="text-blue-500" />
                                Max Width (%)
                            </label>
                            <input
                                type="number"
                                value={settings.productMainMaxWidth}
                                onChange={(e) => setSettings({ ...settings, productMainMaxWidth: Number(e.target.value) })}
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                placeholder="e.g. 100"
                            />
                            <p className="text-[10px] text-gray-400">Percentage of the container width to occupy.</p>
                        </div>

                        <div className="space-y-4">
                            <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                                <LayoutGrid size={18} className="text-blue-500" />
                                Aspect Ratio
                            </label>
                            <select
                                value={settings.productAspectRatio}
                                onChange={(e) => setSettings({ ...settings, productAspectRatio: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            >
                                <option value="auto">Auto (Default)</option>
                                <option value="1/1">1:1 Square</option>
                                <option value="3/4">3:4 Portrait</option>
                                <option value="4/5">4:5 Portrait (Premium)</option>
                                <option value="16/9">16:9 Landscape</option>
                            </select>
                            <p className="text-[10px] text-gray-400">Forces the container to a specific shape.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                                <ZoomIn size={18} className="text-blue-500" />
                                Zoom Level (%)
                            </label>
                            <input
                                type="number"
                                value={settings.productZoomLevel}
                                onChange={(e) => setSettings({ ...settings, productZoomLevel: Number(e.target.value) })}
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                placeholder="e.g. 250"
                            />
                            <p className="text-[10px] text-gray-400">Magnification factor for the hover zoom effect.</p>
                        </div>

                        <div className="space-y-4">
                            <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                                <Image size={18} className="text-blue-500" />
                                Image Object Fit
                            </label>
                            <select
                                value={settings.imageObjectFit}
                                onChange={(e) => setSettings({ ...settings, imageObjectFit: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            >
                                <option value="contain">Contain (Industry Standard)</option>
                                <option value="cover">Cover (Fill Area)</option>
                                <option value="fill">Fill (Stretch)</option>
                            </select>
                            <p className="text-[10px] text-gray-400">How the image should resize to fit its container.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                                <LayoutGrid size={18} className="text-blue-500" />
                                Thumbnail Size (px)
                            </label>
                            <input
                                type="number"
                                value={settings.thumbnailSize}
                                onChange={(e) => setSettings({ ...settings, thumbnailSize: Number(e.target.value) })}
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                placeholder="e.g. 64"
                            />
                            <p className="text-[10px] text-gray-400">Size of the side gallery preview images.</p>
                        </div>

                        <div className="space-y-4">
                            <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                                <LayoutGrid size={18} className="text-blue-500" />
                                Variation Size (px)
                            </label>
                            <input
                                type="number"
                                value={settings.variationSize}
                                onChange={(e) => setSettings({ ...settings, variationSize: Number(e.target.value) })}
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                placeholder="e.g. 48"
                            />
                            <p className="text-[10px] text-gray-400">Size of the color variation previews.</p>
                        </div>
                    </div>

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

            <div className="mt-8 p-6 rounded-2xl bg-blue-50 border border-blue-100">
                <h4 className="font-bold text-blue-900 mb-2 flex items-center gap-2 text-sm">
                    💡 Industry Standards Tip
                </h4>
                <p className="text-xs text-blue-700 leading-relaxed">
                    Most high-end e-commerce sites use a **4:5 aspect ratio** or **1:1 square ratio**. 
                    For fashion, **contain** object-fit ensures no part of the product is cropped, 
                    while a **max-height of 450px to 600px** provides a comfortable viewing experience on most desktop screens.
                </p>
            </div>
        </div>
    );
};

export default ImageOptimize;
