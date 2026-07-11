import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { backendUrl } from '../App.jsx';
import { 
  FiPlus, 
  FiTrash2, 
  FiChevronUp, 
  FiChevronDown, 
  FiSave, 
  FiChevronRight, 
  FiEye, 
  FiEdit, 
  FiUpload, 
  FiFolderPlus 
} from 'react-icons/fi';

const PREDEFINED_POLICIES = [
  { id: 'DataPrivacy', label: 'Data Privacy' },
  { id: 'Faq', label: 'FAQ' },
  { id: 'GiftWrapPolicy', label: 'Gift Wrap Policy' },
  { id: 'GrievanceRedressals', label: 'Grievance Redressals' },
  { id: 'LuxePolicy', label: 'Luxe Membership Policy' },
  { id: 'PaymentPolicy', label: 'Payment Policy' },
  { id: 'ReturnRefund', label: 'Return & Refund Policy' },
  { id: 'ReviewRating', label: 'Review & Rating Policy' },
  { id: 'TermsConditions', label: 'Terms & Conditions' },
];

const PolicyUpdate = ({ token }) => {
  const [policies, setPolicies] = useState(PREDEFINED_POLICIES);
  const [selectedPolicyName, setSelectedPolicyName] = useState('');
  const [pageTitle, setPageTitle] = useState('');
  const [sections, setSections] = useState([]); // [{ title: '', content: [{ type: 'paragraph', text: '' }] }]
  const [loading, setLoading] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [collapsedSections, setCollapsedSections] = useState({});
  const role = localStorage.getItem('role');

  // New features state
  const [activeTab, setActiveTab] = useState('edit'); // 'edit' | 'preview'
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPolicyId, setNewPolicyId] = useState('');
  const [newPolicyTitle, setNewPolicyTitle] = useState('');
  
  // Importer state
  const [showImporter, setShowImporter] = useState(false);
  const [importRawText, setImportRawText] = useState('');

  const API_BASE_URL = `${backendUrl}/api/policy`;

  useEffect(() => {
    fetchPoliciesList();
  }, []);

  const fetchPoliciesList = async () => {
    try {
      const response = await axios.get(API_BASE_URL);
      const dbPolicies = response.data || [];
      
      // Merge predefined policies with database policies
      const merged = [...PREDEFINED_POLICIES];
      dbPolicies.forEach(db => {
        const exists = merged.some(p => p.id === db.policyName);
        if (!exists) {
          merged.push({ id: db.policyName, label: db.pageTitle, isCustom: true });
        }
      });
      setPolicies(merged);
    } catch (err) {
      console.error("Error fetching policies list:", err);
    }
  };

  const toggleSection = (index) => {
    setCollapsedSections(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const collapseAllSections = () => {
    const collapsed = {};
    sections.forEach((_, idx) => {
      collapsed[idx] = true;
    });
    setCollapsedSections(collapsed);
  };

  const expandAllSections = () => {
    setCollapsedSections({});
  };

  const fetchPolicyContent = async (name) => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/${name}`);
      setPageTitle(response.data.pageTitle || '');
      const content = response.data.content || [];
      setSections(content);
    } catch (err) {
      console.error(`Error fetching policy ${name}:`, err);
      toast.error('Policy not found or error loading. Starting with fresh template.');
      setPageTitle(policies.find(p => p.id === name)?.label || '');
      setSections([{ title: 'Introduction', content: [{ type: 'paragraph', text: '' }] }]);
    } finally {
      setLoading(false);
    }
  };

  const handlePolicySelect = (e) => {
    const name = e.target.value;
    setSelectedPolicyName(name);
    if (name) {
      fetchPolicyContent(name);
    } else {
      setPageTitle('');
      setSections([]);
    }
  };

  const addSection = () => {
    setSections([...sections, { title: '', content: [{ type: 'paragraph', text: '' }] }]);
  };

  const removeSection = (index) => {
    const newSections = [...sections];
    newSections.splice(index, 1);
    setSections(newSections);
  };

  const updateSectionTitle = (index, title) => {
    const newSections = [...sections];
    newSections[index].title = title;
    setSections(newSections);
  };

  const addContentItem = (sIndex, type = 'paragraph') => {
    const newSections = [...sections];
    newSections[sIndex].content.push({ type, text: '' });
    setSections(newSections);
  };

  const updateContentItem = (sIndex, cIndex, field, value) => {
    const newSections = [...sections];
    newSections[sIndex].content[cIndex][field] = value;
    setSections(newSections);
  };

  const removeContentItem = (sIndex, cIndex) => {
    const newSections = [...sections];
    newSections[sIndex].content.splice(cIndex, 1);
    setSections(newSections);
  };

  const moveSection = (index, direction) => {
    if ((direction === -1 && index === 0) || (direction === 1 && index === sections.length - 1)) return;
    const newSections = [...sections];
    const element = newSections.splice(index, 1)[0];
    newSections.splice(index + direction, 0, element);
    setSections(newSections);
  };

  // Bulk parser logic
  const handleParseAndImport = () => {
    if (!importRawText.trim()) {
      toast.error("Please paste some text to import.");
      return;
    }

    const lines = importRawText.split('\n');
    const parsedSections = [];
    let currentSection = null;

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // Header pattern check
      const isHeader = 
        /^\d+(\.\d*)*\s+[A-Za-z]/.test(trimmed) || 
        /^section\s+\d+/i.test(trimmed) ||
        (trimmed.length < 80 && trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed));

      if (isHeader) {
        if (currentSection) {
          parsedSections.push(currentSection);
        }
        currentSection = { title: trimmed, content: [] };
      } else {
        if (!currentSection) {
          currentSection = { title: 'Introduction', content: [] };
        }

        const isListItem = /^[-*•]\s+/.test(trimmed) || /^[a-zA-Z0-9]\)\s+/.test(trimmed);
        if (isListItem) {
          const cleanText = trimmed.replace(/^[-*•a-zA-Z0-9)]\s+/, '');
          currentSection.content.push({ type: 'list', text: cleanText });
        } else {
          currentSection.content.push({ type: 'paragraph', text: trimmed });
        }
      }
    });

    if (currentSection) {
      parsedSections.push(currentSection);
    }

    if (parsedSections.length > 0) {
      setSections(parsedSections);
      setShowImporter(false);
      setImportRawText('');
      toast.success("Text parsed and imported successfully!");
    } else {
      toast.error("No sections could be parsed.");
    }
  };

  // Custom policy creation
  const handleCreateCustomPolicy = (e) => {
    e.preventDefault();
    const cleanId = newPolicyId.trim().replace(/\s+/g, '');
    if (!cleanId || !newPolicyTitle.trim()) {
      toast.error("All fields are required");
      return;
    }

    // Slug validation
    if (!/^[a-zA-Z0-9-_]+$/.test(cleanId)) {
      toast.error("Policy ID must contain only alphanumeric characters, hyphens or underscores.");
      return;
    }

    // Check if ID already exists
    const exists = policies.some(p => p.id.toLowerCase() === cleanId.toLowerCase());
    if (exists) {
      toast.error("Policy ID already exists");
      return;
    }

    const newCustom = { id: cleanId, label: newPolicyTitle.trim(), isCustom: true };
    setPolicies(prev => [...prev, newCustom]);
    setSelectedPolicyName(cleanId);
    setPageTitle(newPolicyTitle.trim());
    setSections([{ title: 'Introduction', content: [{ type: 'paragraph', text: '' }] }]);
    
    // Clear and close
    setNewPolicyId('');
    setNewPolicyTitle('');
    setShowCreateModal(false);
    toast.success("Custom policy template created. Add your content and click Save.");
  };

  // Custom policy deletion
  const handleDeleteCustomPolicy = async () => {
    const isCustom = policies.find(p => p.id === selectedPolicyName)?.isCustom;
    if (!isCustom) {
      toast.error("Predefined policy pages cannot be deleted.");
      return;
    }

    if (!window.confirm(`Are you sure you want to permanently delete the policy "${selectedPolicyName}"?`)) {
      return;
    }

    setLoading(true);
    try {
      await axios.delete(`${API_BASE_URL}/${selectedPolicyName}`, {
        headers: { 'token': token }
      });
      toast.success("Policy deleted successfully!");
      setSelectedPolicyName('');
      setPageTitle('');
      setSections([]);
      fetchPoliciesList();
    } catch (err) {
      console.error("Error deleting policy:", err);
      toast.error("Failed to delete policy from database.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPolicyName || !pageTitle) {
      toast.error('Policy name and title are required');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        policyName: selectedPolicyName,
        pageTitle: pageTitle,
        content: sections
      };
      
      await axios.post(API_BASE_URL, payload, {
        headers: { 'Content-Type': 'application/json', 'token': token }
      });
      toast.success('Policy updated successfully!');
      fetchPoliciesList();
    } catch (err) {
      console.error('Error updating policy:', err);
      toast.error('Failed to update policy');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Policy Manager</h1>
          <p className="text-gray-500">Manage your website's footer and legal pages dynamically</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl shadow-md hover:from-pink-600 hover:to-rose-600 transition-all font-semibold"
        >
          <FiFolderPlus size={18} /> Add Custom Policy
        </button>
      </div>

      {/* Select Page Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8 flex flex-col md:flex-row md:items-end gap-6">
        <div className="flex-1">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Select Page to Edit</label>
          <select
            className="w-full p-3.5 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-200 outline-none transition-all text-gray-700 font-medium"
            value={selectedPolicyName}
            onChange={handlePolicySelect}
          >
            <option value="">-- Select a Page --</option>
            {policies.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label} {p.isCustom ? '(Custom)' : ''}
              </option>
            ))}
          </select>
        </div>

        {selectedPolicyName && policies.find(p => p.id === selectedPolicyName)?.isCustom && (
          <button
            type="button"
            onClick={handleDeleteCustomPolicy}
            className="flex items-center gap-2 px-5 py-3.5 bg-rose-50 text-rose-600 rounded-xl border border-rose-200 hover:bg-rose-100 hover:text-rose-700 transition-all font-semibold"
          >
            <FiTrash2 size={18} /> Delete Policy
          </button>
        )}
      </div>

      {selectedPolicyName && (
        <div className="space-y-6">
          {/* Mode Switcher Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('edit')}
              className={`flex items-center gap-2 px-6 py-3 border-b-2 font-semibold text-sm transition-all ${
                activeTab === 'edit'
                  ? 'border-pink-500 text-pink-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <FiEdit size={16} /> Edit Document
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`flex items-center gap-2 px-6 py-3 border-b-2 font-semibold text-sm transition-all ${
                activeTab === 'preview'
                  ? 'border-pink-500 text-pink-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <FiEye size={16} /> Live Preview
            </button>
          </div>

          {activeTab === 'edit' ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Page Title Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Display Page Title</label>
                <input
                  type="text"
                  className="w-full p-3.5 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-200 outline-none transition-all text-gray-800 font-medium"
                  value={pageTitle}
                  onChange={(e) => setPageTitle(e.target.value)}
                  placeholder="e.g. Terms & Conditions"
                  required
                />
              </div>

              {/* Advanced Actions Bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={collapseAllSections}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition-all"
                  >
                    Collapse All
                  </button>
                  <button
                    type="button"
                    onClick={expandAllSections}
                    className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold transition-all"
                  >
                    Expand All
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowImporter(!showImporter)}
                  className="flex items-center gap-1.5 px-4 py-2 bg-pink-50 text-pink-600 rounded-xl border border-pink-100 hover:bg-pink-100 transition-all text-xs font-bold"
                >
                  <FiUpload size={14} /> Bulk Text Importer
                </button>
              </div>

              {/* Bulk Importer Box */}
              {showImporter && (
                <div className="bg-white rounded-2xl border-2 border-dashed border-pink-200 p-6 space-y-4">
                  <div>
                    <h3 className="font-bold text-gray-800 text-sm">Bulk Document Importer</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Paste your raw text below. Heading lines will automatically trigger new sections, bulleted lines start lists, and regular lines are paragraphs.
                    </p>
                  </div>
                  <textarea
                    rows={8}
                    value={importRawText}
                    onChange={(e) => setImportRawText(e.target.value)}
                    placeholder="Paste text here..."
                    className="w-full p-4 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-200 outline-none transition-all text-sm resize-y"
                  />
                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setShowImporter(false)}
                      className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleParseAndImport}
                      className="px-4 py-2 bg-pink-500 text-white rounded-lg text-xs font-bold hover:bg-pink-600 transition-all shadow-sm"
                    >
                      Parse & Import Text
                    </button>
                  </div>
                </div>
              )}

              {/* Content Sections */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold text-gray-800">Content Sections</h2>
                  <button
                    type="button"
                    onClick={addSection}
                    className="flex items-center gap-2 px-4 py-2.5 bg-pink-500 text-white rounded-xl hover:bg-pink-600 transition-all shadow-sm font-semibold text-sm"
                  >
                    <FiPlus /> Add Section
                  </button>
                </div>

                {sections.map((section, sIndex) => (
                  <div key={sIndex} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden transition-all">
                    {/* Header */}
                    <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center gap-4">
                      <div className="flex items-center gap-4 flex-1">
                        <button
                          type="button"
                          onClick={() => toggleSection(sIndex)}
                          className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors text-gray-500"
                        >
                          {collapsedSections[sIndex] ? <FiChevronRight size={18} /> : <FiChevronDown size={18} />}
                        </button>
                        <span className="text-gray-400 font-mono text-sm font-bold">#{sIndex + 1}</span>
                        <input
                          type="text"
                          className="bg-transparent font-bold text-gray-700 outline-none w-full border-b border-transparent focus:border-pink-300 py-1"
                          value={section.title}
                          onChange={(e) => updateSectionTitle(sIndex, e.target.value)}
                          placeholder="Section Title (e.g. 1. Introduction)"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button type="button" onClick={() => moveSection(sIndex, -1)} className="p-2 hover:bg-gray-200 rounded-lg text-gray-600 transition-colors" title="Move Up"><FiChevronUp size={16} /></button>
                        <button type="button" onClick={() => moveSection(sIndex, 1)} className="p-2 hover:bg-gray-200 rounded-lg text-gray-600 transition-colors" title="Move Down"><FiChevronDown size={16} /></button>
                        {role !== 'staff' && (
                          <button type="button" onClick={() => removeSection(sIndex)} className="p-2 hover:bg-rose-50 text-rose-500 rounded-lg transition-colors ml-2" title="Delete Section"><FiTrash2 size={16} /></button>
                        )}
                      </div>
                    </div>

                    {/* Content List */}
                    {!collapsedSections[sIndex] && (
                      <div className="p-6 space-y-4">
                        {section.content.map((item, cIndex) => (
                          <div key={cIndex} className="flex gap-4 items-start group">
                            <select
                              className="p-2.5 text-xs bg-gray-100 border border-gray-200 rounded-xl font-semibold text-gray-700 outline-none"
                              value={item.type}
                              onChange={(e) => updateContentItem(sIndex, cIndex, 'type', e.target.value)}
                            >
                              <option value="paragraph">Paragraph</option>
                              <option value="subheading">Subheading</option>
                              <option value="list">List Item</option>
                            </select>
                            
                            <textarea
                              className="flex-1 p-3 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:border-pink-300 focus:bg-white transition-all resize-y min-h-[70px] text-sm text-gray-700"
                              rows={item.type === 'paragraph' ? 3 : 1}
                              value={item.text}
                              onChange={(e) => updateContentItem(sIndex, cIndex, 'text', e.target.value)}
                              placeholder={`Enter ${item.type} text...`}
                            />
                            
                            {role !== 'staff' && (
                              <button
                                type="button"
                                onClick={() => removeContentItem(sIndex, cIndex)}
                                className="p-2.5 text-gray-300 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100"
                              >
                                <FiTrash2 size={16} />
                              </button>
                            )}
                          </div>
                        ))}
                        
                        {/* Quick inserts */}
                        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                          <button
                            type="button"
                            onClick={() => addContentItem(sIndex, 'paragraph')}
                            className="text-xs bg-pink-50 hover:bg-pink-100 text-pink-600 font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all"
                          >
                            <FiPlus size={12} /> Add Paragraph
                          </button>
                          <button
                            type="button"
                            onClick={() => addContentItem(sIndex, 'subheading')}
                            className="text-xs bg-pink-50 hover:bg-pink-100 text-pink-600 font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all"
                          >
                            <FiPlus size={12} /> Add Subheading
                          </button>
                          <button
                            type="button"
                            onClick={() => addContentItem(sIndex, 'list')}
                            className="text-xs bg-pink-50 hover:bg-pink-100 text-pink-600 font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all"
                          >
                            <FiPlus size={12} /> Add List Item
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Bottom Sticky Save */}
              <div className="sticky bottom-6 flex justify-center pt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-12 py-4 bg-gradient-to-r from-gray-900 to-black text-white rounded-full font-bold shadow-xl hover:scale-105 active:scale-95 transition-all disabled:from-gray-400 disabled:to-gray-400"
                >
                  <FiSave size={18} /> {loading ? 'Saving Changes...' : 'Save All Changes'}
                </button>
              </div>
            </form>
          ) : (
            /* Live Preview Rendering */
            <div className="rounded-3xl bg-gradient-to-br from-[#fde2e4] to-[#f9d1d1] py-12 px-6 sm:px-12 border border-white/20 shadow-inner">
              <div className="max-w-3xl mx-auto space-y-8">
                {/* Title */}
                <div className="backdrop-blur-xl bg-white/70 rounded-3xl shadow-xl p-8 border border-white/40 mb-8">
                  <h1 className="text-3xl md:text-5xl font-bold text-center text-[#f47b7d] tracking-wide">
                    {pageTitle || 'Untitled Policy'}
                  </h1>
                </div>

                {/* Sections */}
                {sections && sections.length > 0 ? (
                  <div className="backdrop-blur-xl bg-white/70 rounded-3xl shadow-xl p-8 md:p-12 border border-white/40 space-y-8">
                    {sections.map((section, sIdx) => (
                      <div key={sIdx} className="space-y-4">
                        <h2 className="text-2xl font-bold text-[#f68a8b] border-b border-[#fbc4c5] pb-2">{section.title}</h2>
                        <div className="space-y-4">
                          {section.content && section.content.map((item, idx) => {
                            if (item.type === 'subheading') {
                              return <h3 key={idx} className="text-xl font-semibold text-gray-800 mt-6">{item.text}</h3>;
                            }
                            if (item.type === 'list') {
                              return (
                                <ul key={idx} className="list-disc list-inside space-y-2 text-gray-700 pl-4">
                                  <li>{item.text}</li>
                                </ul>
                              );
                            }
                            return <p key={idx} className="text-gray-700 leading-relaxed text-base">{item.text}</p>;
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-[#f47b7d] font-semibold">
                    No content added yet. Switch to Edit Mode to add sections.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Custom Policy Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-white p-6 md:p-8 rounded-2xl shadow-2xl max-w-md w-full border border-gray-100 transition-all scale-100">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">Create Custom Policy</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-2xl transition-all"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleCreateCustomPolicy} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Policy Name (Slug/ID)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. shipping-policy"
                  value={newPolicyId}
                  onChange={(e) => setNewPolicyId(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-200 outline-none text-sm transition-all"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Alphanumeric characters only, no spaces. Will be used in the URL.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Display Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Shipping & Delivery Policy"
                  value={newPolicyTitle}
                  onChange={(e) => setNewPolicyTitle(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-300 rounded-xl focus:ring-2 focus:ring-pink-200 outline-none text-sm transition-all"
                />
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-sm font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl shadow-md hover:from-pink-600 hover:to-rose-600 transition-all font-semibold text-sm"
                >
                  Create Policy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Staff Details Modal */}
      {showStaffModal && selectedStaff && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4'>
          <div className='bg-white p-6 rounded-lg shadow-xl max-w-sm w-full border border-gray-100'>
            <div className='flex justify-between items-center mb-4'>
              <h2 className='text-xl font-bold text-gray-800'>Staff Details</h2>
              <button onClick={() => setShowStaffModal(false)} className='text-gray-500 hover:text-gray-700 font-bold text-xl'>×</button>
            </div>
            <div className='space-y-3'>
              <div className='flex flex-col'>
                <span className='text-xs font-semibold text-gray-500 uppercase'>Name</span>
                <span className='text-sm font-medium text-gray-800'>{selectedStaff.name || 'N/A'}</span>
              </div>
              <div className='flex flex-col'>
                <span className='text-xs font-semibold text-gray-500 uppercase'>Email</span>
                <span className='text-sm font-medium text-gray-800'>{selectedStaff.email}</span>
              </div>
            </div>
            <div className='mt-6 flex justify-end'>
              <button
                onClick={() => setShowStaffModal(false)}
                className='px-6 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors font-medium text-sm'
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PolicyUpdate;
