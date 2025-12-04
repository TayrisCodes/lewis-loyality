'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Switch } from '@/components/ui/switch';
import { Sidebar } from '@/components/dashboard/sidebar';
import { motion } from 'framer-motion';
import { 
  Settings, 
  QrCode, 
  Receipt, 
  RefreshCw, 
  AlertCircle,
  CheckCircle2,
  Store as StoreIcon,
  Power,
  PowerOff
} from 'lucide-react';
import ApiClient, { AuthUtils } from '@/lib/api-client';

interface Store {
  _id: string;
  name: string;
  address: string;
  allowQrScanning: boolean;
  allowReceiptUploads: boolean;
}

interface SystemStats {
  totalStores: number;
  qrEnabled: number;
  qrDisabled: number;
  receiptEnabled: number;
  receiptDisabled: number;
}

export default function SystemControlPage() {
  const router = useRouter();
  const [stores, setStores] = useState<Store[]>([]);
  const [statistics, setStatistics] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
        statistics: SystemStats;
      }>('/api/super/system-control');
      setStores(data.stores);
      setStatistics(data.statistics);
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

  const updateStoreSettings = async (
    storeId: string, 
    field: 'allowQrScanning' | 'allowReceiptUploads', 
    value: boolean
  ) => {
    try {
      setUpdating(`${storeId}-${field}`);
      await ApiClient.put('/api/super/system-control', {
        action: 'single',
        storeId,
        [field]: value
      });
      // Update local state
      setStores(stores.map(store => 
        store._id === storeId ? { ...store, [field]: value } : store
      ));
      // Recalculate statistics
      await fetchData();
    } catch (error: any) {
      console.error('Error updating store:', error);
      alert(error.error || 'Failed to update store settings');
    } finally {
      setUpdating(null);
    }
  };

  const bulkUpdate = async (field: 'allowQrScanning' | 'allowReceiptUploads', value: boolean) => {
    const systemName = field === 'allowQrScanning' ? 'QR Code System' : 'Receipt System';
    const action = value ? 'ENABLE' : 'DISABLE';
    
    if (!confirm(`Are you sure you want to ${action} ${systemName} for ALL stores?\n\nThis will affect ${statistics?.totalStores} stores.`)) {
      return;
    }

    try {
      setUpdating(`bulk-${field}`);
      await ApiClient.put('/api/super/system-control', {
        action: 'bulk',
        [field]: value
      });
      // Refresh data
      await fetchData();
      alert(`${systemName} ${value ? 'enabled' : 'disabled'} for all stores successfully!`);
    } catch (error: any) {
      console.error('Error bulk updating:', error);
      alert(error.error || 'Failed to update all stores');
    } finally {
      setUpdating(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar role="superadmin" />
        <div className="flex-1 lg:ml-64 flex justify-center items-center">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading system control...</p>
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
                System Control
              </h1>
              <p className="text-gray-600 mt-1">
                Manage QR and Receipt systems across all stores
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
              className="grid grid-cols-1 md:grid-cols-5 gap-4"
            >
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Stores</CardTitle>
                  <StoreIcon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{statistics.totalStores}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">QR Enabled</CardTitle>
                  <QrCode className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{statistics.qrEnabled}</div>
                  <p className="text-xs text-muted-foreground">
                    {Math.round((statistics.qrEnabled / statistics.totalStores) * 100)}% of stores
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">QR Disabled</CardTitle>
                  <PowerOff className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{statistics.qrDisabled}</div>
                  <p className="text-xs text-muted-foreground">
                    {Math.round((statistics.qrDisabled / statistics.totalStores) * 100)}% of stores
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Receipt Enabled</CardTitle>
                  <Receipt className="h-4 w-4 text-brand-coral" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-brand-coral">{statistics.receiptEnabled}</div>
                  <p className="text-xs text-muted-foreground">
                    {Math.round((statistics.receiptEnabled / statistics.totalStores) * 100)}% of stores
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Receipt Disabled</CardTitle>
                  <PowerOff className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{statistics.receiptDisabled}</div>
                  <p className="text-xs text-muted-foreground">
                    {Math.round((statistics.receiptDisabled / statistics.totalStores) * 100)}% of stores
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Bulk Actions Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-900">
                  <Power className="h-5 w-5" />
                  Bulk Actions - Apply to All Stores
                </CardTitle>
                <CardDescription>
                  Enable or disable systems for all active stores at once
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h3 className="font-semibold text-blue-900">QR Code System</h3>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => bulkUpdate('allowQrScanning', true)}
                        disabled={updating === 'bulk-allowQrScanning'}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Power className="w-4 h-4 mr-1" />
                        Enable All
                      </Button>
                      <Button
                        onClick={() => bulkUpdate('allowQrScanning', false)}
                        disabled={updating === 'bulk-allowQrScanning'}
                        variant="destructive"
                      >
                        <PowerOff className="w-4 h-4 mr-1" />
                        Disable All
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-semibold text-blue-900">Receipt System</h3>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => bulkUpdate('allowReceiptUploads', true)}
                        disabled={updating === 'bulk-allowReceiptUploads'}
                        className="bg-brand-coral hover:bg-brand-coral/90"
                      >
                        <Power className="w-4 h-4 mr-1" />
                        Enable All
                      </Button>
                      <Button
                        onClick={() => bulkUpdate('allowReceiptUploads', false)}
                        disabled={updating === 'bulk-allowReceiptUploads'}
                        variant="destructive"
                      >
                        <PowerOff className="w-4 h-4 mr-1" />
                        Disable All
                      </Button>
                    </div>
                  </div>
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
                <CardTitle>Store-by-Store Control</CardTitle>
                <CardDescription>
                  Enable or disable systems individually for each store
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Store Name</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead className="text-center">QR System</TableHead>
                      <TableHead className="text-center">Receipt System</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stores.map((store) => (
                      <TableRow key={store._id}>
                        <TableCell className="font-medium">{store.name}</TableCell>
                        <TableCell className="text-sm text-gray-600">{store.address}</TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Switch
                              checked={store.allowQrScanning !== false}
                              onCheckedChange={(checked) =>
                                updateStoreSettings(store._id, 'allowQrScanning', checked)
                              }
                              disabled={updating === `${store._id}-allowQrScanning`}
                            />
                            {store.allowQrScanning !== false ? (
                              <Badge variant="outline" className="text-green-600 border-green-600">
                                <Power className="h-3 w-3 mr-1" />
                                ON
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-red-600 border-red-600">
                                <PowerOff className="h-3 w-3 mr-1" />
                                OFF
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Switch
                              checked={store.allowReceiptUploads !== false}
                              onCheckedChange={(checked) =>
                                updateStoreSettings(store._id, 'allowReceiptUploads', checked)
                              }
                              disabled={updating === `${store._id}-allowReceiptUploads`}
                            />
                            {store.allowReceiptUploads !== false ? (
                              <Badge variant="outline" className="text-brand-coral border-brand-coral">
                                <Power className="h-3 w-3 mr-1" />
                                ON
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-red-600 border-red-600">
                                <PowerOff className="h-3 w-3 mr-1" />
                                OFF
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {store.allowQrScanning !== false && store.allowReceiptUploads !== false ? (
                            <Badge variant="default" className="bg-green-600">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Both Active
                            </Badge>
                          ) : store.allowQrScanning !== false || store.allowReceiptUploads !== false ? (
                            <Badge variant="secondary">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Partial
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <PowerOff className="h-3 w-3 mr-1" />
                              Both Off
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

