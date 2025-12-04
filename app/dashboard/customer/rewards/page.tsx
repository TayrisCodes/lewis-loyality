'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { User, Eye, Share2, ArrowLeft } from 'lucide-react';
import DiscountCardModal from '@/components/DiscountCardModal';
import Image from 'next/image';

interface Reward {
  id: string;
  storeName?: string;
  storeAddress?: string;
  rewardType?: string;
  dateIssued?: string;
  expiresAt?: string;
  status: 'pending' | 'claimed' | 'redeemed' | 'used' | 'expired';
  discountCode?: string;
  discountPercent?: number;
  qrCode?: string;
}

export default function CustomerRewardsPage() {
  const router = useRouter();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [customerName, setCustomerName] = useState('Customer');
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);

  useEffect(() => {
    fetchRewards();
  }, []);

  const fetchRewards = async () => {
    const phone = localStorage.getItem('customerPhone') || localStorage.getItem('customer_phone');
    const name = localStorage.getItem('customerName') || localStorage.getItem('customer_name') || 'Customer';
    
    setCustomerName(name);
    
    if (!phone) {
      window.location.href = '/customer-auth';
      return;
    }

    try {
      // Fetch reward status which includes recent rewards
      const statusRes = await fetch(`/api/customer/rewards/status?phone=${encodeURIComponent(phone)}`);
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        const allRewards = statusData.recentRewards || [];
        
        // Sort by date (newest first)
        allRewards.sort((a: Reward, b: Reward) => {
          const dateA = a.dateIssued ? new Date(a.dateIssued).getTime() : 0;
          const dateB = b.dateIssued ? new Date(b.dateIssued).getTime() : 0;
          return dateB - dateA;
        });
        
        setRewards(allRewards);
      }

      // Also fetch from legacy endpoint for backward compatibility
      const rewardsRes = await fetch(`/api/customer/${phone}/rewards`);
      if (rewardsRes.ok) {
        const data = await rewardsRes.json();
        if (data.rewards && data.rewards.length > 0) {
          // Merge with existing rewards
          const existingIds = new Set(rewards.map(r => r.id));
          const newRewards = data.rewards.filter((r: Reward) => !existingIds.has(r.id));
          setRewards(prev => [...prev, ...newRewards]);
        }
      }
    } catch (error) {
      console.error('Error fetching rewards:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewReward = (reward: Reward) => {
    setSelectedReward(reward);
  };

  const handleShareReward = async (reward: Reward) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Reward from Lewis Retails',
          text: `Check out my reward: ${reward.discountPercent || 10}% discount!`,
          url: window.location.href,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      // Fallback: copy to clipboard
      const text = `My Reward from Lewis Retails: ${reward.discountPercent || 10}% discount! ${window.location.href}`;
      navigator.clipboard.writeText(text).then(() => {
        alert('Reward link copied to clipboard!');
      });
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50" style={{ backgroundColor: '#F4F4F4' }}>
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading rewards...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20" style={{ backgroundColor: '#F4F4F4' }}>
      <div className="max-w-md mx-auto bg-white min-h-screen relative pb-20" style={{ maxWidth: '430px' }}>
        
        {/* Header - Back arrow, Name left, Profile icon right */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/dashboard/customer')}
              className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 transition-colors mb-2"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={() => router.push('/dashboard/customer/profile')}
              className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 transition-colors"
            >
              <User className="w-5 h-5 text-gray-600" />
            </button>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">
            Hi {customerName.split(' ')[0]}
          </h1>
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

        {/* Reward List - Card with Logo (Excluding Used - they go to history) */}
        <div className="px-6 mb-6 space-y-3">
          {rewards.filter(r => r.status !== 'used').length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">No active rewards yet</p>
              <p className="text-sm text-gray-500">Keep visiting stores to earn rewards!</p>
            </div>
          ) : (
            rewards
              .filter(r => r.status !== 'used') // Exclude used rewards from main list
              .map((reward, index) => (
              <motion.div
                key={reward.id || index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative"
                style={{
                  width: '342px',
                  maxWidth: '100%',
                  height: '77px',
                  borderRadius: '11px',
                  padding: '14px 10px',
                  backgroundColor: 'white',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                }}
              >
                <div className="flex items-center gap-3 h-full">
                  {/* Lewis Logo */}
                  <div
                    style={{
                      width: '49px',
                      height: '49px',
                      borderRadius: '11px',
                      border: '1px solid #E5E5E5',
                      overflow: 'hidden',
                      flexShrink: 0,
                    }}
                  >
                    <Image
                      src="/Lewis_Retails_logo_2.png"
                      alt="Lewis Retails"
                      width={49}
                      height={49}
                      className="object-cover w-full h-full"
                    />
                  </div>

                  {/* Reward Title */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">
                      {reward.rewardType || `Reward #${index + 1}`}
                    </h3>
                    {reward.status === 'redeemed' && reward.expiresAt && (
                      <p className="text-xs text-gray-500 mt-1">
                        Expires: {new Date(reward.expiresAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  {/* View and Share Icons */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <button
                      onClick={() => handleViewReward(reward)}
                      className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <Eye className="w-5 h-5 text-gray-600" />
                    </button>
                    <button
                      onClick={() => handleShareReward(reward)}
                      className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <Share2 className="w-5 h-5 text-gray-600" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* History Section - Used Rewards */}
        {rewards.filter(r => r.status === 'used').length > 0 && (
          <div className="px-6 mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">History</h2>
            <div className="space-y-3">
              {rewards
                .filter(r => r.status === 'used')
                .map((reward, index) => (
                  <motion.div
                    key={reward.id || index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="relative opacity-60"
                    style={{
                      width: '342px',
                      maxWidth: '100%',
                      height: '77px',
                      borderRadius: '11px',
                      padding: '14px 10px',
                      backgroundColor: 'white',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    }}
                  >
                    <div className="flex items-center gap-3 h-full">
                      {/* Lewis Logo */}
                      <div
                        style={{
                          width: '49px',
                          height: '49px',
                          borderRadius: '11px',
                          border: '1px solid #E5E5E5',
                          overflow: 'hidden',
                          flexShrink: 0,
                        }}
                      >
                        <Image
                          src="/Lewis_Retails_logo_2.png"
                          alt="Lewis Retails"
                          width={49}
                          height={49}
                          className="object-cover w-full h-full"
                        />
                      </div>

                      {/* Reward Title */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">
                          {reward.rewardType || `Reward #${index + 1}`}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">
                          Used - {reward.dateIssued ? new Date(reward.dateIssued).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>

                      {/* View and Share Icons - Allow viewing/sharing used rewards */}
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <button
                          onClick={() => handleViewReward(reward)}
                          className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors"
                          title="View Discount Card"
                        >
                          <Eye className="w-5 h-5 text-gray-600" />
                        </button>
                        <button
                          onClick={() => handleShareReward(reward)}
                          className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors"
                          title="Share Discount Card"
                        >
                          <Share2 className="w-5 h-5 text-gray-600" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
            </div>
          </div>
        )}

        {/* Discount Card Modal */}
        {selectedReward && (
          <DiscountCardModal
            reward={selectedReward}
            onClose={() => setSelectedReward(null)}
          />
        )}

      </div>

      {/* Add Montserrat font */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;700&display=swap');
        body {
          font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
      `}</style>
    </div>
  );
}
