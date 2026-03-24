import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { backendUrl } from '../../App.jsx';
import { FiPlus, FiTrash2, FiSave } from 'react-icons/fi';

const Cms = ({ token }) => {
  const [swipingMessages, setSwipingMessages] = useState([]);
  const [promoBanner, setPromoBanner] = useState({
    topLine: "JOIN NOW & SAVE 15% ON MEMBERSHIP!",
    discountCode: "luxe15",
    buttonText: "JOIN NOW"
  });
  const [loading, setLoading] = useState(false);

  const API_BASE_URL = `${backendUrl}/api/cms`;

  const fetchCmsContent = async () => {
    setLoading(true);
    try {
      // Fetch Swiping Messages
      try {
        const resMsg = await axios.get(`${API_BASE_URL}/swiping_messages`);
        if (resMsg.data && resMsg.data.content) {
          setSwipingMessages(resMsg.data.content);
        }
      } catch (err) {
        console.warn('Swiping messages not found, using defaults.');
        setSwipingMessages([
          "Free Shipping on Orders Over Rs 499",
          "Register To Get 10% Off: CODE: FNEW10",
          "2 Days Return And Exchange Policy",
        ]);
      }

      // Fetch Promo Banner
      try {
        const resPromo = await axios.get(`${API_BASE_URL}/promo_banner`);
        if (resPromo.data && resPromo.data.content) {
          setPromoBanner(resPromo.data.content);
        }
      } catch (err) {
        console.warn('Promo banner not found, using defaults.');
      }

    } catch (err) {
      console.error('Error fetching CMS content:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCmsContent();
  }, []);

  const addMessage = () => {
    setSwipingMessages([...swipingMessages, '']);
  };

  const updateMessage = (index, value) => {
    const newMessages = [...swipingMessages];
    newMessages[index] = value;
    setSwipingMessages(newMessages);
  };

  const removeMessage = (index) => {
    const newMessages = swipingMessages.filter((_, i) => i !== index);
    setSwipingMessages(newMessages);
  };

  const handlePromoChange = (e) => {
    const { name, value } = e.target;
    setPromoBanner(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Save Swiping Messages
      await axios.post(`${API_BASE_URL}/`, {
        name: 'swiping_messages',
        content: swipingMessages.filter(msg => msg.trim() !== '')
      }, {
        headers: { 'Content-Type': 'application/json', 'token': token }
      });

      // Save Promo Banner
      await axios.post(`${API_BASE_URL}/`, {
        name: 'promo_banner',
        content: promoBanner
      }, {
        headers: { 'Content-Type': 'application/json', 'token': token }
      });

      toast.success('CMS content updated successfully!');
    } catch (err) {
      console.error('Error updating CMS content:', err);
      toast.error('Failed to update CMS content');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-50 min-h-screen">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">CMS Manager</h1>
        <p className="text-gray-500">Manage dynamic text content across the website</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Swiping Messages Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800">Swiping Messages</h2>
            <button
              type="button"
              onClick={addMessage}
              className="flex items-center gap-2 px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors shadow-sm text-sm"
            >
              <FiPlus /> Add Message
            </button>
          </div>
          
          <div className="space-y-3">
            {swipingMessages.map((msg, index) => (
              <div key={index} className="flex gap-3 items-center group">
                <span className="text-gray-400 font-mono text-sm w-6">#{index + 1}</span>
                <input
                  type="text"
                  className="flex-1 p-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-200 outline-none transition-all"
                  value={msg}
                  onChange={(e) => updateMessage(index, e.target.value)}
                  placeholder="Enter message text..."
                  required
                />
                <button
                  type="button"
                  onClick={() => removeMessage(index)}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <FiTrash2 size={20} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Promo Banner Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-6">Promo Banner (Join Now Section)</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Top Line Text</label>
              <input
                type="text"
                name="topLine"
                className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-200 outline-none transition-all"
                value={promoBanner.topLine}
                onChange={handlePromoChange}
                placeholder="e.g. JOIN NOW & SAVE 15% ON MEMBERSHIP!"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Discount Code</label>
              <input
                type="text"
                name="discountCode"
                className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-200 outline-none transition-all"
                value={promoBanner.discountCode}
                onChange={handlePromoChange}
                placeholder="e.g. luxe15"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Button Text</label>
              <input
                type="text"
                name="buttonText"
                className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-200 outline-none transition-all"
                value={promoBanner.buttonText}
                onChange={handlePromoChange}
                placeholder="e.g. JOIN NOW"
                required
              />
            </div>
          </div>
        </div>

        <div className="flex justify-center pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-10 py-4 bg-gray-900 text-white rounded-full font-bold shadow-xl hover:bg-black hover:scale-105 active:scale-95 transition-all disabled:bg-gray-400"
          >
            <FiSave /> {loading ? 'Saving...' : 'Save All Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Cms;
