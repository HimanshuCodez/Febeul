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
import FebeulDashboard from './pages/Dashboard' // Import the Dashboard component
import Login from './components/Login'
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export const backendUrl = import.meta.env.VITE_BACKEND_URL
export const currency = '₹'

const App = () => {

  const [token, setToken] = useState(localStorage.getItem('token')?localStorage.getItem('token'):'');
  const [role, setRole] = useState(localStorage.getItem('role')?localStorage.getItem('role'):'');

  useEffect(()=>{
    localStorage.setItem('token',token)
    localStorage.setItem('role',role)
  },[token, role])

  return (
    <div className='bg-gray-50 min-h-screen'>
      <ToastContainer />
      {token === ""
        ? <Login setToken={setToken} setRole={setRole} />
        : <>
          <Navbar setToken={setToken} setRole={setRole} />
          <hr />
          <div className='flex w-full'>
            <Sidebar role={role} />
            <div className='w-[70%] mx-auto ml-[max(5vw,25px)] my-8 text-gray-600 text-base'>
              <Routes>
                {role === 'admin' ? (
                  <>
                    <Route path='/' element={<FebeulDashboard token={token} />} />
                    <Route path='/add' element={<Add token={token} />} />
                    <Route path='/list' element={<List token={token} />} />
                    <Route path='/orders' element={<Orders token={token} />} />
                    <Route path='/update/:productId' element={<Update token={token} />} />
                    <Route path='/allusers' element={<AllUsers token={token} />} />
                    <Route path='/gift-wraps' element={<ManageGiftWraps token={token} />} />
                    <Route path='/policy-update' element={<PolicyUpdate token={token} />} />
                    <Route path='/coupons' element={<Coupons token={token} />} />
                    <Route path='/tickets' element={<Tickets token={token} />} />
                    <Route path='/reviews' element={<ReviewsAdmin token={token} />} />
                  </>
                ) : (
                  <>
                    <Route path='/' element={<List token={token} />} />
                    <Route path='/add' element={<Add token={token} />} />
                    <Route path='/list' element={<List token={token} />} />
                    <Route path='/update/:productId' element={<Update token={token} />} />
                  </>
                )}
              </Routes>
            </div>
          </div>
        </>
      }
    </div>
  )
}

export default App