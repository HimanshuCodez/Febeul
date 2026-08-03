import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { backendUrl } from '../App';
import { toast } from 'react-toastify';
import { Truck, MapPin, Save, RefreshCcw, Search, Info, Ban, Trash2 } from 'lucide-react';

const DEFAULT_ZONES = [
    { key: 'local', name: 'Local Zone', priority: 'Local', minDays: 1, maxDays: 2 },
    { key: 'north', name: 'North Zone', priority: 'Zonal', minDays: 2, maxDays: 4 },
    { key: 'west', name: 'West Zone', priority: 'Zonal', minDays: 3, maxDays: 5 },
    { key: 'central', name: 'Central Zone', priority: 'Zonal', minDays: 3, maxDays: 5 },
    { key: 'south', name: 'South Zone', priority: 'National', minDays: 4, maxDays: 6 },
    { key: 'east', name: 'East Zone', priority: 'National', minDays: 3, maxDays: 6 },
    { key: 'northeast', name: 'North East Zone', priority: 'Remote', minDays: 5, maxDays: 9 },
    { key: 'special', name: 'Special / Remote Zone', priority: 'Remote', minDays: 5, maxDays: 10 },
];

const DEFAULT_STATES = [
    { state: 'Delhi (NCT)', isUT: true, zoneKey: 'local', minDays: 1, maxDays: 2, priority: 'Local', active: true },
    { state: 'Haryana', isUT: false, zoneKey: 'north', minDays: 2, maxDays: 3, priority: 'Zonal', active: true },
    { state: 'Punjab', isUT: false, zoneKey: 'north', minDays: 2, maxDays: 4, priority: 'Zonal', active: true },
    { state: 'Chandigarh', isUT: true, zoneKey: 'north', minDays: 2, maxDays: 3, priority: 'Zonal', active: true },
    { state: 'Uttar Pradesh', isUT: false, zoneKey: 'north', minDays: 2, maxDays: 4, priority: 'Zonal', active: true },
    { state: 'Uttarakhand', isUT: false, zoneKey: 'north', minDays: 2, maxDays: 4, priority: 'Zonal', active: true },
    { state: 'Rajasthan', isUT: false, zoneKey: 'north', minDays: 2, maxDays: 4, priority: 'Zonal', active: true },
    { state: 'Himachal Pradesh', isUT: false, zoneKey: 'north', minDays: 3, maxDays: 5, priority: 'Zonal', active: true },
    { state: 'Gujarat', isUT: false, zoneKey: 'west', minDays: 3, maxDays: 5, priority: 'Zonal', active: true },
    { state: 'Maharashtra', isUT: false, zoneKey: 'west', minDays: 3, maxDays: 5, priority: 'Zonal', active: true },
    { state: 'Goa', isUT: false, zoneKey: 'west', minDays: 4, maxDays: 6, priority: 'Zonal', active: true },
    { state: 'Dadra & Nagar Haveli and Daman & Diu', isUT: true, zoneKey: 'west', minDays: 4, maxDays: 6, priority: 'Zonal', active: true },
    { state: 'Madhya Pradesh', isUT: false, zoneKey: 'central', minDays: 3, maxDays: 5, priority: 'Zonal', active: true },
    { state: 'Chhattisgarh', isUT: false, zoneKey: 'central', minDays: 3, maxDays: 5, priority: 'Zonal', active: true },
    { state: 'Karnataka', isUT: false, zoneKey: 'south', minDays: 4, maxDays: 6, priority: 'National', active: true },
    { state: 'Telangana', isUT: false, zoneKey: 'south', minDays: 4, maxDays: 6, priority: 'National', active: true },
    { state: 'Andhra Pradesh', isUT: false, zoneKey: 'south', minDays: 4, maxDays: 6, priority: 'National', active: true },
    { state: 'Tamil Nadu', isUT: false, zoneKey: 'south', minDays: 4, maxDays: 6, priority: 'National', active: true },
    { state: 'Kerala', isUT: false, zoneKey: 'south', minDays: 5, maxDays: 7, priority: 'National', active: true },
    { state: 'Puducherry', isUT: true, zoneKey: 'south', minDays: 5, maxDays: 7, priority: 'National', active: true },
    { state: 'West Bengal', isUT: false, zoneKey: 'east', minDays: 4, maxDays: 6, priority: 'National', active: true },
    { state: 'Odisha', isUT: false, zoneKey: 'east', minDays: 4, maxDays: 6, priority: 'National', active: true },
    { state: 'Bihar', isUT: false, zoneKey: 'east', minDays: 3, maxDays: 5, priority: 'National', active: true },
    { state: 'Jharkhand', isUT: false, zoneKey: 'east', minDays: 3, maxDays: 5, priority: 'National', active: true },
    { state: 'Assam', isUT: false, zoneKey: 'northeast', minDays: 5, maxDays: 7, priority: 'Remote', active: true },
    { state: 'Sikkim', isUT: false, zoneKey: 'northeast', minDays: 6, maxDays: 8, priority: 'Remote', active: true },
    { state: 'Tripura', isUT: false, zoneKey: 'northeast', minDays: 6, maxDays: 9, priority: 'Remote', active: true },
    { state: 'Meghalaya', isUT: false, zoneKey: 'northeast', minDays: 6, maxDays: 9, priority: 'Remote', active: true },
    { state: 'Manipur', isUT: false, zoneKey: 'northeast', minDays: 6, maxDays: 9, priority: 'Remote', active: true },
    { state: 'Mizoram', isUT: false, zoneKey: 'northeast', minDays: 6, maxDays: 9, priority: 'Remote', active: true },
    { state: 'Nagaland', isUT: false, zoneKey: 'northeast', minDays: 6, maxDays: 9, priority: 'Remote', active: true },
    { state: 'Arunachal Pradesh', isUT: false, zoneKey: 'northeast', minDays: 7, maxDays: 10, priority: 'Remote', active: true },
    { state: 'Jammu & Kashmir', isUT: true, zoneKey: 'special', minDays: 5, maxDays: 8, priority: 'Remote', active: true },
    { state: 'Ladakh', isUT: true, zoneKey: 'special', minDays: 7, maxDays: 10, priority: 'Remote', active: true },
    { state: 'Andaman & Nicobar Islands', isUT: true, zoneKey: 'special', minDays: 8, maxDays: 10, priority: 'Remote', active: true },
    { state: 'Lakshadweep', isUT: true, zoneKey: 'special', minDays: 8, maxDays: 10, priority: 'Remote', active: true },
];

const PRIORITY_STYLES = {
    Local: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Zonal: 'bg-blue-50 text-blue-700 border-blue-200',
    National: 'bg-amber-50 text-amber-700 border-amber-200',
    Remote: 'bg-rose-50 text-rose-700 border-rose-200',
};

const Toggle = ({ active, onChange }) => (
    <button
        type="button"
        onClick={onChange}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${active ? 'bg-emerald-500' : 'bg-gray-300'}`}
    >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${active ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
);

const DeliveryControl = ({ token }) => {
    const [zones, setZones] = useState(DEFAULT_ZONES);
    const [states, setStates] = useState(DEFAULT_STATES);
    const [search, setSearch] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Pincode-level overrides: block a pincode entirely, or just block COD for it
    const [pincodeEntries, setPincodeEntries] = useState([]);
    const [pincodeInput, setPincodeInput] = useState('');
    const [pincodeFetchedInfo, setPincodeFetchedInfo] = useState(null);
    const [isPincodeFetching, setIsPincodeFetching] = useState(false);
    const [newBlockPincode, setNewBlockPincode] = useState(false);
    const [newBlockCod, setNewBlockCod] = useState(true);
    const [isSavingPincodes, setIsSavingPincodes] = useState(false);

    useEffect(() => {
        const loadAll = async () => {
            setIsLoading(true);
            // Both fetches must finish before the page becomes interactive —
            // otherwise a pincode rule added locally while the (slower)
            // blocklist fetch is still in flight gets silently wiped out
            // when that fetch resolves and overwrites pincodeEntries.
            await Promise.all([fetchSettings(), fetchPincodeBlocklist()]);
            setIsLoading(false);
        };
        loadAll();
    }, []);

    const fetchSettings = async () => {
        try {
            const response = await axios.get(`${backendUrl}/api/cms/deliveryZones`);
            if (response.data.success && response.data.content?.states?.length) {
                setZones(response.data.content.zones || DEFAULT_ZONES);
                setStates(response.data.content.states || DEFAULT_STATES);
            } else {
                setZones(DEFAULT_ZONES);
                setStates(DEFAULT_STATES);
            }
        } catch (error) {
            console.error('Error fetching delivery zones:', error);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const response = await axios.post(`${backendUrl}/api/cms`, {
                name: 'deliveryZones',
                content: { zones, states }
            }, { headers: { token } });

            if (response.data.success) {
                toast.success('Delivery zones updated successfully');
            } else {
                toast.error('Failed to update delivery zones');
            }
        } catch (error) {
            console.error('Error updating delivery zones:', error);
            toast.error('An error occurred while saving');
        } finally {
            setIsSaving(false);
        }
    };

    const fetchPincodeBlocklist = async () => {
        try {
            const response = await axios.get(`${backendUrl}/api/cms/pincodeBlocklist`);
            if (response.data.success && response.data.content?.entries) {
                setPincodeEntries(response.data.content.entries);
            }
        } catch (error) {
            console.error('Error fetching pincode blocklist:', error);
        }
    };

    const handleFetchPincodeArea = async () => {
        const zip = pincodeInput.trim();
        if (!/^\d{6}$/.test(zip)) {
            toast.error('Enter a valid 6-digit pincode');
            return;
        }
        setIsPincodeFetching(true);
        setPincodeFetchedInfo(null);
        try {
            const response = await axios.get(`${backendUrl}/api/user/pincode-check/${zip}`);
            const data = response.data?.[0];
            if (data?.Status === 'Success' && data.PostOffice?.length > 0) {
                const { District, State } = data.PostOffice[0];
                setPincodeFetchedInfo({ district: District, state: State });
            } else {
                toast.error('Invalid pincode or no data found');
            }
        } catch (error) {
            console.error('Error fetching pincode area:', error);
            toast.error('Failed to fetch pincode area');
        } finally {
            setIsPincodeFetching(false);
        }
    };

    const handleAddPincodeEntry = () => {
        const zip = pincodeInput.trim();
        if (!pincodeFetchedInfo) {
            toast.error('Fetch the area for this pincode first');
            return;
        }
        setPincodeEntries((prev) => {
            const existingIndex = prev.findIndex((e) => e.pincode === zip);
            const entry = {
                pincode: zip,
                district: pincodeFetchedInfo.district,
                state: pincodeFetchedInfo.state,
                blockPincode: newBlockPincode,
                blockCod: newBlockCod,
            };
            if (existingIndex !== -1) {
                const next = [...prev];
                next[existingIndex] = entry;
                return next;
            }
            return [...prev, entry];
        });
        toast.success(`Override saved locally for ${zip} — click "Save Pincode Rules" to publish`);
        setPincodeInput('');
        setPincodeFetchedInfo(null);
        setNewBlockPincode(false);
        setNewBlockCod(true);
    };

    const updatePincodeEntry = (pincode, field, value) => {
        setPincodeEntries((prev) => prev.map((e) => (e.pincode === pincode ? { ...e, [field]: value } : e)));
    };

    const removePincodeEntry = (pincode) => {
        setPincodeEntries((prev) => prev.filter((e) => e.pincode !== pincode));
    };

    const handleSavePincodes = async () => {
        setIsSavingPincodes(true);
        try {
            const response = await axios.post(`${backendUrl}/api/cms`, {
                name: 'pincodeBlocklist',
                content: { entries: pincodeEntries }
            }, { headers: { token } });

            if (response.data.success) {
                toast.success('Pincode rules updated successfully');
            } else {
                toast.error('Failed to update pincode rules');
            }
        } catch (error) {
            console.error('Error updating pincode rules:', error);
            toast.error('An error occurred while saving');
        } finally {
            setIsSavingPincodes(false);
        }
    };

    const updateZone = (key, field, value) => {
        setZones((prev) => prev.map((z) => (z.key === key ? { ...z, [field]: value } : z)));
    };

    const updateState = (stateName, field, value) => {
        setStates((prev) => prev.map((s) => (s.state === stateName ? { ...s, [field]: value } : s)));
    };

    const applyZoneDefaults = (stateName, zoneKey) => {
        const zone = zones.find((z) => z.key === zoneKey);
        setStates((prev) => prev.map((s) => (
            s.state === stateName
                ? { ...s, zoneKey, priority: zone?.priority || s.priority, minDays: zone?.minDays ?? s.minDays, maxDays: zone?.maxDays ?? s.maxDays }
                : s
        )));
    };

    const zoneStats = useMemo(() => {
        return zones.map((zone) => {
            const zoneStates = states.filter((s) => s.zoneKey === zone.key);
            const activeCount = zoneStates.filter((s) => s.active).length;
            return { ...zone, total: zoneStates.length, activeCount };
        });
    }, [zones, states]);

    const filteredStates = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return states;
        return states.filter((s) => s.state.toLowerCase().includes(q));
    }, [states, search]);

    const totalActive = states.filter((s) => s.active).length;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-8 border-b border-gray-50 flex flex-wrap items-center justify-between gap-4 bg-gray-50/50">
                    <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1">Warehouse origin · Delhi 110042</p>
                        <h2 className="text-2xl font-bold text-gray-900">Delivery Zone Engine</h2>
                        <p className="text-gray-500 text-sm mt-1">
                            {totalActive}/{states.length} states serviceable · Manage zones, delivery windows and per-state serviceability
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={async () => { setIsLoading(true); await fetchSettings(); setIsLoading(false); }}
                            className="flex items-center gap-2 px-5 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-all font-medium text-gray-600"
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

            {/* Zone Manifest cards */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <div className="flex items-center gap-2 mb-6">
                    <Truck className="text-blue-500" size={20} />
                    <h3 className="font-bold text-gray-800">Zone Manifest — live from Delhi 110042</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {zoneStats.map((zone) => (
                        <div key={zone.key} className="rounded-xl border border-gray-200 p-4">
                            <p className="font-bold text-gray-900 text-sm">{zone.name}</p>
                            <p className="text-2xl font-black text-gray-900 mt-2">{zone.minDays}–{zone.maxDays}<span className="text-xs font-medium text-gray-400 ml-1">days</span></p>
                            <div className="flex items-center justify-between mt-3">
                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${PRIORITY_STYLES[zone.priority] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                                    {zone.priority}
                                </span>
                                <span className="text-[11px] text-gray-400 font-medium">{zone.activeCount}/{zone.total} states</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Zone definitions */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <div className="flex items-center justify-between mb-1">
                    <h3 className="font-bold text-gray-800">Zone definitions</h3>
                    <p className="text-xs text-gray-400">Edit once, applies as the default for states assigned to this zone</p>
                </div>
                <div className="mt-6 divide-y divide-gray-100">
                    {zones.map((zone) => (
                        <div key={zone.key} className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-center py-4">
                            <div>
                                <p className="font-semibold text-gray-800 text-sm">{zone.name}</p>
                                <span className={`inline-block mt-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${PRIORITY_STYLES[zone.priority] || ''}`}>
                                    {zone.priority} priority
                                </span>
                            </div>
                            <div className="space-y-1">
                                <label className="block text-[10px] font-semibold text-gray-400 uppercase">Min Days</label>
                                <input
                                    type="number"
                                    min={0}
                                    value={zone.minDays}
                                    onChange={(e) => updateZone(zone.key, 'minDays', Number(e.target.value))}
                                    className="w-full px-3 py-1.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="block text-[10px] font-semibold text-gray-400 uppercase">Max Days</label>
                                <input
                                    type="number"
                                    min={0}
                                    value={zone.maxDays}
                                    onChange={(e) => updateZone(zone.key, 'maxDays', Number(e.target.value))}
                                    className="w-full px-3 py-1.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="block text-[10px] font-semibold text-gray-400 uppercase">Priority</label>
                                <select
                                    value={zone.priority}
                                    onChange={(e) => updateZone(zone.key, 'priority', e.target.value)}
                                    className="w-full px-3 py-1.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
                                >
                                    {Object.keys(PRIORITY_STYLES).map((p) => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* State / UT master table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-2">
                        <MapPin className="text-rose-500" size={20} />
                        <h3 className="font-bold text-gray-800">State / UT master table</h3>
                    </div>
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search state..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 pr-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-rose-500 outline-none text-sm w-56"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                                <th className="py-3 pr-3">State / UT</th>
                                <th className="py-3 px-3">Zone</th>
                                <th className="py-3 px-3">Delivery days</th>
                                <th className="py-3 px-3">Priority</th>
                                <th className="py-3 px-3">Active</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredStates.map((s) => (
                                <tr key={s.state} className={!s.active ? 'opacity-50' : ''}>
                                    <td className="py-3 pr-3">
                                        <p className="font-semibold text-gray-800">{s.state}</p>
                                        {s.isUT && <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">UT</span>}
                                    </td>
                                    <td className="py-3 px-3">
                                        <select
                                            value={s.zoneKey}
                                            onChange={(e) => applyZoneDefaults(s.state, e.target.value)}
                                            className="px-2 py-1.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-rose-500 outline-none text-xs bg-white min-w-[130px]"
                                        >
                                            {zones.map((z) => <option key={z.key} value={z.key}>{z.name}</option>)}
                                        </select>
                                    </td>
                                    <td className="py-3 px-3">
                                        <div className="flex items-center gap-1.5">
                                            <input
                                                type="number"
                                                min={0}
                                                value={s.minDays}
                                                onChange={(e) => updateState(s.state, 'minDays', Number(e.target.value))}
                                                className="w-14 px-2 py-1.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-rose-500 outline-none text-xs"
                                            />
                                            <span className="text-gray-400">–</span>
                                            <input
                                                type="number"
                                                min={0}
                                                value={s.maxDays}
                                                onChange={(e) => updateState(s.state, 'maxDays', Number(e.target.value))}
                                                className="w-14 px-2 py-1.5 rounded-lg border border-gray-200 focus:ring-2 focus:ring-rose-500 outline-none text-xs"
                                            />
                                            <span className="text-gray-400 text-xs">days</span>
                                        </div>
                                    </td>
                                    <td className="py-3 px-3">
                                        <select
                                            value={s.priority}
                                            onChange={(e) => updateState(s.state, 'priority', e.target.value)}
                                            className={`px-2 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider outline-none ${PRIORITY_STYLES[s.priority] || ''}`}
                                        >
                                            {Object.keys(PRIORITY_STYLES).map((p) => <option key={p} value={p}>{p}</option>)}
                                        </select>
                                    </td>
                                    <td className="py-3 px-3">
                                        <Toggle active={s.active} onChange={() => updateState(s.state, 'active', !s.active)} />
                                    </td>
                                </tr>
                            ))}
                            {filteredStates.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="py-8 text-center text-gray-400 text-sm">No states match &quot;{search}&quot;</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pincode-level overrides */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                        <Ban className="text-rose-500" size={20} />
                        <h3 className="font-bold text-gray-800">Pincode-level overrides</h3>
                    </div>
                    <button
                        onClick={handleSavePincodes}
                        disabled={isSavingPincodes}
                        className="flex items-center gap-2 px-6 py-2 rounded-xl bg-black text-white hover:bg-gray-800 transition-all font-medium text-sm disabled:bg-gray-400"
                    >
                        {isSavingPincodes ? <div className="animate-spin h-4 w-4 border-b-2 border-white rounded-full"></div> : <Save size={16} />}
                        Save Pincode Rules
                    </button>
                </div>
                <p className="text-xs text-gray-400 mb-6">Block a specific pincode entirely, or just disable Cash on Delivery for it</p>

                <div className="rounded-xl border border-gray-200 p-4 flex flex-wrap items-end gap-4">
                    <div className="space-y-1">
                        <label className="block text-[10px] font-semibold text-gray-400 uppercase">Pincode</label>
                        <input
                            type="text"
                            maxLength={6}
                            placeholder="e.g. 110042"
                            value={pincodeInput}
                            onChange={(e) => { setPincodeInput(e.target.value.replace(/\D/g, '')); setPincodeFetchedInfo(null); }}
                            className="w-36 px-3 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-rose-500 outline-none text-sm"
                        />
                    </div>
                    <button
                        onClick={handleFetchPincodeArea}
                        disabled={isPincodeFetching}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-all font-medium text-sm text-gray-700 disabled:opacity-50"
                    >
                        {isPincodeFetching ? <div className="animate-spin h-4 w-4 border-b-2 border-gray-500 rounded-full"></div> : <Search size={16} />}
                        Fetch Area
                    </button>

                    {pincodeFetchedInfo && (
                        <div className="text-sm text-gray-600">
                            <span className="font-semibold text-gray-800">{pincodeFetchedInfo.district}</span>, {pincodeFetchedInfo.state}
                        </div>
                    )}

                    {pincodeFetchedInfo && (
                        <>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-gray-500">Block Pincode</span>
                                <Toggle active={newBlockPincode} onChange={() => setNewBlockPincode((v) => !v)} />
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-gray-500">Block COD</span>
                                <Toggle active={newBlockCod} onChange={() => setNewBlockCod((v) => !v)} />
                            </div>
                            <button
                                onClick={handleAddPincodeEntry}
                                className="px-5 py-2 rounded-lg bg-rose-500 text-white hover:bg-rose-600 transition-all font-medium text-sm"
                            >
                                Add / Update Rule
                            </button>
                        </>
                    )}
                </div>

                {pincodeEntries.length > 0 && (
                    <div className="overflow-x-auto mt-6">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                                    <th className="py-3 pr-3">Pincode</th>
                                    <th className="py-3 px-3">Area</th>
                                    <th className="py-3 px-3">Block Pincode</th>
                                    <th className="py-3 px-3">Block COD</th>
                                    <th className="py-3 px-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {pincodeEntries.map((entry) => (
                                    <tr key={entry.pincode}>
                                        <td className="py-3 pr-3 font-semibold text-gray-800">{entry.pincode}</td>
                                        <td className="py-3 px-3 text-gray-600">{entry.district}, {entry.state}</td>
                                        <td className="py-3 px-3">
                                            <Toggle active={entry.blockPincode} onChange={() => updatePincodeEntry(entry.pincode, 'blockPincode', !entry.blockPincode)} />
                                        </td>
                                        <td className="py-3 px-3">
                                            <Toggle active={entry.blockCod} onChange={() => updatePincodeEntry(entry.pincode, 'blockCod', !entry.blockCod)} />
                                        </td>
                                        <td className="py-3 px-3">
                                            <button onClick={() => removePincodeEntry(entry.pincode)} className="text-gray-400 hover:text-rose-600 transition-colors">
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="p-6 rounded-2xl bg-amber-50 border border-amber-100 flex gap-4">
                <div className="p-2 h-fit bg-amber-100 rounded-lg text-amber-600">
                    <Info size={20} />
                </div>
                <div>
                    <h4 className="font-bold text-amber-900 mb-1 text-sm italic">How this connects to the storefront</h4>
                    <p className="text-xs text-amber-800 leading-relaxed font-medium">
                        Turning a state's "Active" toggle off marks every pincode in that state as not currently serviceable —
                        customers will see a warning toast when adding or selecting an address in that state on checkout, the
                        address page, and the delivery address modal. The delivery day range shown here also drives the
                        "Estimated arrival" date on product pages once a customer has a shipping address selected.
                        Pincode-level overrides above take precedence over the state table: "Block Pincode" makes that exact
                        pincode unserviceable regardless of its state, and "Block COD" only hides the Cash on Delivery option
                        for orders shipping to that pincode.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default DeliveryControl;
