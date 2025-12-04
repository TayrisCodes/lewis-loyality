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
  BarChart3,
  Receipt as ReceiptIcon,
  CheckCircle2,
  XCircle,
  Flag,
  AlertCircle,
  Eye,
  FileText
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
  receipts?: Array<{
    _id: string;
    imageUrl: string;
    status: string;
    reason?: string;
    flags?: string[];
    tin?: string;
    invoiceNo?: string;
    dateOnReceipt?: string;
    totalAmount?: number;
    branchText?: string;
    ocrText?: string;
    storeId?: {
      _id: string;
      name: string;
      address?: string;
    } | null;
    createdAt: string;
    processedAt?: string;
  }>;
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200"><CheckCircle2 className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-200"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      case 'flagged':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200"><Flag className="h-3 w-3 mr-1" />Flagged</Badge>;
      case 'pending':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'needs_store_selection':
        return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-200"><AlertCircle className="h-3 w-3 mr-1" />Needs Store Selection</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
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

          {/* Receipts Section */}
          {customer.receipts && customer.receipts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ReceiptIcon className="h-5 w-5" />
                    Receipts Uploaded at {customer.storeInfo.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {customer.receipts.map((receipt) => (
                      <div
                        key={receipt._id}
                        className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            {getStatusBadge(receipt.status)}
                            {receipt.storeId && (
                              <div className="flex items-center gap-1 text-sm text-gray-600">
                                <Store className="h-4 w-4" />
                                <span>{receipt.storeId.name}</span>
                              </div>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">
                            {formatDate(receipt.createdAt)}
                          </div>
                        </div>

                        {/* Extracted Data */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                          {receipt.totalAmount && (
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Amount</div>
                              <div className="font-medium">{receipt.totalAmount} ETB</div>
                            </div>
                          )}
                          {receipt.invoiceNo && (
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Invoice No</div>
                              <div className="font-medium font-mono text-sm">{receipt.invoiceNo}</div>
                            </div>
                          )}
                          {receipt.dateOnReceipt && (
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Receipt Date</div>
                              <div className="font-medium">{receipt.dateOnReceipt}</div>
                            </div>
                          )}
                          {receipt.tin && (
                            <div>
                              <div className="text-xs text-gray-500 mb-1">TIN</div>
                              <div className="font-medium font-mono text-sm">{receipt.tin}</div>
                            </div>
                          )}
                        </div>

                        {/* Additional Info */}
                        {(receipt.branchText || receipt.reason || receipt.flags?.length) && (
                          <div className="space-y-2 mb-3">
                            {receipt.branchText && (
                              <div className="text-sm">
                                <span className="text-gray-500">Branch: </span>
                                <span className="font-medium">{receipt.branchText}</span>
                              </div>
                            )}
                            {receipt.reason && (
                              <div className="text-sm">
                                <span className="text-gray-500">Reason: </span>
                                <span className={receipt.status === 'rejected' ? 'text-red-600' : 'text-yellow-600'}>
                                  {receipt.reason}
                                </span>
                              </div>
                            )}
                            {receipt.flags && receipt.flags.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {receipt.flags.map((flag, index) => (
                                  <Badge key={index} variant="outline" className="text-xs">
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    {flag}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(receipt.imageUrl, '_blank')}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View Receipt Image
                          </Button>
                          {receipt.processedAt && (
                            <div className="text-xs text-gray-500 ml-auto">
                              Processed: {formatDate(receipt.processedAt)}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

