'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Sidebar } from '@/components/dashboard/sidebar';
import { motion } from 'framer-motion';
import { Calendar, Search, CheckCircle, XCircle, Filter, QrCode, Receipt, Eye } from 'lucide-react';

interface Visit {
  _id: string;
  customerId: { name: string; phone: string };
  timestamp: string;
  rewardEarned: boolean;
  storeId: string;
  visitMethod?: 'qr' | 'receipt';  // NEW: Visit method
  receiptId?: {                     // NEW: Receipt details
    _id: string;
    imageUrl: string;
    status: string;
    totalAmount?: number;
    dateOnReceipt?: string;
    invoiceNo?: string;
  };
}

export default function AdminVisitsPage() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [filteredVisits, setFilteredVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    fetchVisits();
  }, []);

  useEffect(() => {
    filterVisits();
  }, [visits, searchTerm, dateFilter]);

  const fetchVisits = async () => {
    try {
      const response = await fetch('/api/admin/visits');
      if (response.ok) {
        const data = await response.json();
        setVisits(data);
      }
    } catch (error) {
      console.error('Error fetching visits:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterVisits = () => {
    let filtered = visits;

    // Filter by search term (name or phone)
    if (searchTerm) {
      filtered = filtered.filter(visit =>
        visit.customerId?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        visit.customerId?.phone?.includes(searchTerm)
      );
    }

    // Filter by date
    if (dateFilter) {
      filtered = filtered.filter(visit => {
        const visitDate = new Date(visit.timestamp).toISOString().split('T')[0];
        return visitDate === dateFilter;
      });
    }

    setFilteredVisits(filtered);
  };

  const handleMarkRewardRedeemed = async (visitId: string) => {
    try {
      // In a real app, this would be an API call
      // await fetch(`/api/admin/visits/${visitId}/redeem`, { method: 'POST' });

      // For now, just update the local state
      setVisits(visits.map(visit =>
        visit._id === visitId ? { ...visit, rewardEarned: true } : visit
      ));

      alert('Reward marked as redeemed!');
    } catch (error) {
      console.error('Error marking reward as redeemed:', error);
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

  const totalVisits = filteredVisits.length;
  const rewardsGiven = filteredVisits.filter(v => v.rewardEarned).length;
  const qrVisits = filteredVisits.filter(v => v.visitMethod === 'qr' || !v.visitMethod).length;
  const receiptVisits = filteredVisits.filter(v => v.visitMethod === 'receipt').length;
  const todayVisits = filteredVisits.filter(v => {
    const visitDate = new Date(v.timestamp).toDateString();
    const today = new Date().toDateString();
    return visitDate === today;
  }).length;

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
              <h1 className="text-3xl font-bold">Visits Management</h1>
              <p className="text-gray-600 mt-1">Track and manage customer visits</p>
            </div>
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
                <CardTitle className="text-sm font-medium">Total Visits</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalVisits}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">QR Visits</CardTitle>
                <QrCode className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{qrVisits}</div>
                <p className="text-xs text-muted-foreground">
                  {totalVisits > 0 ? Math.round((qrVisits / totalVisits) * 100) : 0}%
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Receipt Visits</CardTitle>
                <Receipt className="h-4 w-4 text-brand-coral" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{receiptVisits}</div>
                <p className="text-xs text-muted-foreground">
                  {totalVisits > 0 ? Math.round((receiptVisits / totalVisits) * 100) : 0}%
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Rewards Given</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{rewardsGiven}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Today's Visits</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{todayVisits}</div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex gap-4"
          >
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by customer name or phone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-48">
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                placeholder="Filter by date"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm('');
                setDateFilter('');
              }}
            >
              <Filter className="w-4 h-4 mr-2" />
              Clear Filters
            </Button>
          </motion.div>

          {/* Visits Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Customer Visits</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Visit Time</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Reward Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVisits.map((visit) => (
                      <TableRow key={visit._id}>
                        <TableCell className="font-medium">
                          {visit.customerId?.name || 'Unknown'}
                        </TableCell>
                        <TableCell>{visit.customerId?.phone || 'N/A'}</TableCell>
                        <TableCell>
                          {new Date(visit.timestamp).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          {visit.visitMethod === 'receipt' ? (
                            <Badge variant="outline" className="border-brand-coral text-brand-coral">
                              <Receipt className="h-3 w-3 mr-1" />
                              Receipt
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              <QrCode className="h-3 w-3 mr-1" />
                              QR Code
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={visit.rewardEarned ? 'default' : 'secondary'}>
                            {visit.rewardEarned ? 'Redeemed' : 'Available'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {visit.visitMethod === 'receipt' && visit.receiptId ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.open(`/dashboard/admin/receipts/${visit.receiptId?._id}`, '_blank')}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              View Receipt
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">QR Visit</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {filteredVisits.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No visits found matching your criteria.
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