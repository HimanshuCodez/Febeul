import React from 'react';
import { Tag, Banknote, ShieldCheck, Award } from 'lucide-react';

const offers = [
 
  {
    icon: <ShieldCheck size={24} className="text-green-600" />,
    title: 'Luxe Offers',
    description: 'Get 30% off on orders above ₹1000',
  },
  {
    icon: <Award size={24} className="text-green-600" />,
    title: 'Special Offer',
    description: 'Get a free gift on purchases above ₹5000',
  }
];

const OfferShows = () => {
  return (
    <div className="my-4">
      <h2 className="text-lg font-bold text-gray-800 mb-3">Offers</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {offers.map((offer, index) => (
          <div key={index} className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg bg-gray-50 hover:shadow-md transition-shadow">
            <div className="flex-shrink-0">
              {offer.icon}
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">{offer.title}</h3>
              <p className="text-sm text-gray-600">{offer.description}</p>
              
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default OfferShows;
