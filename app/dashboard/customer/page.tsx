'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { motion } from 'framer-motion';
import { User, MapPin, Gift, TrendingUp, QrCode } from 'lucide-react';

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
  status: 'unused' | 'used' | 'expired';
}

export default function CustomerDashboard() {
  const [customer, setCustomer] = useState<CustomerData | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCustomerData();
  }, []);

  const fetchCustomerData = async () => {
    // Check for both possible localStorage keys
    const phone = localStorage.getItem('customerPhone') || localStorage.getItem('customer_phone');
    console.log('localStorage keys:', {
      customerPhone: localStorage.getItem('customerPhone'),
      customer_phone: localStorage.getItem('customer_phone'),
      customerName: localStorage.getItem('customerName'),
      customer_name: localStorage.getItem('customer_name'),
      totalVisits: localStorage.getItem('totalVisits'),
      lastVisit: localStorage.getItem('lastVisit')
    });
    
    if (!phone) {
      console.log('No phone found in localStorage, redirecting to auth');
      window.location.href = '/customer-auth';
      return;
    }

    try {
      // For now, we'll get customer data from localStorage and simulate API calls
      // In a real app, you'd fetch from /api/customer/profile
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
        console.log('Rewards API response:', rewardsData);
        setRewards(rewardsData.rewards || []);
      } else {
        console.error('Failed to fetch rewards:', rewardsRes.status, rewardsRes.statusText);
      }
    } catch (error) {
      console.error('Error fetching customer data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVisit = () => {
    // In a real app, this would open a QR scanner
    // For now, redirect to visit page
    window.location.href = '/visit';
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  if (!customer) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">No customer data found</h2>
          <Button onClick={() => window.location.href = '/visit'}>
            Start Visiting
          </Button>
        </div>
      </div>
    );
  }

  const nextRewardVisits = 5 - (customer.totalVisits % 5);
  const progressPercentage = ((customer.totalVisits % 5) / 5) * 100;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Hi {customer.name} 👋
          </h1>
          <p className="text-gray-600 dark:text-gray-400">Welcome to Lewis Retails Loyalty</p>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Visits</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{customer.totalVisits}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rewards Earned</CardTitle>
              <Gift className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{rewards.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Last Visit</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-sm">
                {new Date(customer.lastVisit).toLocaleDateString()}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Next Reward Progress */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Next Reward Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span>{customer.totalVisits % 5} / 5 visits</span>
                <span>{nextRewardVisits} visits to go</span>
              </div>
              <Progress value={progressPercentage} className="w-full" />
              <p className="text-center text-sm text-muted-foreground">
                {nextRewardVisits} more visits to earn your next reward!
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Visit Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center"
        >
          <Button
            size="lg"
            onClick={handleVisit}
            className="px-8 py-4 text-lg bg-brand-green hover:bg-brand-green/90"
          >
            <QrCode className="w-5 h-5 mr-2" />
            Visit a Store
          </Button>
        </motion.div>

        {/* Recent Rewards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>My Rewards</CardTitle>
            </CardHeader>
            <CardContent>
              {rewards.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No rewards yet. Keep visiting stores to earn rewards!
                </p>
              ) : (
                <div className="space-y-4">
                  {rewards.map((reward, index) => (
                    <div
                      key={reward.id || index}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <h3 className="font-semibold">{reward.rewardType}</h3>
                        <p className="text-sm text-muted-foreground">
                          Store: {reward.storeName}
                        </p>
                        {reward.storeAddress && (
                          <p className="text-xs text-muted-foreground">
                            {reward.storeAddress}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Issued: {new Date(reward.dateIssued).toLocaleDateString()}
                        </p>
                        {reward.expiresAt && (
                          <p className="text-xs text-muted-foreground">
                            Expires: {new Date(reward.expiresAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <Badge variant={reward.status === 'unused' ? 'default' : 'secondary'}>
                        {reward.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex gap-4 justify-center"
        >
          <Button variant="outline" onClick={() => window.location.href = '/dashboard/customer/rewards'}>
            View All Rewards
          </Button>
          <Button variant="outline" onClick={() => window.location.href = '/dashboard/customer/profile'}>
            Profile Settings
          </Button>
        </motion.div>
      </div>
    </div>
  );
}