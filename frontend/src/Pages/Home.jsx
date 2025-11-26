import React from 'react'
import CloviaHeader from '../components/Navbar'
import Hero from '../components/HeroSection'

import PromoBanner from '../components/PromoBanner'
import OfferBar from '../components/ReturnBanner'
import StylesSection from '../components/Banner'

import Footer from '../components/Footer'
import Spotlight from '../components/Spotlight'
import BlackBanner from '../components/BlackBanner'


const Home = () => {
  return  (
    <div><CloviaHeader/>
    <Hero />
    <OfferBar/>
    <div className='mt-5'><Spotlight/></div>
    <div className='mt-5'><BlackBanner/></div>
    <div className='mt-5'><StylesSection/></div>
    <div className='mt-5'><PromoBanner/></div>
    {/* <div className='mt-5'><PurpleBanner/></div> */}
    <Footer/>
    
    </div>
  )
}

export default Home