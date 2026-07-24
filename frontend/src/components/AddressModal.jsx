import React from 'react';
import { X, PlusCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import useAuthStore from '../store/authStore';

const AddressModal = ({ isOpen, onClose, addresses, selectedAddress, onSelectAddress }) => {
  const navigate = useNavigate();
  const getStateServiceability = useAuthStore((state) => state.getStateServiceability);

  if (!isOpen) return null;

  const handleSelect = (address) => {
    const zoneInfo = getStateServiceability(address.state);
    if (zoneInfo && zoneInfo.active === false) {
      toast.error('This pincode is not currently serviceable.');
      return;
    }
    onSelectAddress(address);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Select a delivery address</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800">
            <X size={24} />
          </button>
        </div>
        
        <div className="space-y-4 max-h-80 overflow-y-auto">
          {addresses.map((address) => {
            const zoneInfo = getStateServiceability(address.state);
            const isServiceable = !(zoneInfo && zoneInfo.active === false);
            return (
              <div
                key={address._id}
                onClick={() => handleSelect(address)}
                className={`p-4 border rounded-lg transition-all ${!isServiceable ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'} ${
                  selectedAddress?._id === address._id
                    ? 'border-pink-500 bg-pink-50'
                    : 'border-gray-300 hover:border-pink-400'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold">{address.name}</p>
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] rounded-full uppercase font-bold border">
                      {address.addressType === 'Home' ? 'House/Apartment' : address.addressType}
                  </span>
                  {!isServiceable && (
                    <span className="px-2 py-0.5 bg-red-100 text-red-600 text-[10px] rounded-full uppercase font-bold border border-red-200">
                        Not serviceable
                    </span>
                  )}
                </div>
                <p>{address.address}, {address.locality}</p>
                {address.landmark && <p className="text-sm text-gray-500 italic">Landmark: {address.landmark}</p>}
                <p>{address.zip}, {address.city}</p>
                <p>{address.state}, {address.country}</p>
                <p>Phone: {address.phone}{address.alternatePhone ? `, ${address.alternatePhone}` : ''}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-6">
          <button 
            onClick={() => {
              onClose();
              navigate('/address');
            }}
            className="flex items-center justify-center gap-2 w-full py-2 px-4 border border-dashed rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
          >
            <PlusCircle size={20} />
            <span>Add a new address</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddressModal;
