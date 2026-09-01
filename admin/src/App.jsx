import React, { useEffect, useState, Suspense, lazy } from 'react'
import Navbar from './components/Navbar'
import Sidebar from './components/Sidebar'
import ScrollToTop from './components/ScrollToTop'
import { Routes, Route } from 'react-router-dom'
import Login from './components/Login'
import ForgetPass from './pages/ForgetPass'
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Route-level code splitting: each admin page (and its data fetching) only
// loads once its route is actually visited, instead of all pages being
// bundled and parsed upfront on first load.
const Add = lazy(() => import('./pages/Add'))
const List = lazy(() => import('./pages/List'))
const LuxeList = lazy(() => import('./pages/LuxeList..jsx'))
const Orders = lazy(() => import('./pages/Orders'))
const Update = lazy(() => import('./pages/Update'))
const AllUsers = lazy(() => import('./pages/AllUsers'))
const ManageGiftWraps = lazy(() => import('./pages/ManageGiftWraps'))
const PolicyUpdate = lazy(() => import('./pages/PolicyUpdate'))
const Coupons = lazy(() => import('./pages/Coupons'))
const Tickets = lazy(() => import('./pages/Tickets'))
const ReviewsAdmin = lazy(() => import('./pages/ReviewsAdmin'))
const Images = lazy(() => import('./pages/Images/Images'))
const Cms = lazy(() => import('./pages/Texts/Cms'))
const FebeulDashboard = lazy(() => import('./pages/Dashboard'))
const NewUserMail = lazy(() => import('./pages/NewUserMail'))
const RefundRequests = lazy(() => import('./pages/RefundRequests'))
const ReturnRequests = lazy(() => import('./pages/ReturnRequests'))
const MaintenanceMode = lazy(() => import('./pages/Settings/MaintenanceMode'))
const Configurations = lazy(() => import('./pages/Settings/Configurations'))
const DeliveryControl = lazy(() => import('./pages/DeliveryControl'))
const ImageOptimize = lazy(() => import('./pages/Settings/ImageOptimize'))
const TypographySettings = lazy(() => import('./pages/Settings/TypographySettings'))
const ProductTaxonomy = lazy(() => import('./pages/Settings/ProductTaxonomy'))
const Stats = lazy(() => import('./pages/Stats/Stats'))
const ResetData = lazy(() => import('./pages/ResetData'))

const PageFallback = () => (
  <div className='flex items-center justify-center py-24'>
    <div className='w-8 h-8 border-2 border-gray-200 border-t-black rounded-full animate-spin' />
  </div>
)

export const backendUrl = import.meta.env.VITE_BACKEND_URL
export const currency = '₹'

const App = () => {

  const [token, setToken] = useState(localStorage.getItem('token')?localStorage.getItem('token'):'');
  const [role, setRole] = useState(localStorage.getItem('role')?localStorage.getItem('role'):'');
  const [userEmail, setUserEmail] = useState(localStorage.getItem('userEmail')?localStorage.getItem('userEmail'):'');
  const [permissions, setPermissions] = useState(JSON.parse(localStorage.getItem('permissions') || '[]'));

  const isAllowed = (path) => {
    if (role === 'admin') return true;
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
      <ScrollToTop />
      <ToastContainer />
      {token === ""
        ? <Routes>
            <Route path='/forgot-password' element={<ForgetPass />} />
            <Route path='*' element={<Login setToken={setToken} setRole={setRole} setUserEmail={setUserEmail} setPermissions={setPermissions} />} />
          </Routes>
        : <>
          <Navbar setToken={setToken} setRole={setRole} setUserEmail={setUserEmail} role={role} email={userEmail} setPermissions={setPermissions} />
          <hr />
          <div className='flex w-full'>
            <Sidebar role={role} permissions={permissions} />
            <div className='w-[70%] mx-auto ml-[max(5vw,25px)] my-8 text-gray-600 text-base'>
              <Suspense fallback={<PageFallback />}>
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
                {isAllowed('/luxelist') && <Route path='/luxelist' element={<LuxeList token={token} />} />}
                {isAllowed('/orders') && <Route path='/orders' element={<Orders token={token} />} />}
                {isAllowed('/refund-requests') && <Route path='/refund-requests' element={<RefundRequests token={token} />} />}
                {isAllowed('/return-requests') && <Route path='/return-requests' element={<ReturnRequests token={token} />} />}
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
                {isAllowed('/delivery-control') && <Route path='/delivery-control' element={<DeliveryControl token={token} />} />}
                {isAllowed('/image-optimize') && <Route path='/image-optimize' element={<ImageOptimize token={token} />} />}
                {isAllowed('/typography') && <Route path='/typography' element={<TypographySettings token={token} />} />}
                {isAllowed('/product-taxonomy') && <Route path='/product-taxonomy' element={<ProductTaxonomy token={token} />} />}
                {isAllowed('/stats') && <Route path='/stats' element={<Stats token={token} />} />}
                {isAllowed('/reset-data') && <Route path='/reset-data' element={<ResetData token={token} />} />}
                
                {/* Fallback for update if /list is allowed */}
                {isAllowed('/list') && <Route path='/update/:productId' element={<Update token={token} />} />}
              </Routes>
              </Suspense>
            </div>
          </div>
        </>
      }
    </div>
  )
}

export default App