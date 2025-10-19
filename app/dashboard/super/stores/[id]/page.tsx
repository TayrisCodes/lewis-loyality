'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sidebar } from '@/components/dashboard/sidebar';
import { motion } from 'framer-motion';
import { ArrowLeft, Edit, Save, RefreshCw, Store, User, MapPin, Calendar, QrCode } from 'lucide-react';

interface Store {
  _id: string;
  name: string;
  address: string;
  adminId?: { name: string; email: string };
  qrToken: string;
  qrExpiresAt: string;
  isActive: boolean;
  createdAt: string;
}

interface Admin {
  _id: string;
  name: string;
  email: string;
  storeId?: { name: string };
  isActive: boolean;
}

export default function StoreDetailPage() {
  const params = useParams();
  const storeId = params.id as string;

  const [store, setStore] = useState<Store | null>(null);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    address: '',
    adminId: '',
    isActive: false,
  });

  useEffect(() => {
    fetchData();
  }, [storeId]);

  const fetchData = async () => {
    try {
      const [storeRes, adminsRes] = await Promise.all([
        fetch(`/api/super/stores/${storeId}`),
        fetch('/api/super/admins'),
      ]);

      if (storeRes.ok) {
        const storeData = await storeRes.json();
        setStore(storeData);
        setEditForm({
          name: storeData.name,
          address: storeData.address,
          adminId: storeData.adminId?._id || 'none',
          isActive: storeData.isActive,
        });
      }

      if (adminsRes.ok) {
        const adminsData = await adminsRes.json();
        setAdmins(adminsData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`/api/super/stores/${storeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });

      if (response.ok) {
        setEditing(false);
        fetchData();
      }
    } catch (error) {
      console.error('Error updating store:', error);
    }
  };

  const handleRegenerateQR = async () => {
    try {
      const response = await fetch(`/api/super/stores/${storeId}/generate-qr`, {
        method: 'POST',
      });

      if (response.ok) {
        fetchData();
      }
    } catch (error) {
      console.error('Error regenerating QR:', error);
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

  if (!store) {
    return (
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar role="superadmin" />
        <div className="flex-1 lg:ml-64 flex items-center justify-center">
          <div className="text-center">Store not found</div>
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
            className="flex items-center gap-4"
          >
            <Button
              variant="outline"
              onClick={() => window.history.back()}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Stores
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{store.name}</h1>
              <p className="text-gray-600 mt-1">Store Details & Management</p>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Store Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Store className="w-5 h-5" />
                    Store Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!editing ? (
                    <>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-500" />
                        <span className="font-medium">Address:</span>
                        <span>{store.address}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-500" />
                        <span className="font-medium">Admin:</span>
                        <span>
                          {store.adminId ? `${store.adminId.name} (${store.adminId.email})` : 'No Admin Assigned'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <span className="font-medium">Created:</span>
                        <span>{new Date(store.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Status:</span>
                        <Badge variant={store.isActive ? 'default' : 'secondary'}>
                          {store.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <Button onClick={() => setEditing(true)} className="w-full">
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Store
                      </Button>
                    </>
                  ) : (
                    <form onSubmit={handleUpdateStore} className="space-y-4">
                      <div>
                        <Label htmlFor="edit-name">Store Name</Label>
                        <Input
                          id="edit-name"
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-address">Address</Label>
                        <Input
                          id="edit-address"
                          value={editForm.address}
                          onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit-admin">Assign Admin</Label>
                        <Select
                          value={editForm.adminId}
                          onValueChange={(value) => setEditForm({ ...editForm, adminId: value === 'none' ? '' : value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select an admin" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No Admin</SelectItem>
                            {admins.filter(admin => !admin.storeId || (admin.storeId && typeof admin.storeId === 'object' && (admin.storeId as any)._id === storeId)).map((admin) => (
                              <SelectItem key={admin._id} value={admin._id}>
                                {admin.name} ({admin.email})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="edit-active"
                          checked={editForm.isActive}
                          onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                        />
                        <Label htmlFor="edit-active">Active</Label>
                      </div>
                      <div className="flex gap-2">
                        <Button type="submit" className="flex-1">
                          <Save className="w-4 h-4 mr-2" />
                          Save Changes
                        </Button>
                        <Button type="button" variant="outline" onClick={() => setEditing(false)} className="flex-1">
                          Cancel
                        </Button>
                      </div>
                    </form>
                  )}
                </CardContent>
              </Card>
            </motion.div>

            {/* QR Code Information */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <QrCode className="w-5 h-5" />
                    QR Code Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <span className="font-medium">QR Token:</span>
                    <div className="mt-1 p-2 bg-gray-100 rounded text-sm font-mono break-all">
                      {store.qrToken}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    <span className="font-medium">Expires:</span>
                    <span>{new Date(store.qrExpiresAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Status:</span>
                    <Badge variant={new Date(store.qrExpiresAt) > new Date() ? 'default' : 'destructive'}>
                      {new Date(store.qrExpiresAt) > new Date() ? 'Valid' : 'Expired'}
                    </Badge>
                  </div>
                  <Button onClick={handleRegenerateQR} variant="outline" className="w-full">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Regenerate QR Code
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}