'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Sidebar } from '@/components/dashboard/sidebar';
import { motion } from 'framer-motion';
import { 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  Calendar,
  Store,
  User,
  Gift,
  Phone,
  Mail,
  MapPin,
  TrendingUp,
  RefreshCw
} from 'lucide-react';
import ApiClient, { AuthUtils } from '@/lib/api-client';

interface Customer {
  _id: string;
  name: string;
  phone: string;
  email?: string;
  totalVisits: number;
  totalRewards: number;
  lastVisit?: string;
  favoriteStore?: {
    _id: string;
    name: string;
  };
  registeredAt: string;
  isActive: boolean;
  totalSpent?: number;
  averageVisitFrequency?: number;
}

interface Store {
  _id: string;
  name: string;
  address: string;
}

interface Admin {
  _id: string;
  name: string;
  email: string;
  storeId?: {
    _id: string;
    name: string;
  };
}

interface CustomerFilters {
  search: string;
  store: string;
  admin: string;
  hasRewards: string;
  dateFrom: string;
  dateTo: string;
  sortBy: string;
  sortOrder: string;
}

export default function SuperAdminCustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  
  const [filters, setFilters] = useState<CustomerFilters>({
    search: '',
    store: '',
    admin: '',
    hasRewards: '',
    dateFrom: '',
    dateTo: '',
    sortBy: 'lastVisit',
    sortOrder: 'desc'
  });

  const itemsPerPage = 10;

  useEffect(() => {
    // Check if user is authenticated and is superadmin
    if (!AuthUtils.isAuthenticated() || !AuthUtils.isSuperAdmin()) {
      router.push('/login');
      return;
    }
    fetchData();
  }, [router, currentPage, filters]);

  const fetchData = async () => {
    try {
      setError(null);
      setLoading(true);
      
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== '')
        )
      });

      const [customersData, storesData, adminsData] = await Promise.all([
        ApiClient.get<{
          customers: Customer[];
          totalPages: number;
          totalCustomers: number;
        }>(`/api/super/customers?${queryParams}`),
        ApiClient.get<Store[]>('/api/super/stores'),
        ApiClient.get<Admin[]>('/api/super/admins'),
      ]);

      setCustomers(customersData.customers);
      setTotalPages(customersData.totalPages);
      setTotalCustomers(customersData.totalCustomers);
      setStores(storesData);
      setAdmins(adminsData);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      setError(error.error || 'Failed to fetch data');
      if (error.status === 401) {
        AuthUtils.clearAuth();
        router.push('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof CustomerFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1); // Reset to first page when filters change
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      store: '',
      admin: '',
      hasRewards: '',
      dateFrom: '',
      dateTo: '',
      sortBy: 'lastVisit',
      sortOrder: 'desc'
    });
    setCurrentPage(1);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStoreName = (storeId: string) => {
    const store = stores.find(s => s._id === storeId);
    return store ? store.name : 'Unknown Store';
  };

  const getAdminName = (adminId: string) => {
    const admin = admins.find(a => a._id === adminId);
    return admin ? admin.name : 'Unknown Admin';
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar role="superadmin" />
        <div className="flex-1 lg:ml-64 flex justify-center items-center">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading customers...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
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
              <h1 className="text-3xl font-bold">Customer Management</h1>
              <p className="text-gray-600 mt-1">
                Manage and analyze customer data across all stores
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="w-4 h-4 mr-2" />
                {showFilters ? 'Hide Filters' : 'Show Filters'}
              </Button>
              <Button onClick={fetchData} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </motion.div>

          {/* Filters */}
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-white p-6 rounded-lg shadow-sm border"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="search">Search</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="search"
                      placeholder="Name, phone, email..."
                      value={filters.search}
                      onChange={(e) => handleFilterChange('search', e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="store">Store</Label>
                  <Select value={filters.store} onValueChange={(value) => handleFilterChange('store', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Stores" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Stores</SelectItem>
                      {stores.map((store) => (
                        <SelectItem key={store._id} value={store._id}>
                          {store.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="admin">Admin</Label>
                  <Select value={filters.admin} onValueChange={(value) => handleFilterChange('admin', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Admins" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Admins</SelectItem>
                      {admins.map((admin) => (
                        <SelectItem key={admin._id} value={admin._id}>
                          {admin.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="hasRewards">Rewards Status</Label>
                  <Select value={filters.hasRewards} onValueChange={(value) => handleFilterChange('hasRewards', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Customers" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Customers</SelectItem>
                      <SelectItem value="true">Has Rewards</SelectItem>
                      <SelectItem value="false">No Rewards</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="dateFrom">From Date</Label>
                  <Input
                    id="dateFrom"
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="dateTo">To Date</Label>
                  <Input
                    id="dateTo"
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="sortBy">Sort By</Label>
                  <Select value={filters.sortBy} onValueChange={(value) => handleFilterChange('sortBy', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lastVisit">Last Visit</SelectItem>
                      <SelectItem value="totalVisits">Total Visits</SelectItem>
                      <SelectItem value="totalRewards">Total Rewards</SelectItem>
                      <SelectItem value="registeredAt">Registration Date</SelectItem>
                      <SelectItem value="name">Name</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="sortOrder">Order</Label>
                  <Select value={filters.sortOrder} onValueChange={(value) => handleFilterChange('sortOrder', value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="desc">Descending</SelectItem>
                      <SelectItem value="asc">Ascending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end mt-4">
                <Button variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>
              </div>
            </motion.div>
          )}

          {/* Stats Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-4 gap-4"
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
                <User className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalCustomers}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {customers.filter(c => c.isActive).length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Visits</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {customers.reduce((sum, c) => sum + c.totalVisits, 0)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Rewards</CardTitle>
                <Gift className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {customers.reduce((sum, c) => sum + c.totalRewards, 0)}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Customers Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Customers ({totalCustomers})</CardTitle>
              </CardHeader>
              <CardContent>
                {error && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                    {error}
                  </div>
                )}

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Visits</TableHead>
                      <TableHead>Rewards</TableHead>
                      <TableHead>Last Visit</TableHead>
                      <TableHead>Favorite Store</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {customers.map((customer) => (
                      <TableRow key={customer._id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{customer.name}</div>
                            <div className="text-sm text-gray-500">
                              Joined {formatDate(customer.registeredAt)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="h-3 w-3" />
                              {customer.phone}
                            </div>
                            {customer.email && (
                              <div className="flex items-center gap-2 text-sm text-gray-500">
                                <Mail className="h-3 w-3" />
                                {customer.email}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-center">
                            <div className="font-medium">{customer.totalVisits}</div>
                            {customer.averageVisitFrequency && (
                              <div className="text-xs text-gray-500">
                                {customer.averageVisitFrequency.toFixed(1)}/week
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-center">
                            <div className="font-medium">{customer.totalRewards}</div>
                            {customer.totalSpent && (
                              <div className="text-xs text-gray-500">
                                ${customer.totalSpent.toFixed(2)} spent
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {customer.lastVisit ? formatDate(customer.lastVisit) : 'Never'}
                        </TableCell>
                        <TableCell>
                          {customer.favoriteStore ? (
                            <div className="flex items-center gap-2">
                              <Store className="h-3 w-3" />
                              <span className="text-sm">{customer.favoriteStore.name}</span>
                            </div>
                          ) : (
                            <span className="text-gray-500 text-sm">No visits</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={customer.isActive ? 'default' : 'secondary'}>
                            {customer.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => router.push(`/dashboard/super/customers/${customer._id}`)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-gray-700">
                    Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalCustomers)} of {totalCustomers} customers
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const pageNum = i + 1;
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                            className="w-8 h-8 p-0"
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </Button>
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

