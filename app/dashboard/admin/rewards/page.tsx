'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sidebar } from '@/components/dashboard/sidebar';
import { motion, AnimatePresence } from 'framer-motion';
import { Gift, Plus, Edit, Trash2, Target, CheckCircle, Clock, QrCode, Scan, Users, RefreshCw, Camera, X, AlertCircle } from 'lucide-react';
import QRCode from 'react-qr-code';
import QRCodeScanner from '@/components/QRCodeScanner';

interface Reward {
  id: string;
  code: string;
  status: 'pending' | 'claimed' | 'redeemed' | 'used' | 'expired';
  rewardType: string;
  discountPercent?: number;
  discountCode?: string;
  qrCode?: string;
  issuedAt: string;
  claimedAt?: string;
  redeemedAt?: string;
  usedAt?: string;
  expiresAt?: string;
  customer: {
    id: string;
    name: string;
    phone: string;
  };
  store: {
    id: string;
    name: string;
  };
  usedAtStore?: {
    name: string;
    address?: string;
  };
}

interface RewardStats {
  pending: number;
  claimed: number;
  redeemed: number;
  used: number;
  expired: number;
}

export default function AdminRewardsPage() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [rewardStats, setRewardStats] = useState<RewardStats>({
    pending: 0,
    claimed: 0,
    redeemed: 0,
    used: 0,
    expired: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [redeeming, setRedeeming] = useState<string | null>(null);
  const [scanning, setScanning] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [historyRewards, setHistoryRewards] = useState<Reward[]>([]);
  const [historyStats, setHistoryStats] = useState({ totalScanned: 0, totalScannedThisMonth: 0, totalScannedToday: 0 });
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (!showHistory) {
      fetchRewards();
    }
  }, [selectedStatus, showHistory]);

  useEffect(() => {
    if (showHistory) {
      fetchRewardHistory();
    }
  }, [showHistory, historyPage]);

  const fetchRewards = async () => {
    try {
      const url = selectedStatus !== 'all' 
        ? `/api/admin/rewards?status=${selectedStatus}`
        : '/api/admin/rewards';
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setRewards(data.rewards || []);
          if (data.stats) {
            setRewardStats(data.stats);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching rewards:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRewardHistory = async () => {
    setHistoryLoading(true);
    try {
      const response = await fetch(`/api/admin/rewards/history?page=${historyPage}&limit=20`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setHistoryRewards(data.rewards || []);
          if (data.stats) {
            setHistoryStats(data.stats);
          }
          if (data.pagination) {
            setHistoryTotalPages(data.pagination.totalPages || 1);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching reward history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleScanQRCode = async (qrCodeData: string) => {
    try {
      setScanning('qr-scanner');
      
      const response = await fetch('/api/admin/rewards/scan-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrCodeData }),
      });

      const data = await response.json();

      if (data.success) {
        setToastMessage({
          type: 'success',
          message: data.message || `Discount successfully applied! ${data.data.discountPercent || 10}% discount given to ${data.data.customer.name}.`,
        });
        
        // Refresh rewards list
        setTimeout(() => {
          fetchRewards();
          if (showHistory) {
            fetchRewardHistory();
          }
        }, 1000);
        
        // Clear toast after 5 seconds
        setTimeout(() => {
          setToastMessage(null);
        }, 5000);
      } else {
        setToastMessage({
          type: 'error',
          message: data.error || 'Failed to scan QR code. Please try again.',
        });
        
        // Clear error toast after 5 seconds
        setTimeout(() => {
          setToastMessage(null);
        }, 5000);
        
        throw new Error(data.error || 'Failed to scan QR code');
      }
    } catch (error: any) {
      setToastMessage({
        type: 'error',
        message: error.message || 'Failed to scan QR code. Please try again.',
      });
      
      setTimeout(() => {
        setToastMessage(null);
      }, 5000);
      
      throw error;
    } finally {
      setScanning(null);
    }
  };

  const handleRedeemReward = async (rewardId: string) => {
    if (!confirm('Redeem this reward and generate QR code for customer?')) return;

    setRedeeming(rewardId);
    try {
      const response = await fetch(`/api/admin/rewards/${rewardId}/redeem`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          discountPercent: 10, // 10% discount
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        // Show QR code dialog with updated data
        setSelectedReward({
          id: rewardId,
          code: data.data.code,
          status: 'redeemed',
          rewardType: data.data.rewardType || '10% Discount',
          discountPercent: data.data.discountPercent,
          discountCode: data.data.discountCode,
          qrCode: data.data.qrCode,
          issuedAt: data.data.issuedAt || new Date().toISOString(),
          redeemedAt: data.data.redeemedAt || new Date().toISOString(),
          expiresAt: data.data.expiresAt,
          customer: data.data.customer || { id: '', name: 'Unknown', phone: '' },
          store: data.data.store || { id: '', name: 'Unknown' },
        });
        setShowQRDialog(true);
        
        // Refresh rewards list after a short delay
        setTimeout(() => {
          fetchRewards();
        }, 500);
      } else {
        alert(data.error || 'Failed to redeem reward. Please try again.');
      }
    } catch (error) {
      console.error('Error redeeming reward:', error);
      alert('Failed to redeem reward. Please try again.');
    } finally {
      setRedeeming(null);
    }
  };

  const handleScanQR = async (rewardId: string) => {
    if (!confirm('Mark this reward as used? Customer has used the discount.')) return;

    setScanning(rewardId);
    try {
      const response = await fetch(`/api/admin/rewards/${rewardId}/scan`, {
        method: 'POST',
      });

      const data = await response.json();
      
      if (data.success) {
        alert('Reward marked as used. Customer can now earn a new reward.');
        // Refresh rewards list
        fetchRewards();
        // Close QR dialog if open
        setShowQRDialog(false);
        setSelectedReward(null);
      } else {
        // Show specific message for used discount card
        if (data.error && data.error.includes('DiscountCard is used')) {
          alert('DiscountCard is used');
        } else {
          alert(data.error || 'Failed to mark reward as used. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error scanning reward:', error);
      alert('Failed to mark reward as used. Please try again.');
    } finally {
      setScanning(null);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending':
        return 'default';
      case 'claimed':
        return 'secondary';
      case 'redeemed':
        return 'outline';
      case 'used':
        return 'outline';
      case 'expired':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20';
      case 'claimed':
        return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20';
      case 'redeemed':
        return 'text-green-600 bg-green-50 dark:bg-green-900/20';
      case 'used':
        return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20';
      case 'expired':
        return 'text-red-600 bg-red-50 dark:bg-red-900/20';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar role="admin" />
        <div className="flex-1 lg:ml-64 flex items-center justify-center">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

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
              <h1 className="text-3xl font-bold">Rewards Management</h1>
              <p className="text-gray-600 mt-1">Manage customer rewards and scan discount QR codes</p>
            </div>
            <Button
              onClick={() => setShowQRScanner(true)}
              className="bg-orange-600 hover:bg-orange-700"
            >
              <Scan className="w-4 h-4 mr-2" />
              Scan Discount QR
            </Button>
          </motion.div>

          {/* Stats Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-5 gap-4"
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
                <Clock className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{rewardStats.pending}</div>
                <p className="text-xs text-muted-foreground">Waiting to claim</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Claimed</CardTitle>
                <CheckCircle className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{rewardStats.claimed}</div>
                <p className="text-xs text-muted-foreground">Need redemption</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Redeemed</CardTitle>
                <QrCode className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{rewardStats.redeemed}</div>
                <p className="text-xs text-muted-foreground">QR code active</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Used</CardTitle>
                <Scan className="h-4 w-4 text-gray-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-600">{rewardStats.used}</div>
                <p className="text-xs text-muted-foreground">Completed</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total</CardTitle>
                <Gift className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {rewardStats.pending + rewardStats.claimed + rewardStats.redeemed + rewardStats.used + rewardStats.expired}
                </div>
                <p className="text-xs text-muted-foreground">All rewards</p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Rewards List Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Customer Rewards</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Manage pending and claimed rewards
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={fetchRewards}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Status Filter Tabs */}
                <div className="flex gap-2 mb-4 border-b pb-2 flex-wrap">
                  <Button
                    variant={!showHistory ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setShowHistory(false)}
                  >
                    Active Rewards
                  </Button>
                  <Button
                    variant={showHistory ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setShowHistory(true)}
                  >
                    My History
                    {historyStats.totalScanned > 0 && (
                      <Badge className="ml-2" variant="outline">
                        {historyStats.totalScanned}
                      </Badge>
                    )}
                  </Button>
                  {!showHistory && (
                    <>
                      {['all', 'pending', 'claimed', 'redeemed', 'used'].map((status) => (
                        <Button
                          key={status}
                          variant={selectedStatus === status ? 'default' : 'ghost'}
                          size="sm"
                          onClick={() => setSelectedStatus(status)}
                          className="capitalize"
                        >
                          {status}
                          {status !== 'all' && (
                            <Badge className="ml-2" variant="outline">
                              {status === 'pending' ? rewardStats.pending :
                               status === 'claimed' ? rewardStats.claimed :
                               status === 'redeemed' ? rewardStats.redeemed :
                               status === 'used' ? rewardStats.used : 0}
                            </Badge>
                          )}
                        </Button>
                      ))}
                    </>
                  )}
                </div>

                {/* Rewards Table / History Table */}
                {showHistory ? (
                  // History View
                  <div className="rounded-md border">
                    <div className="p-4 bg-gray-50 dark:bg-gray-900 border-b">
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Total Scanned</p>
                          <p className="text-2xl font-bold">{historyStats.totalScanned}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">This Month</p>
                          <p className="text-2xl font-bold">{historyStats.totalScannedThisMonth}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Today</p>
                          <p className="text-2xl font-bold">{historyStats.totalScannedToday}</p>
                        </div>
                      </div>
                    </div>
                    {historyLoading ? (
                      <div className="text-center py-8">
                        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-gray-400" />
                        <p className="text-sm text-muted-foreground">Loading history...</p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Customer</TableHead>
                            <TableHead>Reward Code</TableHead>
                            <TableHead>Used At Store</TableHead>
                            <TableHead>Discount</TableHead>
                            <TableHead>Used Date</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {historyRewards.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                <Scan className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                                <p>No reward history found</p>
                                <p className="text-sm">Rewards you scan will appear here</p>
                              </TableCell>
                            </TableRow>
                          ) : (
                            historyRewards.map((reward: any) => (
                              <TableRow key={reward.id}>
                                <TableCell>
                                  <div>
                                    <div className="font-medium">{reward.customer.name}</div>
                                    <div className="text-sm text-muted-foreground">{reward.customer.phone}</div>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                                    {reward.code}
                                  </code>
                                </TableCell>
                                <TableCell>
                                  <div className="font-medium">{reward.usedAtStore?.name || reward.store?.name || 'Unknown'}</div>
                                  {reward.store?.name && reward.usedAtStore?.name !== reward.store?.name && (
                                    <div className="text-xs text-muted-foreground">
                                      Created at: {reward.store.name}
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-green-600">
                                    {reward.discountPercent || 10}% OFF
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="text-sm">
                                    {reward.usedAt ? new Date(reward.usedAt).toLocaleDateString() : 'N/A'}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    {reward.usedAt ? new Date(reward.usedAt).toLocaleTimeString() : ''}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    )}
                    {!historyLoading && historyTotalPages > 1 && (
                      <div className="p-4 border-t flex justify-between items-center">
                        <p className="text-sm text-muted-foreground">
                          Page {historyPage} of {historyTotalPages}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                            disabled={historyPage === 1}
                          >
                            Previous
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setHistoryPage(p => Math.min(historyTotalPages, p + 1))}
                            disabled={historyPage >= historyTotalPages}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  // Active Rewards View
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Customer</TableHead>
                          <TableHead>Reward Code</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Issued</TableHead>
                          <TableHead>Expires</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rewards.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            <Gift className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                            <p>No rewards found</p>
                            <p className="text-sm">Rewards will appear here when customers claim them</p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        rewards.map((reward) => (
                          <TableRow key={reward.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{reward.customer.name}</div>
                                <div className="text-sm text-muted-foreground">{reward.customer.phone}</div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <code className="text-xs bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                                {reward.code}
                              </code>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={getStatusBadgeVariant(reward.status) as any}
                                className={getStatusColor(reward.status)}
                              >
                                {reward.status.toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {new Date(reward.issuedAt).toLocaleDateString()}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {new Date(reward.issuedAt).toLocaleTimeString()}
                              </div>
                            </TableCell>
                            <TableCell>
                              {reward.expiresAt ? (
                                <div className="text-sm">
                                  {new Date(reward.expiresAt).toLocaleDateString()}
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">N/A</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                {reward.status === 'claimed' && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleRedeemReward(reward.id)}
                                    disabled={redeeming === reward.id}
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    {redeeming === reward.id ? (
                                      <>
                                        <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                                        Redeeming...
                                      </>
                                    ) : (
                                      <>
                                        <CheckCircle className="h-3 w-3 mr-1" />
                                        Redeem
                                      </>
                                    )}
                                  </Button>
                                )}
                                {reward.status === 'redeemed' && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => {
                                        setSelectedReward(reward);
                                        setShowQRDialog(true);
                                      }}
                                    >
                                      <QrCode className="h-3 w-3 mr-1" />
                                      View QR
                                    </Button>
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        // If reward has QR code, we can scan it directly or open scanner
                                        // For now, open QR scanner to scan customer's QR code
                                        setShowQRScanner(true);
                                      }}
                                      disabled={scanning === reward.id}
                                      className="bg-orange-600 hover:bg-orange-700"
                                    >
                                      <Camera className="h-3 w-3 mr-1" />
                                      Scan Discount QR
                                    </Button>
                                  </>
                                )}
                                {reward.status === 'pending' && (
                                  <span className="text-xs text-muted-foreground">
                                    Waiting for customer to claim
                                  </span>
                                )}
                                {reward.status === 'used' && (
                                  <span className="text-xs text-muted-foreground">
                                    Completed
                                  </span>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                )}
              </CardContent>
            </Card>
          </motion.div>


          {/* How it works */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>How Rewards Work</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <span className="text-blue-600 font-bold">1</span>
                    </div>
                    <h3 className="font-medium mb-1">Customer Visits</h3>
                    <p className="text-sm text-gray-600">5 approved receipts within 45 days</p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <span className="text-yellow-600 font-bold">2</span>
                    </div>
                    <h3 className="font-medium mb-1">Customer Claims</h3>
                    <p className="text-sm text-gray-600">Reward appears as "Claimed"</p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <span className="text-green-600 font-bold">3</span>
                    </div>
                    <h3 className="font-medium mb-1">Admin Redeems</h3>
                    <p className="text-sm text-gray-600">Generate 10% discount QR code</p>
                  </div>
                  <div className="text-center">
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <span className="text-purple-600 font-bold">4</span>
                    </div>
                    <h3 className="font-medium mb-1">Scan Discount QR</h3>
                    <p className="text-sm text-gray-600">Scan customer's discount QR code to apply discount</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Toast Message */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-md ${
              toastMessage.type === 'success' 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'
            }`}
          >
            <div className="flex items-start gap-3">
              {toastMessage.type === 'success' ? (
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              )}
              <div className="flex-1">
                <p className={`text-sm font-medium ${
                  toastMessage.type === 'success' ? 'text-green-800' : 'text-red-800'
                }`}>
                  {toastMessage.message}
                </p>
              </div>
              <button
                onClick={() => setToastMessage(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* QR Code Scanner */}
      <QRCodeScanner
        isOpen={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        onScan={handleScanQRCode}
      />

      {/* QR Code Dialog */}
      <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reward QR Code - {selectedReward?.customer.name || 'Customer'}</DialogTitle>
          </DialogHeader>
          {selectedReward && (
            <div className="space-y-4">
              <div className="text-center space-y-2 pb-2 border-b">
                <p className="text-sm font-medium">Customer: {selectedReward.customer.name}</p>
                <p className="text-sm text-muted-foreground">Phone: {selectedReward.customer.phone}</p>
                <p className="text-sm font-medium">
                  Discount: <span className="text-green-600 font-bold">{selectedReward.discountPercent || 10}%</span>
                </p>
                {selectedReward.expiresAt && (
                  <p className="text-sm text-muted-foreground">
                    Expires: {new Date(selectedReward.expiresAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: '2-digit',
                      year: 'numeric'
                    })}
                  </p>
                )}
              </div>
              
              {selectedReward.qrCode ? (
                <>
                  <div className="bg-white p-6 rounded-lg flex flex-col items-center border-2 border-gray-300">
                    <QRCode
                      value={selectedReward.qrCode}
                      size={256}
                      level="H"
                      className="w-full"
                    />
                    {selectedReward.discountCode && (
                      <p className="text-xs text-gray-600 mt-3 font-mono bg-gray-100 px-2 py-1 rounded">
                        Code: {selectedReward.discountCode}
                      </p>
                    )}
                    <p className="text-sm font-bold text-gray-700 mt-2">Scan to Cashier</p>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      className="flex-1 bg-orange-600 hover:bg-orange-700"
                      onClick={() => {
                        setShowQRDialog(false);
                        setShowQRScanner(true);
                      }}
                      disabled={selectedReward.status === 'used'}
                    >
                      {selectedReward.status === 'used' ? (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Already Used
                        </>
                      ) : (
                        <>
                          <Camera className="h-4 w-4 mr-2" />
                          Scan Customer's QR Code
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowQRDialog(false)}
                    >
                      Close
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">QR code not available yet</p>
                  <p className="text-sm text-muted-foreground mt-2">Redeem the reward first to generate QR code</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}