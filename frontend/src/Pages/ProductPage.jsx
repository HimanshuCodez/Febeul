import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { Share2, Truck, RotateCcw, ShieldCheck } from 'lucide-react';
import Loader from '../components/Loader';

const backendUrl = import.meta.env.VITE_BACKEND_URL;

export default function ProductPage() {
    const { productId } = useParams();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState(0);

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const response = await axios.post(`${backendUrl}/api/product/single`, { productId });
                if (response.data.success) {
                    setProduct(response.data.product);
                } else {
                    console.error(response.data.message);
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        fetchProduct();
    }, [productId]);

    if (loading) {
        return <Loader />;
    }

    if (!product) {
        return <div className="text-center mt-10">Product not found</div>;
    }

    const images = product.image || [];

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-sm">
        {/* Breadcrumb */}
        <div className="p-4 text-sm text-gray-600">
          {product.category} › {product.subCategory}
        </div>

        <div className="grid md:grid-cols-2 gap-8 p-6">
          {/* Left Side - Images */}
          <div className="flex gap-4">
            {/* Thumbnail Column */}
            <div className="flex flex-col gap-2">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImage(idx)}
                  className={`w-16 h-20 border-2 rounded overflow-hidden ${
                    selectedImage === idx ? 'border-blue-500' : 'border-gray-200'
                  }`}
                >
                  <img src={img} alt={`Thumbnail ${idx + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>

            {/* Main Image */}
            <div className="flex-1 bg-gray-100 rounded-lg overflow-hidden">
              <img 
                src={images[selectedImage]} 
                alt="Product main view" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Right Side - Product Details */}
          <div className="space-y-6">
            {/* Share Button */}
            <button className="flex items-center gap-2 text-gray-600 hover:text-gray-800 ml-auto">
              <Share2 size={20} />
            </button>

            {/* Product Title */}
            <div>
              <h1 className="text-2xl font-semibold text-gray-800 mb-2">
                {product.name}
              </h1>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 line-through text-sm">₹{product.mrp}</span>
                <span className="text-red-500 font-semibold">{Math.round(((product.mrp - product.price) / product.mrp) * 100)}% Off</span>
              </div>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold">₹{product.price}</span>
              <span className="text-sm text-gray-600">Inclusive of all taxes</span>
            </div>

            {/* Coupons & Promotions */}
            <div className="border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-3">Coupons & Promotions</h3>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div className="border border-gray-200 rounded p-2">
                  <div className="font-semibold text-gray-800">Cashback</div>
                  <div className="text-xs text-gray-600">Upto ₹74.00</div>
                  <div className="text-xs text-gray-500">Pay Master,Amazon Pay Master</div>
                  <div className="text-blue-500 text-xs mt-1">1 offer</div>
                </div>
                <div className="border border-gray-200 rounded p-2">
                  <div className="font-semibold text-gray-800">Bank Offer</div>
                  <div className="text-xs text-gray-600">Upto ₹1,000.00</div>
                  <div className="text-xs text-gray-500">off on select Credit Cards</div>
                  <div className="text-blue-500 text-xs mt-1">15 offers</div>
                </div>
                <div className="border border-gray-200 rounded p-2">
                  <div className="font-semibold text-gray-800">Partner Offers</div>
                  <div className="text-xs text-gray-600">Get GST Invoice</div>
                  <div className="text-xs text-gray-500">and save up to 28% on business...</div>
                  <div className="text-blue-500 text-xs mt-1">1 offer</div>
                </div>
              </div>
            </div>

            {/* Service Icons */}
            <div className="flex justify-around py-4 border-y border-gray-200">
              <div className="text-center">
                <Truck className="mx-auto mb-2 text-gray-600" size={32} />
                <div className="text-xs text-blue-500">Free delivery</div>
              </div>
              <div className="text-center">
                <RotateCcw className="mx-auto mb-2 text-gray-600" size={32} />
                <div className="text-xs text-blue-500">3 days Replacement</div>
              </div>
              <div className="text-center">
                <ShieldCheck className="mx-auto mb-2 text-gray-600" size={32} />
                <div className="text-xs text-blue-500">Warranty Policy</div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button className="flex-1 bg-pink-400 hover:bg-pink-500 text-white py-3 rounded-full font-semibold transition-colors">
                BUY NOW
              </button>
              <button className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 rounded-full font-semibold transition-colors">
                ADD TO CART
              </button>
            </div>

            {/* About this item */}
            <div className="space-y-4">
              <h3 className="font-bold text-gray-800 text-lg">About this item</h3>
              <p>{product.description}</p>
            </div>
          </div>
        </div>

        {/* Product Details & Additional Information */}
        <div className="grid md:grid-cols-2 gap-8 p-6 border-t border-gray-200">
          {/* Product Details */}
          <div>
            <h3 className="font-bold text-gray-800 text-lg mb-4">Product details</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <span className="text-gray-600">MRP</span>
                <span className="text-gray-800">₹{product.mrp}</span>
              </div>
               <div className="grid grid-cols-2 gap-4">
                <span className="text-gray-600">Category</span>
                <span className="text-gray-800">{product.category}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <span className="text-gray-600">Sub Category</span>
                <span className="text-gray-800">{product.subCategory}</span>
              </div>
               <div className="grid grid-cols-2 gap-4">
                <span className="text-gray-600">Color</span>
                <span className="text-gray-800">{product.color}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <span className="text-gray-600">Length</span>
                <span className="text-gray-800">{product.length}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <span className="text-gray-600">Breadth</span>
                <span className="text-gray-800">{product.breadth}</span>
              </div>
               <div className="grid grid-cols-2 gap-4">
                <span className="text-gray-600">Fabric</span>
                <span className="text-gray-800">{product.fabric}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <span className="text-gray-600">Pattern</span>
                <span className="text-gray-800">{product.pattern}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <span className="text-gray-600">Sleeve Style</span>
                <span className="text-gray-800">{product.sleeveStyle}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <span className="text-gray-600">Sleeve Length</span>
                <span className="text-gray-800">{product.sleeveLength}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <span className="text-gray-600">Neck</span>
                <span className="text-gray-800">{product.neck}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <span className="text-gray-600">Country of Origin</span>
                <span className="text-gray-800">{product.countryOfOrigin}</span>
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div>
            <h3 className="font-bold text-gray-800 text-lg mb-4">Additional Information</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <span className="text-gray-600">Manufacturer</span>
                <span className="text-gray-800">{product.manufacturer}</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <span className="text-gray-600">Style Code</span>
                <span className="text-gray-800">{product.styleCode}</span>
              </div>
               <div className="grid grid-cols-2 gap-4">
                <span className="text-gray-600">HSN</span>
                <span className="text-gray-800">{product.hsn}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}