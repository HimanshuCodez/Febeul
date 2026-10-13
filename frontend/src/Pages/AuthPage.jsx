import { GoogleLogin } from '@react-oauth/google';
import { Eye, EyeOff, ArrowLeft, Mail, Lock, User, Phone } from "lucide-react";
import useAuthStore from "../store/authStore";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { toast, Toaster } from 'react-hot-toast';
import axios from 'axios';
import { useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { motion as Motion, AnimatePresence } from "framer-motion";
import TurnstileChallenge from '../components/TurnstileChallenge';

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [step, setStep] = useState(1);
  const [timer, setTimer] = useState(60);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [signupFormData, setSignupFormData] = useState(null);
  const [authConfig, setAuthConfig] = useState(null);
  const [configError, setConfigError] = useState(false);
  const [configRetry, setConfigRetry] = useState(0);
  const [turnstileToken, setTurnstileToken] = useState('');
  const [captchaVersion, setCaptchaVersion] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const requestInFlight = useRef(false);
  const { login, register: signup, isAuthenticated, error, loading, clearError, setToken, googleLogin } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from || "/";

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    getValues,
    reset,
    trigger,
    setValue
  } = useForm();

  const password = watch("password");
  const busy = loading || submitting;
  const canAuthenticate = Boolean(authConfig) && !configError && !busy && (!authConfig.enabled || Boolean(turnstileToken));

  useEffect(() => {
    const controller = new AbortController();
    setAuthConfig(null);
    setConfigError(false);
    axios.get(`${import.meta.env.VITE_BACKEND_URL}/api/user/auth-config`, { signal: controller.signal, timeout: 15000 }).then(({ data }) => {
      if (!data.success || typeof data.turnstile?.enabled !== 'boolean' || (data.turnstile.enabled && !data.turnstile.siteKey)) throw new Error('Invalid verification configuration');
      setAuthConfig(data.turnstile);
    }).catch(() => { if (!controller.signal.aborted) setConfigError(true); });
    return () => controller.abort();
  }, [configRetry]);

  const withVerification = async (request) => {
    if (requestInFlight.current) return;
    if (!canAuthenticate) {
      toast.error('Please complete the security verification first.');
      return;
    }
    requestInFlight.current = true;
    setSubmitting(true);
    const token = authConfig.enabled ? turnstileToken : undefined;
    setTurnstileToken('');
    try {
      await request(token);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to continue. Please try again.');
    } finally {
      // Cloudflare tokens are single use, even if login, email delivery, or a network call fails.
      setTurnstileToken('');
      setCaptchaVersion(value => value + 1);
      setSubmitting(false);
      requestInFlight.current = false;
    }
  };

  const goBack = () => {
    setTurnstileToken('');
    setStep(1);
  };

  useEffect(() => {
    if (isAuthenticated) {
      if (location.pathname === '/auth') {
        navigate(redirectTo, { replace: true });
      }
    }
    if (error) {
      toast.error(error);
      clearError();
    }
  }, [isAuthenticated, error, navigate, location.pathname, redirectTo, clearError]);

  useEffect(() => {
    return () => {
      clearError();
    };
  }, [clearError]);

  useEffect(() => {
    let interval = null;
    if (isTimerActive && timer > 0) {
      interval = setInterval(() => {
        setTimer((timer) => timer - 1);
      }, 1000);
    } else if (timer === 0) {
      setIsTimerActive(false);
      setTimer(60);
    }
    return () => clearInterval(interval);
  }, [isTimerActive, timer]);

  const onSubmit = async (data) => {
    if (isLogin) {
      if (step === 1) { // Password login
        const email = data.identifier.toLowerCase();
        await withVerification(turnstileToken => login({ email, password: data.password, turnstileToken }));
      } else { // step === 2, OTP login
        try {
          const email = getValues('identifier').toLowerCase();
          const otp = [0, 1, 2, 3, 4, 5].map(i => data[`loginOtp_${i}`]).join('');

          if (otp.length < 6) {
            toast.error("Please enter 6-digit OTP");
            return;
          }

          await withVerification(async turnstileToken => {
            const response = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/otp/verify-email-login-otp`, { email, otp, turnstileToken });

            if (response.data.success) {
              const { token } = response.data;
              setToken(token);
              toast.success("Logged in successfully!");
              navigate(redirectTo, { replace: true });
            } else {
              toast.error(response.data.message);
            }
          });
        } catch (error) {
          toast.error(error.response?.data?.message || 'Failed to verify OTP');
        }
      }
    } else { // This is Signup
      if (step === 1) { 
        setSignupFormData(data); // Store data
        await sendSignupOtp();
      } else if (step === 2) {
        try {
          const email = getValues('email').toLowerCase();
          const otp = [0, 1, 2, 3, 4, 5].map(i => data[`signupOtp_${i}`]).join('');

          if (otp.length < 6) {
            toast.error("Please enter 6-digit OTP");
            return;
          }

          await withVerification(async turnstileToken => {
            const verifyResponse = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/otp/verify-email-otp`, {
              email: email,
              otp: otp,
              turnstileToken,
            });

            if (verifyResponse.data.success) {
              toast.success('Email verified successfully!');
              const registered = await signup({
                name: signupFormData.name,
                email: email,
                mobile: signupFormData.mobile,
                password: signupFormData.password,
                registrationToken: verifyResponse.data.registrationToken
              });
              if (registered) toast.success("Signed up successfully!");
            } else {
              toast.error(verifyResponse.data.message || 'Invalid OTP.');
            }
          });
        } catch (err) {
          toast.error(err.response?.data?.message || 'Failed to verify OTP.');
        }
      }
    }
  };

  const sendLoginOtp = async () => {
    const identifierRaw = getValues("identifier");
    const isEmail = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(identifierRaw);

    if (!isEmail) {
      toast.error("Please enter a valid email address.");
      return;
    }

    const email = identifierRaw.toLowerCase();

    try {
      const url = `${import.meta.env.VITE_BACKEND_URL}/api/otp/send-email-otp`;
      await withVerification(async turnstileToken => {
        const payload = { email, purpose: 'login', turnstileToken };
        const response = await axios.post(url, payload);

        if (response.data.success) {
          toast.success(`OTP sent to ${email}`);
          setStep(2);
          setIsTimerActive(true);
          setTimer(60);
        } else {
          toast.error(response.data.message);
        }
      });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send OTP');
    }
  };

  const handleSendLoginOtp = async () => {
    const result = await trigger("identifier");
    if (!result) return;
    await sendLoginOtp();
  };

  const handleResendLoginOtp = async () => {
    await sendLoginOtp();
  }

  const sendSignupOtp = async () => {
    const email = getValues("email").toLowerCase();
    try {
      await withVerification(async turnstileToken => {
        const response = await axios.post(`${import.meta.env.VITE_BACKEND_URL}/api/otp/send-email-otp`, { email, purpose: 'signup', turnstileToken });
        if (response.data.success) {
          toast.success(`OTP sent to ${email}`);
          setStep(2);
          setIsTimerActive(true);
          setTimer(60);
        } else {
          toast.error(response.data.message);
        }
      });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send OTP');
    }
  };

  const handleResendSignupOtp = async () => {
    await sendSignupOtp();
  };

  const toggleForm = () => {
    if (requestInFlight.current) return;
    setTurnstileToken('');
    setSignupFormData(null);
    setIsTimerActive(false);
    setTimer(60);
    setIsLogin(!isLogin);
    setStep(1);
    reset(); 
  }

  const handleOtpPaste = (e, type) => {
    const paste = e.clipboardData.getData("text").slice(0, 6);
    if (!/^\d+$/.test(paste)) return;
    
    const otpArray = paste.split("");
    otpArray.forEach((num, idx) => {
      setValue(`${type}Otp_${idx}`, num);
    });
    
    const lastIdx = Math.min(otpArray.length - 1, 5);
    document.getElementById(`${type}-otp-${lastIdx}`)?.focus();
  };

  const handleOtpInput = (e, index, type) => {
    const val = e.target.value;
    if (val && index < 5) {
      document.getElementById(`${type}-otp-${index + 1}`)?.focus();
    }
  };

  const handleOtpKeyDown = (e, index, type) => {
    if (e.key === "Backspace" && !e.target.value && index > 0) {
      document.getElementById(`${type}-otp-${index - 1}`)?.focus();
    }
  };

  return (
    <>
      <Toaster position="top-center" reverseOrder={false} />
      <div className="relative min-h-screen flex items-center justify-center overflow-clip bg-gradient-to-br from-[#f9aeaf] to-[#fcd9d9] p-4 md:p-6">
        {[...Array(8)].map((_, i) => (
          <Motion.div
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
          </Motion.div>
        ))}

        <Motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md backdrop-blur-lg bg-white/70 rounded-[2rem] shadow-2xl p-6 md:p-8 border border-white/40"
        >
          <Motion.h2
            key={isLogin ? "login" : "signup"}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-2xl md:text-3xl font-bold text-center mb-6 text-[#f47b7d]"
          >
            {isLogin ? "Welcome Back! 💖" : "Create Account"}
          </Motion.h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <AnimatePresence mode="wait">
            {!isLogin && step === 1 && (
              <Motion.div
                key="signup-step-1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Full Name"
                    {...register("name", { required: "Name is required" })}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#f9aeaf] focus:border-transparent outline-none transition-all"
                  />
                  {errors.name && <p className="text-xs text-red-500 mt-1 ml-1">{errors.name.message}</p>}
                </div>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="email"
                    placeholder="Email Address"
                    {...register("email", {
                      required: "Email is required",
                      pattern: {
                        value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                        message: "Please enter a valid email address",
                      },
                    })}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#f9aeaf] focus:border-transparent outline-none transition-all"
                  />
                  {errors.email && <p className="text-xs text-red-500 mt-1 ml-1">{errors.email.message}</p>}
                </div>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
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
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#f9aeaf] focus:border-transparent outline-none transition-all"
                  />
                  {errors.mobile && <p className="text-xs text-red-500 mt-1 ml-1">{errors.mobile.message}</p>}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    {...register("password", {
                      required: "Password is required",
                      minLength: {
                        value: 10,
                        message: "Password must be at least 10 characters",
                      },
                    })}
                    className="w-full pl-10 pr-12 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#f9aeaf] focus:border-transparent outline-none transition-all"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 cursor-pointer" onClick={() => setShowPassword(false)} />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 cursor-pointer" onClick={() => setShowPassword(true)} />
                    )}
                  </div>
                  {errors.password && <p className="text-xs text-red-500 mt-1 ml-1">{errors.password.message}</p>}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm Password"
                    {...register("confirmPassword", {
                      required: "Please confirm your password",
                      validate: (value) => value === password || "Passwords do not match",
                    })}
                    className="w-full pl-10 pr-12 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#f9aeaf] focus:border-transparent outline-none transition-all"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 cursor-pointer" onClick={() => setShowConfirmPassword(false)} />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 cursor-pointer" onClick={() => setShowConfirmPassword(true)} />
                    )}
                  </div>
                  {errors.confirmPassword && <p className="text-xs text-red-500 mt-1 ml-1">{errors.confirmPassword.message}</p>}
                </div>
                <p className="text-xs text-gray-500 text-center">
                  By joining, you agree to our <Link to="/TermsConditions" className="text-[#f47b7d] hover:underline">Terms</Link> & <Link to="/DataPrivacy" className="text-[#f47b7d] hover:underline">Privacy</Link>
                </p>
              </Motion.div>
            )}

            {!isLogin && step === 2 && (
              <Motion.div
                key="signup-step-2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center">
                   <p className="text-gray-600 mb-1">Verify your email</p>
                   <p className="text-sm font-medium text-gray-800">{getValues('email')}</p>
                </div>

                <div className="flex justify-between gap-2" onPaste={(e) => handleOtpPaste(e, 'signup')}>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <input
                      key={i}
                      id={`signup-otp-${i}`}
                      type="text"
                      maxLength={1}
                      {...register(`signupOtp_${i}`)}
                      onInput={(e) => handleOtpInput(e, i, 'signup')}
                      onKeyDown={(e) => handleOtpKeyDown(e, i, 'signup')}
                      className="w-10 h-12 md:w-12 md:h-14 text-center text-xl font-bold rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#f9aeaf] focus:border-transparent outline-none transition-all"
                    />
                  ))}
                </div>

                <div className="text-center">
                  {isTimerActive ? (
                    <p className="text-xs text-gray-500">Resend OTP in <span className="font-semibold">{timer}s</span></p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendSignupOtp} disabled={!canAuthenticate}
                      className="text-sm text-[#f47b7d] font-semibold hover:underline"
                    >
                      Resend OTP
                    </button>
                  )}
                </div>

                <button 
                  type="button" 
                  onClick={goBack} disabled={busy}
                  className="w-full flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-[#f47b7d] transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Change Email / Go Back
                </button>
              </Motion.div>
            )}

            {isLogin && step === 1 && (
              <Motion.div
                key="login-step-1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="email"
                    placeholder="Email Address"
                    {...register("identifier", { 
                      required: "Email is required",
                      pattern: {
                        value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                        message: "Please enter a valid email address"
                      }
                    })}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#f9aeaf] focus:border-transparent outline-none transition-all"
                  />
                  {errors.identifier && <p className="text-xs text-red-500 mt-1 ml-1">{errors.identifier.message}</p>}
                </div>

                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    {...register("password", { required: "Password is required" })}
                    className="w-full pl-10 pr-12 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#f9aeaf] focus:border-transparent outline-none transition-all"
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 cursor-pointer" onClick={() => setShowPassword(false)} />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 cursor-pointer" onClick={() => setShowPassword(true)} />
                    )}
                  </div>
                  {errors.password && <p className="text-xs text-red-500 mt-1 ml-1">{errors.password.message}</p>}
                </div>
                
                <div className="flex justify-between items-center px-1">
                  <button type="button" onClick={handleSendLoginOtp} disabled={!canAuthenticate} className="text-xs text-[#f47b7d] font-medium hover:underline">
                    Login with OTP
                  </button>
                  <Link to="/forgot-password" title="Forget Password" className="text-xs text-gray-500 hover:text-[#f47b7d] hover:underline">
                    Forgot Password?
                  </Link>
                </div>
              </Motion.div>
            )}

            {isLogin && step === 2 && (
              <Motion.div
                key="login-step-2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="text-center">
                   <p className="text-gray-600 mb-1">Verify with OTP</p>
                   <p className="text-sm font-medium text-gray-800">{getValues('identifier')}</p>
                </div>

                <div className="flex justify-between gap-2" onPaste={(e) => handleOtpPaste(e, 'login')}>
                  {[0, 1, 2, 3, 4, 5].map((i) => (
                    <input
                      key={i}
                      id={`login-otp-${i}`}
                      type="text"
                      maxLength={1}
                      {...register(`loginOtp_${i}`)}
                      onInput={(e) => handleOtpInput(e, i, 'login')}
                      onKeyDown={(e) => handleOtpKeyDown(e, i, 'login')}
                      className="w-10 h-12 md:w-12 md:h-14 text-center text-xl font-bold rounded-xl border border-gray-200 focus:ring-2 focus:ring-[#f9aeaf] focus:border-transparent outline-none transition-all"
                    />
                  ))}
                </div>

                <div className="text-center">
                  {isTimerActive ? (
                    <p className="text-xs text-gray-500">Resend OTP in <span className="font-semibold">{timer}s</span></p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendLoginOtp} disabled={!canAuthenticate}
                      className="text-sm text-[#f47b7d] font-semibold hover:underline"
                    >
                      Resend OTP
                    </button>
                  )}
                </div>

                <button 
                  type="button" 
                  onClick={goBack} disabled={busy}
                  className="w-full flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-[#f47b7d] transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Password Login
                </button>
              </Motion.div>
            )}
            </AnimatePresence>

            {configError ? (
              <div role="alert" className="rounded-xl border border-pink-100 bg-white/70 p-3 text-center text-xs text-gray-600">
                <p>Sign-in verification is unavailable. Please try again.</p>
                <button type="button" onClick={() => setConfigRetry(value => value + 1)} className="mt-2 min-h-10 font-semibold text-[#d85d60] underline">Retry security check</button>
              </div>
            ) : !authConfig ? <p role="status" className="text-center text-xs text-gray-500">Preparing secure sign-in…</p> : authConfig.enabled ? (
              <TurnstileChallenge key={`${isLogin}-${step}-${captchaVersion}`} siteKey={authConfig.siteKey} onToken={setTurnstileToken} />
            ) : null}

            <Motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={!canAuthenticate}
              className="w-full py-3.5 bg-[#f47b7d] text-white font-bold rounded-xl shadow-lg shadow-[#f47b7d]/20 hover:bg-[#f68a8b] transition-all disabled:bg-gray-400 disabled:shadow-none mt-6"
            >
              {busy ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing...
                </span>
              ) : isLogin ? (step === 1 ? "Login" : "Verify & Login") : (step === 1 ? "Continue" : "Verify & Create Account")}
            </Motion.button>
          </form>

          <div className="my-6 flex items-center gap-4">
            <div className="flex-grow border-t border-gray-200"></div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">OR</span>
            <div className="flex-grow border-t border-gray-200"></div>
          </div>
          
          <div className="flex justify-center" inert={!canAuthenticate} aria-disabled={!canAuthenticate}>
            <GoogleLogin
              onSuccess={credentialResponse => {
                withVerification(turnstileToken => googleLogin(credentialResponse.credential, turnstileToken));
              }}
              onError={() => {
                toast.error('Google Login Failed');
              }}
              theme="outline"
              shape="pill"
              size="large"
              width="100%"
            />
          </div>

          <div className="text-center mt-8 text-sm text-gray-600">
            {isLogin ? "New to Febeul?" : "Already have an account?"}{" "}
            <button onClick={toggleForm} disabled={busy} className="text-[#f47b7d] font-bold hover:underline transition-all">
              {isLogin ? "Create Account" : "Login Now"}
            </button>
          </div>
        </Motion.div>
      </div>
    </>
  );
};

export default AuthPage;

