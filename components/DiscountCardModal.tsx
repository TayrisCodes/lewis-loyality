'use client';

import { motion } from 'framer-motion';
import Image from 'next/image';
import QRCode from 'react-qr-code';

interface DiscountCardModalProps {
  reward: {
    id: string;
    discountCode?: string;
    discountPercent?: number;
    qrCode?: string;
    expiresAt?: string;
    status?: 'pending' | 'claimed' | 'redeemed' | 'used' | 'expired';
  };
  onClose: () => void;
}

export default function DiscountCardModal({ reward, onClose }: DiscountCardModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative w-full max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Background Blur Image */}
        <div className="absolute inset-0 rounded-xl overflow-hidden">
          <Image
            src="/Vector (6).png"
            alt="Background"
            fill
            className="object-cover"
            style={{ filter: 'blur(8px)', transform: 'scale(1.1)' }}
          />
          <div className="absolute inset-0 bg-black/30"></div>
        </div>

        {/* Discount Card */}
        <div
          className="relative rounded-xl p-6 text-white"
          style={{
            background: 'linear-gradient(135deg, #FF701A 0%, #FF8C42 100%)',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-white/20 rounded-full hover:bg-white/30 transition-colors z-10"
          >
            <span className="text-white text-xl leading-none">×</span>
          </button>

          {/* Lewis Logo - Top Left */}
          <div className="mb-3">
            <Image
              src="/Lewis_Retails_logo_2.png"
              alt="Lewis Retails"
              width={60}
              height={60}
              className="object-contain"
            />
            <div className="text-white text-xs mt-1">
              <div className="font-semibold">Lewis Retails</div>
              <div>Supermarket</div>
            </div>
          </div>

          {/* Title */}
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-3xl font-bold">Discount Card</h2>
            {reward.status === 'used' && (
              <span className="px-3 py-1 bg-white/30 rounded-full text-xs font-semibold">
                Used
              </span>
            )}
          </div>

          {/* Divider */}
          <div className="h-px bg-white/30 mb-3"></div>

          {/* Scan, Earn, Reward */}
          <div className="flex justify-around text-sm mb-6">
            <span>Scan</span>
            <span>Earn</span>
            <span className="font-bold">Reward</span>
          </div>

          {/* Discount Info */}
          <div className="flex justify-between items-center bg-white/20 rounded-lg p-4 mb-6">
            <div>
              <p className="text-xs opacity-90 mb-1">Discount:</p>
              <p className="text-2xl font-bold">{reward.discountPercent || 10}%</p>
            </div>
            <div className="text-right">
              <p className="text-xs opacity-90 mb-1">Expiry date</p>
              <p className="text-sm font-bold">
                {reward.expiresAt
                  ? new Date(reward.expiresAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: '2-digit',
                      year: 'numeric'
                    })
                  : 'N/A'}
              </p>
            </div>
          </div>

          {/* Divider */}
          <div className="h-px bg-white/30 mb-6"></div>

          {/* QR Code */}
          {reward.qrCode ? (
            <div className="bg-white p-4 rounded-lg flex flex-col items-center">
              <div className="w-48 h-48 bg-white flex items-center justify-center rounded-lg border-2 border-white/50 p-2">
                <QRCode
                  value={reward.qrCode}
                  size={176}
                  level="H"
                  className="w-full h-full"
                />
              </div>
              <p className="text-orange-900 font-bold mt-3 text-sm">Scan to Casher</p>
              {reward.discountCode && (
                <p className="text-xs text-orange-700 mt-1 font-mono">
                  Code: {reward.discountCode}
                </p>
              )}
            </div>
          ) : (
            <div className="bg-white/20 rounded-lg p-6 text-center">
              <p className="text-sm">QR Code will be available after redemption</p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}



