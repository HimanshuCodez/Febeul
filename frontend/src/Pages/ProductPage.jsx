import React, { useState } from 'react';
import { Share2, Truck, RotateCcw, ShieldCheck } from 'lucide-react';

export default function ProductPage() {
  const [selectedImage, setSelectedImage] = useState(0);
  const images = ['/api/placeholder/400/500', '/api/placeholder/400/500', '/api/placeholder/400/500', '/api/placeholder/400/500'];

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-sm">
        {/* Breadcrumb */}
        <div className="p-4 text-sm text-gray-600">
          Clothing & Accessories › Women › Sleep & Lounge Wear › Babydolls
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
                Women Babydoll Lace Kimono Robe Babydoll Lingerie Mesh Chemise Nightgown Cover Up Honeymoon Valentine Nightie
              </h1>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 line-through text-sm">₹999</span>
                <span className="text-red-500 font-semibold">50% Off</span>
              </div>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-2">
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
                <div className="text-xs text-blue-500">7 days Replacement</div>
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
              <ul className="space-y-3 text-gray-700">
                <li className="flex gap-2">
                  <span className="text-gray-400">•</span>
                  <span><strong>Style:</strong> garter lingerie for women, womens teddy lingerie, lace chemise, lace mesh lingerie, lingerie for women, babydoll lingerie,chemise lingerie for women, lingerie for women, negligee lingerie, full slip dress</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-gray-400">•</span>
                  <span><strong>Unique Design:</strong> The women lingerie featuring sheer lace cups, soft mesh skirt with garter belt. makes you look more lovely and charming at night, seductive to draw your lover's attention.</span>
                </li>
                <li className="flex gap-2">
                  <span className="text-gray-400">•</span>
                  <span><strong>Occasion:</strong> Lace sleepwear, perfect for photoshoots or special nights, such as Valentine's Day, wedding night, honeymoon gift, bridal shower, lingerie party and every special moments， it will make you more elegant and charming.</span>
                </li>
              </ul>
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
                <span className="text-gray-600">Material composition</span>
                <span className="text-gray-800">80% Net, 20% Lace</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <span className="text-gray-600">Length</span>
                <span className="text-gray-800">Above The Knee</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <span className="text-gray-600">Material type</span>
                <span className="text-gray-800">Lace, Net</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <span className="text-gray-600">Closure type</span>
                <span className="text-gray-800">Pull On</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <span className="text-gray-600">Sleeve type</span>
                <span className="text-gray-800">Sleeveless</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <span className="text-gray-600">Number of items</span>
                <span className="text-gray-800">1</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <span className="text-gray-600">Country of Origin</span>
                <span className="text-gray-800">India</span>
              </div>
            </div>
          </div>

          {/* Additional Information */}
          <div>
            <h3 className="font-bold text-gray-800 text-lg mb-4">Additional Information</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <span className="text-gray-600">Manufacturer</span>
                <span className="text-gray-800">ALPHA ONE TOUCH</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <span className="text-gray-600">Packer</span>
                <span className="text-gray-800">ALPHA ONE TOUCH</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <span className="text-gray-600">Item Weight</span>
                <span className="text-gray-800">150 g</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <span className="text-gray-600">Item Dimensions LxWxH</span>
                <span className="text-gray-800">22 x 20 x 10 Centimeters</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <span className="text-gray-600">Net Quantity</span>
                <span className="text-gray-800">1.0 Count</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <span className="text-gray-600">Included Components</span>
                <span className="text-gray-800">Panty</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <span className="text-gray-600">Generic Name</span>
                <span className="text-gray-800">Nightwear</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}