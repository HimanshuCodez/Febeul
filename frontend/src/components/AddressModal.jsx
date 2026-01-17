import React from 'react';
import { X, PlusCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const AddressModal = ({ isOpen, onClose, addresses, selectedAddress, onSelectAddress }) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

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
          {addresses.map((address) => (
            <div
              key={address._id}
              onClick={() => onSelectAddress(address)}
              className={`p-4 border rounded-lg cursor-pointer transition-all ${
                selectedAddress?._id === address._id
                  ? 'border-orange-500 bg-orange-50'
                  : 'border-gray-300 hover:border-orange-400'
              }`}
            >
              <p className="font-semibold">{address.name}</p>
              <p>{address.street}, {address.city}</p>
              <p>{address.state}, {address.country} - {address.zip}</p>
              <p>Phone: {address.phone}</p>
            </div>
          ))}
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
