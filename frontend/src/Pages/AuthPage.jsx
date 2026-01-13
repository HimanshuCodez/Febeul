import { GoogleLogin } from '@react-oauth/google';
import { Eye, EyeOff } from "lucide-react";
import useAuthStore from "../store/authStore";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { toast, Toaster } from 'react-hot-toast';
import axios from 'axios';

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [step, setStep] = useState(1);
  const [timer, setTimer] = useState(60);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const { login, register: signup, isAuthenticated, error, loading, clearError, setToken, googleLogin } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    getValues,
    reset,
    trigger
  } = useForm();

  const password = watch("password");

  useEffect(() => {
    if (isAuthenticated) {
      // Toast logic is tricky with multiple login types. Let's simplify.
      // A success toast will now be shown inside the login/signup/googleLogin functions if needed.
      // This effect will just handle the redirect.
      if (location.pathname === '/auth') {
        toast.success("Logged in successfully!");
        navigate("/", { replace: true });
      }
    }
    if (error) {
      toast.error(error);
      clearError();
    }
  }, [isAuthenticated, error, navigate, location.pathname, clearError]);

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
        const identifier = data.identifier;
        const isEmail = /^\S+@\S+$/.test(identifier);
        const processedIdentifier = isEmail ? identifier.toLowerCase() : identifier;
        await login({ email: processedIdentifier, password: data.password });
      } else { // step === 2, OTP login
        try {
          const identifier = getValues('identifier');
          const otp = data.loginOtp;
          const isEmail = /^\S+@\S+$/.test(identifier);
          const processedIdentifier = isEmail ? identifier.toLowerCase() : identifier;

          let response;
          if (isEmail) {
            response = await axios.post('https://febeul.onrender.com/api/otp/verify-email-login-otp', { email: processedIdentifier, otp: otp });
          } else { // mobile
            response = await axios.post('https://febeul.onrender.com/api/otp/verify-otp', { mobile: processedIdentifier, otp: otp });
          }

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
      }
    } else { // This is Signup
      if (step === 1) { 
        await sendSignupOtp();
      } else if (step === 2) {
        try {
          const email = getValues('email').toLowerCase();
          const verifyResponse = await axios.post('https://febeul.onrender.com/api/otp/verify-email-otp', {
            email: email,
            otp: data.signupOtp
          });

          if (verifyResponse.data.success) {
            toast.success('Email verified successfully!');
            await signup({
              name: getValues('name'),
              email: email,
              mobile: getValues('mobile'),
              password: getValues('password')
            });
          } else {
            toast.error(verifyResponse.data.message || 'Invalid OTP.');
          }
        } catch (err) {
          toast.error(err.response?.data?.message || 'Failed to verify OTP.');
        }
      }
    }
  };

  const sendLoginOtp = async () => {
    const identifierRaw = getValues("identifier");
    const isEmail = /^\S+@\S+$/.test(identifierRaw);
    const isMobile = /^\d{10}$/.test(identifierRaw);

    if (!isEmail && !isMobile) {
      toast.error("Please enter a valid email or 10-digit mobile number.");
      return;
    }

    const identifier = isEmail ? identifierRaw.toLowerCase() : identifierRaw;

    try {
      const url = isEmail ? 'https://febeul.onrender.com/api/otp/send-email-otp' : 'https://febeul.onrender.com/api/otp/send-otp';
      const payload = isEmail ? { email: identifier } : { mobile: identifier };
      const response = await axios.post(url, payload);

      if (response.data.success) {
        toast.success(`OTP sent to ${identifier}`);
        setStep(2);
        setIsTimerActive(true);
        setTimer(60);
      } else {
        toast.error(response.data.message);
      }
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
      const response = await axios.post('https://febeul.onrender.com/api/otp/send-email-otp', { email });
      if (response.data.success) {
        toast.success(`OTP sent to ${email}`);
        setStep(2);
        setIsTimerActive(true);
        setTimer(60);
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to send OTP');
    }
  };

  const handleSendSignupOtp = async () => {
    const result = await trigger(["name", "email", "mobile", "password", "confirmPassword"]);
    if (!result) return;
    await sendSignupOtp();
  };

  const handleResendSignupOtp = async () => {
    await sendSignupOtp();
  };

  const toggleForm = () => {
    setIsLogin(!isLogin);
    setStep(1);
    reset(); 
  }

  return (
    <>
      <Toaster position="top-center" reverseOrder={false} />
      <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#f9aeaf] to-[#fcd9d9] p-6">
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
                <div>
                  <input
                    type="text"
                    placeholder="Full Name"
                    {...register("name", { required: "Name is required" })}
                    className="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-[#f9aeaf] outline-none"
                  />
                  {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>}
                </div>
                <div>
                  <input
                    type="email"
                    placeholder="Email"
                    {...register("email", {
                      required: "Email is required",
                      pattern: {
                        value: /^\S+@\S+$/i,
                        message: "Enter a valid email",
                      },
                    })}
                    className="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-[#f9aeaf] outline-none"
                  />
                  {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>}
                </div>
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

            {!isLogin && step === 2 && (
              <>
                <p className="text-center text-gray-600">
                  An OTP has been sent to {getValues('email')}.
                </p>
                <div>
                  <input
                    type="text"
                    placeholder="Enter 6-digit OTP"
                    {...register("signupOtp", {
                      required: "OTP is required",
                      minLength: { value: 6, message: "OTP must be 6 characters" },
                      maxLength: { value: 6, message: "OTP must be 6 characters" },
                    })}
                    className="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-[#f9aeaf] outline-none"
                  />
                  {errors.signupOtp && <p className="text-sm text-red-500 mt-1">{errors.signupOtp.message}</p>}
                </div>

                <div className="text-center">
                  {isTimerActive ? (
                    <p className="text-gray-500">Resend OTP in {timer}s</p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendSignupOtp}
                      className="text-[#f47b7d] font-semibold underline"
                    >
                      Resend OTP
                    </button>
                  )}
                </div>
              </>
            )}


            {isLogin && (
              <>
                {step === 1 ? (
                  <>
                    <div>
                      <input
                        type="text"
                        placeholder="Email or Mobile Number"
                        {...register("identifier", { required: "Email or mobile number is required" })}
                        className="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-[#f9aeaf] outline-none"
                      />
                      {errors.identifier && <p className="text-sm text-red-500 mt-1">{errors.identifier.message}</p>}
                    </div>

                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Password"
                        {...register("password", { required: "Password is required" })}
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
                    <div className="text-right text-sm mt-1 flex justify-between items-center">
                      <button type="button" onClick={handleSendLoginOtp} className="text-sm text-[#f47b7d] hover:underline">
                        Login with OTP
                      </button>
                      <Link to="/forgot-password" className="text-gray-500 hover:text-[#f47b7d] hover:underline">
                        Forgot Password?
                      </Link>
                    </div>
                  </>
                ) : ( 
                  <>
                    <p className="text-center text-gray-600">
                      An OTP has been sent to {getValues('identifier')}.
                    </p>
                    <div>
                      <input
                        type="text"
                        placeholder="Enter 6-digit OTP"
                        {...register("loginOtp", {
                          required: "OTP is required",
                          minLength: { value: 6, message: "OTP must be 6 characters" },
                          maxLength: { value: 6, message: "OTP must be 6 characters" },
                        })}
                        className="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-[#f9aeaf] outline-none"
                      />
                      {errors.loginOtp && <p className="text-sm text-red-500 mt-1">{errors.loginOtp.message}</p>}
                    </div>

                    <div className="text-center">
                      {isTimerActive ? (
                        <p className="text-gray-500">Resend OTP in {timer}s</p>
                      ) : (
                        <button
                          type="button"
                          onClick={handleResendLoginOtp}
                          className="text-[#f47b7d] font-semibold underline"
                        >
                          Resend OTP
                        </button>
                      )}
                    </div>
                    <div className="text-center mt-2">
                      <button type="button" onClick={() => setStep(1)} className="text-sm text-gray-500 hover:text-[#f47b7d] hover:underline">
                        Login with Password instead
                      </button>
                    </div>
                  </>
                )}
              </>
            )}

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              type="submit"
              disabled={loading}
              onClick={step === 1 && !isLogin ? handleSendSignupOtp : handleSubmit(onSubmit)}
              className="w-full py-3 bg-[#f9aeaf] text-white font-semibold rounded-xl shadow-md hover:bg-[#f68a8b] transition disabled:bg-gray-400"
            >
              {loading ? 'Processing...' : isLogin ? (step === 1 ? "Login" : "Verify & Login") : (step === 1 ? "Continue" : "Verify & Create Account")}
            </motion.button>
          </form>

          <div className="my-6 flex items-center">
            <div className="flex-grow border-t border-gray-300"></div>
            <span className="flex-shrink mx-4 text-gray-500">OR</span>
            <div className="flex-grow border-t border-gray-300"></div>
          </div>
          
          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={credentialResponse => {
                googleLogin(credentialResponse.credential);
              }}
              onError={() => {
                toast.error('Google Login Failed');
              }}
              width="300px"
              useOneTap
            />
          </div>

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
