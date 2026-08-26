import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { backendUrl } from '../App';
import { toast } from 'react-toastify';
import { AlertTriangle, Trash2, ShoppingBag, Users, PackageSearch, BarChart3 } from 'lucide-react';

const COUNTDOWN_SECONDS = 10;

const RESET_ACTIONS = [
    {
        key: 'dashboard-stats',
        icon: BarChart3,
        title: 'Reset Invoice Counter',
        description: 'Resets the sequential invoice/order number back to 0. Dashboard analytics themselves are always computed live from orders and users, so this does not delete any data — it only affects future invoice numbering.',
        endpoint: '/api/reset/dashboard-stats',
    },
    {
        key: 'orders',
        icon: ShoppingBag,
        title: 'Delete All Orders',
        description: 'Permanently deletes every order in the database and resets the invoice counter. This cannot be undone — customers will lose access to their order history and invoices.',
        endpoint: '/api/reset/orders',
    },
    {
        key: 'users',
        icon: Users,
        title: 'Delete All Customer Accounts',
        description: 'Permanently deletes every customer account (staff and admin accounts are preserved so nobody is locked out). This cannot be undone.',
        endpoint: '/api/reset/users',
    },
    {
        key: 'products',
        icon: PackageSearch,
        title: 'Delete All Products',
        description: 'Permanently wipes the entire product catalog, including every variation, image reference, and stock record. This cannot be undone.',
        endpoint: '/api/reset/products',
    },
];

const ResetCard = ({ action, token }) => {
    const [confirming, setConfirming] = useState(false);
    const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS);
    const [submitting, setSubmitting] = useState(false);
    const intervalRef = useRef(null);

    useEffect(() => {
        return () => clearInterval(intervalRef.current);
    }, []);

    const startConfirm = () => {
        setConfirming(true);
        setSecondsLeft(COUNTDOWN_SECONDS);
        clearInterval(intervalRef.current);
        intervalRef.current = setInterval(() => {
            setSecondsLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(intervalRef.current);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const cancelConfirm = () => {
        clearInterval(intervalRef.current);
        setConfirming(false);
        setSecondsLeft(COUNTDOWN_SECONDS);
    };

    const executeReset = async () => {
        setSubmitting(true);
        try {
            const response = await axios.post(`${backendUrl}${action.endpoint}`, {}, { headers: { token } });
            if (response.data.success) {
                toast.success(response.data.message || `${action.title} completed.`);
            } else {
                toast.error(response.data.message || `Failed to run: ${action.title}`);
            }
        } catch (error) {
            console.error(`Error running reset action ${action.key}:`, error);
            toast.error(error.response?.data?.message || 'An error occurred while resetting.');
        } finally {
            setSubmitting(false);
            cancelConfirm();
        }
    };

    const Icon = action.icon;

    return (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-red-50 shrink-0">
                    <Icon className="text-red-500" size={22} />
                </div>
                <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900">{action.title}</h3>
                    <p className="text-sm text-gray-500 mt-1">{action.description}</p>
                </div>
            </div>

            <div className="mt-5">
                {!confirming ? (
                    <button
                        onClick={startConfirm}
                        className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-xl font-semibold text-sm hover:bg-red-700 transition-colors"
                    >
                        <Trash2 size={16} />
                        Reset
                    </button>
                ) : (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                        <div className="flex items-center gap-2 text-red-700 font-semibold text-sm mb-3">
                            <AlertTriangle size={16} />
                            This action is permanent and cannot be undone.
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <button
                                onClick={executeReset}
                                disabled={secondsLeft > 0 || submitting}
                                className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors ${
                                    secondsLeft > 0 || submitting
                                        ? 'bg-red-200 text-red-400 cursor-not-allowed'
                                        : 'bg-red-600 text-white hover:bg-red-700'
                                }`}
                            >
                                {submitting
                                    ? 'Resetting...'
                                    : secondsLeft > 0
                                        ? `Confirm in ${secondsLeft}s`
                                        : 'Confirm Reset'}
                            </button>
                            <button
                                onClick={cancelConfirm}
                                disabled={submitting}
                                className="px-5 py-2.5 rounded-xl font-semibold text-sm text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const ResetData = ({ token }) => {
    return (
        <div className="min-h-screen p-8">
            <header className="mb-8 pb-6 border-b-2 border-gray-200">
                <div className="flex items-center gap-3 mb-1">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-100">
                        <AlertTriangle className="text-red-600" size={20} />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900">Reset Data</h1>
                </div>
                <p className="text-gray-600 font-medium">
                    Irreversible database resets. Each action requires a {COUNTDOWN_SECONDS}-second wait before it can be confirmed.
                </p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {RESET_ACTIONS.map((action) => (
                    <ResetCard key={action.key} action={action} token={token} />
                ))}
            </div>
        </div>
    );
};

export default ResetData;
