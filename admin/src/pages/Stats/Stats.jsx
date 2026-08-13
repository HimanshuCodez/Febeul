import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { backendUrl } from '../../App';
import { Server, Cloud, RefreshCcw } from 'lucide-react';

const formatBytes = (bytes) => {
    if (bytes === null || bytes === undefined) return 'N/A';
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`;
};

const formatUptime = (seconds) => {
    if (!seconds) return 'N/A';
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${d}d ${h}h ${m}m`;
};

const UsageBar = ({ used, limit }) => {
    if (!limit) return null;
    const pct = Math.min(100, (used / limit) * 100);
    const barColor = pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-yellow-500' : 'bg-black';
    return (
        <div className="w-full bg-gray-100 rounded-full h-2.5 mt-2">
            <div className={`${barColor} h-2.5 rounded-full transition-all`} style={{ width: `${pct}%` }} />
        </div>
    );
};

const StatRow = ({ label, value }) => (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-b-0">
        <span className="text-sm text-gray-500">{label}</span>
        <span className="text-sm font-semibold text-gray-900">{value}</span>
    </div>
);

const Stats = ({ token }) => {
    const [data, setData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchStats = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await axios.get(`${backendUrl}/api/admin/system-stats`, { headers: { token } });
            if (response.data.success) {
                setData(response.data);
            } else {
                setError(response.data.message || 'Failed to load stats');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Error fetching system stats');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
            </div>
        );
    }

    const server = data?.server;
    const cloud = data?.cloudinary;

    return (
        <div className="max-w-4xl mx-auto p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">System Stats</h2>
                    <p className="text-gray-500 text-sm mt-1">Live server and storage usage</p>
                </div>
                <button
                    onClick={fetchStats}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-black text-white text-sm font-medium hover:bg-gray-800 transition-colors active:scale-95"
                >
                    <RefreshCcw size={16} />
                    Refresh
                </button>
            </div>

            {error && (
                <div className="mb-6 p-4 rounded-xl bg-red-50 text-red-600 text-sm border border-red-100">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Server Usage */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-50 bg-gray-50/50 flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-black text-white">
                            <Server size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900">Server (Render)</h3>
                            <p className="text-xs text-gray-500">Live process & host memory usage</p>
                        </div>
                    </div>
                    <div className="p-6">
                        {server ? (
                            <>
                                <div className="mb-1 flex items-center justify-between">
                                    <span className="text-sm text-gray-500">Memory used</span>
                                    <span className="text-sm font-semibold text-gray-900">
                                        {formatBytes(server.usedMemoryBytes)} / {formatBytes(server.totalMemoryBytes)}
                                    </span>
                                </div>
                                <UsageBar used={server.usedMemoryBytes} limit={server.totalMemoryBytes} />

                                <div className="mt-4">
                                    <StatRow label="App (process) memory" value={formatBytes(server.processMemoryBytes)} />
                                    <StatRow label="Free memory" value={formatBytes(server.freeMemoryBytes)} />
                                    <StatRow label="CPU cores" value={server.cpuCount} />
                                    <StatRow label="Load average (1m)" value={server.loadAvg?.[0]?.toFixed(2) ?? 'N/A'} />
                                    <StatRow label="Uptime" value={formatUptime(server.uptimeSeconds)} />
                                </div>
                            </>
                        ) : (
                            <p className="text-sm text-gray-400">No server data available.</p>
                        )}
                    </div>
                </div>

                {/* Cloudinary Storage */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-50 bg-gray-50/50 flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-black text-white">
                            <Cloud size={20} />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900">Cloudinary Storage</h3>
                            <p className="text-xs text-gray-500">Media storage used on your Cloudinary plan</p>
                        </div>
                    </div>
                    <div className="p-6">
                        {cloud ? (
                            <>
                                <div className="mb-1 flex items-center justify-between">
                                    <span className="text-sm text-gray-500">Storage used</span>
                                    <span className="text-sm font-semibold text-gray-900">
                                        {formatBytes(cloud.storageBytes)}
                                        {cloud.storageLimitBytes ? ` / ${formatBytes(cloud.storageLimitBytes)}` : ''}
                                    </span>
                                </div>
                                <UsageBar used={cloud.storageBytes} limit={cloud.storageLimitBytes} />

                                <div className="mt-4">
                                    <StatRow label="Plan" value={cloud.plan || 'N/A'} />
                                    <StatRow label="Bandwidth used" value={formatBytes(cloud.bandwidthBytes)} />
                                    <StatRow label="Resources (images/videos)" value={cloud.resourceCount ?? 'N/A'} />
                                    <StatRow label="Derived resources" value={cloud.derivedResourceCount ?? 'N/A'} />
                                    {cloud.credits !== null && cloud.credits !== undefined && (
                                        <StatRow label="Credits used" value={`${cloud.credits}${cloud.creditsLimit ? ` / ${cloud.creditsLimit}` : ''}`} />
                                    )}
                                </div>
                            </>
                        ) : (
                            <p className="text-sm text-gray-400">Cloudinary usage unavailable.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Stats;
