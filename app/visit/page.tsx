'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface Store {
  id: string;
  name: string;
  address: string;
}

function VisitPageContent() {
  const searchParams = useSearchParams();
  const storeId = searchParams.get('storeId');
  const token = searchParams.get('token');

  const [step, setStep] = useState<'validating' | 'form' | 'scanning' | 'success' | 'error'>('validating');
  const [store, setStore] = useState<Store | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [existingCustomer, setExistingCustomer] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);

  useEffect(() => {
    if (storeId && token) {
      validateQR();
    } else {
      setStep('error');
      setError('Invalid QR code parameters');
    }
  }, [storeId, token]);

  const validateQR = async () => {
    try {
      const response = await fetch('/api/customer/validate-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storeId, token }),
      });

      const data = await response.json();

      if (response.ok && data.valid) {
        setStore(data.store);
        checkExistingCustomer();
      } else {
        setStep('error');
        setError(data.error || 'Invalid QR code');
      }
    } catch (error) {
      setStep('error');
      setError('Network error. Please try again.');
    }
  };

  const checkExistingCustomer = async () => {
    const savedPhone = localStorage.getItem('customerPhone');
    if (savedPhone) {
      setPhone(savedPhone);
      try {
        const response = await fetch('/api/customer/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: savedPhone }),
        });

        const data = await response.json();
        if (response.ok && data.exists) {
          setExistingCustomer(data);
          setName(data.name);
          setStep('scanning');
          handleScan(savedPhone);
        } else {
          setStep('form');
        }
      } catch (error) {
        setStep('form');
      }
    } else {
      setStep('form');
    }
  };

  const handleCheckPhone = async () => {
    if (!phone.trim()) return;

    setLoading(true);
    try {
      const response = await fetch('/api/customer/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim() }),
      });

      const data = await response.json();
      if (response.ok && data.exists) {
        setExistingCustomer(data);
        setName(data.name);
      } else {
        setExistingCustomer(null);
      }
    } catch (error) {
      console.error('Error checking phone:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!name.trim() || !phone.trim()) return;

    setLoading(true);
    try {
      const response = await fetch('/api/customer/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim() }),
      });

      const data = await response.json();
      if (response.ok) {
        localStorage.setItem('customerPhone', phone.trim());
        setStep('scanning');
        handleScan(phone.trim());
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleScan = async (phoneNumber: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/customer/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneNumber, storeId, token }),
      });

      const data = await response.json();
      if (response.ok) {
        setScanResult(data);
        setStep('success');
      } else {
        setStep('error');
        setError(data.error || 'Scan failed');
      }
    } catch (error) {
      setStep('error');
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'validating') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
          <h2 className="text-xl font-semibold">Validating QR Code...</h2>
        </motion.div>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-100">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md mx-auto p-6"
        >
          <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-red-800 mb-2">Invalid QR Code</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <p className="text-sm text-gray-600">
            Please use today's store QR code to visit.
          </p>
        </motion.div>
      </div>
    );
  }

  if (step === 'form') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        {/* Logo Section */}
        <div className="mb-6">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-primary rounded-2xl flex items-center justify-center shadow-lg">
            <span className="text-2xl sm:text-3xl font-bold text-primary-foreground">L</span>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <Card className="shadow-xl">
            <CardHeader className="text-center space-y-2">
              <CardTitle className="text-2xl sm:text-3xl">Welcome to {store?.name}</CardTitle>
              <p className="text-sm text-muted-foreground">{store?.address}</p>
              <p className="text-xs text-muted-foreground">
                {existingCustomer ? 'Confirm your visit' : 'Enter your details to visit'}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <AnimatePresence mode="wait">
                {!existingCustomer ? (
                  <motion.div
                    key="phone-step"
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-4"
                  >
                    <div>
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="Enter your phone number"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        onBlur={handleCheckPhone}
                        disabled={loading}
                      />
                    </div>

                    {phone && !existingCustomer && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                          id="name"
                          placeholder="Enter your full name"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          disabled={loading}
                        />
                      </motion.div>
                    )}

                    <Button
                      className="w-full mt-4"
                      onClick={handleRegister}
                      disabled={loading || !name.trim() || !phone.trim()}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Registering...
                        </>
                      ) : (
                        'Register & Visit'
                      )}
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="confirm-step"
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-4"
                  >
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                      <p className="text-green-800 dark:text-green-200 font-medium">
                        Welcome back, {existingCustomer.name}! 👋
                      </p>
                      <p className="text-green-600 dark:text-green-300 text-sm mt-1">
                        Total visits: {existingCustomer.totalVisits}
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                        Phone: {phone}
                      </p>
                    </div>

                    <Button
                      className="w-full"
                      onClick={() => handleScan(phone)}
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                          Recording Visit...
                        </>
                      ) : (
                        'Confirm Visit'
                      )}
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>

              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-red-600 text-sm text-center"
                >
                  {error}
                </motion.p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  if (step === 'scanning') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
          <h2 className="text-xl font-semibold">Recording your visit...</h2>
        </motion.div>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          >
            <CheckCircle className="w-20 h-20 text-green-600 mx-auto mb-6" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h2 className="text-3xl font-bold text-green-800 mb-2">Visit Recorded!</h2>
            <p className="text-green-700 mb-4">Thank you for visiting {store?.name}</p>

            <div className="bg-white rounded-lg p-4 mb-4 shadow-sm">
              <p className="text-lg font-semibold">Total Visits: {scanResult?.totalVisits}</p>
            </div>

            {scanResult?.rewardEarned && scanResult?.reward && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4"
              >
                <h3 className="text-lg font-bold text-yellow-800 mb-2">🎉 Congratulations!</h3>
                <p className="text-yellow-700">You've earned a {scanResult.reward.type}!</p>
                <p className="text-sm text-yellow-600 mt-1">
                  Code: <span className="font-mono font-bold">{scanResult.reward.code}</span>
                </p>
                <p className="text-xs text-yellow-600 mt-1">
                  Expires: {new Date(scanResult.reward.expiresAt).toLocaleDateString()}
                </p>
              </motion.div>
            )}

            <Button
              onClick={() => window.location.href = '/dashboard/customer'}
              className="w-full"
            >
              View My Dashboard
            </Button>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return null;
}

export default function VisitPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <VisitPageContent />
    </Suspense>
  );
}