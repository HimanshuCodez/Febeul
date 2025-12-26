import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, Truck, RotateCcw, ShieldCheck, Star } from 'lucide-react';
import Loader from '../components/Loader';

const backendUrl = import.meta.env.VITE_BACKEND_URL;

const ProductDetailPage = () => {
    const { productId } = useParams();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState(0);

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const { data } = await axios.post(`${backendUrl}/api/product/single`, { productId });
                if (data.success) {
                    setProduct(data.product);
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
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
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
                                    className={`w-20 h-24 rounded-lg border-2 overflow-hidden cursor-pointer ${selectedImage === idx ? 'border-pink-500' : 'border-transparent'}`}
                                    whileHover={{ scale: 1.05 }}
                                    transition={{ duration: 0.2 }}
                                >
                                    <img src={img} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                                </motion.div>
                            ))}
                        </div>
                        <div className="relative flex-1 bg-gray-100 rounded-xl overflow-hidden aspect-square max-h-[550px]">
                            <AnimatePresence>
                                <motion.img
                                    key={selectedImage}
                                    src={images[selectedImage]}
                                    alt="Product main view"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.3 }}
                                    className="absolute w-full h-full object-cover"
                                />
                            </AnimatePresence>
                        </div>
                    </motion.div>

                    {/* Product Details */}
                    <motion.div variants={itemVariants} className="flex flex-col space-y-5">
                        <div className="flex justify-between items-start">
                            <h1 className="text-3xl lg:text-4xl font-bold text-gray-800">{product.name}</h1>
                            <motion.button whileTap={{ scale: 0.9 }} className="p-2 rounded-full hover:bg-gray-100">
                                <Share2 size={22} className="text-gray-600" />
                            </motion.button>
                        </div>
                        
                        <div className="flex items-center gap-4">
                            <div className="flex items-center">
                                {[...Array(5)].map((_, i) => <Star key={i} size={20} className="text-yellow-400 fill-current" />)}
                            </div>
                            <span className="text-gray-600">(125 Reviews)</span>
                        </div>

                        <div className="flex items-baseline gap-3">
                            <span className="text-3xl font-extrabold text-gray-900">₹{product.price}</span>
                            <span className="text-lg text-gray-500 line-through">₹{product.mrp}</span>
                            <span className="text-lg font-semibold text-pink-500">{discount}% Off</span>
                        </div>
                        
                        <p className="text-gray-600 leading-relaxed">{product.description}</p>
                        
                        <div className="flex gap-4 pt-4">
                            <motion.button whileTap={{ scale: 0.95 }} className="flex-1 bg-pink-500 hover:bg-pink-600 text-white py-3.5 rounded-full font-bold text-lg transition-colors">
                                Buy Now
                            </motion.button>
                            <motion.button whileTap={{ scale: 0.95 }} className="flex-1 bg-white border-2 border-pink-500 text-pink-500 py-3.5 rounded-full font-bold text-lg hover:bg-pink-50 transition-colors">
                                Add to Cart
                            </motion.button>
                        </div>
                        
                        <div className="flex justify-around py-6 border-y border-gray-200 mt-6">
                            <div className="text-center flex flex-col items-center gap-2">
                                <Truck className="text-gray-700" size={28} />
                                <span className="text-xs font-medium text-gray-600">Free Delivery</span>
                            </div>
                            <div className="text-center flex flex-col items-center gap-2">
                                <RotateCcw className="text-gray-700" size={28} />
                                <span className="text-xs font-medium text-gray-600">3-Day Replacement</span>
                            </div>
                            <div className="text-center flex flex-col items-center gap-2">
                                <ShieldCheck className="text-gray-700" size={28} />
                                <span className="text-xs font-medium text-gray-600">1-Year Warranty</span>
                            </div>
                        </div>

                        {/* Details Accordion can be added here in the future */}
                        <div>
                             <h3 className="font-bold text-gray-800 text-lg mb-4">Product details</h3>
                             <div className="space-y-3">
                                <DetailRow label="Category" value={product.category} />
                                <DetailRow label="Color" value={product.color} />
                                <DetailRow label="Fabric" value={product.fabric} />
                                <DetailRow label="Country of Origin" value={product.countryOfOrigin} />
                             </div>
                        </div>

                    </motion.div>
                </div>
            </motion.div>
        </div>
    );
};

const DetailRow = ({ label, value }) => (
    <div className="grid grid-cols-2 gap-4 text-sm">
        <span className="text-gray-600">{label}</span>
        <span className="text-gray-800 font-medium">{value}</span>
    </div>
);

export default ProductDetailPage;