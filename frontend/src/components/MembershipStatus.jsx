import React from 'react';
import { Link } from 'react-router-dom';
import { Crown, Calendar } from 'lucide-react';

const MembershipStatus = ({ user }) => {
  if (user && user.isLuxeMember) {
    const expiryDate = new Date(user.luxeMembershipExpires).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    return (
      <div className="bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-lg shadow-lg p-6 mb-6">
        <div className="flex items-center space-x-4">
          <Crown className="w-10 h-10" />
          <div>
            <h3 className="text-xl font-bold">Febeul Luxe Member</h3>
            <p className="text-sm opacity-90 flex items-center mt-1">
              <Calendar size={14} className="mr-2" />
              Membership valid until: <strong>{expiryDate}</strong>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-[#f9aeaf] to-[#fcd9d9] rounded-lg shadow-lg p-8 mb-6 text-center">
      <h3 className="text-2xl font-bold text-gray-800 mb-2">Unlock Exclusive Benefits!</h3>
      <p className="text-gray-700 mb-6">Join Febeul Luxe to enjoy priority delivery, special discounts, and more.</p>
      <Link
        to="/luxe"
        className="inline-block bg-white text-pink-500 font-bold py-3 px-8 rounded-full shadow-md hover:bg-gray-100 hover:scale-105 transition-transform"
      >
        Join Febeul Luxe
      </Link>
    </div>
  );
};

export default MembershipStatus;
