import axios from 'axios'
import React, { useState } from 'react'
import { backendUrl } from '../App'
import { toast } from 'react-toastify'
import { Link } from 'react-router-dom'

const Login = ({setToken, setRole, setUserEmail, setPermissions}) => {

    const [email,setEmail] = useState('')
    const [password,setPassword] = useState('')
    const [loginMethod, setLoginMethod] = useState('password') // 'password' or 'otp'
    const [otp, setOtp] = useState(['', '', '', '', '', ''])
    const [showOtpInput, setShowOtpInput] = useState(false)
    const [loading, setLoading] = useState(false)

    const onSubmitHandler = async (e) => {
        try {
            e.preventDefault();
            setLoading(true);
            
            let response;
            if (loginMethod === 'password') {
                response = await axios.post(backendUrl + '/api/user/admin',{email,password})
            } else {
                const otpString = otp.join('');
                if (otpString.length !== 6) {
                    toast.error("Please enter 6-digit OTP");
                    setLoading(false);
                    return;
                }
                response = await axios.post(backendUrl + '/api/user/admin-otp-login', { email, otp: otpString })
            }

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
        } finally {
            setLoading(false)
        }
    }

    const handleSendOtp = async () => {
        if (!email) {
            toast.error("Please enter email address");
            return;
        }
        setLoading(true);
        try {
            const response = await axios.post(backendUrl + '/api/user/admin-send-otp', { email });
            if (response.data.success) {
                toast.success(response.data.message);
                setShowOtpInput(true);
            } else {
                toast.error(response.data.message);
            }
        } catch (error) {
            toast.error("Failed to send OTP");
        } finally {
            setLoading(false);
        }
    }

    const handleOtpChange = (value, index) => {
        if (isNaN(value)) return;
        const newOtp = [...otp];
        newOtp[index] = value.substring(value.length - 1);
        setOtp(newOtp);

        if (value && index < 5) {
            document.getElementById(`otp-${index + 1}`).focus();
        }
    };

    const handleKeyDown = (e, index) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            document.getElementById(`otp-${index - 1}`).focus();
        }
    };

  return (
    <div className='min-h-screen flex items-center justify-center w-full bg-gray-50'>
        <div className='bg-white shadow-md rounded-lg px-8 py-8 max-w-md w-full'>
            <h1 className='text-2xl font-bold mb-2 text-center'>Admin Panel</h1>
            <p className='text-gray-500 text-sm text-center mb-6'>Enter your credentials to access the dashboard</p>
            
            <div className='flex gap-4 mb-6 border-b'>
                <button 
                    onClick={() => {setLoginMethod('password'); setShowOtpInput(false)}}
                    className={`pb-2 text-sm font-semibold transition-all ${loginMethod === 'password' ? 'border-b-2 border-black text-black' : 'text-gray-400'}`}
                >
                    Password
                </button>
                <button 
                    onClick={() => setLoginMethod('otp')}
                    className={`pb-2 text-sm font-semibold transition-all ${loginMethod === 'otp' ? 'border-b-2 border-black text-black' : 'text-gray-400'}`}
                >
                    OTP Login
                </button>
            </div>

            <form onSubmit={onSubmitHandler}>
                <div className='mb-4'>
                    <p className='text-sm font-medium text-gray-700 mb-2'>Email Address</p>
                    <input 
                        onChange={(e)=>setEmail(e.target.value)} 
                        value={email} 
                        className='rounded-md w-full px-3 py-2 border border-gray-300 outline-none focus:border-black transition-all' 
                        type="email" 
                        placeholder='your@email.com' 
                        required 
                    />
                </div>

                {loginMethod === 'password' ? (
                    <div className='mb-6'>
                        <div className='flex justify-between items-center mb-2'>
                            <p className='text-sm font-medium text-gray-700'>Password</p>
                            <Link to="/forgot-password" title="Forget Password" className='text-xs text-gray-500 hover:text-black hover:underline transition-colors'>
                                Forgot Password?
                            </Link>
                        </div>
                        <input 
                            onChange={(e)=>setPassword(e.target.value)} 
                            value={password} 
                            className='rounded-md w-full px-3 py-2 border border-gray-300 outline-none focus:border-black transition-all' 
                            type="password" 
                            placeholder='Enter your password' 
                            required 
                        />
                    </div>
                ) : (
                    <div className='mb-6'>
                        {!showOtpInput ? (
                            <button 
                                type="button"
                                onClick={handleSendOtp}
                                disabled={loading}
                                className='w-full py-2 px-4 rounded-md text-white bg-black hover:bg-gray-800 transition-colors disabled:bg-gray-400'
                            >
                                {loading ? 'Sending...' : 'Send OTP'}
                            </button>
                        ) : (
                            <div>
                                <p className='text-sm font-medium text-gray-700 mb-3'>Enter 6-digit OTP</p>
                                <div className='flex justify-between gap-2 mb-4'>
                                    {otp.map((digit, index) => (
                                        <input
                                            key={index}
                                            id={`otp-${index}`}
                                            type="text"
                                            maxLength="1"
                                            value={digit}
                                            onChange={(e) => handleOtpChange(e.target.value, index)}
                                            onKeyDown={(e) => handleKeyDown(e, index)}
                                            className='w-10 h-11 text-center text-xl font-bold rounded-md border border-gray-300 outline-none focus:border-black transition-all'
                                            required
                                        />
                                    ))}
                                </div>
                                <button type="button" onClick={handleSendOtp} className='text-xs text-gray-500 hover:text-black underline'>
                                    Resend OTP
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {(loginMethod === 'password' || showOtpInput) && (
                    <button 
                        disabled={loading}
                        className='w-full py-2 px-4 rounded-md text-white bg-black hover:bg-gray-800 transition-colors disabled:bg-gray-400 shadow-sm' 
                        type="submit"
                    > 
                        {loading ? 'Logging in...' : 'Login'} 
                    </button>
                )}
            </form>
        </div>
    </div>
  )
}

export default Login