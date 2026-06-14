import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { backendUrl } from '../../App';
import { toast } from 'react-toastify';
import { 
    Type, Save, RefreshCcw, Layout, Heading1, Heading2, Heading3, 
    Smartphone, Monitor, ChevronDown, Search, AlignLeft, 
    MoveHorizontal, MoveVertical, Bold, Italic, CaseUpper
} from 'lucide-react';

const FONT_GROUPS = {
    'Sans-Serif (Modern)': ['Inter', 'Roboto', 'Montserrat', 'Poppins', 'Open Sans', 'Lato', 'Raleway', 'Nunito', 'Ubuntu'],
    'Serif (Classic)': ['Playfair Display', 'Merriweather', 'Lora', 'Libre Baskerville', 'Crimson Text', 'Georgia'],
    'Display (Stylized)': ['Bebas Neue', 'Cinzel', 'Oswald', 'Quicksand', 'Righteous', 'Dancing Script', 'Pacifico'],
    'Monospace': ['Fira Code', 'Roboto Mono', 'Source Code Pro', 'Courier New'],
    'System': ['Arial', 'Verdana', 'Times New Roman', 'system-ui']
};

const FONT_WEIGHTS = [
    { label: 'Light', value: '300' },
    { label: 'Regular', value: '400' },
    { label: 'Medium', value: '500' },
    { label: 'Semi-Bold', value: '600' },
    { label: 'Bold', value: '700' },
    { label: 'Extra-Bold', value: '800' },
];

const FontPicker = ({ label, value, onChange, description }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const allFonts = Object.values(FONT_GROUPS).flat();
    const filteredFonts = allFonts.filter(font => 
        font.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-2 relative" ref={dropdownRef}>
            <label className="text-sm font-semibold text-gray-600">{label}</label>
            <div 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-4 py-2 rounded-lg border border-gray-200 bg-white cursor-pointer flex items-center justify-between hover:border-black transition-colors"
                style={{ fontFamily: value }}
            >
                <span>{value}</span>
                <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>
            
            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl max-h-80 overflow-hidden flex flex-col">
                    <div className="p-2 border-b border-gray-100 flex items-center gap-2">
                        <Search size={14} className="text-gray-400" />
                        <input 
                            autoFocus
                            placeholder="Search fonts..."
                            className="w-full text-sm outline-none"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="overflow-y-auto">
                        {Object.entries(FONT_GROUPS).map(([group, fonts]) => {
                            const groupFiltered = fonts.filter(f => f.toLowerCase().includes(searchTerm.toLowerCase()));
                            if (groupFiltered.length === 0) return null;
                            return (
                                <div key={group}>
                                    <div className="px-3 py-1 bg-gray-50 text-[10px] font-bold text-gray-400 uppercase tracking-wider">{group}</div>
                                    {groupFiltered.map(font => (
                                        <div 
                                            key={font}
                                            onClick={() => {
                                                onChange(font);
                                                setIsOpen(false);
                                            }}
                                            className={`px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm transition-colors ${value === font ? 'bg-indigo-50 text-indigo-600 font-semibold' : ''}`}
                                            style={{ fontFamily: font }}
                                        >
                                            {font}
                                        </div>
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
            <p className="text-[10px] text-gray-400">{description}</p>
        </div>
    );
};

const ControlGroup = ({ label, children, icon: Icon }) => (
    <div className="space-y-3">
        <div className="flex items-center gap-2 text-gray-700">
            {Icon && <Icon size={16} />}
            <span className="text-sm font-bold uppercase tracking-wide text-gray-500">{label}</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6 rounded-xl border border-gray-100 bg-gray-50/30">
            {children}
        </div>
    </div>
);

const TypographySettings = ({ token }) => {
    const [settings, setSettings] = useState({
        primaryFont: 'Inter',
        primaryWeight: '400',
        primaryLineHeight: '1.6',
        primaryLetterSpacing: '0',
        accentFont: 'Playfair Display',
        accentWeight: '700',
        accentLineHeight: '1.2',
        accentLetterSpacing: '0',
        headingTransform: 'none',
        baseFontSize: 16,
        h1Size: 48,
        h2Size: 36,
        h3Size: 24,
        mobileBaseFontSize: 14,
        mobileH1Size: 32,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [previewMode, setPreviewMode] = useState('desktop');

    useEffect(() => {
        fetchSettings();
    }, []);

    useEffect(() => {
        const loadFonts = () => {
            const fontsToLoad = [settings.primaryFont, settings.accentFont];
            const uniqueFonts = [...new Set(fontsToLoad)].filter(font => 
                !['Arial', 'Verdana', 'Georgia', 'Times New Roman', 'system-ui'].includes(font)
            );

            if (uniqueFonts.length === 0) return;

            const fontString = uniqueFonts.map(font => `family=${font.replace(/\s+/g, '+')}:wght@300;400;500;600;700;800`).join('&');
            const linkId = 'google-fonts-typography-preview';
            let link = document.getElementById(linkId);

            if (!link) {
                link = document.createElement('link');
                link.id = linkId;
                link.rel = 'stylesheet';
                document.head.appendChild(link);
            }
            link.href = `https://fonts.googleapis.com/css2?${fontString}&display=swap`;
        };

        loadFonts();
    }, [settings.primaryFont, settings.accentFont]);

    const fetchSettings = async () => {
        try {
            const response = await axios.get(`${backendUrl}/api/cms/typographySettings`);
            if (response.data.success && response.data.content) {
                setSettings({
                    ...settings,
                    ...response.data.content
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
        <div className="max-w-6xl mx-auto p-6 space-y-8">
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-white">
                    <div>
                        <h2 className="text-3xl font-black text-gray-900 tracking-tight">Typography Suite</h2>
                        <p className="text-gray-500 text-sm mt-1">Professional-grade control over your website's character</p>
                    </div>
                    <div className="p-4 rounded-2xl bg-black text-white shadow-lg shadow-black/10">
                        <Type size={32} />
                    </div>
                </div>

                <div className="p-8 space-y-12">
                    {/* Primary Font Controls */}
                    <ControlGroup label="Primary Body Font" icon={AlignLeft}>
                        <FontPicker 
                            label="Font Family"
                            value={settings.primaryFont}
                            onChange={(font) => setSettings({ ...settings, primaryFont: font })}
                            description="Used for paragraphs, buttons, and most UI elements."
                        />
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-600">Font Weight</label>
                            <select 
                                value={settings.primaryWeight}
                                onChange={(e) => setSettings({ ...settings, primaryWeight: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-black outline-none"
                            >
                                {FONT_WEIGHTS.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-600 flex items-center gap-1">
                                <MoveVertical size={14} /> Line Height
                            </label>
                            <input 
                                type="number" step="0.1" min="1" max="2"
                                value={settings.primaryLineHeight}
                                onChange={(e) => setSettings({ ...settings, primaryLineHeight: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-black outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-600 flex items-center gap-1">
                                <MoveHorizontal size={14} /> Letter Spacing (px)
                            </label>
                            <input 
                                type="number" step="0.1" min="-2" max="10"
                                value={settings.primaryLetterSpacing}
                                onChange={(e) => setSettings({ ...settings, primaryLetterSpacing: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-black outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-600">Base Font Size (px)</label>
                            <input 
                                type="number"
                                value={settings.baseFontSize}
                                onChange={(e) => setSettings({ ...settings, baseFontSize: Number(e.target.value) })}
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-black outline-none"
                            />
                        </div>
                    </ControlGroup>

                    {/* Accent/Heading Controls */}
                    <ControlGroup label="Accent & Heading Font" icon={Heading1}>
                        <FontPicker 
                            label="Font Family"
                            value={settings.accentFont}
                            onChange={(font) => setSettings({ ...settings, accentFont: font })}
                            description="Used for all H1, H2, and H3 headings."
                        />
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-600">Font Weight</label>
                            <select 
                                value={settings.accentWeight}
                                onChange={(e) => setSettings({ ...settings, accentWeight: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-black outline-none"
                            >
                                {FONT_WEIGHTS.map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-600">Text Transform</label>
                            <select 
                                value={settings.headingTransform}
                                onChange={(e) => setSettings({ ...settings, headingTransform: e.target.value })}
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-black outline-none"
                            >
                                <option value="none">None</option>
                                <option value="uppercase">UPPERCASE</option>
                                <option value="capitalize">Capitalize</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-600 flex items-center gap-1">
                                <Heading1 size={14} /> H1 Size (px)
                            </label>
                            <input 
                                type="number"
                                value={settings.h1Size}
                                onChange={(e) => setSettings({ ...settings, h1Size: Number(e.target.value) })}
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-black outline-none"
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
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-black outline-none"
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
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-black outline-none"
                            />
                        </div>
                    </ControlGroup>

                    {/* Responsive Settings */}
                    <ControlGroup label="Mobile & Responsive" icon={Smartphone}>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-600">Mobile Base Size (px)</label>
                            <input 
                                type="number"
                                value={settings.mobileBaseFontSize}
                                onChange={(e) => setSettings({ ...settings, mobileBaseFontSize: Number(e.target.value) })}
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-black outline-none"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-semibold text-gray-600">Mobile H1 Size (px)</label>
                            <input 
                                type="number"
                                value={settings.mobileH1Size}
                                onChange={(e) => setSettings({ ...settings, mobileH1Size: Number(e.target.value) })}
                                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:ring-2 focus:ring-black outline-none"
                            />
                        </div>
                    </ControlGroup>

                    {/* Live Preview Section */}
                    <section className="mt-16">
                        <div className="flex items-center justify-between mb-6 border-b border-gray-100 pb-4">
                            <div className="flex items-center gap-2">
                                <Layout className="text-gray-400" size={20} />
                                <h3 className="font-black text-xl text-gray-800 uppercase tracking-tight">Live Web Preview</h3>
                            </div>
                            <div className="flex bg-gray-100 p-1 rounded-xl">
                                <button 
                                    onClick={() => setPreviewMode('desktop')}
                                    className={`p-2 rounded-lg transition-all ${previewMode === 'desktop' ? 'bg-white shadow-sm text-black' : 'text-gray-400'}`}
                                >
                                    <Monitor size={18} />
                                </button>
                                <button 
                                    onClick={() => setPreviewMode('mobile')}
                                    className={`p-2 rounded-lg transition-all ${previewMode === 'mobile' ? 'bg-white shadow-sm text-black' : 'text-gray-400'}`}
                                >
                                    <Smartphone size={18} />
                                </button>
                            </div>
                        </div>

                        <div className={`mx-auto transition-all duration-500 border border-gray-100 rounded-3xl overflow-hidden bg-white shadow-2xl shadow-black/5 ${previewMode === 'mobile' ? 'max-w-[375px]' : 'max-w-full'}`}>
                            <div className="p-8 space-y-8" style={{ 
                                fontSize: `${previewMode === 'mobile' ? settings.mobileBaseFontSize : settings.baseFontSize}px`,
                                fontFamily: settings.primaryFont,
                                fontWeight: settings.primaryWeight,
                                lineHeight: settings.primaryLineHeight,
                                letterSpacing: `${settings.primaryLetterSpacing}px`
                            }}>
                                <div className="space-y-4">
                                    <h1 style={{ 
                                        fontSize: `${previewMode === 'mobile' ? settings.mobileH1Size : settings.h1Size}px`, 
                                        fontFamily: settings.accentFont,
                                        fontWeight: settings.accentWeight,
                                        lineHeight: settings.accentLineHeight,
                                        letterSpacing: `${settings.accentLetterSpacing}px`,
                                        textTransform: settings.headingTransform
                                    }}>
                                        The Art of Professional Typography
                                    </h1>
                                    <h2 style={{ 
                                        fontSize: `${settings.h2Size * (previewMode === 'mobile' ? 0.75 : 1)}px`, 
                                        fontFamily: settings.accentFont,
                                        fontWeight: settings.accentWeight,
                                        textTransform: settings.headingTransform
                                    }}>
                                        Perfect for Luxury E-commerce
                                    </h2>
                                </div>
                                <p className="text-gray-600">
                                    This is a live preview of your primary font. Notice how the line height and letter spacing affect the overall readability and "feel" of your brand. Professional typography is about the relationship between space and characters.
                                </p>
                                <div className="flex gap-4 pt-4">
                                    <button style={{ 
                                        padding: '12px 28px',
                                        backgroundColor: 'black',
                                        color: 'white',
                                        borderRadius: '12px',
                                        fontWeight: 600,
                                        fontSize: '14px'
                                    }}>
                                        Shop Collection
                                    </button>
                                    <button style={{ 
                                        padding: '12px 28px',
                                        backgroundColor: 'white',
                                        color: 'black',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '12px',
                                        fontWeight: 600,
                                        fontSize: '14px'
                                    }}>
                                        Learn More
                                    </button>
                                </div>
                            </div>
                        </div>
                    </section>

                    <div className="pt-12 flex justify-end gap-4 border-t border-gray-50">
                        <button
                            onClick={fetchSettings}
                            className="flex items-center gap-2 px-8 py-3 rounded-2xl border border-gray-200 hover:bg-gray-50 transition-all font-bold text-gray-500 hover:text-black"
                        >
                            <RefreshCcw size={20} />
                            Reset Changes
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex items-center gap-2 px-10 py-3 rounded-2xl bg-black text-white hover:bg-gray-800 transition-all font-bold shadow-xl shadow-black/10 disabled:bg-gray-400"
                        >
                            {isSaving ? <div className="animate-spin h-5 w-5 border-b-2 border-white rounded-full"></div> : <Save size={20} />}
                            Save Configuration
                        </button>
                    </div>
                </div>
            </div>

            <div className="p-8 rounded-3xl bg-black text-white flex gap-6 items-center">
                <div className="p-4 bg-white/10 rounded-2xl">
                    <Type size={32} className="text-white" />
                </div>
                <div>
                    <h4 className="font-black text-lg mb-1 uppercase tracking-tight">Design Tip</h4>
                    <p className="text-gray-400 text-sm leading-relaxed max-w-2xl">
                        For a premium look, try using a <span className="text-white font-bold">Serif font</span> like Playfair Display for headings with <span className="text-white font-bold">increased letter spacing</span>, paired with a clean <span className="text-white font-bold">Sans-Serif</span> like Inter for body text.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default TypographySettings;
