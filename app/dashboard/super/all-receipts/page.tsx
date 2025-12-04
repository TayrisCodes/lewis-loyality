'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sidebar } from '@/components/dashboard/sidebar';
import { motion } from 'framer-motion';
import { 
  Receipt as ReceiptIcon,
  RefreshCw,
  Search,
  Eye,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Flag,
  ChevronLeft,
  ChevronRight,
  Store as StoreIcon,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import ApiClient, { AuthUtils } from '@/lib/api-client';

interface Receipt {
  _id: string;
  customerPhone: string;
  storeId: {
    _id: string;
    name: string;
    address: string;
  };
  imageUrl: string;
  status: string;
  totalAmount?: number;
  invoiceNo?: string;
  dateOnReceipt?: string;
  createdAt: string;
  reason?: string;
}

interface Statistics {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  flagged: number;
  flaggedManual: number;
  needsStoreSelection?: number;
}

interface StoreStats {
  storeId: string;
  storeName: string;
  total: number;
  flagged: number;
  approved: number;
  rejected: number;
}

export default function GlobalReceiptDashboardPage() {
  const router = useRouter();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [storeStats, setStoreStats] = useState<StoreStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [storeFilter, setStoreFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalReceipts, setTotalReceipts] = useState(0);

  useEffect(() => {
    // Check if user is authenticated and is super admin
    if (!AuthUtils.isAuthenticated() || !AuthUtils.isSuperAdmin()) {
      router.push('/login');
      return;
    }
    fetchData();
  }, [router, statusFilter, storeFilter, searchQuery, currentPage]);

  const fetchData = async () => {
    try {
      setError(null);
      setLoading(true);
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(storeFilter && { storeId: storeFilter }),
        ...(searchQuery && { search: searchQuery })
      });

      const data = await ApiClient.get<{
        receipts: Receipt[];
        statistics: Statistics;
        storeStats: StoreStats[];
        pagination: {
          currentPage: number;
          totalPages: number;
          totalReceipts: number;
        };
      }>(`/api/super/receipts?${params}`);
      
      setReceipts(data.receipts);
      setStatistics(data.statistics);
      setStoreStats(data.storeStats);
      setTotalPages(data.pagination.totalPages);
      setTotalReceipts(data.pagination.totalReceipts);
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <Badge variant="default" className="bg-green-600">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        );
      case 'flagged':
      case 'flagged_manual_requested':
        return (
          <Badge variant="outline" className="border-yellow-600 text-yellow-600">
            <Flag className="h-3 w-3 mr-1" />
            Flagged
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="outline" className="border-blue-600 text-blue-600">
            <AlertCircle className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading && receipts.length === 0) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar role="superadmin" />
        <div className="flex-1 lg:ml-64 flex justify-center items-center">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading receipts...</p>
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
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <ReceiptIcon className="h-8 w-8" />
                Global Receipt Dashboard
              </h1>
              <p className="text-gray-600 mt-1">
                Monitor all receipts across all stores
              </p>
            </div>
            <Button onClick={fetchData} variant="outline" disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </motion.div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-700"
            >
              <AlertCircle className="h-5 w-5" />
              {error}
            </motion.div>
          )}

          {/* Statistics Cards */}
          {statistics && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-1 md:grid-cols-6 gap-4"
            >
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total</CardTitle>
                  <ReceiptIcon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{statistics.total}</div>
                  <p className="text-xs text-muted-foreground">All receipts</p>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:bg-gray-50" onClick={() => setStatusFilter('flagged')}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Flagged</CardTitle>
                  <Flag className="h-4 w-4 text-yellow-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">
                    {statistics.flagged + statistics.flaggedManual}
                  </div>
                  <p className="text-xs text-muted-foreground">Needs review</p>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:bg-gray-50" onClick={() => setStatusFilter('pending')}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending</CardTitle>
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{statistics.pending}</div>
                  <p className="text-xs text-muted-foreground">Processing</p>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:bg-gray-50" onClick={() => setStatusFilter('approved')}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Approved</CardTitle>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{statistics.approved}</div>
                  <p className="text-xs text-muted-foreground">
                    {statistics.total > 0 ? Math.round((statistics.approved / statistics.total) * 100) : 0}% approval
                  </p>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:bg-gray-50" onClick={() => setStatusFilter('rejected')}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Rejected</CardTitle>
                  <XCircle className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{statistics.rejected}</div>
                  <p className="text-xs text-muted-foreground">
                    {statistics.total > 0 ? Math.round((statistics.rejected / statistics.total) * 100) : 0}% rejected
                  </p>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:bg-gray-50" onClick={() => setStatusFilter('all')}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">View All</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-sm font-bold">Clear Filter</div>
                  <p className="text-xs text-muted-foreground">Show all status</p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Store Performance Stats */}
          {storeStats.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <StoreIcon className="h-5 w-5" />
                    Top Stores by Receipt Volume
                  </CardTitle>
                  <CardDescription>Stores with highest receipt activity</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {storeStats.slice(0, 6).map((store) => (
                      <div
                        key={store.storeId}
                        className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                        onClick={() => setStoreFilter(store.storeId)}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="font-medium text-sm truncate">{store.storeName}</div>
                          <Badge variant="outline" className="text-xs">
                            {store.total}
                          </Badge>
                        </div>
                        <div className="flex gap-2 text-xs">
                          <span className="text-green-600">✓ {store.approved}</span>
                          <span className="text-yellow-600">⚠ {store.flagged}</span>
                          <span className="text-red-600">✗ {store.rejected}</span>
                        </div>
                        {store.flagged > store.total * 0.2 && (
                          <div className="mt-2 text-xs text-yellow-600 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            High flag rate
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-wrap gap-4"
          >
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by phone or invoice..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={(value) => {
              setStatusFilter(value);
              setCurrentPage(1);
            }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="flagged">Flagged</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            {(statusFilter !== 'all' || storeFilter || searchQuery) && (
              <Button
                variant="outline"
                onClick={() => {
                  setStatusFilter('all');
                  setStoreFilter('');
                  setSearchQuery('');
                  setCurrentPage(1);
                }}
              >
                Clear Filters
              </Button>
            )}
          </motion.div>

          {/* Receipts Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>
                  Receipts ({totalReceipts})
                  {storeFilter && storeStats.find(s => s.storeId === storeFilter) && (
                    <Badge variant="outline" className="ml-2">
                      {storeStats.find(s => s.storeId === storeFilter)?.storeName}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Showing {receipts.length} of {totalReceipts} receipts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Store</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receipts.map((receipt) => (
                      <TableRow key={receipt._id}>
                        <TableCell>
                          <div>
                            <div className="font-medium text-sm">{receipt.storeId.name}</div>
                            <div className="text-xs text-gray-500 truncate max-w-[150px]">
                              {receipt.storeId.address}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{receipt.customerPhone}</TableCell>
                        <TableCell>
                          {receipt.invoiceNo ? (
                            <Badge variant="outline" className="font-mono text-xs">
                              {receipt.invoiceNo}
                            </Badge>
                          ) : (
                            <span className="text-xs text-gray-400">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {receipt.totalAmount ? (
                            <span className="font-medium">{receipt.totalAmount} ETB</span>
                          ) : (
                            <span className="text-xs text-gray-400">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">{formatDate(receipt.createdAt)}</div>
                        </TableCell>
                        <TableCell>{getStatusBadge(receipt.status)}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => router.push(`/dashboard/admin/receipts/${receipt._id}`)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {receipts.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <ReceiptIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No receipts found</p>
                    {(statusFilter !== 'all' || searchQuery) && (
                      <p className="text-sm mt-2">Try adjusting your filters</p>
                    )}
                  </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6">
                    <div className="text-sm text-gray-700">
                      Page {currentPage} of {totalPages}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1 || loading}
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages || loading}
                      >
                        Next
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
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

