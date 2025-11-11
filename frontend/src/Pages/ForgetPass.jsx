import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";

const ForgotPassword = () => {
  const [step, setStep] = useState(1);
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm();

  const password = watch("password");

  const onSubmit = (data) => {
    if (step === 1) {
      // simulate sending OTP
      alert(`OTP sent to ${data.email}`);
      setStep(2);
    } else if (step === 2) {
      alert("OTP verified successfully!");
      setStep(3);
    } else {
      alert("Password reset successfully 💕");
    }
  };

  // Handle OTP input paste
  const handleOtpPaste = (e) => {
    const paste = e.clipboardData.getData("text").slice(0, 6);
    const otpArray = paste.split("");
    otpArray.forEach((num, idx) => setValue(`otp_${idx + 1}`, num));
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#f9aeaf] to-[#fcd9d9] p-6">
      {/* Floating hearts background */}
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

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md backdrop-blur-lg bg-white/60 rounded-3xl shadow-2xl p-8 border border-white/40"
      >
        <h2 className="text-3xl font-bold text-center mb-6 text-[#f47b7d]">
          Forgot Password 💌
        </h2>

        <AnimatePresence mode="wait">
          {/* Step 1: Enter Email */}
          {step === 1 && (
            <motion.form
              key="step1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-4"
            >
              <p className="text-center text-gray-600 text-sm mb-2">
                Enter your registered email to receive OTP
              </p>
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
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}

              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                type="submit"
                className="w-full py-3 bg-[#f9aeaf] text-white font-semibold rounded-xl shadow-md hover:bg-[#f68a8b] transition"
              >
                Send OTP
              </motion.button>
            </motion.form>
          )}

          {/* Step 2: Enter OTP */}
          {step === 2 && (
            <motion.form
              key="step2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              onSubmit={handleSubmit(onSubmit)}
              onPaste={handleOtpPaste}
              className="space-y-4"
            >
              <p className="text-center text-gray-600 text-sm mb-2">
                Enter the 6-digit OTP sent to your email
              </p>

              <div className="flex justify-between gap-2">
                {[1, 2, 3, 4, 5, 6].map((num) => (
                  <input
                    key={num}
                    type="text"
                    maxLength={1}
                    {...register(`otp_${num}`, {
                      required: "All OTP digits required",
                      pattern: {
                        value: /^[0-9]$/,
                        message: "Only numbers allowed",
                      },
                    })}
                    onInput={(e) => {
                      const next = e.target.nextElementSibling;
                      if (e.target.value && next) next.focus();
                    }}
                    className="w-12 h-12 text-center rounded-xl border text-lg font-semibold focus:ring-2 focus:ring-[#f9aeaf] outline-none"
                  />
                ))}
              </div>

              {errors.otp_1 && (
                <p className="text-sm text-red-500 text-center mt-1">
                  {errors.otp_1.message}
                </p>
              )}

              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                type="submit"
                className="w-full py-3 bg-[#f9aeaf] text-white font-semibold rounded-xl shadow-md hover:bg-[#f68a8b] transition"
              >
                Verify OTP
              </motion.button>
            </motion.form>
          )}

          {/* Step 3: Reset Password */}
          {step === 3 && (
            <motion.form
              key="step3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.4 }}
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-4"
            >
              <p className="text-center text-gray-600 text-sm mb-2">
                Set your new password
              </p>

              <div>
                <input
                  type="password"
                  placeholder="New Password"
                  {...register("password", {
                    required: "Password is required",
                    minLength: {
                      value: 6,
                      message: "At least 6 characters",
                    },
                  })}
                  className="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-[#f9aeaf] outline-none"
                />
                {errors.password && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <div>
                <input
                  type="password"
                  placeholder="Confirm Password"
                  {...register("confirmPassword", {
                    required: "Confirm your password",
                    validate: (value) =>
                      value === password || "Passwords do not match",
                  })}
                  className="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-[#f9aeaf] outline-none"
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-red-500 mt-1">
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>

              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                type="submit"
                className="w-full py-3 bg-[#f9aeaf] text-white font-semibold rounded-xl shadow-md hover:bg-[#f68a8b] transition"
              >
                Reset Password
              </motion.button>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Footer */}
        <div className="text-center mt-6 text-sm">
          <Link to={"/login"} className="text-[#f47b7d] font-semibold underline">
            Back to Login
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
