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
    buttonText: "JOIN NOW",
    desktopBackground: "",
    mobileBackground: ""
  });
  const [infoBar, setInfoBar] = useState({
    backgroundColor: "#F4B8BE",
    shippingTitle: "Free shipping",
    qrImage: "/qramazon.jpeg",
    qrTitle: "Scan & Shop",
    qrSubtitle: "Available on Amazon",
    returnTitle: "FREE RETURN",
    returnSubtitle: "3-Days free return"
  });
  const [swipingCreator, setSwipingCreator] = useState(null);
  const [promoCreator, setPromoCreator] = useState(null);
  const [infoBarCreator, setInfoBarCreator] = useState(null);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [loading, setLoading] = useState(false);
  const role = localStorage.getItem('role');

  const API_BASE_URL = `${backendUrl}/api/cms`;

  const fetchCmsContent = async () => {
    setLoading(true);
    try {
      // Fetch Swiping Messages
      try {
        const resMsg = await axios.get(`${API_BASE_URL}/swiping_messages`);
        if (resMsg.data && resMsg.data.success) {
          if (resMsg.data.content) setSwipingMessages(resMsg.data.content);
          if (resMsg.data.creator) setSwipingCreator(resMsg.data.creator);
        } else {
          setSwipingMessages([
            "Free Shipping on Orders Over Rs 499",
            "Register To Get 10% Off: CODE: FNEW10",
            "2 Days Return And Exchange Policy",
          ]);
        }
      } catch (err) {
        console.warn('Swiping messages fetch error, using defaults.');
        setSwipingMessages([
          "Free Shipping on Orders Over Rs 499",
          "Register To Get 10% Off: CODE: FNEW10",
          "2 Days Return And Exchange Policy",
        ]);
      }

      // Fetch Promo Banner
      try {
        const resPromo = await axios.get(`${API_BASE_URL}/promo_banner`);
        if (resPromo.data && resPromo.data.success) {
          if (resPromo.data.content) setPromoBanner(resPromo.data.content);
          if (resPromo.data.creator) setPromoCreator(resPromo.data.creator);
        }
      } catch (err) {
        console.warn('Promo banner fetch error, using defaults.');
      }

      // Fetch Info Bar
      try {
        const resInfoBar = await axios.get(`${API_BASE_URL}/info_bar`);
        if (resInfoBar.data && resInfoBar.data.success) {
          if (resInfoBar.data.content) setInfoBar(prev => ({ ...prev, ...resInfoBar.data.content }));
          if (resInfoBar.data.creator) setInfoBarCreator(resInfoBar.data.creator);
        }
      } catch (err) {
        console.warn('Info bar fetch error, using defaults.');
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

  const handlePromoBackgroundUpload = async (field, file) => {
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
        headers: { token, 'Content-Type': 'multipart/form-data' },
      });
      if (response.data.success) {
        setPromoBanner(prev => ({ ...prev, [field]: response.data.imageUrl }));
        toast.success('Image uploaded successfully');
      }
    } catch (err) {
      console.error('Error uploading promo banner image:', err);
      toast.error('Failed to upload image');
    } finally {
      setLoading(false);
    }
  };

  const handleInfoBarChange = (e) => {
    const { name, value } = e.target;
    setInfoBar(prev => ({ ...prev, [name]: value }));
  };

  const handleInfoBarImageUpload = async (file) => {
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
        headers: { token, 'Content-Type': 'multipart/form-data' },
      });
      if (response.data.success) {
        setInfoBar(prev => ({ ...prev, qrImage: response.data.imageUrl }));
        toast.success('Image uploaded successfully');
      }
    } catch (err) {
      console.error('Error uploading QR code image:', err);
      toast.error('Failed to upload image');
    } finally {
      setLoading(false);
    }
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

      // Save Info Bar
      await axios.post(`${API_BASE_URL}/`, {
        name: 'info_bar',
        content: infoBar
      }, {
        headers: { 'Content-Type': 'application/json', 'token': token }
      });

      toast.success('CMS content updated successfully!');
      fetchCmsContent(); // Refresh to get updated creator info
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
            <div>
              <h2 className="text-xl font-bold text-gray-800">Swiping Messages</h2>
              {swipingCreator && (
                <p className="text-[10px] text-gray-500 mt-1">
                  Last Updated By: 
                  <span 
                    onClick={() => { if(swipingCreator.role === 'staff') { setSelectedStaff(swipingCreator); setShowStaffModal(true); } }}
                    className={`ml-1 px-2 py-0.5 rounded-full font-bold uppercase ${swipingCreator.role === 'staff' ? 'bg-blue-100 text-blue-700 cursor-pointer hover:bg-blue-200' : 'bg-gray-100 text-gray-600'} inline-block`}
                  >
                    {swipingCreator.role || 'Admin'}
                  </span>
                </p>
              )}
            </div>
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
                {role !== 'staff' && (
                  <button
                    type="button"
                    onClick={() => removeMessage(index)}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <FiTrash2 size={20} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Promo Banner Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-800">Promo Banner (Join Now Section)</h2>
            {promoCreator && (
              <p className="text-[10px] text-gray-500 mt-1">
                Last Updated By: 
                <span 
                  onClick={() => { if(promoCreator.role === 'staff') { setSelectedStaff(promoCreator); setShowStaffModal(true); } }}
                  className={`ml-1 px-2 py-0.5 rounded-full font-bold uppercase ${promoCreator.role === 'staff' ? 'bg-blue-100 text-blue-700 cursor-pointer hover:bg-blue-200' : 'bg-gray-100 text-gray-600'} inline-block`}
                >
                  {promoCreator.role || 'Admin'}
                </span>
              </p>
            )}
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4 border-b border-gray-200">
              <div className="space-y-3">
                <p className="font-bold text-gray-600 uppercase text-[10px] tracking-wider">Desktop Background</p>
                <div className="w-full h-24 bg-gray-100 rounded border overflow-hidden">
                  {promoBanner.desktopBackground ? (
                    <img src={promoBanner.desktopBackground} className="w-full h-full object-cover" alt="Desktop background preview" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No image set</div>
                  )}
                </div>
                <label className="block cursor-pointer text-center bg-white border px-3 py-2 rounded text-xs shadow-sm hover:bg-gray-50 transition">
                  Upload Desktop Image
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePromoBackgroundUpload('desktopBackground', e.target.files[0])} />
                </label>
                <p className="text-[10px] text-gray-500">Best fit: 1920×400px (wide banner, ~4.8:1). The banner's height is set by the text/button content, so the image is cropped with object-cover — keep the important part centered.</p>
              </div>
              <div className="space-y-3">
                <p className="font-bold text-blue-600 uppercase text-[10px] tracking-wider">Mobile Background</p>
                <div className="w-full h-24 bg-gray-100 rounded border overflow-hidden">
                  {promoBanner.mobileBackground ? (
                    <img src={promoBanner.mobileBackground} className="w-full h-full object-cover" alt="Mobile background preview" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No image set</div>
                  )}
                </div>
                <label className="block cursor-pointer text-center bg-blue-50 border border-blue-200 text-blue-600 px-3 py-2 rounded text-xs shadow-sm hover:bg-blue-100 transition">
                  Upload Mobile Image
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePromoBackgroundUpload('mobileBackground', e.target.files[0])} />
                </label>
                <p className="text-[10px] text-gray-500">Best fit: 750×600px. Mobile text wraps to more lines, so this crop is taller/narrower than the desktop one.</p>
              </div>
              {(promoBanner.desktopBackground || promoBanner.mobileBackground) && (
                <div className="md:col-span-2">
                  <button
                    type="button"
                    onClick={() => setPromoBanner(prev => ({ ...prev, desktopBackground: '', mobileBackground: '' }))}
                    className="text-xs text-red-500 hover:text-red-600 font-medium"
                  >
                    Remove background images (use solid color)
                  </button>
                </div>
              )}
            </div>

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

        {/* Info Bar Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-800">Info Bar (Shipping / Scan &amp; Shop / Free Return)</h2>
            {infoBarCreator && (
              <p className="text-[10px] text-gray-500 mt-1">
                Last Updated By:
                <span
                  onClick={() => { if(infoBarCreator.role === 'staff') { setSelectedStaff(infoBarCreator); setShowStaffModal(true); } }}
                  className={`ml-1 px-2 py-0.5 rounded-full font-bold uppercase ${infoBarCreator.role === 'staff' ? 'bg-blue-100 text-blue-700 cursor-pointer hover:bg-blue-200' : 'bg-gray-100 text-gray-600'} inline-block`}
                >
                  {infoBarCreator.role || 'Admin'}
                </span>
              </p>
            )}
          </div>

          <div className="space-y-4">
            <div className="border p-4 rounded-md bg-gray-50 shadow-inner flex flex-wrap items-center gap-4">
              <div>
                <p className="font-medium text-sm">Background Color</p>
                <p className="text-[10px] text-gray-500">Applies to the whole strip.</p>
              </div>
              <input
                type="color"
                value={infoBar.backgroundColor}
                onChange={(e) => setInfoBar(prev => ({ ...prev, backgroundColor: e.target.value }))}
                className="w-12 h-10 border rounded cursor-pointer"
              />
              <input
                type="text"
                value={infoBar.backgroundColor}
                onChange={(e) => setInfoBar(prev => ({ ...prev, backgroundColor: e.target.value }))}
                placeholder="#F4B8BE"
                className="w-28 px-3 py-2 border rounded outline-none bg-white text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Free Shipping Title</label>
              <input
                type="text"
                name="shippingTitle"
                className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-200 outline-none transition-all"
                value={infoBar.shippingTitle}
                onChange={handleInfoBarChange}
                placeholder="e.g. Free shipping"
                required
              />
              <p className="text-[10px] text-gray-500 mt-1">The subtext ("on orders over Rs.X") is pulled automatically from the shipping threshold in Site Settings.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-4 items-start border-t pt-4">
              <div className="space-y-3">
                <p className="font-bold text-gray-600 uppercase text-[10px] tracking-wider">QR / Barcode Image</p>
                <div className="w-24 h-24 bg-gray-100 rounded border overflow-hidden">
                  {infoBar.qrImage ? (
                    <img src={infoBar.qrImage} className="w-full h-full object-contain" alt="QR code preview" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No image</div>
                  )}
                </div>
                <label className="block cursor-pointer text-center bg-white border px-3 py-2 rounded text-xs shadow-sm hover:bg-gray-50 transition">
                  Upload Image
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleInfoBarImageUpload(e.target.files[0])} />
                </label>
                <p className="text-[10px] text-gray-500 max-w-[140px]">Best fit: 200×200px square, transparent or white background.</p>
              </div>
              <div className="space-y-4 w-full">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Scan &amp; Shop Title</label>
                  <input
                    type="text"
                    name="qrTitle"
                    className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-200 outline-none transition-all"
                    value={infoBar.qrTitle}
                    onChange={handleInfoBarChange}
                    placeholder="e.g. Scan & Shop"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Scan &amp; Shop Subtitle</label>
                  <input
                    type="text"
                    name="qrSubtitle"
                    className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-200 outline-none transition-all"
                    value={infoBar.qrSubtitle}
                    onChange={handleInfoBarChange}
                    placeholder="e.g. Available on Amazon"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Free Return Title</label>
                <input
                  type="text"
                  name="returnTitle"
                  className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-200 outline-none transition-all"
                  value={infoBar.returnTitle}
                  onChange={handleInfoBarChange}
                  placeholder="e.g. FREE RETURN"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Free Return Subtitle</label>
                <input
                  type="text"
                  name="returnSubtitle"
                  className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-200 outline-none transition-all"
                  value={infoBar.returnSubtitle}
                  onChange={handleInfoBarChange}
                  placeholder="e.g. 3-Days free return"
                  required
                />
              </div>
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

      {/* Staff Details Modal */}
      {showStaffModal && selectedStaff && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4'>
          <div className='bg-white p-6 rounded-lg shadow-xl max-w-sm w-full'>
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

export default Cms;
