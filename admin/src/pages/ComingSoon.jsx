import React from 'react'
import { Construction } from 'lucide-react'

// Generic placeholder page for nav entries that are wired up (route +
// sidebar link + permission) before the actual feature is built. Reused by
// Staff Tracking / User Tracking — pass a `title` (and optional `subtitle`)
// per route.
const ComingSoon = ({ title = 'Coming Soon', subtitle = "This feature isn't live yet — we're working on it." }) => {
  return (
    <div className='flex flex-col items-center justify-center text-center py-32 px-6'>
      <div className='bg-gray-100 p-5 rounded-2xl mb-5'>
        <Construction size={32} className='text-gray-400' />
      </div>
      <h1 className='text-2xl font-black text-gray-900 tracking-tight uppercase mb-2'>{title}</h1>
      <p className='text-sm font-bold text-gray-400 max-w-sm'>Coming Soon</p>
      <p className='text-xs text-gray-400 max-w-sm mt-2'>{subtitle}</p>
    </div>
  )
}

export default ComingSoon
