'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';

export default function CustomerAuth() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isExistingUser, setIsExistingUser] = useState(false);
  const [customerName, setCustomerName] = useState('');

  // Check if user exists when phone number changes
  useEffect(() => {
    const checkUser = async () => {
      if (phone.length === 9) {
        try {
          const response = await fetch('/api/v2/customer/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone: `+251${phone}` }),
          });

          if (response.ok) {
            const data = await response.json();
            if (data.customer) {
              setIsExistingUser(true);
              setCustomerName(data.customer.name || '');
              setName(data.customer.name || ''); // Set name field with fetched name
            } else {
              setIsExistingUser(false);
              setCustomerName('');
              setName(''); // Clear name for new users
            }
          }
        } catch (err) {
          // Silently fail - user might not exist yet
          setIsExistingUser(false);
          setCustomerName('');
          setName('');
        }
      } else {
        setIsExistingUser(false);
        setCustomerName('');
        setName('');
      }
    };

    const debounceTimer = setTimeout(checkUser, 500);
    return () => clearTimeout(debounceTimer);
  }, [phone]);

  // Validate phone number format
  const validatePhone = (value: string): boolean => {
    // Remove any non-digit characters
    const digits = value.replace(/\D/g, '');
    
    // Must be exactly 9 digits
    if (digits.length !== 9) {
      return false;
    }
    
    // Must start with 9 (Ethio Telecom) or 7 (Safaricom)
    if (!digits.startsWith('9') && !digits.startsWith('7')) {
      return false;
    }
    
    return true;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow digits
    const digits = value.replace(/\D/g, '');
    
    // Limit to 9 digits
    if (digits.length <= 9) {
      setPhone(digits);
      setPhoneError('');
      
      // Validate when user stops typing
      if (digits.length === 9) {
        if (!validatePhone(digits)) {
          setPhoneError('Phone number must start with 9 or 7');
        }
      }
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow editing if not an existing user
    if (!isExistingUser) {
      setName(e.target.value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setPhoneError('');

    // Validate phone number
    if (!validatePhone(phone)) {
      setPhoneError('Phone number must be 9 digits starting with 9 or 7');
      setLoading(false);
      return;
    }

    const fullPhone = `+251${phone}`;

    try {
      if (isExistingUser) {
        // Sign in existing customer
        const response = await fetch('/api/v2/customer/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: fullPhone }),
        });

        if (response.ok) {
          const data = await response.json();
          
          if (data.customer) {
            // Store customer data
            localStorage.setItem('customerName', data.customer.name || '');
            localStorage.setItem('customerPhone', data.customer.phone || fullPhone);
            localStorage.setItem('totalVisits', (data.customer.totalVisits || 0).toString());
            localStorage.setItem('lastVisit', data.customer.lastVisit || new Date().toISOString());
            
            // Redirect to customer dashboard
            router.push('/dashboard/customer');
          } else {
            setError('Customer not found. Please sign up first.');
          }
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Customer not found' }));
          setError(errorData.error || 'Customer not found. Please sign up first.');
        }
      } else {
        // Register new customer - name is required
        if (!name.trim()) {
          setError('Name is required for registration');
          setLoading(false);
          return;
        }

        const response = await fetch('/api/customer/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name.trim(), phone: fullPhone }),
        });

        if (response.ok) {
          const data = await response.json();
          
          // Store customer data
          localStorage.setItem('customerName', data.name || name);
          localStorage.setItem('customerPhone', data.phone || fullPhone);
          localStorage.setItem('totalVisits', (data.totalVisits || 0).toString());
          localStorage.setItem('lastVisit', new Date().toISOString());
          
          // Redirect to customer dashboard
          router.push('/dashboard/customer');
        } else {
          const data = await response.json().catch(() => ({ error: 'Registration failed' }));
          setError(data.error || 'Registration failed');
        }
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen overflow-hidden" style={{ backgroundColor: '#F4F4F4' }}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2, duration: 0.6 }}
        className="flex flex-col mx-auto relative"
        style={{
          width: '430px',
          maxWidth: '100vw',
          height: '100vh',
          backgroundColor: '#F4F4F4',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Content Container - Compact layout with space for footer */}
        <div className="flex flex-col items-center px-4 w-full" style={{ 
          paddingTop: '40px',
          paddingBottom: '80px',
          minHeight: 'calc(100vh - 80px)',
          maxHeight: 'calc(100vh - 80px)',
          overflowY: 'auto',
          overflowX: 'hidden',
        }}>
        
        {/* Logo - Larger size */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.2, duration: 0.5 }}
          className="mb-6 flex items-center justify-center"
        >
          <Image
            src="/Frame 2.png"
            alt="Lewis Retails Supermarket"
            width={280}
            height={110}
            className="object-contain"
            priority
          />
        </motion.div>

        {/* Form */}
        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.4, duration: 0.5 }}
          onSubmit={handleSubmit}
          className="w-full space-y-5 max-w-sm"
        >
          {/* Mobile Number Field */}
          <div>
            <label 
              htmlFor="phone" 
              className="block text-sm font-medium mb-2"
              style={{ color: '#FF701A' }}
            >
              Mobile Number
            </label>
            <div className="flex border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-[#FF701A] focus-within:border-[#FF701A]">
              {/* Country Code - Fixed */}
              <div 
                className="px-4 py-3 bg-gray-50 border-r border-gray-300 flex items-center text-gray-700 font-medium"
                style={{ minWidth: '70px' }}
              >
                +251
              </div>
              {/* Phone Input */}
              <input
                id="phone"
                type="tel"
                value={phone}
                onChange={handlePhoneChange}
                placeholder="enter here"
                maxLength={9}
                className="flex-1 px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none bg-white"
                required
              />
            </div>
            {phoneError && (
              <p className="mt-1 text-sm text-red-600">{phoneError}</p>
            )}
          </div>

          {/* Name Field - Always visible, readonly for existing users */}
          <div>
            <label 
              htmlFor="name" 
              className="block text-sm font-medium mb-2"
              style={{ color: '#FF701A' }}
            >
              Name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={handleNameChange}
              placeholder="enter here"
              readOnly={isExistingUser}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF701A] focus:border-[#FF701A] bg-white"
              style={{
                cursor: isExistingUser ? 'not-allowed' : 'text',
                backgroundColor: isExistingUser ? '#f9fafb' : 'white',
              }}
              required={!isExistingUser}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || !validatePhone(phone) || (!isExistingUser && !name.trim())}
            className="w-full text-white font-bold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            style={{
              backgroundColor: '#FF701A',
              height: '54px',
              fontFamily: 'Montserrat, sans-serif',
              fontWeight: 700,
              fontSize: '14px',
              lineHeight: '100%',
              letterSpacing: '0%',
            }}
            onMouseEnter={(e) => {
              if (!e.currentTarget.disabled) {
                e.currentTarget.style.opacity = '0.9';
              }
            }}
            onMouseLeave={(e) => {
              if (!e.currentTarget.disabled) {
                e.currentTarget.style.opacity = '1';
              }
            }}
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <span>{isExistingUser ? 'Sign In' : 'Register'}</span>
            )}
          </button>
        </motion.form>

        {/* How To Get Reward Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.6, duration: 0.5 }}
          className="w-full max-w-sm mx-auto mt-6 flex flex-col items-center"
        >
          {/* Title */}
          <h2
            style={{
              fontFamily: 'Montserrat, sans-serif',
              fontWeight: 600,
              fontStyle: 'normal',
              fontSize: '18px',
              lineHeight: '130%',
              letterSpacing: '0%',
              textAlign: 'center',
              color: '#8E8E93',
              marginBottom: '20px',
            }}
          >
            How To Get Reward
          </h2>

          {/* Infographic Image */}
          <div className="flex items-center justify-center" style={{ marginBottom: '20px' }}>
            <Image
              src="/Frame 1000002089 (1).png"
              alt="How to get reward process"
              width={342}
              height={101}
              className="object-contain"
              priority
            />
          </div>

          {/* Motto */}
          <p
            style={{
              fontFamily: 'Montserrat, sans-serif',
              fontWeight: 600,
              fontStyle: 'normal',
              fontSize: '12px',
              lineHeight: '130%',
              letterSpacing: '0%',
              textAlign: 'center',
              color: '#8E8E93',
              marginTop: '0px',
            }}
          >
            Your receipt holds value at our shop
          </p>
        </motion.div>
        </div>

      </motion.div>
      
      {/* Add Montserrat font */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;700&display=swap');
        body {
          font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          margin: 0;
          padding: 0;
        }
        html, body, #__next {
          height: 100%;
          overflow-x: hidden;
        }
      `}</style>
    </div>
  );
}
