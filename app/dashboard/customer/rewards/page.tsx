'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion } from 'framer-motion';
import { ArrowLeft, Gift, Calendar, MapPin, Store, TrendingUp, CheckCircle, XCircle, Clock } from 'lucide-react';

interface Reward {
  id: string;
  storeName: string;
  storeAddress: string;
  rewardType: string;
  dateIssued: string;
  expiresAt: string;
  status: 'unused' | 'used' | 'expired';
}

export default function CustomerRewardsPage() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [customerName, setCustomerName] = useState('Customer');

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
      const response = await fetch(`/api/customer/${phone}/rewards`);
      if (response.ok) {
        const data = await response.json();
        setRewards(data.rewards || []);
      } else {
        console.error('Failed to fetch rewards:', response.status);
      }
    } catch (error) {
      console.error('Error fetching rewards:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterRewards = (status: 'all' | 'unused' | 'used' | 'expired') => {
    if (status === 'all') return rewards;
    return rewards.filter(reward => reward.status === status);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'unused':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'used':
        return <CheckCircle className="w-4 h-4 text-gray-400" />;
      case 'expired':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'unused':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'used':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      case 'expired':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    }
  };

  const RewardCard = ({ reward, index }: { reward: Reward; index: number }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card className="hover:shadow-lg transition-shadow dark:bg-gray-800">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
                <Gift className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold dark:text-white">{reward.rewardType}</h3>
                <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {getStatusIcon(reward.status)}
                  <span className="capitalize">{reward.status}</span>
                </div>
              </div>
            </div>
            <Badge className={getStatusColor(reward.status)}>
              {reward.status.toUpperCase()}
            </Badge>
          </div>

          <div className="space-y-3">
            <div className="flex items-start gap-2 text-sm">
              <Store className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium dark:text-white">{reward.storeName}</p>
                {reward.storeAddress && (
                  <p className="text-gray-600 dark:text-gray-400">{reward.storeAddress}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-3 border-t dark:border-gray-700">
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Issued</p>
                  <p className="font-medium dark:text-white">
                    {new Date(reward.dateIssued).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {reward.expiresAt && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Expires</p>
                    <p className="font-medium dark:text-white">
                      {new Date(reward.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {reward.status === 'unused' && (
            <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-900/50">
              <p className="text-sm text-green-800 dark:text-green-400 text-center">
                ✨ This reward is ready to use!
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading rewards...</p>
        </div>
      </div>
    );
  }

  const unusedRewards = filterRewards('unused');
  const usedRewards = filterRewards('used');
  const expiredRewards = filterRewards('expired');

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <Button
            variant="outline"
            onClick={() => window.location.href = '/dashboard/customer'}
            className="bg-white dark:bg-gray-800"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
              My Rewards
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {customerName}'s Loyalty Rewards
            </p>
          </div>
          <div className="w-32"></div> {/* Spacer for centering */}
        </motion.div>

        {/* Stats Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-4 gap-4"
        >
          <Card className="dark:bg-gray-800">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Rewards</p>
                <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 mt-2">
                  {rewards.length}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="dark:bg-gray-800">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">Available</p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">
                  {unusedRewards.length}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="dark:bg-gray-800">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">Used</p>
                <p className="text-3xl font-bold text-gray-600 dark:text-gray-400 mt-2">
                  {usedRewards.length}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="dark:bg-gray-800">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">Expired</p>
                <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-2">
                  {expiredRewards.length}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Rewards List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 dark:text-white">
                <Gift className="w-5 h-5" />
                All Rewards
              </CardTitle>
            </CardHeader>
            <CardContent>
              {rewards.length === 0 ? (
                <div className="text-center py-12">
                  <Gift className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-lg text-gray-600 dark:text-gray-400 mb-2">
                    No rewards yet
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
                    Keep visiting stores to earn rewards!
                  </p>
                  <Button onClick={() => window.location.href = '/visit'}>
                    Visit a Store
                  </Button>
                </div>
              ) : (
                <Tabs defaultValue="all" className="w-full">
                  <TabsList className="grid w-full grid-cols-4 dark:bg-gray-700">
                    <TabsTrigger value="all">
                      All ({rewards.length})
                    </TabsTrigger>
                    <TabsTrigger value="unused">
                      Available ({unusedRewards.length})
                    </TabsTrigger>
                    <TabsTrigger value="used">
                      Used ({usedRewards.length})
                    </TabsTrigger>
                    <TabsTrigger value="expired">
                      Expired ({expiredRewards.length})
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="all" className="space-y-4 mt-6">
                    {rewards.length > 0 ? (
                      rewards.map((reward, index) => (
                        <RewardCard key={reward.id || index} reward={reward} index={index} />
                      ))
                    ) : (
                      <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                        No rewards found
                      </p>
                    )}
                  </TabsContent>

                  <TabsContent value="unused" className="space-y-4 mt-6">
                    {unusedRewards.length > 0 ? (
                      unusedRewards.map((reward, index) => (
                        <RewardCard key={reward.id || index} reward={reward} index={index} />
                      ))
                    ) : (
                      <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                        No available rewards
                      </p>
                    )}
                  </TabsContent>

                  <TabsContent value="used" className="space-y-4 mt-6">
                    {usedRewards.length > 0 ? (
                      usedRewards.map((reward, index) => (
                        <RewardCard key={reward.id || index} reward={reward} index={index} />
                      ))
                    ) : (
                      <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                        No used rewards
                      </p>
                    )}
                  </TabsContent>

                  <TabsContent value="expired" className="space-y-4 mt-6">
                    {expiredRewards.length > 0 ? (
                      expiredRewards.map((reward, index) => (
                        <RewardCard key={reward.id || index} reward={reward} index={index} />
                      ))
                    ) : (
                      <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                        No expired rewards
                      </p>
                    )}
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Action Buttons */}
        {rewards.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex gap-4 justify-center pb-6"
          >
            <Button
              onClick={() => window.location.href = '/visit'}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Earn More Rewards
            </Button>
          </motion.div>
        )}
      </div>
    </div>
  );
}








