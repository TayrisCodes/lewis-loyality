'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sidebar } from '@/components/dashboard/sidebar';
import { motion } from 'framer-motion';
import { 
  ArrowLeft,
  User,
  Phone,
  Mail,
  Calendar,
  Gift,
  Store,
  TrendingUp,
  Clock,
  DollarSign,
  Activity,
  RefreshCw,
  Award,
  Target,
  BarChart3
} from 'lucide-react';
import ApiClient, { AuthUtils } from '@/lib/api-client';

interface CustomerDetail {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  totalVisits: number;
  totalRewards: number;
  totalSpent: number;
  averageVisitFrequency: number;
  lastVisit?: string;
  registeredAt: string;
  isActive: boolean;
  visitHistory: Array<{
    _id: string;
    visitDate: string;
    rewardsEarned: number;
    amountSpent?: number;
  }>;
  rewardHistory: Array<{
    _id: string;
    rewardType: string;
    amount: number;
    earnedAt: string;
  }>;
  statistics: {
    averageSpendingPerVisit: number;
    longestStreak: number;
    currentStreak: number;
    monthlyVisits: Array<{ month: string; visits: number }>;
  };
  storeInfo: {
    name: string;
    address: string;
  };
}

export default function AdminCustomerDetailPage() {
  const router = useRouter();
  const params = useParams();
  const customerId = params.id as string;
  
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is authenticated and is admin
    if (!AuthUtils.isAuthenticated() || !AuthUtils.isAdmin()) {
      router.push('/login');
      return;
    }
    fetchCustomerDetail();
  }, [router, customerId]);

  const fetchCustomerDetail = async () => {
    try {
      setError(null);
      setLoading(true);
      
      const customerData = await ApiClient.get<CustomerDetail>(`/api/admin/customers/${customerId}`);
      setCustomer(customerData);
    } catch (error: any) {
      console.error('Error fetching customer detail:', error);
      setError(error.error || 'Failed to fetch customer data');
      if (error.status === 401) {
        AuthUtils.clearAuth();
        router.push('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    return `${Math.floor(diffInDays / 30)} months ago`;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar role="admin" />
        <div className="flex-1 lg:ml-64 flex justify-center items-center">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading customer details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar role="admin" />
        <div className="flex-1 lg:ml-64 flex justify-center items-center">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error || 'Customer not found'}</p>
            <Button onClick={() => router.push('/dashboard/admin/customers')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Customers
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar role="admin" />

      <div className="flex-1 lg:ml-64">
        <div className="p-6 space-y-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => router.push('/dashboard/admin/customers')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Customers
              </Button>
              <div>
                <h1 className="text-3xl font-bold">{customer.name}</h1>
                <p className="text-gray-600">Customer Details - {customer.storeInfo.name}</p>
              </div>
            </div>
            <Button onClick={fetchCustomerDetail} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </motion.div>

          {/* Store Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Store className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-blue-900">{customer.storeInfo.name}</h3>
                    <p className="text-sm text-blue-700">{customer.storeInfo.address}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Customer Info Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Visits</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{customer.totalVisits}</div>
                <p className="text-xs text-muted-foreground">
                  {customer.averageVisitFrequency.toFixed(1)} visits/week
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Rewards</CardTitle>
                <Gift className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{customer.totalRewards}</div>
                <p className="text-xs text-muted-foreground">
                  {customer.rewardHistory.length} rewards earned
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(customer.totalSpent)}</div>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(customer.statistics.averageSpendingPerVisit)} avg/visit
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{customer.statistics.currentStreak}</div>
                <p className="text-xs text-muted-foreground">
                  Best: {customer.statistics.longestStreak} days
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Customer Profile */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <span>{customer.phone}</span>
                </div>
                {customer.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <span>{customer.email}</span>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span>Joined {formatDate(customer.registeredAt)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Activity className="h-4 w-4 text-gray-500" />
                  <span>Last visit: {customer.lastVisit ? getTimeAgo(customer.lastVisit) : 'Never'}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={customer.isActive ? 'default' : 'secondary'}>
                    {customer.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Quick Stats
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Avg Spending</span>
                  <span className="font-medium">{formatCurrency(customer.statistics.averageSpendingPerVisit)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Longest Streak</span>
                  <span className="font-medium">{customer.statistics.longestStreak} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Current Streak</span>
                  <span className="font-medium">{customer.statistics.currentStreak} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Visit Frequency</span>
                  <span className="font-medium">{customer.averageVisitFrequency.toFixed(1)}/week</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Visit History */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Visit History at {customer.storeInfo.name}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Rewards Earned</TableHead>
                      <TableHead>Amount Spent</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customer.visitHistory.slice(0, 10).map((visit) => (
                      <TableRow key={visit._id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{formatDate(visit.visitDate)}</div>
                            <div className="text-sm text-gray-500">{getTimeAgo(visit.visitDate)}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Gift className="h-3 w-3 text-green-600" />
                            <span className="font-medium">{visit.rewardsEarned}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {visit.amountSpent ? formatCurrency(visit.amountSpent) : 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {customer.visitHistory.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No visit history available
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Reward History */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Reward History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Reward Type</TableHead>
                      <TableHead>Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customer.rewardHistory.slice(0, 10).map((reward) => (
                      <TableRow key={reward._id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{formatDate(reward.earnedAt)}</div>
                            <div className="text-sm text-gray-500">{getTimeAgo(reward.earnedAt)}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{reward.rewardType}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Gift className="h-3 w-3 text-green-600" />
                            <span className="font-medium">{reward.amount}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {customer.rewardHistory.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No reward history available
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

