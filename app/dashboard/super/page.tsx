'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sidebar } from '@/components/dashboard/sidebar';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Store, Users, UserCheck, TrendingUp, Plus, RefreshCw, Gift, Calendar } from 'lucide-react';
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
  topCustomers: Array<{ 
    _id: string; 
    name: string; 
    totalVisits: number; 
    totalRewards: number; 
    lastVisit?: string;
  }>;
}

interface Store {
  _id: string;
  name: string;
  address: string;
  adminId?: { name: string; email: string };
  qrToken: string;
  qrExpiresAt: string;
  isActive: boolean;
}

interface Admin {
  _id: string;
  name: string;
  email: string;
  storeId?: { name: string };
  isActive: boolean;
  lastLogin?: string;
}

interface Store {
  _id: string;
  name: string;
  address: string;
  adminId?: { name: string; email: string };
  qrToken: string;
  qrExpiresAt: string;
  isActive: boolean;
}

interface Admin {
  _id: string;
  name: string;
  email: string;
  storeId?: { name: string };
  isActive: boolean;
  lastLogin?: string;
}

export default function SuperAdminDashboard() {
  const router = useRouter();
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createStoreOpen, setCreateStoreOpen] = useState(false);
  const [createAdminOpen, setCreateAdminOpen] = useState(false);
  const [storeForm, setStoreForm] = useState({ name: '', address: '', adminId: '' });
  const [adminForm, setAdminForm] = useState({ name: '', email: '', password: '', storeId: '' });

  useEffect(() => {
    // Check if user is authenticated and is superadmin
    if (!AuthUtils.isAuthenticated() || !AuthUtils.isSuperAdmin()) {
      router.push('/login');
      return;
    }
    fetchData();
  }, [router]);

  const fetchData = async () => {
    try {
      setError(null);
      const [analyticsData, storesData, adminsData] = await Promise.all([
        ApiClient.get<Analytics>('/api/super/analytics'),
        ApiClient.get<Store[]>('/api/super/stores'),
        ApiClient.get<Admin[]>('/api/super/admins'),
      ]);

      setAnalytics(analyticsData);
      setStores(storesData);
      setAdmins(adminsData);
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

  const handleRegenerateQR = async (storeId: string) => {
    try {
      await ApiClient.post(`/api/super/stores/${storeId}/generate-qr`);
      fetchData(); // Refresh data
    } catch (error: any) {
      console.error('Error regenerating QR:', error);
      alert(error.error || 'Failed to regenerate QR code');
    }
  };

  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await ApiClient.post('/api/super/stores', storeForm);
      setCreateStoreOpen(false);
      setStoreForm({ name: '', address: '', adminId: '' });
      fetchData();
    } catch (error: any) {
      console.error('Error creating store:', error);
      alert(error.error || 'Failed to create store');
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await ApiClient.post('/api/super/admins', adminForm);
      setCreateAdminOpen(false);
      setAdminForm({ name: '', email: '', password: '', storeId: '' });
      fetchData();
    } catch (error: any) {
      console.error('Error creating admin:', error);
      alert(error.error || 'Failed to create admin');
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading...</div>;
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar role="superadmin" />

      <div className="flex-1 lg:ml-64">
        <div className="p-6 space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-between items-center"
          >
            <h1 className="text-3xl font-bold">Super Admin Dashboard</h1>
            <div className="space-x-2">
              <Dialog open={createStoreOpen} onOpenChange={setCreateStoreOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Store
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Store</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateStore} className="space-y-4">
                    <div>
                      <Label htmlFor="store-name">Store Name</Label>
                      <Input
                        id="store-name"
                        value={storeForm.name}
                        onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="store-address">Address</Label>
                      <Input
                        id="store-address"
                        value={storeForm.address}
                        onChange={(e) => setStoreForm({ ...storeForm, address: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="store-admin">Assign Admin (Optional)</Label>
                      <Select value={storeForm.adminId} onValueChange={(value) => setStoreForm({ ...storeForm, adminId: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an admin" />
                        </SelectTrigger>
                        <SelectContent>
                          {admins.filter(admin => !admin.storeId).map((admin) => (
                            <SelectItem key={admin._id} value={admin._id}>
                              {admin.name} ({admin.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="submit" className="w-full">Create Store</Button>
                  </form>
                </DialogContent>
              </Dialog>

              <Dialog open={createAdminOpen} onOpenChange={setCreateAdminOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Admin
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Admin</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateAdmin} className="space-y-4">
                    <div>
                      <Label htmlFor="admin-name">Name</Label>
                      <Input
                        id="admin-name"
                        value={adminForm.name}
                        onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="admin-email">Email</Label>
                      <Input
                        id="admin-email"
                        type="email"
                        value={adminForm.email}
                        onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="admin-password">Password</Label>
                      <Input
                        id="admin-password"
                        type="password"
                        value={adminForm.password}
                        onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="admin-store">Assign Store (Optional)</Label>
                      <Select value={adminForm.storeId} onValueChange={(value) => setAdminForm({ ...adminForm, storeId: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a store" />
                        </SelectTrigger>
                        <SelectContent>
                          {stores.filter(store => !store.adminId).map((store) => (
                            <SelectItem key={store._id} value={store._id}>
                              {store.name} - {store.address}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button type="submit" className="w-full">Create Admin</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </motion.div>

          {/* Summary Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4"
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Stores</CardTitle>
                <Store className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics?.totalStores || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Admins</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics?.totalAdmins || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
                <UserCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics?.totalCustomers || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Visits</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics?.totalVisits || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Rewards Given</CardTitle>
                <Gift className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics?.rewardsGiven || 0}</div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Charts Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {/* Daily Visits Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Daily Visits (Last 7 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analytics?.dailyVisits || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="visits" stroke="#8884d8" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Top Stores Table */}
            <Card>
              <CardHeader>
                <CardTitle>Top Stores by Visits</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Store Name</TableHead>
                      <TableHead>Visits</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analytics?.topStores?.slice(0, 5).map((store, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{store.name}</TableCell>
                        <TableCell>{store.visitCount}</TableCell>
                      </TableRow>
                    )) || []}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </motion.div>

          {/* Top Customers Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Top Customers</span>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => router.push('/dashboard/super/customers')}
                  >
                    View All
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics?.topCustomers?.slice(0, 10).map((customer, index) => (
                    <div key={customer._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                         onClick={() => router.push(`/dashboard/super/customers/${customer._id}`)}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-purple-700">{index + 1}</span>
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
                  )) || []}
                </div>
                {(!analytics?.topCustomers || analytics.topCustomers.length === 0) && (
                  <div className="text-center py-8 text-gray-500">
                    No customer data available
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Stores Management */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Stores Management</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Admin</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>QR Expires</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stores.slice(0, 5).map((store) => (
                      <TableRow key={store._id}>
                        <TableCell className="font-medium">{store.name}</TableCell>
                        <TableCell>{store.address}</TableCell>
                        <TableCell>
                          {store.adminId ? store.adminId.name : 'No Admin'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={store.isActive ? 'default' : 'secondary'}>
                            {store.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(store.qrExpiresAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRegenerateQR(store._id)}
                          >
                            <RefreshCw className="w-4 h-4 mr-1" />
                            Regenerate QR
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {stores.length > 5 && (
                  <div className="mt-4 text-center">
                    <Button variant="outline" onClick={() => window.location.href = '/dashboard/super/stores'}>
                      View All Stores ({stores.length})
                    </Button>
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