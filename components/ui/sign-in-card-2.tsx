'use client'
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { Mail, Lock, Eye, EyeClosed, ArrowRight, QrCode } from 'lucide-react';
import { cn } from "@/lib/utils";
import { Logo } from '@/components/ui/logo';

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        className
      )}
      {...props}
    />
  )
}

export function SignInCard() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // For 3D card effect
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useTransform(mouseY, [-300, 300], [10, -10]);
  const rotateY = useTransform(mouseX, [-300, 300], [-10, 10]);

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left - rect.width / 2);
    mouseY.set(e.clientY - rect.top - rect.height / 2);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Determine which endpoint to use based on email
      const isSuperAdmin = email === 'admin@lewisloyalty.com';
      const endpoint = isSuperAdmin ? "/api/super/auth/login" : "/api/admin/auth/login";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }

      // Store user info in localStorage/sessionStorage for client-side use
      const storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem("admin_role", data.user.role);
      storage.setItem("admin_email", data.user.email);
      if (data.user.name) {
        storage.setItem("admin_name", data.user.name);
      }
      if (data.user.id) {
        storage.setItem("admin_id", data.user.id);
      }
      if (data.user.storeId) {
        storage.setItem("admin_storeId", data.user.storeId);
      }

      // Small delay to ensure storage is set, then redirect
      setTimeout(() => {
        const dashboardPath = data.user.role === 'superadmin' ? '/dashboard/super' : '/dashboard/admin';
        window.location.href = dashboardPath;
      }, 100);
      
    } catch (err: any) {
      setError(err.message || "An error occurred during login");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen bg-gray-50 dark:bg-gray-900 relative overflow-hidden flex items-center justify-center">
      {/* Customer QR Button - Top Left */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="absolute top-6 left-6 z-20"
      >
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => router.push("/customer")}
          className="bg-brand-green hover:bg-brand-green/90 text-white px-4 py-2 rounded-lg transition-all duration-300 flex items-center gap-2 group shadow-lg"
        >
          <QrCode className="h-4 w-4" />
          <span className="text-sm font-medium">Customer Scan</span>
        </motion.button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-sm relative z-10"
      >
        <div className="relative">
          <div className="relative bg-white dark:bg-gray-800 rounded-lg p-8 border border-gray-200 dark:border-gray-700 shadow-lg">
            {/* Logo and header */}
            <div className="text-center space-y-4 mb-6">
              <div className="flex justify-center">
                <Logo size="md" />
              </div>

              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Welcome Back
              </h1>
              
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Sign in to Lewis Retails Loyalty
              </p>
            </div>

            {/* Error message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20"
                >
                  <p className="text-xs text-red-400">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Login form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-3">
                {/* Email input */}
                <div className="relative">
                  <div className="relative flex items-center overflow-hidden rounded-lg">
                    <Mail className={`absolute left-3 w-4 h-4 transition-all duration-300 ${
                      focusedInput === "email" ? 'text-brand-green' : 'text-gray-400'
                    }`} />
                    
                    <Input
                      type="email"
                      placeholder="Email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onFocus={() => setFocusedInput("email")}
                      onBlur={() => setFocusedInput(null)}
                      className="w-full bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-600 focus:border-brand-green text-gray-900 dark:text-white placeholder:text-gray-400 h-10 transition-all duration-300 pl-10 pr-3"
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {/* Password input */}
                <div className="relative">
                  <div className="relative flex items-center overflow-hidden rounded-lg">
                    <Lock className={`absolute left-3 w-4 h-4 transition-all duration-300 ${
                      focusedInput === "password" ? 'text-brand-green' : 'text-gray-400'
                    }`} />
                    
                    <Input
                      type={showPassword ? "text" : "password"}
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onFocus={() => setFocusedInput("password")}
                      onBlur={() => setFocusedInput(null)}
                      className="w-full bg-gray-50 dark:bg-gray-900 border-gray-300 dark:border-gray-600 focus:border-brand-green text-gray-900 dark:text-white placeholder:text-gray-400 h-10 transition-all duration-300 pl-10 pr-10"
                      required
                      disabled={isLoading}
                    />
                    
                    {/* Toggle password visibility */}
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)} 
                      className="absolute right-3 cursor-pointer focus:outline-none"
                      disabled={isLoading}
                    >
                      {showPassword ? (
                        <Eye className="w-4 h-4 text-gray-400 hover:text-brand-green transition-colors duration-300" />
                      ) : (
                        <EyeClosed className="w-4 h-4 text-gray-400 hover:text-brand-green transition-colors duration-300" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Remember me */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <input
                      id="remember-me"
                      name="remember-me"
                      type="checkbox"
                      checked={rememberMe}
                      onChange={() => setRememberMe(!rememberMe)}
                      disabled={isLoading}
                      className="appearance-none h-4 w-4 rounded border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 checked:bg-brand-green checked:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/30 transition-all duration-200 disabled:opacity-50"
                    />
                    {rememberMe && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute inset-0 flex items-center justify-center text-white pointer-events-none"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      </motion.div>
                    )}
                  </div>
                  <label htmlFor="remember-me" className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors duration-200 cursor-pointer">
                    Remember me for 7 days
                  </label>
                </div>
              </div>

              {/* Sign in button */}
              <motion.button
                whileHover={{ scale: isLoading ? 1 : 1.02 }}
                whileTap={{ scale: isLoading ? 1 : 0.98 }}
                type="submit"
                disabled={isLoading}
                className="w-full bg-brand-green hover:bg-brand-green/90 text-white font-medium h-10 rounded-lg transition-all duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed mt-5"
              >
                <AnimatePresence mode="wait">
                  {isLoading ? (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center justify-center"
                    >
                      <div className="w-4 h-4 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />
                    </motion.div>
                  ) : (
                    <motion.span
                      key="button-text"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center justify-center gap-2 text-sm font-medium"
                    >
                      Sign In
                      <ArrowRight className="w-4 h-4" />
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.button>

              {/* Demo credentials note */}
              <div className="text-center mt-4">
                <p className="text-gray-500 dark:text-gray-500 text-[10px]">Demo Credentials:</p>
                <p className="text-gray-600 dark:text-gray-400 text-[10px] font-mono mt-1">
                  admin@lewisloyalty.com / admin123
                </p>
                <p className="text-gray-600 dark:text-gray-400 text-[10px] font-mono mt-1">
                  storeadmin@lewisloyalty.com / admin123
                </p>
              </div>
            </form>
          </div>
        </div>
      </motion.div>
    </div>
  );
}