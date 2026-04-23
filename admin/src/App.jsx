import React, { useEffect, useState } from 'react'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'
import { Routes, Route } from 'react-router-dom'
import Add from './pages/Add'
import List from './pages/List'
import Orders from './pages/Orders'
import Update from './pages/Update' // Import the Update component
import AllUsers from './pages/AllUsers'
import ManageGiftWraps from './pages/ManageGiftWraps'
import PolicyUpdate from './pages/PolicyUpdate' // Import the PolicyUpdate component
import Coupons from './pages/Coupons' // Import the Coupons component
import Tickets from './pages/Tickets' // Import the Tickets component
import ReviewsAdmin from './pages/ReviewsAdmin' // Import the ReviewsAdmin component
import Images from './pages/Images/Images' // Import the Images component
import Cms from './pages/Texts/Cms' // Import the Cms component
import FebeulDashboard from './pages/Dashboard' // Import the Dashboard component
import NewUserMail from './pages/NewUserMail' // Import the NewUserMail component
import MaintenanceMode from './pages/Settings/MaintenanceMode'
import Configurations from './pages/Settings/Configurations'
import Login from './components/Login'
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export const backendUrl = import.meta.env.VITE_BACKEND_URL
export const currency = '₹'

const App = () => {

  const [token, setToken] = useState(localStorage.getItem('token')?localStorage.getItem('token'):'');
  const [role, setRole] = useState(localStorage.getItem('role')?localStorage.getItem('role'):'');
  const [userEmail, setUserEmail] = useState(localStorage.getItem('userEmail')?localStorage.getItem('userEmail'):'');
  const [permissions, setPermissions] = useState(JSON.parse(localStorage.getItem('permissions') || '[]'));

  const isAllowed = (path) => {
    if (role === 'admin') return true;
    // For staff, if no permissions are set, they might have none or all depending on system design.
    // Based on Sidebar.jsx, permissions.length === 0 means default behavior (allowed if no specific permissions set)
    // but usually for staff we want explicit permissions.
    // Given the current implementation in Sidebar.jsx, let's stick to it but pass permissions state.
    if (permissions.length === 0) return true; 
    return permissions.includes(path);
  };

  useEffect(()=>{
    localStorage.setItem('token',token)
    localStorage.setItem('role',role)
    localStorage.setItem('userEmail',userEmail)
    localStorage.setItem('permissions', JSON.stringify(permissions))
  },[token, role, userEmail, permissions])

  return (
    <div className='bg-gray-50 min-h-screen'>
      <ToastContainer />
      {token === ""
        ? <Login setToken={setToken} setRole={setRole} setUserEmail={setUserEmail} setPermissions={setPermissions} />
        : <>
          <Navbar setToken={setToken} setRole={setRole} setUserEmail={setUserEmail} role={role} email={userEmail} setPermissions={setPermissions} />
          <hr />
          <div className='flex w-full'>
            <Sidebar role={role} permissions={permissions} />
            <div className='w-[70%] mx-auto ml-[max(5vw,25px)] my-8 text-gray-600 text-base'>
              <Routes>
                {/* Dashboard / Root */}
                {isAllowed('/') ? (
                   <Route path='/' element={<FebeulDashboard token={token} />} />
                ) : (
                   <Route path='/' element={<List token={token} />} />
                )}

                {/* Other Routes protected by isAllowed */}
                {isAllowed('/add') && <Route path='/add' element={<Add token={token} />} />}
                {isAllowed('/list') && <Route path='/list' element={<List token={token} />} />}
                {isAllowed('/orders') && <Route path='/orders' element={<Orders token={token} />} />}
                {isAllowed('/update') && <Route path='/update/:productId' element={<Update token={token} />} />}
                {isAllowed('/allusers') && <Route path='/allusers' element={<AllUsers token={token} />} />}
                {isAllowed('/gift-wraps') && <Route path='/gift-wraps' element={<ManageGiftWraps token={token} />} />}
                {isAllowed('/policy-update') && <Route path='/policy-update' element={<PolicyUpdate token={token} />} />}
                {isAllowed('/coupons') && <Route path='/coupons' element={<Coupons token={token} />} />}
                {isAllowed('/tickets') && <Route path='/tickets' element={<Tickets token={token} />} />}
                {isAllowed('/reviews') && <Route path='/reviews' element={<ReviewsAdmin token={token} />} />}
                {isAllowed('/cms') && <Route path='/cms' element={<Cms token={token} />} />}
                {isAllowed('/images') && <Route path='/images' element={<Images token={token} />} />}
                {isAllowed('/send-mail') && <Route path='/send-mail' element={<NewUserMail token={token} />} />}
                {isAllowed('/maintenance') && <Route path='/maintenance' element={<MaintenanceMode token={token} />} />}
                {isAllowed('/configurations') && <Route path='/configurations' element={<Configurations token={token} />} />}
                
                {/* Fallback for update if /list is allowed */}
                {isAllowed('/list') && <Route path='/update/:productId' element={<Update token={token} />} />}
              </Routes>
            </div>
          </div>
        </>
      }
    </div>
  )
}

export default App