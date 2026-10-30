/* eslint-disable react/prop-types -- Admin shell props come from App. */
import ThemeToggle from './ThemeToggle'

const Navbar = ({setToken, setRole, setUserEmail, setPermissions, role, email, theme, onToggleTheme}) => {
  return (
    <div className='admin-navbar flex items-center bg-black justify-between py-2 px-4 sm:px-6 lg:px-8'>
        <img 
            className='w-24 sm:w-32'
            src="./removebgLogo.png" 
            alt="Logo" 
        />
        <div className='flex items-center gap-2 sm:gap-4'>
            <ThemeToggle theme={theme} onToggle={onToggleTheme} />
            <div className='flex flex-col items-end'>
                <p className='hidden sm:block text-white font-medium'>
                    {role === 'staff' ? 'Staff Panel' : 'Admin Panel'}
                </p>
                {email && (
                    <p className='hidden sm:block text-gray-400 text-[10px]'>
                        {email}
                    </p>
                )}
            </div>
            <button 
                onClick={()=>{setToken(''); setRole(''); setUserEmail(''); setPermissions([]);}} 
                className='bg-red-500 text-white px-4 py-2 rounded-full text-xs sm:text-sm hover:bg-red-600 transition-colors'>
                Logout
            </button>
        </div>
    </div>
  )
}

export default Navbar
