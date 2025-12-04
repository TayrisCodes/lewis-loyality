'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Shield,
  Clock,
  DollarSign,
  Gift,
  Store as StoreIcon,
  FileText,
  Plus,
  X,
  History,
  Calendar,
  User
} from 'lucide-react';
import ApiClient, { AuthUtils } from '@/lib/api-client';

interface SystemSettings {
  validationRules: {
    allowedTINs: string[];
    minReceiptAmount: number;
    receiptValidityHours: number;
    requireStoreActive: boolean;
    requireReceiptUploadsEnabled: boolean;
  };
  visitLimits: {
    visitLimitHours: number;
  };
  rewardRules: {
    requiredVisits: number;
    rewardPeriodDays: number;
  };
  rewardSettings: {
    discountPercent: number;
    initialExpirationDays: number;
    redemptionExpirationDays: number;
  };
  updatedBy?: string;
  updatedByEmail?: string;
  updatedAt?: string;
  createdAt?: string;
}

interface Store {
  _id: string;
  name: string;
  address: string;
  tin?: string;
  minReceiptAmount?: number;
  receiptValidityHours?: number;
}

interface AuditLog {
  _id: string;
  changedBy: {
    _id: string;
    name: string;
    email: string;
  };
  section: string;
  field?: string;
  changes: {
    before: any;
    after: any;
    description?: string;
  };
  action: string;
  createdAt: string;
}

export default function RulesSettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('global');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Settings state
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [localSettings, setLocalSettings] = useState<SystemSettings | null>(null);
  
  // Per-store settings state
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [bulkStoreSettings, setBulkStoreSettings] = useState({
    minReceiptAmount: '',
    receiptValidityHours: '',
  });
  
  // Audit logs state
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotalPages, setLogsTotalPages] = useState(1);
  const [logsFilter, setLogsFilter] = useState({
    section: '',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    if (!AuthUtils.isAuthenticated() || !AuthUtils.isSuperAdmin()) {
      router.push('/login');
      return;
    }
    fetchSettings();
    fetchStores();
  }, [router]);

  useEffect(() => {
    if (activeTab === 'logs') {
      fetchAuditLogs();
    }
  }, [activeTab, logsPage, logsFilter]);

  const fetchSettings = async () => {
    try {
      setError(null);
      setLoading(true);
      const data = await ApiClient.get<{ success: boolean; settings: SystemSettings }>('/api/super/rules-settings');
      setSettings(data.settings);
      setLocalSettings(JSON.parse(JSON.stringify(data.settings))); // Deep copy
    } catch (error: any) {
      console.error('Error fetching settings:', error);
      setError(error.error || 'Failed to fetch settings');
      if (error.status === 401) {
        AuthUtils.clearAuth();
        router.push('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchStores = async () => {
    try {
      const data = await ApiClient.get<{ stores: Store[] }>('/api/super/receipt-settings');
      setStores(data.stores || []);
    } catch (error: any) {
      console.error('Error fetching stores:', error);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      setLogsLoading(true);
      const params = new URLSearchParams({
        page: logsPage.toString(),
        limit: '20',
      });
      
      if (logsFilter.section) params.append('section', logsFilter.section);
      if (logsFilter.startDate) params.append('startDate', logsFilter.startDate);
      if (logsFilter.endDate) params.append('endDate', logsFilter.endDate);
      
      const data = await ApiClient.get<{
        success: boolean;
        logs: AuditLog[];
        pagination: {
          page: number;
          totalPages: number;
          totalCount: number;
        };
      }>(`/api/super/rules-settings/logs?${params.toString()}`);
      
      setAuditLogs(data.logs || []);
      setLogsTotalPages(data.pagination?.totalPages || 1);
    } catch (error: any) {
      console.error('Error fetching audit logs:', error);
      setError(error.error || 'Failed to fetch audit logs');
    } finally {
      setLogsLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!localSettings) return;
    
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      const payload: any = {};
      
      // Only send changed sections
      if (JSON.stringify(localSettings.validationRules) !== JSON.stringify(settings?.validationRules)) {
        payload.validationRules = localSettings.validationRules;
      }
      if (JSON.stringify(localSettings.visitLimits) !== JSON.stringify(settings?.visitLimits)) {
        payload.visitLimits = localSettings.visitLimits;
      }
      if (JSON.stringify(localSettings.rewardRules) !== JSON.stringify(settings?.rewardRules)) {
        payload.rewardRules = localSettings.rewardRules;
      }
      if (JSON.stringify(localSettings.rewardSettings) !== JSON.stringify(settings?.rewardSettings)) {
        payload.rewardSettings = localSettings.rewardSettings;
      }
      
      if (Object.keys(payload).length === 0) {
        setError('No changes detected');
        return;
      }
      
      await ApiClient.put('/api/super/rules-settings', payload);
      
      setSuccess('Settings updated successfully!');
      await fetchSettings();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error saving settings:', error);
      setError(error.error || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleAddTIN = () => {
    if (!localSettings) return;
    const newTIN = prompt('Enter TIN number (6-20 digits):');
    if (newTIN && /^[0-9]{6,20}$/.test(newTIN)) {
      if (!localSettings.validationRules.allowedTINs.includes(newTIN)) {
        setLocalSettings({
          ...localSettings,
          validationRules: {
            ...localSettings.validationRules,
            allowedTINs: [...localSettings.validationRules.allowedTINs, newTIN],
          },
        });
      } else {
        alert('TIN already exists');
      }
    } else if (newTIN) {
      alert('Invalid TIN format. Must be 6-20 digits.');
    }
  };

  const handleRemoveTIN = (tin: string) => {
    if (!localSettings) return;
    if (localSettings.validationRules.allowedTINs.length <= 1) {
      alert('At least one TIN must be configured');
      return;
    }
    setLocalSettings({
      ...localSettings,
      validationRules: {
        ...localSettings.validationRules,
        allowedTINs: localSettings.validationRules.allowedTINs.filter(t => t !== tin),
      },
    });
  };

  const handleStoreSelect = (storeId: string) => {
    setSelectedStores(prev => 
      prev.includes(storeId) 
        ? prev.filter(id => id !== storeId)
        : [...prev, storeId]
    );
  };

  const handleSelectAllStores = () => {
    if (selectedStores.length === stores.length) {
      setSelectedStores([]);
    } else {
      setSelectedStores(stores.map(s => s._id));
    }
  };

  const handleBulkStoreUpdate = async () => {
    if (selectedStores.length === 0) {
      alert('Please select at least one store');
      return;
    }
    
    try {
      setSaving(true);
      const payload: any = {
        action: 'selected',
        storeIds: selectedStores,
        settings: {},
      };
      
      if (bulkStoreSettings.minReceiptAmount) {
        payload.settings.minReceiptAmount = parseInt(bulkStoreSettings.minReceiptAmount);
      }
      if (bulkStoreSettings.receiptValidityHours) {
        payload.settings.receiptValidityHours = parseInt(bulkStoreSettings.receiptValidityHours);
      }
      
      await ApiClient.put('/api/super/receipt-settings', payload);
      alert(`${selectedStores.length} stores updated successfully!`);
      setSelectedStores([]);
      setBulkStoreSettings({ minReceiptAmount: '', receiptValidityHours: '' });
      await fetchStores();
    } catch (error: any) {
      console.error('Error updating stores:', error);
      alert(error.error || 'Failed to update stores');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar role="superadmin" />
        <div className="flex-1 lg:ml-64 flex justify-center items-center">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Loading settings...</p>
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
                Rules & Constraints Management
              </h1>
              <p className="text-gray-600 mt-1">
                Configure system-wide validation rules, visit limits, and reward settings
              </p>
            </div>
            <Button onClick={fetchSettings} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </motion.div>

          {/* Error/Success Messages */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2 text-red-700"
            >
              <AlertCircle className="h-5 w-5" />
              {error}
            </motion.div>
          )}

          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2 text-green-700"
            >
              <CheckCircle2 className="h-5 w-5" />
              {success}
            </motion.div>
          )}

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="global">Global Settings</TabsTrigger>
              <TabsTrigger value="stores">Per-Store Settings</TabsTrigger>
              <TabsTrigger value="logs">Audit Logs</TabsTrigger>
            </TabsList>

            {/* Global Settings Tab */}
            <TabsContent value="global" className="space-y-6">
              {localSettings && (
                <>
                  {/* Validation Rules */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Shield className="h-5 w-5" />
                          Validation Rules
                        </CardTitle>
                        <CardDescription>
                          Configure receipt validation rules and constraints
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {/* Allowed TINs */}
                        <div>
                          <Label>Allowed TINs (Tax Identification Numbers)</Label>
                          <div className="flex flex-wrap gap-2 mt-2 mb-2">
                            {localSettings.validationRules.allowedTINs.map((tin) => (
                              <Badge key={tin} variant="outline" className="text-sm py-1 px-3 flex items-center gap-2">
                                <span className="font-mono">{tin}</span>
                                {localSettings.validationRules.allowedTINs.length > 1 && (
                                  <button
                                    onClick={() => handleRemoveTIN(tin)}
                                    className="hover:text-red-600"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                )}
                              </Badge>
                            ))}
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={handleAddTIN}
                            className="mt-2"
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add TIN
                          </Button>
                          <p className="text-xs text-gray-500 mt-1">
                            Multiple TINs can be configured. Receipts must match one of these TINs.
                          </p>
                        </div>

                        {/* Minimum Amount */}
                        <div>
                          <Label htmlFor="minReceiptAmount">Minimum Receipt Amount (ETB)</Label>
                          <Input
                            id="minReceiptAmount"
                            type="number"
                            min="0"
                            value={localSettings.validationRules.minReceiptAmount}
                            onChange={(e) => setLocalSettings({
                              ...localSettings,
                              validationRules: {
                                ...localSettings.validationRules,
                                minReceiptAmount: parseInt(e.target.value) || 0,
                              },
                            })}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Receipts below this amount will be rejected.
                          </p>
                        </div>

                        {/* Receipt Validity */}
                        <div>
                          <Label htmlFor="receiptValidityHours">Receipt Validity (Hours)</Label>
                          <Input
                            id="receiptValidityHours"
                            type="number"
                            min="1"
                            value={localSettings.validationRules.receiptValidityHours}
                            onChange={(e) => setLocalSettings({
                              ...localSettings,
                              validationRules: {
                                ...localSettings.validationRules,
                                receiptValidityHours: parseInt(e.target.value) || 24,
                              },
                            })}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            How old a receipt can be before it's rejected (default: 24 hours).
                          </p>
                        </div>

                        {/* Store Status Requirements */}
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <Label>Require Store to be Active</Label>
                            <p className="text-xs text-gray-500">
                              Only accept receipts from active stores
                            </p>
                          </div>
                          <Switch
                            checked={localSettings.validationRules.requireStoreActive}
                            onCheckedChange={(checked) => setLocalSettings({
                              ...localSettings,
                              validationRules: {
                                ...localSettings.validationRules,
                                requireStoreActive: checked,
                              },
                            })}
                          />
                        </div>

                        <div className="flex items-center justify-between p-4 border rounded-lg">
                          <div>
                            <Label>Require Receipt Uploads Enabled</Label>
                            <p className="text-xs text-gray-500">
                              Only accept receipts if store allows receipt uploads
                            </p>
                          </div>
                          <Switch
                            checked={localSettings.validationRules.requireReceiptUploadsEnabled}
                            onCheckedChange={(checked) => setLocalSettings({
                              ...localSettings,
                              validationRules: {
                                ...localSettings.validationRules,
                                requireReceiptUploadsEnabled: checked,
                              },
                            })}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* Visit Limits */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Clock className="h-5 w-5" />
                          Visit Limits
                        </CardTitle>
                        <CardDescription>
                          Configure visit frequency limits
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div>
                          <Label htmlFor="visitLimitHours">Visit Limit (Hours)</Label>
                          <Input
                            id="visitLimitHours"
                            type="number"
                            min="1"
                            value={localSettings.visitLimits.visitLimitHours}
                            onChange={(e) => setLocalSettings({
                              ...localSettings,
                              visitLimits: {
                                visitLimitHours: parseInt(e.target.value) || 24,
                              },
                            })}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Minimum hours between allowed visits (default: 24 hours). Prevents spam and abuse.
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* Reward Rules */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Gift className="h-5 w-5" />
                          Reward Rules
                        </CardTitle>
                        <CardDescription>
                          Configure reward eligibility requirements
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label htmlFor="requiredVisits">Required Visits</Label>
                          <Input
                            id="requiredVisits"
                            type="number"
                            min="1"
                            value={localSettings.rewardRules.requiredVisits}
                            onChange={(e) => setLocalSettings({
                              ...localSettings,
                              rewardRules: {
                                ...localSettings.rewardRules,
                                requiredVisits: parseInt(e.target.value) || 5,
                              },
                            })}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Number of visits required to earn a reward (default: 5).
                          </p>
                        </div>

                        <div>
                          <Label htmlFor="rewardPeriodDays">Reward Period (Days)</Label>
                          <Input
                            id="rewardPeriodDays"
                            type="number"
                            min="1"
                            value={localSettings.rewardRules.rewardPeriodDays}
                            onChange={(e) => setLocalSettings({
                              ...localSettings,
                              rewardRules: {
                                ...localSettings.rewardRules,
                                rewardPeriodDays: parseInt(e.target.value) || 45,
                              },
                            })}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Days within which visits must occur to qualify for reward (default: 45 days).
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* Reward Settings */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <DollarSign className="h-5 w-5" />
                          Reward Settings
                        </CardTitle>
                        <CardDescription>
                          Configure reward discount and expiration settings
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label htmlFor="discountPercent">Discount Percent (%)</Label>
                          <Input
                            id="discountPercent"
                            type="number"
                            min="0"
                            max="100"
                            value={localSettings.rewardSettings.discountPercent}
                            onChange={(e) => setLocalSettings({
                              ...localSettings,
                              rewardSettings: {
                                ...localSettings.rewardSettings,
                                discountPercent: parseInt(e.target.value) || 10,
                              },
                            })}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Discount percentage for rewards (default: 10%).
                          </p>
                        </div>

                        <div>
                          <Label htmlFor="initialExpirationDays">Initial Expiration (Days)</Label>
                          <Input
                            id="initialExpirationDays"
                            type="number"
                            min="1"
                            value={localSettings.rewardSettings.initialExpirationDays}
                            onChange={(e) => setLocalSettings({
                              ...localSettings,
                              rewardSettings: {
                                ...localSettings.rewardSettings,
                                initialExpirationDays: parseInt(e.target.value) || 45,
                              },
                            })}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Days until reward expires after creation (default: 45 days).
                          </p>
                        </div>

                        <div>
                          <Label htmlFor="redemptionExpirationDays">Redemption Expiration (Days)</Label>
                          <Input
                            id="redemptionExpirationDays"
                            type="number"
                            min="1"
                            value={localSettings.rewardSettings.redemptionExpirationDays}
                            onChange={(e) => setLocalSettings({
                              ...localSettings,
                              rewardSettings: {
                                ...localSettings.rewardSettings,
                                redemptionExpirationDays: parseInt(e.target.value) || 30,
                              },
                            })}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Days until reward expires after redemption/QR code generation (default: 30 days).
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* Save Button */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <Card className="bg-gradient-to-r from-brand-coral/10 to-orange-50 border-brand-coral/30">
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-semibold text-brand-coral">Ready to save changes?</p>
                            <p className="text-sm text-gray-600">All changes will be logged in the audit trail.</p>
                          </div>
                          <Button
                            onClick={handleSaveSettings}
                            disabled={saving}
                            className="bg-brand-coral hover:bg-brand-coral/90"
                            size="lg"
                          >
                            {saving ? (
                              <>
                                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="w-4 h-4 mr-2" />
                                Save All Changes
                              </>
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </>
              )}
            </TabsContent>

            {/* Per-Store Settings Tab */}
            <TabsContent value="stores" className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <StoreIcon className="h-5 w-5" />
                      Per-Store Settings
                    </CardTitle>
                    <CardDescription>
                      Override global settings for specific stores
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Bulk Update Form */}
                    <div className="p-4 border rounded-lg bg-gray-50">
                      <Label className="text-base font-semibold mb-4 block">Bulk Update Selected Stores</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="bulkMinAmount">Minimum Amount (ETB)</Label>
                          <Input
                            id="bulkMinAmount"
                            type="number"
                            placeholder="Leave empty to skip"
                            value={bulkStoreSettings.minReceiptAmount}
                            onChange={(e) => setBulkStoreSettings({
                              ...bulkStoreSettings,
                              minReceiptAmount: e.target.value,
                            })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="bulkValidity">Validity (Hours)</Label>
                          <Input
                            id="bulkValidity"
                            type="number"
                            placeholder="Leave empty to skip"
                            value={bulkStoreSettings.receiptValidityHours}
                            onChange={(e) => setBulkStoreSettings({
                              ...bulkStoreSettings,
                              receiptValidityHours: e.target.value,
                            })}
                          />
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button
                          onClick={handleBulkStoreUpdate}
                          disabled={saving || selectedStores.length === 0}
                          className="bg-brand-coral hover:bg-brand-coral/90"
                        >
                          <Save className="w-4 h-4 mr-1" />
                          Update Selected ({selectedStores.length})
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleSelectAllStores}
                        >
                          {selectedStores.length === stores.length ? 'Deselect All' : 'Select All'}
                        </Button>
                      </div>
                    </div>

                    {/* Stores Table */}
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-12">
                              <Checkbox
                                checked={selectedStores.length === stores.length && stores.length > 0}
                                onCheckedChange={handleSelectAllStores}
                              />
                            </TableHead>
                            <TableHead>Store Name</TableHead>
                            <TableHead>TIN</TableHead>
                            <TableHead>Min Amount</TableHead>
                            <TableHead>Validity</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {stores.map((store) => (
                            <TableRow key={store._id}>
                              <TableCell>
                                <Checkbox
                                  checked={selectedStores.includes(store._id)}
                                  onCheckedChange={() => handleStoreSelect(store._id)}
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
                                  <span className="text-xs text-gray-400">Not set</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-green-600 border-green-600">
                                  {store.minReceiptAmount || settings?.validationRules.minReceiptAmount || 2000} ETB
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-blue-600 border-blue-600">
                                  {store.receiptValidityHours || settings?.validationRules.receiptValidityHours || 24}h
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* Audit Logs Tab */}
            <TabsContent value="logs" className="space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <History className="h-5 w-5" />
                      Audit Logs
                    </CardTitle>
                    <CardDescription>
                      View all changes made to system settings
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Filters */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg bg-gray-50">
                      <div>
                        <Label>Section</Label>
                        <select
                          className="w-full mt-1 px-3 py-2 border rounded-md text-sm"
                          value={logsFilter.section}
                          onChange={(e) => {
                            setLogsFilter({ ...logsFilter, section: e.target.value });
                            setLogsPage(1);
                          }}
                        >
                          <option value="">All Sections</option>
                          <option value="validationRules">Validation Rules</option>
                          <option value="visitLimits">Visit Limits</option>
                          <option value="rewardRules">Reward Rules</option>
                          <option value="rewardSettings">Reward Settings</option>
                        </select>
                      </div>
                      <div>
                        <Label>Start Date</Label>
                        <Input
                          type="date"
                          value={logsFilter.startDate}
                          onChange={(e) => {
                            setLogsFilter({ ...logsFilter, startDate: e.target.value });
                            setLogsPage(1);
                          }}
                        />
                      </div>
                      <div>
                        <Label>End Date</Label>
                        <Input
                          type="date"
                          value={logsFilter.endDate}
                          onChange={(e) => {
                            setLogsFilter({ ...logsFilter, endDate: e.target.value });
                            setLogsPage(1);
                          }}
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          variant="outline"
                          onClick={() => {
                            setLogsFilter({ section: '', startDate: '', endDate: '' });
                            setLogsPage(1);
                          }}
                          className="w-full"
                        >
                          Clear Filters
                        </Button>
                      </div>
                    </div>

                    {/* Logs Table */}
                    {logsLoading ? (
                      <div className="text-center py-8">
                        <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2" />
                        <p>Loading audit logs...</p>
                      </div>
                    ) : auditLogs.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        No audit logs found
                      </div>
                    ) : (
                      <>
                        <div className="border rounded-lg overflow-hidden">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Date & Time</TableHead>
                                <TableHead>Changed By</TableHead>
                                <TableHead>Section</TableHead>
                                <TableHead>Changes</TableHead>
                                <TableHead>Action</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {auditLogs.map((log) => (
                                <TableRow key={log._id}>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <Calendar className="h-4 w-4 text-gray-400" />
                                      {new Date(log.createdAt).toLocaleString()}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <User className="h-4 w-4 text-gray-400" />
                                      <div>
                                        <div className="font-medium">{log.changedBy.name}</div>
                                        <div className="text-xs text-gray-500">{log.changedBy.email}</div>
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge variant="outline">{log.section}</Badge>
                                  </TableCell>
                                  <TableCell>
                                    <div className="text-sm">
                                      {log.changes.description || 'Settings updated'}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge>{log.action}</Badge>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>

                        {/* Pagination */}
                        {logsTotalPages > 1 && (
                          <div className="flex justify-between items-center">
                            <Button
                              variant="outline"
                              onClick={() => setLogsPage(prev => Math.max(1, prev - 1))}
                              disabled={logsPage === 1}
                            >
                              Previous
                            </Button>
                            <span className="text-sm text-gray-600">
                              Page {logsPage} of {logsTotalPages}
                            </span>
                            <Button
                              variant="outline"
                              onClick={() => setLogsPage(prev => Math.min(logsTotalPages, prev + 1))}
                              disabled={logsPage === logsTotalPages}
                            >
                              Next
                            </Button>
                          </div>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

