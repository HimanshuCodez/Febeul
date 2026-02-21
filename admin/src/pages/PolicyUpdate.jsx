import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { backendUrl } from '../App.jsx';
import { FiPlus, FiTrash2, FiChevronUp, FiChevronDown, FiSave } from 'react-icons/fi';

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
  const [selectedPolicyName, setSelectedPolicyName] = useState('');
  const [pageTitle, setPageTitle] = useState('');
  const [sections, setSections] = useState([]); // [{ title: '', content: [{ type: 'paragraph', text: '' }] }]
  const [loading, setLoading] = useState(false);

  const API_BASE_URL = `${backendUrl}/api/policy`;

  const fetchPolicyContent = async (name) => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/${name}`);
      setPageTitle(response.data.pageTitle || '');
      // Ensure content is in the expected structure
      const content = response.data.content || [];
      setSections(content);
    } catch (err) {
      console.error(`Error fetching policy ${name}:`, err);
      toast.error('Policy not found or error loading. Starting with fresh template.');
      setPageTitle(PREDEFINED_POLICIES.find(p => p.id === name)?.label || '');
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

  const addContentItem = (sIndex) => {
    const newSections = [...sections];
    newSections[sIndex].content.push({ type: 'paragraph', text: '' });
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
    } catch (err) {
      console.error('Error updating policy:', err);
      toast.error('Failed to update policy');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Policy Manager</h1>
          <p className="text-gray-500">Manage your website's footer and legal pages</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <label className="block text-sm font-semibold text-gray-700 mb-2">Select Page to Edit</label>
        <select
          className="w-full md:w-1/3 p-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-200 outline-none transition-all"
          value={selectedPolicyName}
          onChange={handlePolicySelect}
        >
          <option value="">-- Select a Page --</option>
          {PREDEFINED_POLICIES.map((p) => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </select>
      </div>

      {selectedPolicyName && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Display Page Title</label>
            <input
              type="text"
              className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-200 outline-none transition-all"
              value={pageTitle}
              onChange={(e) => setPageTitle(e.target.value)}
              placeholder="e.g. Terms & Conditions"
              required
            />
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">Content Sections</h2>
              <button
                type="button"
                onClick={addSection}
                className="flex items-center gap-2 px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors shadow-sm"
              >
                <FiPlus /> Add Section
              </button>
            </div>

            {sections.map((section, sIndex) => (
              <div key={sIndex} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 flex justify-between items-center">
                  <div className="flex items-center gap-4 flex-1">
                    <span className="text-gray-400 font-mono text-sm">#{sIndex + 1}</span>
                    <input
                      type="text"
                      className="bg-transparent font-bold text-gray-700 outline-none w-full border-b border-transparent focus:border-pink-300"
                      value={section.title}
                      onChange={(e) => updateSectionTitle(sIndex, e.target.value)}
                      placeholder="Section Title (e.g. 1. Introduction)"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => moveSection(sIndex, -1)} className="p-1 hover:text-pink-500"><FiChevronUp /></button>
                    <button type="button" onClick={() => moveSection(sIndex, 1)} className="p-1 hover:text-pink-500"><FiChevronDown /></button>
                    <button type="button" onClick={() => removeSection(sIndex)} className="p-1 hover:text-red-500 ml-2"><FiTrash2 /></button>
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  {section.content.map((item, cIndex) => (
                    <div key={cIndex} className="flex gap-4 items-start group">
                      <select
                        className="p-2 text-xs bg-gray-100 border rounded font-medium"
                        value={item.type}
                        onChange={(e) => updateContentItem(sIndex, cIndex, 'type', e.target.value)}
                      >
                        <option value="paragraph">Paragraph</option>
                        <option value="subheading">Subheading</option>
                        <option value="list">List Item</option>
                      </select>
                      
                      <textarea
                        className="flex-1 p-2 bg-gray-50 border border-gray-200 rounded outline-none focus:border-pink-300 transition-all resize-none min-h-[40px]"
                        rows={item.type === 'paragraph' ? 3 : 1}
                        value={item.text}
                        onChange={(e) => updateContentItem(sIndex, cIndex, 'text', e.target.value)}
                        placeholder={`Enter ${item.type} text...`}
                      />
                      
                      <button
                        type="button"
                        onClick={() => removeContentItem(sIndex, cIndex)}
                        className="p-2 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  ))}
                  
                  <button
                    type="button"
                    onClick={() => addContentItem(sIndex)}
                    className="text-sm text-pink-500 font-semibold hover:text-pink-600 flex items-center gap-1"
                  >
                    <FiPlus size={14} /> Add Content Row
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="sticky bottom-8 flex justify-center pt-8">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-10 py-4 bg-gray-900 text-white rounded-full font-bold shadow-xl hover:bg-black hover:scale-105 active:scale-95 transition-all disabled:bg-gray-400"
            >
              <FiSave /> {loading ? 'Saving...' : 'Save All Changes'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default PolicyUpdate;
