import React, { useState, useEffect } from 'react'
import Hero from '../components/HeroSection'
import PromoBanner from '../components/PromoBanner'
import OfferBar from '../components/ReturnBanner'
import StylesSection from '../components/Banner'
import Spotlight from '../components/Spotlight'
import BlackBanner from '../components/BlackBanner'
import ProductDealBanner from '../components/ProductDealer'
import AboutUs from '../components/AboutUs'
import LingerieRobeSection from '../components/Pose'
import DiscountBanner from '../components/JoinNow'
import Aboutt from '../components/Aboutt'
import SwipingMessages from '../components/SwippingMsgs'
import MaintenancePage from './Maintenance'
import axios from 'axios'
import useAuthStore from '../store/authStore'

const Home = () => {
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuthStore();

  useEffect(() => {
    const checkMaintenanceMode = async () => {
      try {
        const response = await axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/cms/settings`);
        if (response.data.success && response.data.content) {
          setIsMaintenanceMode(response.data.content.maintenanceMode || false);
        }
      } catch (error) {
        console.error("Error checking maintenance mode:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkMaintenanceMode();
  }, []);

  // If maintenance mode is on and user is NOT an admin/staff, show maintenance page
  const showMaintenance = isMaintenanceMode && user?.role !== 'admin' && user?.role !== 'staff';

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="w-12 h-12 border-4 border-pink-200 border-t-pink-500 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (showMaintenance) {
    return <MaintenancePage />;
  }

  return (
    <div>
      <Hero />
      <OfferBar />
      <div className='mt-5'><Spotlight /></div>
      <div className='mt-5'><BlackBanner /></div>
      <div className='mt-5'><ProductDealBanner /></div>
      <div className='mt-5'><DiscountBanner /></div>
      <div className='mt-5'><LingerieRobeSection /></div>
      <div className='mt-5'><StylesSection /></div>
      <AboutUs />
      <div><Aboutt /></div>
    </div>
  )
}

export default Home
