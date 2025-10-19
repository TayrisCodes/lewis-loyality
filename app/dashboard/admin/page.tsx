'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sidebar } from '@/components/dashboard/sidebar';
import { motion } from 'framer-motion';
import { Users, TrendingUp, Gift, RefreshCw, Printer, QrCode, Calendar, UserCheck } from 'lucide-react';
import ApiClient, { AuthUtils } from '@/lib/api-client';

interface Store {
  _id: string;
  name: string;
  address: string;
  qrToken: string;
  qrUrl: string;
  qrExpiresAt: string;
}

interface Visit {
  _id: string;
  customerId: { name: string; phone: string };
  timestamp: string;
  rewardEarned: boolean;
}

interface Customer {
  _id: string;
  name: string;
  phone: string;
  totalVisits: number;
  lastVisit: string;
  visitCount: number;
  totalRewards: number;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [store, setStore] = useState<Store | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is authenticated and is admin
    if (!AuthUtils.isAuthenticated() || !AuthUtils.isAdmin()) {
      router.push('/login');
      return;
    }
    fetchData();
  }, [router]);

  const fetchData = async () => {
    try {
      setError(null);
      const [storeData, visitsData, customersData] = await Promise.all([
        ApiClient.get<Store>('/api/admin/store'),
        ApiClient.get<Visit[]>('/api/admin/visits'),
        ApiClient.get<Customer[]>('/api/admin/customers'),
      ]);

      setStore(storeData);
      setVisits(visitsData);
      setCustomers(customersData);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      setError(error.error || 'Failed to fetch data');
      if (error.status === 401) {
        // Unauthorized - redirect to login
        AuthUtils.clearAuth();
        router.push('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateQR = async () => {
    try {
      await ApiClient.post('/api/admin/store/generate-qr');
      fetchData(); // Refresh data
    } catch (error: any) {
      console.error('Error regenerating QR:', error);
      alert(error.error || 'Failed to regenerate QR code');
    }
  };

  const handlePrintQR = () => {
    window.open(`/print-qr?storeId=${store?._id}`, '_blank');
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  const todayVisits = visits.filter(visit => {
    const visitDate = new Date(visit.timestamp).toDateString();
    const today = new Date().toDateString();
    return visitDate === today;
  }).length;

  const totalCustomers = customers.length;
  const rewardsIssued = visits.filter(visit => visit.rewardEarned).length;

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar role="admin" />

      <div className="flex-1 lg:ml-64">
        <div className="p-6 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-between items-center"
          >
            <div>
              <h1 className="text-3xl font-bold">Store Dashboard</h1>
              <p className="text-gray-600 mt-1">{store?.name} - {store?.address}</p>
            </div>
          </motion.div>

          {/* Summary Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-4 gap-4"
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Today's Visits</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{todayVisits}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
                <UserCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalCustomers}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Rewards Issued</CardTitle>
                <Gift className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{rewardsIssued}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Store Status</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  <Badge variant="default">Active</Badge>
                </div>
              </CardContent>
            </Card>
          </motion.div>

      {/* QR Code Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              Current Daily QR Code
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {store?.qrToken && (
              <div className="flex items-center justify-center">
                <img
                  src={`/qrcodes/${store._id}-${new Date().toISOString().split('T')[0].replace(/-/g, '')}.png`}
                  alt="Store QR Code"
                  className="w-48 h-48"
                />
              </div>
            )}
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Token: {store?.qrToken}
              </p>
              <p className="text-sm text-muted-foreground">
                Expires: {store?.qrExpiresAt ? new Date(store.qrExpiresAt).toLocaleString() : 'N/A'}
              </p>
            </div>
            <div className="flex gap-2 justify-center">
              <Button onClick={handleRegenerateQR} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Regenerate QR
              </Button>
              <Button onClick={handlePrintQR}>
                <Printer className="w-4 h-4 mr-2" />
                Print QR
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

          {/* Recent Visits and Top Customers */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {/* Recent Visits */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Visits</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Reward</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visits.slice(0, 5).map((visit) => (
                      <TableRow key={visit._id}>
                        <TableCell className="font-medium">
                          {visit.customerId?.name || 'Unknown'}
                        </TableCell>
                        <TableCell>{visit.customerId?.phone || 'N/A'}</TableCell>
                        <TableCell>
                          {new Date(visit.timestamp).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant={visit.rewardEarned ? 'default' : 'secondary'}>
                            {visit.rewardEarned ? 'Yes' : 'No'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {visits.length > 5 && (
                  <div className="mt-4 text-center">
                    <Button variant="outline" onClick={() => window.location.href = '/dashboard/admin/visits'}>
                      View All Visits ({visits.length})
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top Customers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Top Customers</span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => router.push('/dashboard/admin/customers')}
                  >
                    View All
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {customers
                    .sort((a, b) => b.totalVisits - a.totalVisits)
                    .slice(0, 5)
                    .map((customer, index) => (
                    <div key={customer._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                         onClick={() => router.push(`/dashboard/admin/customers/${customer._id}`)}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-blue-700">{index + 1}</span>
                        </div>
                        <div>
                          <div className="font-medium">{customer.name}</div>
                          <div className="text-sm text-gray-500">
                            {customer.totalVisits} visits • {customer.totalRewards} rewards
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-500">
                          {customer.lastVisit ? 
                            new Date(customer.lastVisit).toLocaleDateString() : 
                            'No visits'
                          }
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {customers.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No customers yet
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