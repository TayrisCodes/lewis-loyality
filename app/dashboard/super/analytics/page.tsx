'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sidebar } from '@/components/dashboard/sidebar';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend } from 'recharts';
import { Store, Users, UserCheck, TrendingUp, Gift, Calendar, Activity, Award } from 'lucide-react';
import ApiClient, { AuthUtils } from '@/lib/api-client';

interface Analytics {
  totalStores: number;
  totalAdmins: number;
  totalCustomers: number;
  totalVisits: number;
  visitsLast7Days: number;
  visitsLast30Days: number;
  rewardsGiven: number;
  dailyVisits: Array<{ date: string; visits: number }>;
  topStores: Array<{ name: string; visitCount: number }>;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF6B6B', '#4ECDC4', '#45B7D1'];

export default function SuperAdminAnalyticsPage() {
  const router = useRouter();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is authenticated and is superadmin
    if (!AuthUtils.isAuthenticated() || !AuthUtils.isSuperAdmin()) {
      router.push('/login');
      return;
    }
    fetchAnalytics();
  }, [router]);

  const fetchAnalytics = async () => {
    try {
      setError(null);
      const data = await ApiClient.get<Analytics>('/api/super/analytics');
      setAnalytics(data);
    } catch (error: any) {
      console.error('Error fetching analytics:', error);
      setError(error.error || 'Failed to fetch analytics');
      if (error.status === 401) {
        AuthUtils.clearAuth();
        router.push('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
        <Sidebar role="superadmin" />
        <div className="flex-1 lg:ml-64 flex items-center justify-center">
          <div className="text-center">
            <Activity className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-500" />
            <p className="text-gray-600 dark:text-gray-400">Loading analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
        <Sidebar role="superadmin" />
        <div className="flex-1 lg:ml-64 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const visitsGrowth = analytics?.visitsLast7Days || 0;
  const rewardRate = analytics?.totalVisits ? ((analytics.rewardsGiven / analytics.totalVisits) * 100).toFixed(1) : '0';

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar role="superadmin" />

      <div className="flex-1 lg:ml-64">
        <div className="p-6 space-y-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-between items-center"
          >
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Analytics Dashboard</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">System-wide performance metrics and insights</p>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-gray-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Last updated: {new Date().toLocaleString()}
              </span>
            </div>
          </motion.div>

          {/* Key Metrics Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
          >
            <Card className="dark:bg-gray-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Stores</CardTitle>
                <Store className="h-5 w-5 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">{analytics?.totalStores || 0}</div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Active in system</p>
              </CardContent>
            </Card>

            <Card className="dark:bg-gray-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Admins</CardTitle>
                <Users className="h-5 w-5 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">{analytics?.totalAdmins || 0}</div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Store administrators</p>
              </CardContent>
            </Card>

            <Card className="dark:bg-gray-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Customers</CardTitle>
                <UserCheck className="h-5 w-5 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">{analytics?.totalCustomers || 0}</div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Registered users</p>
              </CardContent>
            </Card>

            <Card className="dark:bg-gray-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Visits</CardTitle>
                <TrendingUp className="h-5 w-5 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">{analytics?.totalVisits || 0}</div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">All-time visits</p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Secondary Metrics */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            <Card className="dark:bg-gray-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Visits (Last 7 Days)</CardTitle>
                <Activity className="h-5 w-5 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">{analytics?.visitsLast7Days || 0}</div>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  Recent activity
                </p>
              </CardContent>
            </Card>

            <Card className="dark:bg-gray-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Visits (Last 30 Days)</CardTitle>
                <Calendar className="h-5 w-5 text-indigo-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">{analytics?.visitsLast30Days || 0}</div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Monthly traffic</p>
              </CardContent>
            </Card>

            <Card className="dark:bg-gray-800">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">Rewards Given</CardTitle>
                <Gift className="h-5 w-5 text-pink-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">{analytics?.rewardsGiven || 0}</div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {rewardRate}% reward rate
                </p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Charts Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {/* Daily Visits Line Chart */}
            <Card className="dark:bg-gray-800">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">Daily Visits Trend (Last 7 Days)</CardTitle>
                <p className="text-sm text-gray-500 dark:text-gray-400">Track daily customer visits</p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analytics?.dailyVisits || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#9CA3AF"
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis 
                      stroke="#9CA3AF"
                      style={{ fontSize: '12px' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1F2937', 
                        border: 'none',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="visits" 
                      stroke="#3B82F6" 
                      strokeWidth={3}
                      dot={{ fill: '#3B82F6', r: 5 }}
                      activeDot={{ r: 7 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Top Stores Bar Chart */}
            <Card className="dark:bg-gray-800">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">Top Performing Stores</CardTitle>
                <p className="text-sm text-gray-500 dark:text-gray-400">Stores by visit count</p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics?.topStores?.slice(0, 5) || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="name" 
                      stroke="#9CA3AF"
                      style={{ fontSize: '11px' }}
                      angle={-15}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis 
                      stroke="#9CA3AF"
                      style={{ fontSize: '12px' }}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1F2937', 
                        border: 'none',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                    />
                    <Bar 
                      dataKey="visitCount" 
                      fill="#10B981"
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>

          {/* Top Stores Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="dark:bg-gray-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-gray-900 dark:text-white">Top Stores Detailed View</CardTitle>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Complete list of top performing stores</p>
                  </div>
                  <Award className="w-8 h-8 text-yellow-500" />
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-gray-900 dark:text-gray-300">Rank</TableHead>
                      <TableHead className="text-gray-900 dark:text-gray-300">Store Name</TableHead>
                      <TableHead className="text-gray-900 dark:text-gray-300">Visit Count</TableHead>
                      <TableHead className="text-gray-900 dark:text-gray-300">Performance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analytics?.topStores?.map((store, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium text-gray-900 dark:text-white">
                          <div className="flex items-center">
                            {index < 3 ? (
                              <Award className={`w-5 h-5 mr-2 ${
                                index === 0 ? 'text-yellow-500' : 
                                index === 1 ? 'text-gray-400' : 
                                'text-orange-600'
                              }`} />
                            ) : null}
                            #{index + 1}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-gray-900 dark:text-white">{store.name}</TableCell>
                        <TableCell className="text-gray-700 dark:text-gray-300">{store.visitCount}</TableCell>
                        <TableCell>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ 
                                width: `${Math.min((store.visitCount / (analytics?.topStores?.[0]?.visitCount || 1)) * 100, 100)}%` 
                              }}
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    )) || []}
                  </TableBody>
                </Table>
                {(!analytics?.topStores || analytics.topStores.length === 0) && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No store data available
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* System Overview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="dark:bg-gray-800">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">System Overview</CardTitle>
                <p className="text-sm text-gray-500 dark:text-gray-400">Key performance indicators</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="text-center">
                    <div className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                      {analytics?.totalStores || 0}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">Active Stores</div>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-green-600 dark:text-green-400">
                      {analytics?.totalAdmins || 0}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">Store Admins</div>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-purple-600 dark:text-purple-400">
                      {analytics?.totalCustomers || 0}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">Registered Customers</div>
                  </div>
                  <div className="text-center">
                    <div className="text-4xl font-bold text-pink-600 dark:text-pink-400">
                      {rewardRate}%
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">Reward Rate</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

