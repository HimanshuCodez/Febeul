import axios from 'axios'
import React, { useState } from 'react'
import { backendUrl } from '../App'
import { toast } from 'react-toastify'
import { Link } from 'react-router-dom'

const Login = ({setToken, setRole, setUserEmail, setPermissions}) => {

    const [email,setEmail] = useState('')
    const [password,setPassword] = useState('')

    const onSubmitHandler = async (e) => {
        try {
            e.preventDefault();
            const response = await axios.post(backendUrl + '/api/user/admin',{email,password})
            if (response.data.success) {
                setToken(response.data.token)
                setRole(response.data.role)
                setUserEmail(response.data.email)
                if (response.data.permissions) {
                    setPermissions(response.data.permissions)
                } else {
                    setPermissions([])
                }
            } else {
                toast.error(response.data.message)
            }
             
        } catch (error) {
            console.log(error);
            toast.error(error.message)
        }
    }

  return (
    <div className='min-h-screen flex items-center justify-center w-full'>
        <div className='bg-white shadow-md rounded-lg px-8 py-6 max-w-md'>
            <h1 className='text-2xl font-bold mb-4 text-center'>Admin Panel</h1>
            <form onSubmit={onSubmitHandler}>
                <div className='mb-3 min-w-72'>
                    <p className='text-sm font-medium text-gray-700 mb-2'>Email Address</p>
                    <input onChange={(e)=>setEmail(e.target.value)} value={email} className='rounded-md w-full px-3 py-2 border border-gray-300 outline-none focus:border-black transition-all' type="email" placeholder='your@email.com' required />
                </div>
                <div className='mb-3 min-w-72'>
                    <div className='flex justify-between items-center mb-2'>
                        <p className='text-sm font-medium text-gray-700'>Password</p>
                        <Link to="/forgot-password" title="Forget Password" title="Forget Password" className='text-xs text-gray-500 hover:text-black hover:underline transition-colors'>
                            Forgot Password?
                        </Link>
                    </div>
                    <input onChange={(e)=>setPassword(e.target.value)} value={password} className='rounded-md w-full px-3 py-2 border border-gray-300 outline-none focus:border-black transition-all' type="password" placeholder='Enter your password' required />
                </div>
                <button className='mt-4 w-full py-2 px-4 rounded-md text-white bg-black hover:bg-gray-800 transition-colors' type="submit"> Login </button>
            </form>
        </div>
    </div>
  )
}

export default Login