"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { QrCode, History, Star, Gift, TrendingUp } from "lucide-react";
import { Logo } from "@/components/ui/logo";

export default function Home() {
  const router = useRouter();

  const handleVisit = () => {
    // Navigate to customer QR scan page
    router.push("/customer");
  };

  const handleVisitHistory = () => {
    // Navigate to customer authentication page
    router.push("/customer-auth");
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 relative overflow-hidden">
      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4">
        {/* Logo and Branding */}
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <div className="flex items-center justify-center mb-6">
            <Logo size="xl" />
          </div>
          
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-4"
          >
            Lewis Retails
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="text-xl md:text-2xl text-brand-green font-semibold mb-2"
          >
            Loyalty Program
          </motion.p>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="text-lg text-gray-600 dark:text-gray-400"
          >
            Scan, Visit, Earn Rewards
          </motion.p>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.8 }}
          className="w-full max-w-md space-y-4"
        >
          {/* Visit Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleVisit}
            className="w-full bg-brand-green hover:bg-brand-green/90 text-white font-bold py-6 px-8 rounded-lg shadow-lg transition-all duration-200"
          >
            <div className="flex items-center justify-center space-x-4">
              <QrCode className="w-8 h-8" />
              <span className="text-2xl">Visit Store</span>
            </div>
          </motion.button>

          {/* Visit History Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleVisitHistory}
            className="w-full bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-brand-coral text-gray-900 dark:text-white font-bold py-6 px-8 rounded-lg shadow-lg transition-all duration-200"
          >
            <div className="flex items-center justify-center space-x-4">
              <History className="w-8 h-8" />
              <span className="text-2xl">Visit History</span>
            </div>
          </motion.button>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.8 }}
          className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl w-full"
        >
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-brand-coral flex items-center justify-center">
              <QrCode className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Quick Scan</h3>
            <p className="text-gray-600 dark:text-gray-400">Scan QR code to record your visit instantly</p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-brand-green flex items-center justify-center">
              <Star className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Earn Points</h3>
            <p className="text-gray-600 dark:text-gray-400">Collect points with every visit to our stores</p>
          </div>
          
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-brand-coral flex items-center justify-center">
              <Gift className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Get Rewards</h3>
            <p className="text-gray-600 dark:text-gray-400">Redeem amazing rewards and special offers</p>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6, duration: 0.8 }}
          className="mt-16 text-center"
        >
          <p className="text-gray-500 dark:text-gray-600 text-sm">
            © 2024 Lewis Retails. All rights reserved.
          </p>
        </motion.div>
      </div>
    </div>
  );
}




