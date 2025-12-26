import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, Truck, RotateCcw, ShieldCheck, Star, ChevronDown, ChevronUp } from 'lucide-react';
import Loader from '../components/Loader';

const backendUrl = import.meta.env.VITE_BACKEND_URL;

const ProductDetailPage = () => {
    const { productId } = useParams();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState(0);
    const [expandedSection, setExpandedSection] = useState('about');

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const { data } = await axios.post(`${backendUrl}/api/product/single`, { productId });
                if (data.success) {
                    setProduct(data.product);
                    console.log("Product description:", data.product.description);
                } else {
                    console.error(data.message);
                }
            } catch (error) {
                console.error("Failed to fetch product:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchProduct();
    }, [productId]);

    const toggleSection = (section) => {
        setExpandedSection(expandedSection === section ? null : section);
    };

    if (loading) return <Loader />;
    if (!product) return <div className="flex items-center justify-center h-screen text-xl text-gray-700">Product not found.</div>;

    const images = product.image || [];
    const discount = Math.round(((product.mrp - product.price) / product.mrp) * 100);

    const mainVariants = {
        hidden: { opacity: 0 },
        visible: { 
            opacity: 1,
            transition: { staggerChildren: 0.1 }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

    return (
        <div className="min-h-screen bg-white">
            <motion.div 
                className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8"
                variants={mainVariants}
                initial="hidden"
                animate="visible"
            >
                {/* Breadcrumb */}
                <motion.div variants={itemVariants} className="text-sm text-gray-500 mb-4">
                    Home / {product.category} / <span className="font-medium text-gray-800">{product.name}</span>
                </motion.div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                    {/* Image Gallery */}
                    <motion.div variants={itemVariants} className="flex flex-col-reverse sm:flex-row gap-4">
                        <div className="flex sm:flex-col gap-3 justify-center">
                            {images.map((img, idx) => (
                                <motion.div
                                    key={idx}
                                    onClick={() => setSelectedImage(idx)}
                                    className={`w-16 h-20 rounded-lg border-2 overflow-hidden cursor-pointer ${selectedImage === idx ? 'border-pink-500' : 'border-gray-200'}`}
                                    whileHover={{ scale: 1.05 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <img src={img} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                                </motion.div>
                            ))}
                        </div>
                        <div className="relative flex-1 bg-gray-50 rounded-lg overflow-hidden aspect-square max-h-[550px]">
                            <AnimatePresence mode="wait">
                                <motion.img
                                    key={selectedImage}
                                    src={images[selectedImage]}
                                    alt="Product main view"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="absolute w-full h-full object-contain p-4"
                                />
                            </AnimatePresence>
                        </div>
                    </motion.div>

                    {/* Product Details */}
                    <motion.div variants={itemVariants} className="flex flex-col">
                        <div className="flex justify-between items-start mb-3">
                            <h1 className="text-2xl lg:text-3xl font-semibold text-gray-900 leading-tight pr-4">{product.name}</h1>
                            <motion.button whileTap={{ scale: 0.9 }} className="p-2 rounded-full hover:bg-gray-100">
                                <Share2 size={20} className="text-gray-600" />
                            </motion.button>
                        </div>
                        
                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex items-center">
                                {[...Array(5)].map((_, i) => <Star key={i} size={16} className="text-yellow-400 fill-current" />)}
                            </div>
                            <span className="text-sm text-gray-600">(125 Reviews)</span>
                        </div>

                        <div className="flex items-baseline gap-3 mb-4">
                            <span className="text-3xl font-bold text-pink-500">₹{product.price}</span>
                            <span className="text-lg text-gray-500 line-through">₹{product.mrp}</span>
                            <span className="text-base font-medium text-pink-500">{discount}% off</span>
                        </div>
                        
                        {/* Coupons & Promotions */}
                        <div className="bg-pink-50 border border-pink-200 rounded-lg p-4 mb-4">
                            <h3 className="font-semibold text-gray-900 mb-2 text-sm">Coupons & Promotions</h3>
                            <div className="space-y-2 text-xs text-gray-700">
                                <p>💰 Save 10% on your first purchase - code: FIRST10</p>
                                <p>🎁 Buy 2 Get 1 Free on select items</p>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 mb-6">
                            <motion.button 
                                whileTap={{ scale: 0.95 }} 
                                className="flex-1 bg-pink-500 hover:bg-pink-600 text-white py-3 rounded-full font-semibold text-base transition-colors shadow-sm"
                            >
                                BUY NOW
                            </motion.button>
                            <motion.button 
                                whileTap={{ scale: 0.95 }} 
                                className="flex-1 bg-white border-2 border-pink-500 text-pink-500 py-3 rounded-full font-semibold text-base hover:bg-pink-50 transition-colors"
                            >
                                ADD TO CART
                            </motion.button>
                        </div>
                        
                        {/* Features */}
                        <div className="grid grid-cols-4 gap-4 py-6 border-y border-gray-200 mb-6">
                            <div className="text-center flex flex-col items-center gap-1">
                                <Truck className="text-gray-700" size={24} />
                                <span className="text-xs text-gray-600">Free Delivery</span>
                            </div>
                            <div className="text-center flex flex-col items-center gap-1">
                                <RotateCcw className="text-gray-700" size={24} />
                                <span className="text-xs text-gray-600">3-Day Return</span>
                            </div>
                            <div className="text-center flex flex-col items-center gap-1">
                                <ShieldCheck className="text-gray-700" size={24} />
                                <span className="text-xs text-gray-600">1-Year Warranty</span>
                            </div>
                            <div className="text-center flex flex-col items-center gap-1">
                                <Star className="text-gray-700" size={24} />
                                <span className="text-xs text-gray-600">Top Rated</span>
                            </div>
                        </div>

                        {/* Expandable Sections */}
                        <div className="space-y-3">
                            {/* About this item */}
                            <div className="border border-gray-200 rounded-lg overflow-hidden">
                                <button
                                    onClick={() => toggleSection('about')}
                                    className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors"
                                >
                                    <span className="font-semibold text-gray-900">About this item</span>
                                    {expandedSection === 'about' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                </button>
                                <AnimatePresence>
                                    {expandedSection === 'about' && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.3 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="p-4 pt-0 text-sm text-gray-700 space-y-2">
                                                <div className="product-description" dangerouslySetInnerHTML={{ __html: product.description }}></div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Product Details */}
                            <div className="border border-gray-200 rounded-lg overflow-hidden">
                                <button
                                    onClick={() => toggleSection('details')}
                                    className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors"
                                >
                                    <span className="font-semibold text-gray-900">Product details</span>
                                    {expandedSection === 'details' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                </button>
                                <AnimatePresence>
                                    {expandedSection === 'details' && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.3 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="p-4 pt-0">
                                                <div className="grid grid-cols-2 gap-3 text-sm">
                                                    <DetailRow label="Category" value={product.category} />
                                                    <DetailRow label="Color" value={product.color} />
                                                    <DetailRow label="Fabric" value={product.fabric} />
                                                    <DetailRow label="Country of Origin" value={product.countryOfOrigin} />
                                                    <DetailRow label="Material type" value={product.materialType || "Lace"} />
                                                    <DetailRow label="Occasion type" value={product.occasionType || "Party"} />
                                                    <DetailRow label="Closure type" value={product.closureType || "Sleeveless"} />
                                                    <DetailRow label="Sleeve type" value={product.sleeveType || "Sleeveless"} />
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Additional Information */}
                            <div className="border border-gray-200 rounded-lg overflow-hidden">
                                <button
                                    onClick={() => toggleSection('additional')}
                                    className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors"
                                >
                                    <span className="font-semibold text-gray-900">Additional information</span>
                                    {expandedSection === 'additional' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                </button>
                                <AnimatePresence>
                                    {expandedSection === 'additional' && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.3 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="p-4 pt-0">
                                                <div className="grid grid-cols-2 gap-3 text-sm">
                                                    <DetailRow label="Manufacturer" value={product.manufacturer || "ASHNA LTD"} />
                                                    <DetailRow label="Item Weight" value={product.weight || "100 g"} />
                                                    <DetailRow label="Net Quantity" value={product.netQuantity || "1.0 count"} />
                                                    <DetailRow label="Generic Name" value={product.genericName || "Nightwear"} />
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* Similar Products Section */}
                        <div className="mt-8">
                            <h3 className="font-semibold text-gray-900 mb-4">Similar Products</h3>
                            <div className="flex gap-3 overflow-x-auto pb-2">
                                {[1, 2, 3, 4].map((item) => (
                                    <div key={item} className="min-w-[100px] flex-shrink-0">
                                        <div className="w-24 h-32 bg-gray-100 rounded-lg mb-2"></div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                </div>
            </motion.div>
        </div>
    );
};

const DetailRow = ({ label, value }) => (
    <>
        <div className="text-gray-600">{label}</div>
        <div className="text-gray-900 font-medium">{value}</div>
    </>
);

export default ProductDetailPage;