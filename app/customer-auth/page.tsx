'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { User, Phone, ArrowRight, Star, Gift, TrendingUp } from 'lucide-react';
import { Logo } from '@/components/ui/logo';

export default function CustomerAuth() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isSignUp) {
        // Register new customer
        const response = await fetch('/api/customer/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, phone }),
        });

        if (response.ok) {
          // Store customer data
          localStorage.setItem('customerName', name);
          localStorage.setItem('customerPhone', phone);
          localStorage.setItem('totalVisits', '0');
          localStorage.setItem('lastVisit', new Date().toISOString());
          
          // Redirect to customer dashboard
          router.push('/dashboard/customer');
        } else {
          const data = await response.json();
          setError(data.error || 'Registration failed');
        }
      } else {
        // Check existing customer
        const response = await fetch('/api/v2/customer/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone }),
        });

        if (response.ok) {
          const data = await response.json();
          // Store customer data
          localStorage.setItem('customerName', data.customer.name);
          localStorage.setItem('customerPhone', data.customer.phone);
          localStorage.setItem('totalVisits', data.customer.totalVisits.toString());
          localStorage.setItem('lastVisit', data.customer.lastVisit || new Date().toISOString());
          
          // Redirect to customer dashboard
          router.push('/dashboard/customer');
        } else {
          setError('Customer not found. Please sign up first.');
        }
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 relative overflow-hidden">
      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="w-full max-w-md"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-6">
              <Logo size="lg" />
            </div>
            
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {isSignUp ? 'Join Lewis Retails' : 'Welcome Back'}
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {isSignUp 
                ? 'Create your account to start earning rewards' 
                : 'Sign in to view your visit history and rewards'
              }
            </p>
          </div>

          {/* Auth Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-8 shadow-lg"
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              {isSignUp && (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                >
                  <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-2">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-12 py-3 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-brand-green transition-colors"
                      placeholder="Enter your full name"
                      required={isSignUp}
                    />
                  </div>
                </motion.div>
              )}

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: isSignUp ? 0.4 : 0.3, duration: 0.5 }}
              >
                <label className="block text-gray-700 dark:text-gray-300 text-sm font-medium mb-2">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-12 py-3 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-brand-green transition-colors"
                    placeholder="+251 9X XXX XXXX"
                    required
                  />
                </div>
              </motion.div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-500/20 border border-red-500/30 rounded-lg p-3"
                >
                  <p className="text-red-300 text-sm">{error}</p>
                </motion.div>
              )}

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="w-full bg-brand-green hover:bg-brand-green/90 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </motion.button>
            </form>

            {/* Toggle Sign In/Sign Up */}
            <div className="mt-6 text-center">
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}
              </p>
              <button
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError('');
                }}
                className="text-brand-coral hover:text-brand-coral/80 font-medium text-sm mt-1 transition-colors"
              >
                {isSignUp ? 'Sign In' : 'Sign Up'}
              </button>
            </div>
          </motion.div>

          {/* Features */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="mt-8 grid grid-cols-3 gap-4"
          >
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-brand-green flex items-center justify-center">
                <Star className="w-6 h-6 text-white" />
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-xs">Earn Points</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-brand-coral flex items-center justify-center">
                <Gift className="w-6 h-6 text-white" />
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-xs">Get Rewards</p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-brand-green flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-xs">Track Visits</p>
            </div>
          </motion.div>

          {/* Back to Home */}
          <div className="mt-8 text-center">
            <button
              onClick={() => router.push('/')}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-sm transition-colors"
            >
              ← Back to Home
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}


