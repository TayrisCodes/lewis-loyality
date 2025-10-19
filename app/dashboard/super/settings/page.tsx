'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Sidebar } from '@/components/dashboard/sidebar';
import { motion } from 'framer-motion';
import { Settings, Save, Bell, QrCode, MapPin } from 'lucide-react';

interface SettingsData {
  whatsappEnabled: boolean;
  qrExpiryHours: number;
  gpsValidationEnabled: boolean;
}

export default function SuperAdminSettingsPage() {
  const [settings, setSettings] = useState<SettingsData>({
    whatsappEnabled: false,
    qrExpiryHours: 24,
    gpsValidationEnabled: false,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      // For now, we'll use localStorage to persist settings
      // In a real app, this would be an API call
      const savedSettings = localStorage.getItem('superadmin_settings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      // Save to localStorage for now
      localStorage.setItem('superadmin_settings', JSON.stringify(settings));

      // In a real app, this would be an API call
      // await fetch('/api/super/settings', {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(settings),
      // });

      // Show success message
      alert('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error saving settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar role="superadmin" />
        <div className="flex-1 lg:ml-64 flex items-center justify-center">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
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
            <div>
              <h1 className="text-3xl font-bold">Settings</h1>
              <p className="text-gray-600 mt-1">Configure system-wide settings</p>
            </div>
            <Button onClick={handleSaveSettings} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Settings'}
            </Button>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* WhatsApp Settings */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="w-5 h-5" />
                    WhatsApp Integration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="whatsapp-enabled">Enable WhatsApp Notifications</Label>
                      <p className="text-sm text-gray-500">
                        Send automated WhatsApp messages for rewards and updates
                      </p>
                    </div>
                    <Switch
                      id="whatsapp-enabled"
                      checked={settings.whatsappEnabled}
                      onCheckedChange={(checked) =>
                        setSettings({ ...settings, whatsappEnabled: checked })
                      }
                    />
                  </div>

                  {!settings.whatsappEnabled && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        WhatsApp integration is currently disabled. Configure your WhatsApp Business API credentials to enable this feature.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* QR Code Settings */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <QrCode className="w-5 h-5" />
                    QR Code Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="qr-expiry">QR Code Expiry (Hours)</Label>
                    <Input
                      id="qr-expiry"
                      type="number"
                      min="1"
                      max="168"
                      value={settings.qrExpiryHours}
                      onChange={(e) =>
                        setSettings({ ...settings, qrExpiryHours: parseInt(e.target.value) || 24 })
                      }
                    />
                    <p className="text-sm text-gray-500">
                      How long QR codes remain valid before requiring regeneration
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* GPS Validation Settings */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Location Validation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="gps-validation">Enable GPS Validation</Label>
                      <p className="text-sm text-gray-500">
                        Require customers to be near the store to scan QR codes
                      </p>
                    </div>
                    <Switch
                      id="gps-validation"
                      checked={settings.gpsValidationEnabled}
                      onCheckedChange={(checked) =>
                        setSettings({ ...settings, gpsValidationEnabled: checked })
                      }
                    />
                  </div>

                  {settings.gpsValidationEnabled && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">
                        GPS validation is enabled. Customers must be within 100 meters of the store location to scan QR codes.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* System Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    System Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Version</span>
                    <span className="text-sm font-medium">1.0.0</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Environment</span>
                    <span className="text-sm font-medium">Development</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Database</span>
                    <span className="text-sm font-medium">MongoDB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Last Updated</span>
                    <span className="text-sm font-medium">{new Date().toLocaleDateString()}</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="flex justify-end gap-4"
          >
            <Button variant="outline" onClick={fetchSettings}>
              Reset Changes
            </Button>
            <Button onClick={handleSaveSettings} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save All Settings'}
            </Button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}