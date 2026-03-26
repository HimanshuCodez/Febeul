import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { backendUrl } from '../../App';
import { toast } from 'react-toastify';
import Loading from '../../components/Loading';

const Images = ({ token }) => {
  const [slides, setSlides] = useState([{ desktop: '', mobile: '', link: '' }]);
  const [spotlight, setSpotlight] = useState([{ image: '', label: '', link: '' }]);
  const [blackBanner, setBlackBanner] = useState({ 
    video: '', 
    link: '',
    showDeal: false,
    deal: { image: '', title: '', price: '', mrp: '', discount: '', link: '' }
  });
  const [poseSection, setPoseSection] = useState({ desktop: '', mobile: '', link: '' });
  const [loading, setLoading] = useState(false);
  const [activeAccordion, setActiveAccordion] = useState('hero');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [hero, spot, banner, pose] = await Promise.all([
        axios.get(`${backendUrl}/api/cms/hero_carousel`),
        axios.get(`${backendUrl}/api/cms/spotlight_categories`),
        axios.get(`${backendUrl}/api/cms/black_banner`),
        axios.get(`${backendUrl}/api/cms/pose_section`)
      ]);

      if (hero.data.success) setSlides(hero.data.content || [{ desktop: '', mobile: '', link: '' }]);
      if (spot.data.success) setSpotlight(spot.data.content || []);
      if (banner.data.success) setBlackBanner(prev => ({...prev, ...banner.data.content}));
      if (pose.data.success) setPoseSection(pose.data.content || { desktop: '', mobile: '', link: '' });

    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleFileUpload = async (type, index, file, subType = '') => {
    const formData = new FormData();
    formData.append('image', file);
    setLoading(true);
    try {
      const response = await axios.post(`${backendUrl}/api/cms/upload`, formData, {
        headers: { token, 'Content-Type': 'multipart/form-data' },
      });

      if (response.data.success) {
        const url = response.data.imageUrl;
        if (type === 'hero') {
          const newSlides = [...slides];
          if (subType === 'mobile') newSlides[index].mobile = url;
          else newSlides[index].desktop = url;
          setSlides(newSlides);
        } else if (type === 'spotlight') {
          const newSpotlight = [...spotlight];
          newSpotlight[index].image = url;
          setSpotlight(newSpotlight);
        } else if (type === 'banner') {
          setBlackBanner({ ...blackBanner, video: url });
        } else if (type === 'deal') {
          setBlackBanner({ ...blackBanner, deal: { ...blackBanner.deal, image: url } });
        } else if (type === 'pose') {
          if (subType === 'mobile') setPoseSection({ ...poseSection, mobile: url });
          else setPoseSection({ ...poseSection, desktop: url });
        }
        toast.success("File uploaded successfully");
      }
    } catch (error) {
      toast.error("Failed to upload file");
    } finally {
      setLoading(false);
    }
  };

  const saveContent = async (name, content) => {
    setLoading(true);
    try {
      const response = await axios.post(`${backendUrl}/api/cms`, { name, content }, { headers: { token } });
      if (response.data.success) toast.success(`${name.replace('_', ' ')} updated`);
    } catch (error) {
      toast.error("Failed to save content");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-6xl mx-auto pb-24 text-gray-800">
      <h2 className="text-3xl font-bold mb-8 border-b pb-4">Visual Content Management (Responsive)</h2>
      
      {/* Hero Carousel */}
      <div className="mb-6 border rounded-lg overflow-hidden shadow-sm">
        <button onClick={() => setActiveAccordion(activeAccordion === 'hero' ? null : 'hero')} className={`w-full flex justify-between items-center p-4 transition-colors font-semibold text-lg ${activeAccordion === 'hero' ? 'bg-blue-50 text-blue-700' : 'bg-gray-50'}`}>
          <span>Hero Carousel (Desktop & Mobile Banners)</span>
          <span>{activeAccordion === 'hero' ? '−' : '+'}</span>
        </button>
        {activeAccordion === 'hero' && (
          <div className="p-6 bg-white space-y-8">
            {slides.map((slide, index) => (
              <div key={index} className="border p-4 rounded-md relative bg-gray-50 shadow-inner">
                <button onClick={() => setSlides(slides.filter((_, i) => i !== index))} className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">X</button>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
                  {/* Desktop Upload */}
                  <div className="space-y-3">
                    <p className="font-bold text-gray-600 uppercase text-[10px] tracking-wider">Desktop Version (Wide)</p>
                    <div className="flex items-center gap-4">
                      <div className="w-40 h-20 bg-gray-200 rounded border overflow-hidden">
                        {slide.desktop ? <img src={slide.desktop} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-400">1920x800</div>}
                      </div>
                      <label className="cursor-pointer bg-white border px-3 py-1 rounded text-xs shadow-sm hover:bg-gray-50 transition">
                        Upload Desktop
                        <input type="file" className="hidden" onChange={(e) => handleFileUpload('hero', index, e.target.files[0], 'desktop')} />
                      </label>
                    </div>
                  </div>
                  {/* Mobile Upload */}
                  <div className="space-y-3">
                    <p className="font-bold text-blue-600 uppercase text-[10px] tracking-wider">Mobile Version (Portrait)</p>
                    <div className="flex items-center gap-4">
                      <div className="w-20 h-24 bg-gray-200 rounded border overflow-hidden">
                        {slide.mobile ? <img src={slide.mobile} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-400 text-[10px]">1080x1350</div>}
                      </div>
                      <label className="cursor-pointer bg-blue-50 border border-blue-200 text-blue-600 px-3 py-1 rounded text-xs shadow-sm hover:bg-blue-100 transition">
                        Upload Mobile
                        <input type="file" className="hidden" onChange={(e) => handleFileUpload('hero', index, e.target.files[0], 'mobile')} />
                      </label>
                    </div>
                  </div>
                  {/* Link */}
                  <div className="md:col-span-2 border-t pt-4">
                    <p className="mb-2 font-medium">Redirect Link</p>
                    <input type="text" placeholder="/products/new-arrivals" value={slide.link} onChange={(e) => { const n = [...slides]; n[index].link = e.target.value; setSlides(n); }} className="w-full px-3 py-2 border rounded outline-none bg-white" />
                  </div>
                </div>
              </div>
            ))}
            <div className="flex gap-4">
              <button onClick={() => setSlides([...slides, { desktop: '', mobile: '', link: '' }])} className="bg-blue-600 text-white px-6 py-2 rounded text-sm font-medium">Add New Slide</button>
              <button onClick={() => saveContent('hero_carousel', slides)} className="bg-black text-white px-10 py-2 rounded font-bold text-sm">Save Carousel</button>
            </div>
          </div>
        )}
      </div>

      {/* Spotlight */}
      <div className="mb-6 border rounded-lg overflow-hidden shadow-sm">
        <button onClick={() => setActiveAccordion(activeAccordion === 'spotlight' ? null : 'spotlight')} className={`w-full flex justify-between items-center p-4 transition-colors font-semibold text-lg ${activeAccordion === 'spotlight' ? 'bg-pink-50 text-pink-700' : 'bg-gray-50'}`}>
          <span>Spotlight Categories (Circular)</span>
          <span>{activeAccordion === 'spotlight' ? '−' : '+'}</span>
        </button>
        {activeAccordion === 'spotlight' && (
          <div className="p-6 bg-white space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {spotlight.map((item, index) => (
                <div key={index} className="border p-4 rounded-md relative bg-gray-50 shadow-inner flex flex-col items-center">
                  <button onClick={() => setSpotlight(spotlight.filter((_, i) => i !== index))} className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">X</button>
                  <div className="flex flex-col items-center gap-3 mb-4">
                    <img src={item.image || ''} className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md" />
                    <label className="cursor-pointer bg-white border px-4 py-1 text-xs rounded-full shadow-sm hover:bg-gray-50 transition">Change Photo<input type="file" className="hidden" onChange={(e) => handleFileUpload('spotlight', index, e.target.files[0])} /></label>
                  </div>
                  <div className="w-full space-y-2">
                    <input type="text" placeholder="Category Label" value={item.label} onChange={(e) => { const n = [...spotlight]; n[index].label = e.target.value; setSpotlight(n); }} className="w-full px-3 py-2 border rounded text-sm outline-none bg-white" />
                    <input type="text" placeholder="Link (e.g. /products/pajamas)" value={item.link} onChange={(e) => { const n = [...spotlight]; n[index].link = e.target.value; setSpotlight(n); }} className="w-full px-3 py-2 border rounded text-sm outline-none bg-white" />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-4 pt-4 border-t">
              <button onClick={() => setSpotlight([...spotlight, { image: '', label: '', link: '' }])} className="bg-pink-600 text-white px-6 py-2 rounded text-sm">Add Category</button>
              <button onClick={() => saveContent('spotlight_categories', spotlight)} className="bg-black text-white px-10 py-2 rounded font-bold text-sm">Save Spotlight</button>
            </div>
          </div>
        )}
      </div>

      {/* Black Banner & Deal */}
      <div className="mb-6 border rounded-lg overflow-hidden shadow-sm">
        <button onClick={() => setActiveAccordion(activeAccordion === 'banner' ? null : 'banner')} className={`w-full flex justify-between items-center p-4 transition-colors font-semibold text-lg ${activeAccordion === 'banner' ? 'bg-purple-50 text-purple-700' : 'bg-gray-50'}`}>
          <span>Black Banner & Deal Card</span>
          <span>{activeAccordion === 'banner' ? '−' : '+'}</span>
        </button>
        {activeAccordion === 'banner' && (
          <div className="p-6 bg-white space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="font-bold text-purple-700 text-sm uppercase tracking-widest">Background Video</h3>
                <div className="bg-black rounded-lg overflow-hidden aspect-video shadow-xl">
                  <video src={blackBanner.video} className="w-full h-full object-cover" controls muted />
                </div>
                <div className="flex gap-2">
                  <label className="flex-1 cursor-pointer bg-purple-600 text-white text-center py-2 rounded text-sm font-bold shadow-md hover:bg-purple-700 transition">Upload Video File<input type="file" accept="video/*" className="hidden" onChange={(e) => handleFileUpload('banner', null, e.target.files[0])} /></label>
                  <input type="text" placeholder="Video Redirect Link" value={blackBanner.link} onChange={(e) => setBlackBanner({...blackBanner, link: e.target.value})} className="flex-1 px-4 py-2 border rounded text-sm outline-none" />
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-purple-700 text-sm uppercase tracking-widest">Deal Overlay Card</h3>
                  <label className="flex items-center gap-2 cursor-pointer bg-purple-100 px-3 py-1 rounded-full text-xs font-bold text-purple-700"><input type="checkbox" checked={blackBanner.showDeal} onChange={(e) => setBlackBanner({...blackBanner, showDeal: e.target.checked})} /> ENABLE DEAL</label>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <input type="text" placeholder="Product Title" value={blackBanner.deal.title} onChange={(e) => setBlackBanner({...blackBanner, deal: {...blackBanner.deal, title: e.target.value}})} className="p-3 border rounded col-span-2 bg-gray-50" />
                  <input type="text" placeholder="Price (e.g. ₹379)" value={blackBanner.deal.price} onChange={(e) => setBlackBanner({...blackBanner, deal: {...blackBanner.deal, price: e.target.value}})} className="p-3 border rounded bg-gray-50" />
                  <input type="text" placeholder="MRP (e.g. ₹999)" value={blackBanner.deal.mrp} onChange={(e) => setBlackBanner({...blackBanner, deal: {...blackBanner.deal, mrp: e.target.value}})} className="p-3 border rounded bg-gray-50" />
                  <input type="text" placeholder="Discount (e.g. 62%)" value={blackBanner.deal.discount} onChange={(e) => setBlackBanner({...blackBanner, deal: {...blackBanner.deal, discount: e.target.value}})} className="p-3 border rounded bg-gray-50" />
                  <input type="text" placeholder="Product Page Link" value={blackBanner.deal.link} onChange={(e) => setBlackBanner({...blackBanner, deal: {...blackBanner.deal, link: e.target.value}})} className="p-3 border rounded bg-gray-50" />
                  <div className="col-span-2 flex items-center gap-6 border-t pt-4 mt-2">
                    <img src={blackBanner.deal.image || ''} className="w-16 h-16 rounded-full object-cover border-2 border-purple-200 shadow-md" />
                    <label className="cursor-pointer bg-white border border-purple-200 text-purple-700 px-4 py-2 rounded text-xs font-bold shadow-sm hover:bg-purple-50 transition">Upload Deal Image<input type="file" className="hidden" onChange={(e) => handleFileUpload('deal', null, e.target.files[0])} /></label>
                  </div>
                </div>
              </div>
            </div>
            <button onClick={() => saveContent('black_banner', blackBanner)} className="bg-black text-white px-12 py-3 rounded font-bold text-sm tracking-widest hover:scale-105 transition">SAVE BANNER SETTINGS</button>
          </div>
        )}
      </div>

      {/* Pose Section Dual Image */}
      <div className="mb-6 border rounded-lg overflow-hidden shadow-sm">
        <button onClick={() => setActiveAccordion(activeAccordion === 'pose' ? null : 'pose')} className={`w-full flex justify-between items-center p-4 transition-colors font-semibold text-lg ${activeAccordion === 'pose' ? 'bg-red-50 text-red-700' : 'bg-gray-50'}`}>
          <span>Pose Section (Desktop & Mobile)</span>
          <span>{activeAccordion === 'pose' ? '−' : '+'}</span>
        </button>
        {activeAccordion === 'pose' && (
          <div className="p-6 bg-white space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <p className="font-bold text-gray-600 uppercase text-xs">Desktop Full Screen (Wide)</p>
                <div className="w-full aspect-video bg-gray-100 rounded-lg overflow-hidden border-4 border-white shadow-xl">
                  {poseSection.desktop ? <img src={poseSection.desktop} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-400">Desktop Image</div>}
                </div>
                <label className="block text-center cursor-pointer bg-white border border-gray-300 py-3 rounded-md text-sm font-bold shadow-sm hover:bg-gray-50 transition">Upload Desktop Image<input type="file" className="hidden" onChange={(e) => handleFileUpload('pose', null, e.target.files[0], 'desktop')} /></label>
              </div>
              <div className="space-y-4">
                <p className="font-bold text-red-600 uppercase text-xs">Mobile Full Screen (Portrait)</p>
                <div className="w-full aspect-[3/4] max-w-[250px] mx-auto bg-gray-100 rounded-lg overflow-hidden border-4 border-white shadow-xl">
                  {poseSection.mobile ? <img src={poseSection.mobile} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-400">Mobile Image</div>}
                </div>
                <label className="block text-center cursor-pointer bg-red-50 text-red-600 border border-red-200 py-3 rounded-md text-sm font-bold shadow-sm hover:bg-red-50 transition">Upload Mobile Image<input type="file" className="hidden" onChange={(e) => handleFileUpload('pose', null, e.target.files[0], 'mobile')} /></label>
              </div>
            </div>
            <div className="border-t pt-6">
              <p className="mb-2 font-medium">Pose Section Link</p>
              <input type="text" placeholder="/products/pose-collection" value={poseSection.link} onChange={(e) => setPoseSection({...poseSection, link: e.target.value})} className="w-full px-4 py-3 border rounded outline-none bg-gray-50 mb-6" />
              <button onClick={() => saveContent('pose_section', poseSection)} className="bg-black text-white px-12 py-3 rounded font-bold text-sm tracking-widest hover:scale-105 transition">SAVE POSE SETTINGS</button>
            </div>
          </div>
        )}
      </div>

      {loading && <Loading />}
    </div>
  );
};

export default Images;