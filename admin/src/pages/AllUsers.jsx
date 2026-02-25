import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { backendUrl } from '../App'; 

const AllUsers = ({ token }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
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

    if (token) {
      fetchUsers();
    }
  }, [token]);

  if (loading) {
    return <p>Loading users...</p>;
  }

  if (error) {
    return <p>Error: {error}</p>;
  }

  return (
    <div className='p-4'>
      <h2 className='text-2xl font-bold mb-4'>All Users</h2>
      {users.length > 0 ? (
        <table className='min-w-full bg-white divide-y divide-gray-200'>
          <thead className='bg-gray-50'>
            <tr>
              <th className='py-2 px-4 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>Name</th>
              <th className='py-2 px-4 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>Email</th>
              <th className='py-2 px-4 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>Mobile</th>
              <th className='py-2 px-4 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>Luxe Member</th>
              <th className='py-2 px-4 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>Luxe Expires</th>
              <th className='py-2 px-4 border-b text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>Gift Wraps Left</th>
            </tr>
          </thead>
          <tbody className='bg-white divide-y divide-gray-200'>
            {users.map((user) => (
              <tr key={user._id}>
                <td className='py-2 px-4 border-b whitespace-nowrap text-sm font-medium text-gray-900'>{user.name}</td>
                <td className='py-2 px-4 border-b whitespace-nowrap text-sm text-gray-500'>{user.email}</td>
                <td className='py-2 px-4 border-b whitespace-nowrap text-sm text-gray-500'>{user.mobile || 'N/A'}</td>
                <td className='py-2 px-4 border-b whitespace-nowrap text-sm text-gray-500'>{user.isLuxeMember ? 'Yes' : 'No'}</td>
                <td className='py-2 px-4 border-b whitespace-nowrap text-sm text-gray-500'>
                  {user.luxeMembershipExpires ? new Date(user.luxeMembershipExpires).toLocaleDateString() : 'N/A'}
                </td>
                <td className='py-2 px-4 border-b whitespace-nowrap text-sm text-gray-500'>{user.giftWrapsLeft}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p>No users found.</p>
      )}
    </div>
  );
};

export default AllUsers;