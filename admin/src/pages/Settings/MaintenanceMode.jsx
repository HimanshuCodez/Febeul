import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { backendUrl } from '../../App';
import { toast } from 'react-toastify';
import { Power, ShieldAlert, CheckCircle, Clock } from 'lucide-react';

const MaintenanceMode = ({ token }) => {
    const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const response = await axios.get(`${backendUrl}/api/cms/settings`);
            if (response.data.success && response.data.content) {
                setIsMaintenanceMode(response.data.content.maintenanceMode || false);
            }
        } catch (error) {
            console.error("Error fetching settings:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggle = async () => {
        const newState = !isMaintenanceMode;
        setIsSaving(true);
        try {
            const response = await axios.post(`${backendUrl}/api/cms`, {
                name: 'settings',
                content: { maintenanceMode: newState }
            }, { headers: { token } });

            if (response.data.success) {
                setIsMaintenanceMode(newState);
                toast.success(`Maintenance Mode ${newState ? 'Enabled' : 'Disabled'}`);
            } else {
                toast.error("Failed to update settings");
            }
        } catch (error) {
            console.error("Error updating settings:", error);
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
                        <h2 className="text-2xl font-bold text-gray-900">Maintenance Mode</h2>
                        <p className="text-gray-500 text-sm mt-1">Control public access to your store</p>
                    </div>
                    <div className={`p-3 rounded-xl ${isMaintenanceMode ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'}`}>
                        {isMaintenanceMode ? <ShieldAlert size={28} /> : <CheckCircle size={28} />}
                    </div>
                </div>

                <div className="p-8">
                    <div className="flex items-center justify-between p-6 rounded-2xl border-2 transition-all duration-300 ${isMaintenanceMode ? 'border-amber-200 bg-amber-50/30' : 'border-gray-100 bg-white'}">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <span className={`w-2 h-2 rounded-full ${isMaintenanceMode ? 'bg-amber-500 animate-pulse' : 'bg-green-500'}`}></span>
                                <h3 className="font-bold text-lg text-gray-900">
                                    Status: {isMaintenanceMode ? 'ACTIVE' : 'INACTIVE'}
                                </h3>
                            </div>
                            <p className="text-gray-600 text-sm max-w-md">
                                {isMaintenanceMode 
                                    ? "Your store is currently hidden from customers. Only administrators can access the website content. A coming soon page is being displayed."
                                    : "Your store is live and accessible to all customers. Maintenance mode is currently turned off."}
                            </p>
                        </div>

                        <button
                            onClick={handleToggle}
                            disabled={isSaving}
                            className={`relative inline-flex h-12 w-24 items-center rounded-full transition-colors duration-300 focus:outline-none ring-offset-2 focus:ring-2 focus:ring-black ${isMaintenanceMode ? 'bg-amber-500' : 'bg-gray-200'}`}
                        >
                            <span
                                className={`inline-block h-10 w-10 transform rounded-full bg-white shadow-lg transition-transform duration-300 flex items-center justify-center ${isMaintenanceMode ? 'translate-x-13' : 'translate-x-1'}`}
                            >
                                <Power size={18} className={isMaintenanceMode ? 'text-amber-500' : 'text-gray-400'} />
                            </span>
                        </button>
                    </div>

                    <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-5 rounded-xl bg-blue-50/50 border border-blue-100 flex gap-4">
                            <div className="p-2 h-fit bg-blue-100 rounded-lg text-blue-600">
                                <Clock size={20} />
                            </div>
                            <div>
                                <h4 className="font-bold text-sm text-blue-900 mb-1">Scheduled Work?</h4>
                                <p className="text-xs text-blue-700 leading-relaxed">
                                    Turn this on before performing major updates, inventory changes, or theme modifications to prevent customer errors.
                                </p>
                            </div>
                        </div>

                        <div className="p-5 rounded-xl bg-purple-50/50 border border-purple-100 flex gap-4">
                            <div className="p-2 h-fit bg-purple-100 rounded-lg text-purple-600">
                                <ShieldAlert size={20} />
                            </div>
                            <div>
                                <h4 className="font-bold text-sm text-purple-900 mb-1">Admin Access</h4>
                                <p className="text-xs text-purple-700 leading-relaxed">
                                    Admins logged into the panel can still preview changes on the frontend while maintenance mode is active.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div className="px-8 py-4 bg-gray-50 border-t border-gray-100 text-right">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        Last checked: {new Date().toLocaleTimeString()}
                    </span>
                </div>
            </div>
            
            <style jsx>{`
                .translate-x-13 {
                    transform: translateX(3.25rem);
                }
            `}</style>
        </div>
    );
};

export default MaintenanceMode;
