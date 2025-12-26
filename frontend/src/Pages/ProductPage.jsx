import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
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

    if (loading) return <Loader />;
    if (!product) return <div className="flex items-center justify-center h-screen text-xl text-gray-700">Product not found.</div>;

    const images = product.image || [];
    const discount = Math.round(((product.mrp - product.price) / product.mrp) * 100);

    return (
        <div className="min-h-screen bg-white">
            <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
                {/* Breadcrumb */}
                <div className="text-sm text-gray-500 mb-6">
                    Home / {product.category} / <span className="font-medium text-gray-800">{product.name}</span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Image Gallery - Left Side */}
                    <div className="lg:col-span-5">
                        <div className="flex flex-col-reverse sm:flex-row gap-3">
                            {/* Thumbnails */}
                            <div className="flex sm:flex-col gap-2">
                                {images.map((img, idx) => (
                                    <div
                                        key={idx}
                                        onClick={() => setSelectedImage(idx)}
                                        className={`w-12 h-16 rounded border cursor-pointer overflow-hidden ${
                                            selectedImage === idx ? 'border-orange-500 border-2' : 'border-gray-300'
                                        }`}
                                    >
                                        <img src={img} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                                    </div>
                                ))}
                            </div>
                            
                            {/* Main Image */}
                            <div className="flex-1 bg-white border border-gray-200 rounded overflow-hidden">
                                <img
                                    src={images[selectedImage]}
                                    alt="Product main view"
                                    className="w-full h-full object-contain p-4"
                                    style={{ maxHeight: '500px' }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Product Details - Right Side */}
                    <div className="lg:col-span-7">
                        <div className="space-y-4">
                            {/* Title */}
                            <div className="flex justify-between items-start">
                                <h1 className="text-xl font-normal text-gray-900 leading-relaxed pr-4">
                                    {product.name}
                                </h1>
                                <button className="text-gray-600 hover:text-gray-800">
                                    <Share2 size={18} />
                                </button>
                            </div>
                            
                            {/* Rating */}
                            <div className="flex items-center gap-2">
                                <div className="flex items-center">
                                    {[...Array(5)].map((_, i) => (
                                        <Star key={i} size={14} className="text-orange-400 fill-current" />
                                    ))}
                                </div>
                                <span className="text-sm text-blue-600 hover:text-orange-600 cursor-pointer">125 ratings</span>
                            </div>

                            {/* Price */}
                            <div className="border-t border-b border-gray-200 py-3">
                                <div className="flex items-baseline gap-3">
                                    <span className="text-sm text-gray-700">-{discount}%</span>
                                    <span className="text-3xl font-normal text-gray-900">₹{product.price}</span>
                                </div>
                                <div className="text-sm text-gray-600 mt-1">
                                    M.R.P.: <span className="line-through">₹{product.mrp}</span>
                                </div>
                                <div className="text-xs text-gray-600 mt-1">Inclusive of all taxes</div>
                            </div>

                            {/* Offers Section */}
                            <div className="bg-gray-50 border border-gray-200 rounded p-4">
                                <div className="grid grid-cols-3 gap-4">
                                    <OfferCard title="Cash Back" desc="Upon ₹1,000 purchase, discount available on HDFC Bank Cards" />
                                    <OfferCard title="Bank Offer" desc="Upon ₹2,000 purchase, discount available on AXIS Bank Cards" />
                                    <OfferCard title="Partner Offers" desc="Get GST invoice and save up to 28% on business purchases" />
                                </div>
                            </div>

                            {/* Product Features Icons */}
                            <div className="flex gap-8 py-4">
                                <FeatureIcon icon={<Truck size={20} />} label="Free Delivery" />
                                <FeatureIcon icon={<RotateCcw size={20} />} label="Easy Returns" />
                                <FeatureIcon icon={<ShieldCheck size={20} />} label="Secure Transaction" />
                            </div>

                            {/* Color/Size Options */}
                            <div>
                                <div className="text-sm font-semibold text-gray-900 mb-2">Colour: {product.color}</div>
                                <div className="flex gap-2">
                                    {images.slice(0, 3).map((img, idx) => (
                                        <div 
                                            key={idx}
                                            className={`w-16 h-20 border-2 rounded cursor-pointer overflow-hidden ${
                                                idx === 0 ? 'border-orange-500' : 'border-gray-300'
                                            }`}
                                        >
                                            <img src={img} alt={`Color option ${idx + 1}`} className="w-full h-full object-cover" />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="space-y-3 pt-4">
                                <button className="w-full bg-yellow-400 hover:bg-yellow-500 text-gray-900 py-2 rounded-full font-normal text-sm transition-colors">
                                    Add to Cart
                                </button>
                                <button className="w-full bg-orange-400 hover:bg-orange-500 text-gray-900 py-2 rounded-full font-normal text-sm transition-colors">
                                    Buy Now
                                </button>
                            </div>

                            {/* Product Details Table */}
                            <div className="border-t border-gray-200 pt-6 mt-6">
                                <h2 className="text-base font-bold text-gray-900 mb-3">Product details</h2>
                                <div className="space-y-2 text-sm">
                                    <DetailRow label="Style Code" value={product.styleCode} />
                                    <DetailRow label="Category" value={product.category} />
                                    <DetailRow label="Sub Category" value={product.subCategory} />
                                    <DetailRow label="Colour" value={product.color} />
                                    <DetailRow label="Material Type" value={product.materialType} />
                                    <DetailRow label="Care Instructions" value={product.careInstructions} />
                                    <DetailRow label="Closure Type" value={product.closureType} />
                                    <DetailRow label="Country of Origin" value={product.countryOfOrigin} />
                                </div>
                            </div>

                            {/* About this item */}
                            <div className="border-t border-gray-200 pt-6">
                                <h2 className="text-base font-bold text-gray-900 mb-3">About this item</h2>
                                <div className="text-sm text-gray-700 leading-relaxed space-y-2">
                                    <div className="product-description" dangerouslySetInnerHTML={{ __html: product.description }}></div>
                                </div>
                            </div>

                            {/* Additional Information */}
                            <div className="border-t border-gray-200 pt-6">
                                <h2 className="text-base font-bold text-gray-900 mb-3">Additional information</h2>
                                <div className="space-y-2 text-sm">
                                    <DetailRow label="Manufacturer" value={product.manufacturer} />
                                    <DetailRow label="Packer" value={product.packer} />
                                    <DetailRow label="Included Components" value={product.includedComponents} />
                                    <DetailRow label="Fabric" value={product.fabric} />
                                    <DetailRow label="Pattern" value={product.pattern} />
                                    <DetailRow label="Sleeve Style" value={product.sleeveStyle} />
                                    <DetailRow label="Sleeve Length" value={product.sleeveLength} />
                                    <DetailRow label="Neck" value={product.neck} />
                                    <DetailRow label="HSN" value={product.hsn} />
                                    <DetailRow label="Material Composition" value={product.materialComposition} />
                                    <DetailRow label="Item Weight" value={product.itemWeight} />
                                    <DetailRow label="Item Dimensions LxWxH" value={product.itemDimensionsLxWxH} />
                                    <DetailRow label="Net Quantity" value={product.netQuantity} />
                                    <DetailRow label="ASIN" value="B01MYCGHG1" />
                                    <DetailRow label="Item model number" value="LR-46325" />
                                    <DetailRow label="Generic Name" value={product.genericName} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const OfferCard = ({ title, desc }) => (
    <div className="text-center">
        <div className="text-xs font-semibold text-gray-900 mb-1">{title}</div>
        <div className="text-xs text-gray-600">{desc}</div>
    </div>
);

const FeatureIcon = ({ icon, label }) => (
    <div className="flex flex-col items-center gap-1">
        <div className="text-gray-600">{icon}</div>
        <span className="text-xs text-gray-700">{label}</span>
    </div>
);

const DetailRow = ({ label, value, bold }) => (
    <div className="grid grid-cols-3 gap-4">
        <span className="text-gray-700 col-span-1">{label}</span>
        <span className={`text-gray-900 col-span-2 ${bold ? 'font-semibold' : ''}`}>{value}</span>
    </div>
);

export default ProductDetailPage;