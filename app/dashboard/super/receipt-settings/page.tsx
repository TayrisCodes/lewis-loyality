'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Sidebar } from '@/components/dashboard/sidebar';
import { motion } from 'framer-motion';
import { 
  Settings, 
  RefreshCw, 
  Save,
  AlertCircle,
  CheckCircle2,
  Receipt as ReceiptIcon,
  Store as StoreIcon,
  Clock,
  DollarSign,
  FileText
} from 'lucide-react';
import ApiClient, { AuthUtils } from '@/lib/api-client';

interface Store {
  _id: string;
  name: string;
  address: string;
  tin?: string;
  branchName?: string;
  minReceiptAmount?: number;
  receiptValidityHours?: number;
  allowReceiptUploads?: boolean;
}

interface Statistics {
  totalStores: number;
  avgMinAmount: number;
  avgValidityHours: number;
  mostCommonTin: string;
  storesWithTin: number;
  storesWithoutTin: number;
}

export default function BulkReceiptSettingsPage() {
  const router = useRouter();
  const [stores, setStores] = useState<Store[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  
  // Bulk settings form
  const [bulkSettings, setBulkSettings] = useState({
    tin: '',
    minReceiptAmount: '',
    receiptValidityHours: '',
  });

  useEffect(() => {
    // Check if user is authenticated and is super admin
    if (!AuthUtils.isAuthenticated() || !AuthUtils.isSuperAdmin()) {
      router.push('/login');
      return;
    }
    fetchData();
  }, [router]);

  const fetchData = async () => {
    try {
      setError(null);
      setLoading(true);
      const data = await ApiClient.get<{
        stores: Store[];
        statistics: Statistics;
      }>('/api/super/receipt-settings');
      setStores(data.stores);
      setStatistics(data.statistics);
      
      // Pre-fill bulk settings with most common values
      if (data.statistics) {
        setBulkSettings({
          tin: data.statistics.mostCommonTin || '',
          minReceiptAmount: data.statistics.avgMinAmount.toString() || '500',
          receiptValidityHours: data.statistics.avgValidityHours.toString() || '24',
        });
      }
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

  const handleSelectStore = (storeId: string) => {
    setSelectedStores(prev => 
      prev.includes(storeId) 
        ? prev.filter(id => id !== storeId)
        : [...prev, storeId]
    );
  };

  const handleSelectAll = () => {
    if (selectedStores.length === stores.length) {
      setSelectedStores([]);
    } else {
      setSelectedStores(stores.map(s => s._id));
    }
  };

  const updateSettings = async (action: 'bulk' | 'selected', settings: any) => {
    try {
      setUpdating(true);
      
      const payload: any = {
        action,
        settings: {
          tin: settings.tin || undefined,
          minReceiptAmount: settings.minReceiptAmount ? parseInt(settings.minReceiptAmount) : undefined,
          receiptValidityHours: settings.receiptValidityHours ? parseInt(settings.receiptValidityHours) : undefined,
        }
      };

      if (action === 'selected') {
        if (selectedStores.length === 0) {
          alert('Please select at least one store');
          return;
        }
        payload.storeIds = selectedStores;
      }

      await ApiClient.put('/api/super/receipt-settings', payload);
      
      // Refresh data
      await fetchData();
      
      // Clear selection
      setSelectedStores([]);
      
      const message = action === 'bulk' 
        ? 'All stores updated successfully!'
        : `${selectedStores.length} stores updated successfully!`;
      alert(message);
    } catch (error: any) {
      console.error('Error updating settings:', error);
      alert(error.error || 'Failed to update settings');
    } finally {
      setUpdating(false);
    }
  };

  const handleBulkUpdate = () => {
    if (!confirm('Are you sure you want to update ALL stores with these settings?\n\nThis will affect ' + statistics?.totalStores + ' stores.')) {
      return;
    }
    updateSettings('bulk', bulkSettings);
  };

  const handleSelectedUpdate = () => {
    if (selectedStores.length === 0) {
      alert('Please select at least one store');
      return;
    }
    if (!confirm(`Update ${selectedStores.length} selected stores with these settings?`)) {
      return;
    }
    updateSettings('selected', bulkSettings);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar role="superadmin" />
        <div className="flex-1 lg:ml-64 flex justify-center items-center">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading receipt settings...</p>
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
                <Settings className="h-8 w-8" />
                Bulk Receipt Settings
              </h1>
              <p className="text-gray-600 mt-1">
                Manage receipt validation settings across all stores
              </p>
            </div>
            <Button onClick={fetchData} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
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
              className="grid grid-cols-1 md:grid-cols-4 gap-4"
            >
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Stores</CardTitle>
                  <StoreIcon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{statistics.totalStores}</div>
                  <p className="text-xs text-muted-foreground">
                    {statistics.storesWithTin} with TIN configured
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Min Amount</CardTitle>
                  <DollarSign className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{statistics.avgMinAmount} ETB</div>
                  <p className="text-xs text-muted-foreground">
                    Average across all stores
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Validity</CardTitle>
                  <Clock className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{statistics.avgValidityHours} hours</div>
                  <p className="text-xs text-muted-foreground">
                    Receipt validity period
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Common TIN</CardTitle>
                  <FileText className="h-4 w-4 text-brand-coral" />
                </CardHeader>
                <CardContent>
                  <div className="text-lg font-bold truncate">{statistics.mostCommonTin || 'Not set'}</div>
                  <p className="text-xs text-muted-foreground">
                    Most used TIN
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Bulk Update Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-gradient-to-r from-brand-coral/10 to-orange-50 border-brand-coral/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-brand-coral">
                  <ReceiptIcon className="h-5 w-5" />
                  Bulk Update Settings
                </CardTitle>
                <CardDescription>
                  Update receipt settings for all stores or selected stores at once
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <Label htmlFor="tin">TIN (Tax ID Number)</Label>
                    <Input
                      id="tin"
                      placeholder="e.g., 0003169685"
                      value={bulkSettings.tin}
                      onChange={(e) => setBulkSettings({ ...bulkSettings, tin: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="minAmount">Minimum Amount (ETB)</Label>
                    <Input
                      id="minAmount"
                      type="number"
                      placeholder="e.g., 500"
                      value={bulkSettings.minReceiptAmount}
                      onChange={(e) => setBulkSettings({ ...bulkSettings, minReceiptAmount: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="validity">Validity (Hours)</Label>
                    <Input
                      id="validity"
                      type="number"
                      placeholder="e.g., 24"
                      value={bulkSettings.receiptValidityHours}
                      onChange={(e) => setBulkSettings({ ...bulkSettings, receiptValidityHours: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleBulkUpdate}
                    disabled={updating}
                    className="bg-brand-coral hover:bg-brand-coral/90"
                  >
                    <Save className="w-4 h-4 mr-1" />
                    Update All Stores ({statistics?.totalStores})
                  </Button>
                  <Button
                    onClick={handleSelectedUpdate}
                    disabled={updating || selectedStores.length === 0}
                    variant="outline"
                    className="border-brand-coral text-brand-coral"
                  >
                    <Save className="w-4 h-4 mr-1" />
                    Update Selected ({selectedStores.length})
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Stores Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Store Settings</CardTitle>
                    <CardDescription>
                      Select stores to update individually or view current settings
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleSelectAll}>
                    {selectedStores.length === stores.length ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedStores.length === stores.length && stores.length > 0}
                          onCheckedChange={handleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Store Name</TableHead>
                      <TableHead>TIN</TableHead>
                      <TableHead>Branch</TableHead>
                      <TableHead>Min Amount</TableHead>
                      <TableHead>Validity</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stores.map((store) => (
                      <TableRow key={store._id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedStores.includes(store._id)}
                            onCheckedChange={() => handleSelectStore(store._id)}
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{store.name}</div>
                            <div className="text-xs text-gray-500">{store.address}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {store.tin ? (
                            <Badge variant="outline" className="font-mono text-xs">
                              {store.tin}
                            </Badge>
                          ) : (
                            <span className="text-xs text-red-600">Not set</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {store.branchName || <span className="text-xs text-gray-400">-</span>}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            {store.minReceiptAmount || 500} ETB
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-blue-600 border-blue-600">
                            {store.receiptValidityHours || 24}h
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {store.tin ? (
                            <Badge variant="default" className="bg-green-600">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Complete
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Incomplete
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {stores.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No stores found
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

