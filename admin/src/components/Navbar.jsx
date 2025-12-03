import React from 'react'
import {assets} from '../assets/assets'

const Navbar = ({setToken}) => {
  return (
    <div className='flex items-center justify-between py-2 px-4 sm:px-6 lg:px-8'>
        <img 
            className='w-24 sm:w-32'
            src="./removebgLogo.png" 
            alt="Logo" 
        />
        <div className='flex items-center gap-4'>
            <p className='hidden sm:block'>Admin Panel</p>
            <button 
                onClick={()=>setToken('')} 
                className='bg-red-500 text-white px-4 py-2 rounded-full text-xs sm:text-sm hover:bg-red-600 transition-colors'>
                Logout
            </button>
        </div>
    </div>
  )
}

export default Navbar