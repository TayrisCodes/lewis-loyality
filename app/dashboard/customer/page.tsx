'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { User, Camera, Upload, Gift, Bell } from 'lucide-react';

// Countdown Timer Component
function CountdownTimer({ endDate, periodExpired }: { endDate: string | null; periodExpired: boolean }) {
  const [timeRemaining, setTimeRemaining] = useState<{ days: number; hours: number; minutes: number } | null>(null);

  useEffect(() => {
    if (!endDate || periodExpired) {
      setTimeRemaining(null);
      return;
    }

    const updateCountdown = () => {
      const now = new Date().getTime();
      const end = new Date(endDate).getTime();
      const difference = end - now;

      if (difference <= 0) {
        setTimeRemaining(null);
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));

      setTimeRemaining({ days, hours, minutes });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [endDate, periodExpired]);

  if (periodExpired) {
    return (
      <div className="mt-2">
        <p className="text-xs text-red-600 font-semibold">
          ⏰ Period expired! Visit count reset. Start earning again!
        </p>
      </div>
    );
  }

  if (!timeRemaining) {
    return null;
  }

  return (
    <div className="mt-2">
      <p className="text-xs text-orange-600 font-semibold">
        ⏰ {timeRemaining.days} {timeRemaining.days === 1 ? 'day' : 'days'} {timeRemaining.hours > 0 && `${timeRemaining.hours}h`} remaining to reach 5 visits
      </p>
    </div>
  );
}
import DiscountCardModal from '@/components/DiscountCardModal';
import Image from 'next/image';

interface CustomerData {
  name: string;
  phone: string;
  totalVisits: number;
  lastVisit: string;
}

interface Reward {
  id: string;
  storeName: string;
  storeAddress: string;
  rewardType: string;
  dateIssued: string;
  expiresAt: string;
  status: 'pending' | 'claimed' | 'redeemed' | 'used' | 'expired';
  code?: string;
  discountCode?: string;
  discountPercent?: number;
  qrCode?: string;
}

interface RewardStatus {
  visitsInPeriod: number;
  visitsNeeded: number;
  canClaim: boolean;
  periodStartDate?: string | null;
  periodEndDate?: string | null;
  daysRemaining?: number;
  periodExpired?: boolean;
  pendingRewards: Array<{
    id: string;
    code: string;
    issuedAt: string;
    expiresAt: string;
  }>;
  recentRewards: Reward[];
}

export default function CustomerDashboard() {
  const router = useRouter();
  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [rewardStatus, setRewardStatus] = useState<RewardStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [redeemedReward, setRedeemedReward] = useState<Reward | null>(null);
  const [showDiscountCard, setShowDiscountCard] = useState(false);

  useEffect(() => {
    fetchCustomerData();
    
    // Poll for reward status updates every 30 seconds
    const interval = setInterval(() => {
      fetchCustomerData();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchCustomerData = async () => {
    const phone = localStorage.getItem('customerPhone') || localStorage.getItem('customer_phone');
    
    if (!phone) {
      window.location.href = '/customer-auth';
      return;
    }

    try {
      setCustomer({
        name: localStorage.getItem('customerName') || localStorage.getItem('customer_name') || 'Customer',
        phone,
        totalVisits: parseInt(localStorage.getItem('totalVisits') || '0'),
        lastVisit: localStorage.getItem('lastVisit') || new Date().toISOString(),
      });

      // Fetch rewards
      const rewardsRes = await fetch(`/api/customer/${phone}/rewards`);
      if (rewardsRes.ok) {
        const rewardsData = await rewardsRes.json();
        setRewards(rewardsData.rewards || []);
        
        // Find claimed or redeemed reward (automatically claimed when 5 visits completed)
        // Exclude used rewards - they go to history
        const activeReward = rewardsData.rewards?.find((r: Reward) => 
          (r.status === 'claimed' || r.status === 'redeemed')
        );
        setRedeemedReward(activeReward || null);
      }

      // Fetch new reward status (5 visits within 45 days)
      const statusRes = await fetch(`/api/customer/rewards/status?phone=${encodeURIComponent(phone)}`);
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setRewardStatus({
          visitsInPeriod: statusData.visitsInPeriod || 0,
          visitsNeeded: statusData.visitsNeeded || 5,
          canClaim: statusData.canClaim || false,
          periodStartDate: statusData.periodStartDate || null,
          periodEndDate: statusData.periodEndDate || null,
          daysRemaining: statusData.daysRemaining || null,
          periodExpired: statusData.periodExpired || false,
          pendingRewards: statusData.pendingRewards || [],
          recentRewards: statusData.recentRewards || [],
        });

        // Check for claimed or redeemed reward (automatically claimed when 5 visits completed)
        const activeReward = statusData.recentRewards?.find((r: Reward) => 
          r.status === 'claimed' || r.status === 'redeemed'
        );
        if (activeReward) {
          setRedeemedReward(activeReward);
          // Close modal if reward was used
          if (activeReward.status === 'used') {
            setShowDiscountCard(false);
          }
        } else {
          // Check if current reward was used
          if (redeemedReward) {
            const wasUsed = statusData.recentRewards?.find((r: Reward) => 
              r.id === redeemedReward.id && r.status === 'used'
            );
            if (wasUsed) {
              // Reward was used by admin - clear it and close modal
              setRedeemedReward(null);
              setShowDiscountCard(false);
            }
          } else {
            // No active rewards found
            setRedeemedReward(null);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching customer data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Reward is automatically claimed when 5 visits are completed
  // No manual claim needed - reward button becomes clickable automatically

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">No customer data found</h2>
          <Button onClick={() => window.location.href = '/customer-auth'}>
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  const visitsInPeriod = rewardStatus?.visitsInPeriod || 0;
  const visitsNeeded = rewardStatus?.visitsNeeded || 5;
  const canClaim = rewardStatus?.canClaim || false;
  const pendingRewards = rewardStatus?.pendingRewards || [];

  return (
    <div className="min-h-screen bg-gray-50 pb-20" style={{ backgroundColor: '#F4F4F4' }}>
      <div className="max-w-md mx-auto bg-white min-h-screen pb-20" style={{ maxWidth: '430px' }}>
        
        {/* Header - Name left, Profile icon right */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <h1 className="text-2xl font-bold text-gray-900">
            Hi {customer.name.split(' ')[0]}
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/dashboard/customer/notifications')}
              className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 transition-colors"
              title="Notification Settings"
            >
              <Bell className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={() => router.push('/dashboard/customer/profile')}
              className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 transition-colors"
            >
              <User className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Gift Box Image */}
        <div className="flex justify-center my-6">
          <div className="relative w-48 h-48 flex items-center justify-center">
            <Image
              src="/gift_svgrepo.com.png"
              alt="Gift Box"
              width={192}
              height={192}
              className="object-contain"
              priority
            />
          </div>
        </div>

        {/* Reward Button - Automatically clickable when 5 visits completed, gray when used */}
        <div className="flex justify-center mb-6 relative">
          {redeemedReward && redeemedReward.status === 'used' ? (
            // Show gray disabled button when reward is used
            <Button
              disabled
              className="relative"
              style={{
                width: '143px',
                height: '31px',
                borderRadius: '999px',
                padding: '11px 18px',
                backgroundColor: '#E5E5E5',
                color: '#9CA3AF',
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'not-allowed',
              }}
            >
              Reward
            </Button>
          ) : redeemedReward && (redeemedReward.status === 'claimed' || redeemedReward.status === 'redeemed') ? (
            // Show animated button when reward is available (claimed or redeemed) - clickable to view discount card
            <motion.div
              className="relative"
              animate={{
                scale: [1, 1.05, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              {/* Pulsing Ring Effect */}
              <motion.div
                className="absolute inset-0 bg-orange-400 rounded-full opacity-30"
                style={{
                  width: '143px',
                  height: '31px',
                  borderRadius: '999px',
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                }}
                animate={{
                  scale: [1, 1.3, 1],
                  opacity: [0.3, 0, 0.3],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
              <Button
                onClick={() => setShowDiscountCard(true)}
                className="relative z-10"
                style={{
                  width: '143px',
                  height: '31px',
                  borderRadius: '999px',
                  padding: '11px 18px',
                  backgroundColor: '#FF701A',
                  color: 'white',
                  fontWeight: 700,
                  fontSize: '14px',
                }}
              >
                Reward
              </Button>
            </motion.div>
          ) : (
            <Button
              disabled
              className="relative"
              style={{
                width: '143px',
                height: '31px',
                borderRadius: '999px',
                padding: '11px 18px',
                backgroundColor: '#E5E5E5',
                color: '#9CA3AF',
                fontWeight: 700,
                fontSize: '14px',
                cursor: 'not-allowed',
              }}
            >
              Reward
            </Button>
          )}
        </div>

        {/* Progress Cards (5 Visits) */}
        <div className="flex justify-center gap-2 px-6 mb-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className={`w-16 h-16 rounded-lg flex flex-col items-center justify-center ${
                index < visitsInPeriod
                  ? 'bg-green-500'
                  : 'bg-white border-2 border-gray-300'
              }`}
            >
              {index < visitsInPeriod ? (
                <Image
                  src="/gift_svgrepo.com.png"
                  alt="Visit"
                  width={32}
                  height={32}
                  className="object-contain mb-1"
                />
              ) : (
                <Gift className="w-6 h-6 text-gray-400 mb-1" />
              )}
              <span className={`text-xs font-bold ${index < visitsInPeriod ? 'text-white' : 'text-gray-400'}`}>
                +1 Visit
              </span>
            </div>
          ))}
        </div>

        {/* Progress Text with Countdown */}
        <div className="text-center mb-6">
          <p className="text-sm text-gray-600">
            {visitsInPeriod} / {visitsNeeded} visits within 45 days
          </p>
          {rewardStatus && rewardStatus.periodEndDate && (
            <CountdownTimer 
              endDate={rewardStatus.periodEndDate}
              periodExpired={rewardStatus.periodExpired || false}
            />
          )}
        </div>

        {/* Reward is automatically claimed when 5 visits are completed - no claim button needed */}

        {/* Discount Card Modal */}
        {showDiscountCard && redeemedReward && (redeemedReward.status === 'claimed' || redeemedReward.status === 'redeemed') && (
          <DiscountCardModal
            reward={redeemedReward}
            onClose={() => setShowDiscountCard(false)}
          />
        )}

        {/* Upload and Camera Buttons */}
        <div className="px-6 mb-6 space-y-3">
          <Button
            onClick={() => {
              router.push(`/customer-receipt?phone=${encodeURIComponent(customer.phone)}&mode=camera`);
            }}
            className="w-full"
            style={{
              backgroundColor: '#FF701A',
              color: 'white',
              height: '56px',
              borderRadius: '12px',
              fontWeight: 600,
              fontSize: '16px',
            }}
          >
            <Camera className="w-5 h-5 mr-2" />
            Open Camera
          </Button>
          
          <Button
            onClick={() => {
              router.push(`/customer-receipt?phone=${encodeURIComponent(customer.phone)}&mode=upload`);
            }}
            variant="outline"
            className="w-full border-2 border-dashed border-gray-300 hover:border-gray-400"
            style={{
              height: '56px',
              borderRadius: '12px',
              fontWeight: 600,
              fontSize: '16px',
            }}
          >
            <Upload className="w-5 h-5 mr-2" />
            Upload Receipt
          </Button>
        </div>

      </div>

      {/* Add Montserrat font */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap');
        body {
          font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
      `}</style>
    </div>
  );
}
