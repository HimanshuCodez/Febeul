import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { backendUrl } from '../App'; 
import { toast } from 'react-toastify';

const AllUsers = ({ token }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  
  // Modal State
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('staff');
  const [selectedPermissions, setSelectedPermissions] = useState([]);

  const permissionOptions = [
    { label: 'Dashboard', path: '/' },
    { label: 'All Users', path: '/allusers' },
    { label: 'Add Items', path: '/add' },
    { label: 'List Items', path: '/list' },
    { label: 'Orders', path: '/orders' },
    { label: 'Gift Wraps', path: '/gift-wraps' },
    { label: 'Policy Update', path: '/policy-update' },
    { label: 'Generate Coupon', path: '/coupons' },
    { label: 'Tickets', path: '/tickets' },
    { label: 'Reviews', path: '/reviews' },
  ];

  const togglePermission = (path) => {
    setSelectedPermissions(prev => 
      prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]
    );
  };

  const handleSavePermissions = async () => {
    try {
      const response = await axios.post(`${backendUrl}/api/user/update-permissions`, {
        email,
        role,
        permissions: selectedPermissions
      }, { headers: { token } });

      if (response.data.success) {
        toast.success(response.data.message);
        setShowModal(false);
        fetchUsers(); // Refresh list
      } else {
        toast.error(response.data.message);
      }
    } catch (err) {
      toast.error("Failed to update permissions");
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${backendUrl}/api/user/allusers`, {
        headers: {
          token
        }
      });
      if (response.data.success) {
        setUsers(response.data.users);
      } else {
        setError('Failed to fetch users');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchUsers();
    }
  }, [token]);

  if (loading) {
    return <p className="p-4">Loading users...</p>;
  }

  if (error) {
    return <p className="p-4 text-red-500">Error: {error}</p>;
  }

  return (
    <div className='p-4 relative'>
      <div className='flex justify-between items-center mb-6'>
        <h2 className='text-2xl font-bold'>All Users</h2>
        <button 
          onClick={() => setShowModal(true)}
          className='bg-black text-white px-4 py-2 rounded-md text-sm hover:bg-gray-800 transition-colors'
        >
          Add Staff Permissions
        </button>
      </div>

      {/* Permissions Modal */}
      {showModal && (
        <div className='fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4'>
          <div className='bg-white rounded-lg w-full max-w-md p-6 shadow-xl'>
            <h3 className='text-xl font-bold mb-4'>Manage Staff Permissions</h3>
            
            <div className='mb-4'>
              <label className='block text-sm font-medium text-gray-700 mb-1'>User Email</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter user email"
                className='w-full border border-gray-300 rounded-md px-3 py-2 outline-none focus:ring-2 focus:ring-black'
              />
            </div>

            <div className='mb-4'>
              <label className='block text-sm font-medium text-gray-700 mb-1'>Role</label>
              <select 
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className='w-full border border-gray-300 rounded-md px-3 py-2 outline-none'
              >
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
                <option value="user">User</option>
              </select>
            </div>

            <div className='mb-6'>
              <label className='block text-sm font-medium text-gray-700 mb-2'>Allowed Pages</label>
              <div className='grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border border-gray-100 rounded'>
                {permissionOptions.map((opt) => (
                  <label key={opt.path} className='flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-1 rounded transition-colors'>
                    <input 
                      type="checkbox"
                      checked={selectedPermissions.includes(opt.path)}
                      onChange={() => togglePermission(opt.path)}
                      className='w-4 h-4 accent-black'
                    />
                    <span className='text-sm text-gray-600'>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className='flex justify-end gap-3'>
              <button 
                onClick={() => setShowModal(false)}
                className='px-4 py-2 text-gray-600 hover:text-gray-800 font-medium'
              >
                Cancel
              </button>
              <button 
                onClick={handleSavePermissions}
                className='bg-black text-white px-6 py-2 rounded-md hover:bg-gray-800 transition-colors font-medium'
              >
                Save Permissions
              </button>
            </div>
          </div>
        </div>
      )}

      {users.length > 0 ? (
        <div className='overflow-x-auto border border-gray-200 rounded-lg'>
          <table className='min-w-full bg-white divide-y divide-gray-200'>
            <thead className='bg-gray-50'>
              <tr>
                <th className='py-3 px-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider'>Name</th>
                <th className='py-3 px-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider'>Email</th>
                <th className='py-3 px-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider'>Role</th>
                <th className='py-3 px-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider'>Luxe</th>
                <th className='py-3 px-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider'>Gift Wraps</th>
              </tr>
            </thead>
            <tbody className='bg-white divide-y divide-gray-200'>
              {users.map((user) => (
                <tr key={user._id} className='hover:bg-gray-50 transition-colors'>
                  <td className='py-3 px-4 whitespace-nowrap text-sm font-medium text-gray-900'>{user.name || 'N/A'}</td>
                  <td className='py-3 px-4 whitespace-nowrap text-sm text-gray-500'>{user.email}</td>
                  <td className='py-3 px-4 whitespace-nowrap text-sm'>
                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      user.role === 'admin' ? 'bg-red-100 text-red-700' : 
                      user.role === 'staff' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className='py-3 px-4 whitespace-nowrap text-sm text-gray-500'>{user.isLuxeMember ? 'Yes' : 'No'}</td>
                  <td className='py-3 px-4 whitespace-nowrap text-sm text-gray-500'>{user.giftWrapsLeft}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p>No users found.</p>
      )}
    </div>
  );
};

export default AllUsers;