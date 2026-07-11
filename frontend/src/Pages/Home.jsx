import React from 'react'
import Hero from '../components/HeroSection'
import OfferBar from '../components/ReturnBanner'
import StylesSection from '../components/Banner'
import Spotlight from '../components/Spotlight'
import BlackBanner from '../components/BlackBanner'
import ProductDealBanner from '../components/ProductDealer'
import AboutUs from '../components/AboutUs'
import LingerieRobeSection from '../components/Pose'
import DiscountBanner from '../components/JoinNow'
import Aboutt from '../components/Aboutt'
import AllProductsCarousel from '../components/Extras/AllProductsCarousel'
import BestSellerCarousel from '../components/Extras/BestSellerCarousel'

const SectionHeading = ({ title, subtitle }) => (
  <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
    <div>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-pink-500">
        Collection
      </p>
      <h2 className="text-3xl font-light tracking-tight text-gray-900 sm:text-4xl">
        {title}
      </h2>
    </div>
    {subtitle ? (
      <p className="max-w-xl text-sm leading-6 text-gray-500">
        {subtitle}
      </p>
    ) : null}
  </div>
);

const Home = () => {
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
      {/* <AboutUs />
      <div><Aboutt /></div> */}
      <section className="mx-auto max-w-[1440px] px-4 py-8 sm:px-8">
        <SectionHeading
          title="Trendings"
          subtitle="Browse the full collection"
        />
        <AllProductsCarousel />
      </section>
      <section className="mx-auto max-w-[1440px] px-4 py-8 sm:px-8">
        <SectionHeading
          title="Our Best Seller"
          subtitle="The most popular picks"
        />
        <BestSellerCarousel />
      </section>
      {/* <div><Aboutt /></div> */}

    </div>
  )
}

export default Home
