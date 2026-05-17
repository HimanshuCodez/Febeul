import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Mail, Lock } from 'lucide-react';
import { backendUrl } from '../App';

const ForgetPass = () => {
    const [step, setStep] = useState(1);
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSendOtp = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await axios.post(`${backendUrl}/api/user/forgot-password`, { 
                email: email.toLowerCase(),
                isAdminReset: true 
            });
            if (response.data.success) {
                toast.success(response.data.message || "OTP sent to your email.");
                setStep(2);
            } else {
                toast.error(response.data.message);
            }
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || "Failed to send OTP.");
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        const otpString = otp.join('');
        if (otpString.length !== 6) {
            toast.error("Please enter the complete 6-digit OTP.");
            return;
        }
        setLoading(true);
        try {
            const response = await axios.post(`${backendUrl}/api/user/verify-password-otp`, { email: email.toLowerCase(), otp: otpString });
            if (response.data.success) {
                toast.success(response.data.message || "OTP verified successfully.");
                setStep(3);
            } else {
                toast.error(response.data.message);
            }
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || "Invalid OTP.");
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            toast.error("Passwords do not match.");
            return;
        }
        if (newPassword.length < 6) {
            toast.error("Password must be at least 6 characters.");
            return;
        }
        setLoading(true);
        try {
            const otpString = otp.join('');
            const response = await axios.post(`${backendUrl}/api/user/reset-password`, { 
                email: email.toLowerCase(), 
                otp: otpString, 
                newPassword 
            });
            if (response.data.success) {
                toast.success(response.data.message || "Password reset successfully! Please login.");
                navigate('/');
            } else {
                toast.error(response.data.message);
            }
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || "Failed to reset password.");
        } finally {
            setLoading(false);
        }
    };

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

    const handleResendOtp = async () => {
        setLoading(true);
        try {
            const response = await axios.post(`${backendUrl}/api/user/forgot-password`, { 
                email: email.toLowerCase(),
                isAdminReset: true 
            });
            if (response.data.success) {
                toast.success("OTP re-sent to your email.");
            } else {
                toast.error(response.data.message);
            }
        } catch (error) {
            toast.error("Failed to re-send OTP.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className='min-h-screen flex items-center justify-center w-full bg-gray-50'>
            <div className='bg-white shadow-md rounded-lg px-8 py-8 max-w-md w-full mx-4'>
                <h1 className='text-2xl font-bold mb-2 text-center'>Reset Password</h1>
                
                {step === 1 && (
                    <form onSubmit={handleSendOtp} className='mt-6'>
                        <p className='text-sm text-gray-600 mb-4 text-center'>Enter your registered email to receive an OTP</p>
                        <div className='mb-4 relative'>
                            <p className='text-sm font-medium text-gray-700 mb-2'>Email Address</p>
                            <div className='relative'>
                                <Mail className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5' />
                                <input 
                                    onChange={(e) => setEmail(e.target.value)} 
                                    value={email} 
                                    className='rounded-md w-full pl-10 pr-3 py-2 border border-gray-300 outline-none focus:border-black transition-all' 
                                    type="email" 
                                    placeholder='your@email.com' 
                                    required 
                                />
                            </div>
                        </div>
                        <button 
                            disabled={loading}
                            className='w-full py-2 px-4 rounded-md text-white bg-black hover:bg-gray-800 transition-colors disabled:bg-gray-400' 
                            type="submit"
                        > 
                            {loading ? 'Sending...' : 'Send OTP'} 
                        </button>
                    </form>
                )}

                {step === 2 && (
                    <form onSubmit={handleVerifyOtp} className='mt-6'>
                        <div className='text-center mb-6'>
                            <p className='text-sm text-gray-600 mb-1'>Verify your identity</p>
                            <p className='text-sm font-bold text-gray-800'>{email}</p>
                        </div>
                        <div className='flex justify-between gap-2 mb-6'>
                            {otp.map((digit, index) => (
                                <input
                                    key={index}
                                    id={`otp-${index}`}
                                    type="text"
                                    maxLength="1"
                                    value={digit}
                                    onChange={(e) => handleOtpChange(e.target.value, index)}
                                    onKeyDown={(e) => handleKeyDown(e, index)}
                                    className='w-10 h-12 text-center text-xl font-bold rounded-md border border-gray-300 outline-none focus:border-black transition-all'
                                    required
                                />
                            ))}
                        </div>
                        <div className='text-center mb-6'>
                            <button type="button" onClick={handleResendOtp} disabled={loading} className='text-sm text-gray-500 hover:text-black font-medium transition-colors'>
                                Didn't receive code? <span className='text-black underline'>Resend</span>
                            </button>
                        </div>
                        <div className='space-y-3'>
                            <button 
                                disabled={loading}
                                className='w-full py-2 px-4 rounded-md text-white bg-black hover:bg-gray-800 transition-colors disabled:bg-gray-400' 
                                type="submit"
                            > 
                                {loading ? 'Verifying...' : 'Verify OTP'} 
                            </button>
                            <button 
                                type="button" 
                                onClick={() => setStep(1)}
                                className='w-full flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-black transition-colors'
                            >
                                <ArrowLeft className='w-4 h-4' /> Change Email
                            </button>
                        </div>
                    </form>
                )}

                {step === 3 && (
                    <form onSubmit={handleResetPassword} className='mt-6'>
                        <p className='text-sm text-gray-600 mb-4 text-center'>Set your new secure password</p>
                        <div className='mb-4'>
                            <p className='text-sm font-medium text-gray-700 mb-2'>New Password</p>
                            <div className='relative'>
                                <Lock className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5' />
                                <input 
                                    onChange={(e) => setNewPassword(e.target.value)} 
                                    value={newPassword} 
                                    className='rounded-md w-full pl-10 pr-3 py-2 border border-gray-300 outline-none focus:border-black transition-all' 
                                    type="password" 
                                    placeholder='Minimum 6 characters' 
                                    required 
                                />
                            </div>
                        </div>
                        <div className='mb-6'>
                            <p className='text-sm font-medium text-gray-700 mb-2'>Confirm Password</p>
                            <div className='relative'>
                                <Lock className='absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5' />
                                <input 
                                    onChange={(e) => setConfirmPassword(e.target.value)} 
                                    value={confirmPassword} 
                                    className='rounded-md w-full pl-10 pr-3 py-2 border border-gray-300 outline-none focus:border-black transition-all' 
                                    type="password" 
                                    placeholder='Re-enter new password' 
                                    required 
                                />
                            </div>
                        </div>
                        <button 
                            disabled={loading}
                            className='w-full py-2 px-4 rounded-md text-white bg-black hover:bg-gray-800 transition-colors disabled:bg-gray-400' 
                            type="submit"
                        > 
                            {loading ? 'Resetting...' : 'Reset Password'} 
                        </button>
                    </form>
                )}

                <div className='mt-8 text-center'>
                    <Link to="/" className='text-sm text-gray-500 hover:text-black font-medium flex items-center justify-center gap-1 transition-colors'>
                        <ArrowLeft className='w-4 h-4' /> Back to Login
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default ForgetPass;
