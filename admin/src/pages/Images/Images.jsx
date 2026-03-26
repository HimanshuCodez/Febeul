import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { backendUrl } from '../../App';
import { toast } from 'react-toastify';
import Loading from '../../components/Loading';

const Images = ({ token }) => {
  const [slides, setSlides] = useState([{ image: '', link: '' }]);
  const [spotlight, setSpotlight] = useState([{ image: '', label: '', link: '' }]);
  const [blackBanner, setBlackBanner] = useState({ video: '', link: '' });
  const [loading, setLoading] = useState(false);
  const [activeAccordion, setActiveAccordion] = useState('hero');

  const fetchData = async () => {
    setLoading(true);
    try {
      const heroRes = await axios.get(`${backendUrl}/api/cms/hero_carousel`);
      if (heroRes.data.success && heroRes.data.content) {
        setSlides(heroRes.data.content);
      }

      const spotlightRes = await axios.get(`${backendUrl}/api/cms/spotlight_categories`);
      if (spotlightRes.data.success && spotlightRes.data.content) {
        setSpotlight(spotlightRes.data.content);
      }

      const bannerRes = await axios.get(`${backendUrl}/api/cms/black_banner`);
      if (bannerRes.data.success && bannerRes.data.content) {
        setBlackBanner(bannerRes.data.content);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleFileUpload = async (type, index, file) => {
    const formData = new FormData();
    formData.append('image', file);
    setLoading(true);
    try {
      const response = await axios.post(`${backendUrl}/api/cms/upload`, formData, {
        headers: {
          token,
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        if (type === 'hero') {
          const newSlides = [...slides];
          newSlides[index].image = response.data.imageUrl;
          setSlides(newSlides);
        } else if (type === 'spotlight') {
          const newSpotlight = [...spotlight];
          newSpotlight[index].image = response.data.imageUrl;
          setSpotlight(newSpotlight);
        } else if (type === 'banner') {
          setBlackBanner({ ...blackBanner, video: response.data.imageUrl });
        }
        toast.success("File uploaded successfully");
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("Failed to upload file");
    } finally {
      setLoading(false);
    }
  };

  const saveContent = async (name, content) => {
    setLoading(true);
    try {
      const response = await axios.post(
        `${backendUrl}/api/cms`,
        { name, content },
        { headers: { token } }
      );

      if (response.data.success) {
        toast.success(`${name.replace('_', ' ')} updated successfully`);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.error("Error saving content:", error);
      toast.error("Failed to save content");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-5xl mx-auto pb-20">
      <h2 className="text-3xl font-bold mb-8 text-gray-800 border-b pb-4">Visual Content Management</h2>
      
      {/* Hero Carousel Accordion */}
      <div className="mb-4 border rounded-lg overflow-hidden shadow-sm">
        <button 
          onClick={() => setActiveAccordion(activeAccordion === 'hero' ? null : 'hero')}
          className={`w-full flex justify-between items-center p-4 transition-colors font-semibold text-lg ${activeAccordion === 'hero' ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
        >
          <span>Hero Carousel (Banner Images)</span>
          <span>{activeAccordion === 'hero' ? '−' : '+'}</span>
        </button>
        
        {activeAccordion === 'hero' && (
          <div className="p-6 bg-white space-y-6">
            {slides.map((slide, index) => (
              <div key={index} className="border p-4 rounded-md relative bg-gray-50 shadow-inner">
                <button
                  onClick={() => setSlides(slides.filter((_, i) => i !== index))}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition"
                >
                  X
                </button>
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex-1">
                    <p className="mb-2 font-medium text-gray-700">Slide Image {index + 1}</p>
                    <div className="flex items-center gap-4">
                      {slide.image ? (
                        <img src={slide.image} alt="" className="w-40 h-24 object-cover rounded border-2 border-white shadow-md" />
                      ) : (
                        <div className="w-40 h-24 bg-gray-200 flex items-center justify-center border rounded text-gray-400">No Image</div>
                      )}
                      <label className="cursor-pointer bg-white border border-gray-300 px-4 py-2 rounded hover:bg-gray-50 transition shadow-sm text-sm">
                        Change Image
                        <input type="file" className="hidden" onChange={(e) => handleFileUpload('hero', index, e.target.files[0])} />
                      </label>
                    </div>
                  </div>
                  <div className="flex-1">
                    <p className="mb-2 font-medium text-gray-700">Redirect Link</p>
                    <input
                      type="text"
                      placeholder="/products/category"
                      value={slide.link}
                      onChange={(e) => {
                        const newSlides = [...slides];
                        newSlides[index].link = e.target.value;
                        setSlides(newSlides);
                      }}
                      className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                    />
                  </div>
                </div>
              </div>
            ))}
            <div className="flex gap-4">
              <button onClick={() => setSlides([...slides, { image: '', link: '' }])} className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition text-sm">Add Slide</button>
              <button onClick={() => saveContent('hero_carousel', slides)} className="bg-black text-white px-8 py-2 rounded hover:bg-gray-800 transition font-bold text-sm">Save Hero Carousel</button>
            </div>
          </div>
        )}
      </div>

      {/* Spotlight Accordion */}
      <div className="mb-4 border rounded-lg overflow-hidden shadow-sm">
        <button 
          onClick={() => setActiveAccordion(activeAccordion === 'spotlight' ? null : 'spotlight')}
          className={`w-full flex justify-between items-center p-4 transition-colors font-semibold text-lg ${activeAccordion === 'spotlight' ? 'bg-pink-50 text-pink-700' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
        >
          <span>Spotlight Categories</span>
          <span>{activeAccordion === 'spotlight' ? '−' : '+'}</span>
        </button>
        
        {activeAccordion === 'spotlight' && (
          <div className="p-6 bg-white space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {spotlight.map((item, index) => (
                <div key={index} className="border p-4 rounded-md relative bg-gray-50 shadow-inner">
                  <button
                    onClick={() => setSpotlight(spotlight.filter((_, i) => i !== index))}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600 transition"
                  >
                    X
                  </button>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      {item.image ? (
                        <img src={item.image} alt="" className="w-20 h-20 rounded-full object-cover border-2 border-white shadow-md" />
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center border text-xs text-gray-400">No Image</div>
                      )}
                      <label className="cursor-pointer bg-white border border-gray-300 px-3 py-1 text-xs rounded hover:bg-gray-50 shadow-sm">
                        Upload Image
                        <input type="file" className="hidden" onChange={(e) => handleFileUpload('spotlight', index, e.target.files[0])} />
                      </label>
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-1 text-gray-700">Label</p>
                      <input
                        type="text"
                        placeholder="BABYDOLL"
                        value={item.label}
                        onChange={(e) => {
                          const newSpotlight = [...spotlight];
                          newSpotlight[index].label = e.target.value;
                          setSpotlight(newSpotlight);
                        }}
                        className="w-full px-3 py-2 border rounded text-sm outline-none"
                      />
                    </div>
                    <div>
                      <p className="text-sm font-medium mb-1 text-gray-700">Redirect Link</p>
                      <input
                        type="text"
                        placeholder="/products/babydoll"
                        value={item.link}
                        onChange={(e) => {
                          const newSpotlight = [...spotlight];
                          newSpotlight[index].link = e.target.value;
                          setSpotlight(newSpotlight);
                        }}
                        className="w-full px-3 py-2 border rounded text-sm outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-4 pt-4 border-t">
              <button onClick={() => setSpotlight([...spotlight, { image: '', label: '', link: '' }])} className="bg-pink-600 text-white px-6 py-2 rounded hover:bg-pink-700 transition text-sm">Add Category</button>
              <button onClick={() => saveContent('spotlight_categories', spotlight)} className="bg-black text-white px-8 py-2 rounded hover:bg-gray-800 transition font-bold text-sm">Save Spotlight</button>
            </div>
          </div>
        )}
      </div>

      {/* Black Banner Video Accordion */}
      <div className="mb-4 border rounded-lg overflow-hidden shadow-sm">
        <button 
          onClick={() => setActiveAccordion(activeAccordion === 'banner' ? null : 'banner')}
          className={`w-full flex justify-between items-center p-4 transition-colors font-semibold text-lg ${activeAccordion === 'banner' ? 'bg-purple-50 text-purple-700' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
        >
          <span>Black Banner (Background Video)</span>
          <span>{activeAccordion === 'banner' ? '−' : '+'}</span>
        </button>
        
        {activeAccordion === 'banner' && (
          <div className="p-6 bg-white space-y-6">
            <div className="border p-6 rounded-md bg-gray-50 shadow-inner">
              <div className="flex flex-col md:flex-row gap-8">
                <div className="flex-1">
                  <p className="mb-3 font-medium text-gray-700">Background Video</p>
                  <div className="space-y-4">
                    {blackBanner.video && (
                      <div className="w-full max-w-sm aspect-video bg-black rounded overflow-hidden shadow-lg border-2 border-white">
                        <video 
                          src={blackBanner.video} 
                          className="w-full h-full object-cover" 
                          controls
                          muted
                        />
                      </div>
                    )}
                    <label className="inline-block cursor-pointer bg-purple-600 text-white px-6 py-2 rounded hover:bg-purple-700 transition shadow-md text-sm font-medium">
                      {blackBanner.video ? "Replace Video" : "Upload Video File"}
                      <input 
                        type="file" 
                        accept="video/*" 
                        className="hidden" 
                        onChange={(e) => handleFileUpload('banner', null, e.target.files[0])} 
                      />
                    </label>
                    <p className="text-xs text-gray-500">Supports MP4, WebM, etc. High-quality background video.</p>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="mb-3 font-medium text-gray-700">Click Redirect Link (Optional)</p>
                  <input
                    type="text"
                    placeholder="e.g. /products/new-arrivals"
                    value={blackBanner.link || ''}
                    onChange={(e) => setBlackBanner({ ...blackBanner, link: e.target.value })}
                    className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-purple-500 outline-none text-sm"
                  />
                  <p className="mt-2 text-xs text-gray-500 italic">User will be redirected here when clicking the banner video.</p>
                </div>
              </div>
            </div>
            <div className="pt-4 border-t">
              <button 
                onClick={() => saveContent('black_banner', blackBanner)} 
                className="bg-black text-white px-10 py-3 rounded hover:bg-gray-800 transition font-bold text-sm tracking-wider"
              >
                SAVE BLACK BANNER
              </button>
            </div>
          </div>
        )}
      </div>

      {loading && <Loading />}
    </div>
  );
};

export default Images;