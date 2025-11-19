import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import GoogleIcon from "../components/GoogleIcon";
import { Eye, EyeOff } from "lucide-react";
import useAuthStore from "../store/authStore";
import { useNavigate, useLocation } from "react-router-dom";
import { toast, Toaster } from 'react-hot-toast';
import axios from 'axios';


const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { login, register: signup, isAuthenticated, error, loading, clearError, setToken } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState(1); // 1 for details, 2 for OTP
  const [formData, setFormData] = useState({});

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    getValues
  } = useForm();

  const password = watch("password");

  useEffect(() => {
    if (isAuthenticated) {
      if (location.pathname === '/auth') {
        toast.success(isLogin ? "Logged in successfully!" : "Signed up successfully!");
        navigate("/", { replace: true });
      }
    }
    if (error) {
      toast.error(error);
      clearError();
    }
  }, [isAuthenticated, error, navigate, isLogin, location.pathname, clearError]);

  useEffect(() => {
    return () => {
      clearError();
    };
  }, [clearError]);

  const onSubmit = async (data) => {
    setFormData(data); // Store form data
    if (isLogin) {
      // Handle Login
      if (data.otp) {
        // OTP Login
        try {
          const response = await axios.post('http://localhost:4000/api/otp/verify-otp', { mobile: data.identifier, otp: data.otp });
          if (response.data.success) {
            const { token } = response.data;
            setToken(token);
            toast.success("Logged in successfully!");
            navigate("/", { replace: true });
          } else {
            toast.error(response.data.message);
          }
        } catch (error) {
          toast.error(error.response?.data?.message || 'Failed to verify OTP');
        }
      } else {
        // Password Login
        await login({ email: data.identifier, password: data.password });
      }
    } else {
      // Handle Signup
      if (step === 1) {
        // Send OTP
        try {
          const response = await axios.post('http://localhost:4000/api/otp/send-otp', { mobile: data.mobile });
          if (response.data.success) {
            toast.success(`OTP sent to ${data.mobile}`);
            setStep(2);
          } else {
            toast.error(response.data.message);
          }
        } catch (error) {
          toast.error(error.response?.data?.message || 'Failed to send OTP');
        }
      } else {
        // Verify OTP and Signup
        try {
          const response = await axios.post('http://localhost:4000/api/otp/verify-otp', { mobile: data.mobile, otp: data.otp });
          if (response.data.success) {
            await signup({ name: data.name, email: data.email, mobile: data.mobile, password: data.password });
          } else {
            toast.error(response.data.message);
          }
        } catch (error) {
          toast.error(error.response?.data?.message || 'Failed to verify OTP');
        }
      }
    }
  };

  const handleSendOtpForLogin = async () => {
    const identifier = getValues("identifier");
    if (!identifier) {
      toast.error("Please enter your mobile number to get an OTP.");
      return;
    }
    // Simple check for mobile number. In a real app, you might want a more robust check.
    if (!/^\d{10}$/.test(identifier)) {
        toast.error("Please enter a valid 10-digit mobile number to receive an OTP.");
        return;
    }
    try {
      const response = await axios.post('http://localhost:4000/api/otp/send-otp', { mobile: identifier });
      if (response.data.success) {
        toast.success(`OTP sent to ${identifier}`);
        setStep(2); // Move to OTP step for login as well
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send OTP');
    }
  };


  const handleGoogleLogin = () => {
    // This would trigger the OAuth flow
    toast("Google Login is not implemented yet.", { icon: '🚧' });
  };

  const toggleForm = () => {
    setIsLogin(!isLogin);
    setStep(1); // Reset to step 1 when toggling
  }

  return (
    <>
    <Toaster position="top-center" reverseOrder={false}/>
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#f9aeaf] to-[#fcd9d9] p-6">
      {/* Animated floating hearts background */}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute text-[#f47b7d]/20 text-4xl select-none"
          initial={{ y: "100vh", x: Math.random() * window.innerWidth }}
          animate={{
            y: ["100vh", "-10vh"],
            x: [
              Math.random() * window.innerWidth,
              Math.random() * window.innerWidth,
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

      {/* Auth Card */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md backdrop-blur-lg bg-white/60 rounded-3xl shadow-2xl p-8 border border-white/40"
      >
        <motion.h2
          key={isLogin ? "login" : "signup"}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-3xl font-bold text-center mb-6 text-[#f47b7d]"
        >
          {isLogin ? "Welcome Back to Febeul 💖" : "Join Febeul Family"}
        </motion.h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {!isLogin && step === 1 && (
            <>
              {/* Name */}
              <div>
                <input
                  type="text"
                  placeholder="Full Name"
                  {...register("name", { required: "Name is required" })}
                  className="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-[#f9aeaf] outline-none"
                />
                {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>}
              </div>
              {/* Email (optional) */}
              <div>
                <input
                  type="email"
                  placeholder="Email (Optional)"
                  {...register("email", {
                    pattern: {
                      value: /^\S+@\S+$/i,
                      message: "Enter a valid email",
                    },
                  })}
                  className="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-[#f9aeaf] outline-none"
                />
                {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>}
              </div>
              {/* Mobile Number */}
              <div>
                <input
                  type="tel"
                  placeholder="Mobile Number"
                  {...register("mobile", {
                    required: "Mobile number is required",
                    pattern: {
                      value: /^\d{10}$/,
                      message: "Enter a valid 10-digit mobile number",
                    },
                  })}
                  className="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-[#f9aeaf] outline-none"
                />
                {errors.mobile && <p className="text-sm text-red-500 mt-1">{errors.mobile.message}</p>}
              </div>
               {/* Password */}
               <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Password"
                  {...register("password", {
                    required: "Password is required",
                    minLength: {
                      value: 6,
                      message: "Password must be at least 6 characters",
                    },
                  })}
                  className="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-[#f9aeaf] outline-none"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5">
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 cursor-pointer" onClick={() => setShowPassword(false)} />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 cursor-pointer" onClick={() => setShowPassword(true)} />
                  )}
                </div>
              </div>
              {errors.password && <p className="text-sm text-red-500 mt-1">{errors.password.message}</p>}
               {/* Confirm Password */}
               <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm Password"
                  {...register("confirmPassword", {
                    required: "Please confirm your password",
                    validate: (value) => value === password || "Passwords do not match",
                  })}
                  className="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-[#f9aeaf] outline-none"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5">
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 cursor-pointer" onClick={() => setShowConfirmPassword(false)} />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 cursor-pointer" onClick={() => setShowConfirmPassword(true)} />
                  )}
                </div>
              </div>
              {errors.confirmPassword && <p className="text-sm text-red-500 mt-1">{errors.confirmPassword.message}</p>}
            </>
          )}

          {isLogin && step === 1 && (
             <>
                {/* Email or Phone */}
                <div>
                    <input
                    type="text"
                    placeholder="Email or Mobile Number"
                    {...register("identifier", { required: "Email or mobile number is required" })}
                    className="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-[#f9aeaf] outline-none"
                    />
                    {errors.identifier && <p className="text-sm text-red-500 mt-1">{errors.identifier.message}</p>}
                </div>

                {/* Password */}
                <div className="relative">
                    <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    {...register("password")} // Not required if using OTP
                    className="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-[#f9aeaf] outline-none"
                    />
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5">
                    {showPassword ? (
                        <EyeOff className="h-5 w-5 text-gray-400 cursor-pointer" onClick={() => setShowPassword(false)} />
                    ) : (
                        <Eye className="h-5 w-5 text-gray-400 cursor-pointer" onClick={() => setShowPassword(true)} />
                    )}
                    </div>
                </div>
                {errors.password && <p className="text-sm text-red-500 mt-1">{errors.password.message}</p>}
            </>
          )}

          {(step === 2) && (
             <div>
                <input
                  type="text"
                  placeholder="Enter OTP"
                  {...register("otp", {
                    required: "OTP is required",
                    minLength: { value: 6, message: "OTP must be 6 characters" },
                    maxLength: { value: 6, message: "OTP must be 6 characters" },
                  })}
                  className="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-[#f9aeaf] outline-none"
                />
                {errors.otp && <p className="text-sm text-red-500 mt-1">{errors.otp.message}</p>}
                <div className="text-right text-sm mt-2">
                    <button type="button" onClick={() => setStep(1)} className="text-[#f47b7d] hover:underline">
                        Back
                    </button>
                </div>
              </div>
          )}

          {/* Submit Button */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#f9aeaf] text-white font-semibold rounded-xl shadow-md hover:bg-[#f68a8b] transition disabled:bg-gray-400"
          >
            {loading ? 'Processing...' : 
              isLogin ? (step === 1 ? "Login" : "Verify & Login") : (step === 1 ? "Get OTP" : "Sign Up")}
          </motion.button>
        </form>

        {/* Divider and alternative login options */}
        {step === 1 && (
            <>
                <div className="text-center text-sm text-gray-500 my-4">or</div>
                
                {isLogin && (
                     <motion.button
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={handleSendOtpForLogin}
                        type="button"
                        className="w-full py-3 flex items-center justify-center gap-2 border rounded-xl hover:bg-gray-50 transition"
                        >
                        Login with OTP
                    </motion.button>
                )}

                <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleGoogleLogin}
                    type="button"
                    className="w-full py-3 mt-4 flex items-center justify-center gap-2 border rounded-xl hover:bg-gray-50 transition"
                >
                    <GoogleIcon size={18} />
                    Continue with Google
                </motion.button>
            </>
        )}

        {/* Toggle between Login and Sign Up */}
        <div className="text-center mt-6 text-sm">
          {isLogin ? "Don’t have an account?" : "Already have an account?"}{" "}
          <button onClick={toggleForm} className="text-[#f47b7d] font-semibold underline">
            {isLogin ? "Sign Up" : "Login"}
          </button>
        </div>
      </motion.div>
    </div>
    </>
  );
};

export default AuthPage;
