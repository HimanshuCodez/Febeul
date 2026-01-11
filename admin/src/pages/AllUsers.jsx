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
      const response = await axios.post(`${backendUrl}/api/user/allusers`, {}, {
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
        <table className='min-w-full bg-white'>
          <thead>
            <tr>
              <th className='py-2 px-4 border-b'>Name</th>
              <th className='py-2 px-4 border-b'>Email</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user._id}>
                <td className='py-2 px-4 border-b text-center'>{user.name}</td>
                <td className='py-2 px-4 border-b text-center'>{user.email}</td>
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
