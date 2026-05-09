import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import useAuthStore from "../store/authStore";
import { toast, Toaster } from 'react-hot-toast';
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, Lock } from "lucide-react";

const ForgotPassword = () => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const { forgotPassword, verifyPasswordResetOtp, resetPassword, loading, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
    setValue,
    watch,
  } = useForm();

  const password = watch("password");

  useEffect(() => {
    if (error) {
      toast.error(error);
      clearError();
    }
  }, [error, clearError]);

  useEffect(() => {
    return () => {
      clearError();
    };
  }, [clearError]);

  const onSubmit = async (data) => {
    clearError();
    if (step === 1) {
      try {
        const emailToProcess = data.email.toLowerCase();
        const response = await forgotPassword(emailToProcess);
        if (response.success) {
          toast.success(response.message || "OTP sent to your email.");
          setEmail(emailToProcess);
          setStep(2);
        } else {
          toast.error(response.message || "Failed to send OTP.");
        }
      } catch (e) {
        // error is handled by the store and useEffect
      }
    } else if (step === 2) {
      const otp = [1, 2, 3, 4, 5, 6].map((num) => getValues(`otp_${num}`)).join('');
      if (otp.length !== 6) {
        toast.error("Please enter the complete 6-digit OTP.");
        return;
      }
      try {
        const response = await verifyPasswordResetOtp({ email, otp });
        if (response.success) {
          toast.success(response.message || "OTP verified successfully.");
          setStep(3);
        } else {
          toast.error(response.message || "Invalid OTP.");
        }
      } catch (e) {
        // error handled by store
      }
    } else {
      try {
        const otp = [1, 2, 3, 4, 5, 6].map((num) => getValues(`otp_${num}`)).join('');
        const response = await resetPassword({ email, otp, newPassword: data.password });
        if (response.success) {
          toast.success(response.message || "Password reset successfully! Please login.");
          navigate('/auth');
        } else {
          toast.error(response.message || "Failed to reset password.");
        }
      } catch (e) {
        // error handled by store
      }
    }
  };

  const handleResendOtp = async () => {
    if (!email) return;
    clearError();
    try {
        const response = await forgotPassword(email);
        if (response.success) {
          toast.success(response.message || "OTP re-sent to your email.");
        } else {
          toast.error(response.message || "Failed to re-send OTP.");
        }
      } catch (e) {
        // error is already handled by the store and useEffect
      }
  };
  
  const handleOtpPaste = (e) => {
    const paste = e.clipboardData.getData("text").slice(0, 6);
    if (!/^\d+$/.test(paste)) return;
    const otpArray = paste.split("");
    otpArray.forEach((num, idx) => setValue(`otp_${idx + 1}`, num));
    const lastIdx = Math.min(otpArray.length, 6);
    document.getElementById(`otp-${lastIdx}`)?.focus();
  };

  const handleOtpInput = (e, num) => {
    if (e.target.value && num < 6) {
      document.getElementById(`otp-${num + 1}`)?.focus();
    }
  };

  const handleOtpKeyDown = (e, num) => {
    if (e.key === "Backspace" && !e.target.value && num > 1) {
      document.getElementById(`otp-${num - 1}`)?.focus();
    }
  };

  return (
    <>
    <Toaster position="top-center" reverseOrder={false}/>
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#f9aeaf] to-[#fcd9d9] p-4 md:p-6">
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute text-[#f47b7d]/20 text-4xl select-none pointer-events-none"
          initial={{ y: "100vh", x: Math.random() * 100 + "vw" }}
          animate={{
            y: ["100vh", "-10vh"],
            x: [
              Math.random() * 100 + "vw",
              Math.random() * 100 + "vw",
            ],
          }}
          transition={{
            duration: 10 + Math.random() * 10,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          💖
        </motion.div>
      ))}

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md backdrop-blur-lg bg-white/70 rounded-[2rem] shadow-2xl p-6 md:p-8 border border-white/40"
      >
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-6 text-[#f47b7d]">
          Reset Password 💌
        </h2>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.form
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4 }}
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-4"
            >
              <p className="text-center text-gray-600 text-sm mb-4">
                Enter your registered email to receive an OTP
              </p>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="email"
                  placeholder="Email Address"
                  {...register("email", {
                    required: "Email is required",
                    pattern: {
                      value: /^\S+@\S+$/i,
                      message: "Enter a valid email",
                    },
                  })}
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#f9aeaf] focus:border-transparent outline-none transition-all"
                />
              </div>
              {errors.email && (
                <p className="text-xs text-red-500 ml-1">{errors.email.message}</p>
              )}

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-[#f47b7d] text-white font-bold rounded-xl shadow-lg shadow-[#f47b7d]/20 hover:bg-[#f68a8b] transition-all disabled:bg-gray-400 mt-4"
              >
                {loading ? 'Sending...' : 'Send OTP'}
              </motion.button>
            </motion.form>
          )}

          {step === 2 && (
            <motion.form
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4 }}
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-6"
            >
              <div className="text-center">
                <p className="text-gray-600 mb-1 text-sm">Verify your identity</p>
                <p className="text-sm font-semibold text-gray-800">{email}</p>
              </div>

              <div className="flex justify-between gap-2" onPaste={handleOtpPaste}>
                {[1, 2, 3, 4, 5, 6].map((num) => (
                  <input
                    key={num}
                    id={`otp-${num}`}
                    type="text"
                    maxLength={1}
                    {...register(`otp_${num}`, {
                      required: true,
                      pattern: /^[0-9]$/,
                    })}
                    onInput={(e) => handleOtpInput(e, num)}
                    onKeyDown={(e) => handleOtpKeyDown(e, num)}
                    className="w-10 h-12 md:w-12 md:h-14 text-center text-xl font-bold rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#f9aeaf] focus:border-transparent outline-none transition-all"
                  />
                ))}
              </div>

              <div className="text-center text-sm">
                  Didn't receive code?{" "}
                  <button type="button" onClick={handleResendOtp} disabled={loading} className="text-[#f47b7d] font-bold hover:underline disabled:text-gray-400">
                      Resend
                  </button>
              </div>

              <div className="space-y-4">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-[#f47b7d] text-white font-bold rounded-xl shadow-lg shadow-[#f47b7d]/20 hover:bg-[#f68a8b] transition-all disabled:bg-gray-400"
                >
                  {loading ? 'Verifying...' : 'Verify OTP'}
                </motion.button>
                
                <button 
                  type="button" 
                  onClick={() => setStep(1)}
                  className="w-full flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-[#f47b7d] transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Change Email
                </button>
              </div>
            </motion.form>
          )}

          {step === 3 && (
            <motion.form
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4 }}
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-4"
            >
              <p className="text-center text-gray-600 text-sm mb-4">
                Set your new secure password
              </p>

              <div className="space-y-4">
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="password"
                    placeholder="New Password"
                    {...register("password", {
                      required: "Password is required",
                      minLength: {
                        value: 8,
                        message: "Minimum 8 characters",
                      },
                    })}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#f9aeaf] focus:border-transparent outline-none transition-all"
                  />
                </div>
                {errors.password && (
                  <p className="text-xs text-red-500 ml-1">{errors.password.message}</p>
                )}

                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="password"
                    placeholder="Confirm Password"
                    {...register("confirmPassword", {
                      required: "Confirm your password",
                      validate: (value) =>
                        value === password || "Passwords do not match",
                    })}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#f9aeaf] focus:border-transparent outline-none transition-all"
                  />
                </div>
                {errors.confirmPassword && (
                  <p className="text-xs text-red-500 ml-1">{errors.confirmPassword.message}</p>
                )}
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="w-full py-3.5 bg-[#f47b7d] text-white font-bold rounded-xl shadow-lg shadow-[#f47b7d]/20 hover:bg-[#f68a8b] transition-all disabled:bg-gray-400 mt-4"
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </motion.button>
            </motion.form>
          )}
        </AnimatePresence>

        <div className="text-center mt-8 text-sm">
          <Link to={"/auth"} className="text-gray-500 hover:text-[#f47b7d] font-semibold flex items-center justify-center gap-1 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Login
          </Link>
        </div>
      </motion.div>
    </div>
    </>
  );
};

export default ForgotPassword;

