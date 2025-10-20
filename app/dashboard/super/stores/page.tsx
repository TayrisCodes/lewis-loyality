'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sidebar } from '@/components/dashboard/sidebar';
import { motion } from 'framer-motion';
import { Store, Plus, RefreshCw, Eye, Edit, Trash2 } from 'lucide-react';

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

export default function SuperAdminStoresPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [createStoreOpen, setCreateStoreOpen] = useState(false);
  const [storeForm, setStoreForm] = useState({ name: '', address: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [storesRes, adminsRes] = await Promise.all([
        fetch('/api/super/stores'),
        fetch('/api/super/admins'),
      ]);

      if (storesRes.ok) {
        const storesData = await storesRes.json();
        setStores(storesData);
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

  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/super/stores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(storeForm),
      });

      if (response.ok) {
        setCreateStoreOpen(false);
        setStoreForm({ name: '', address: '' });
        fetchData();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to create store');
      }
    } catch (error) {
      console.error('Error creating store:', error);
      alert('Failed to create store');
    }
  };

  const handleRegenerateQR = async (storeId: string) => {
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
              <h1 className="text-3xl font-bold">Stores Management</h1>
              <p className="text-gray-600 mt-1">Manage all stores in the system</p>
            </div>
            <Dialog open={createStoreOpen} onOpenChange={setCreateStoreOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Store
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Store</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateStore} className="space-y-4">
                  <div>
                    <Label htmlFor="store-name">Store Name</Label>
                    <Input
                      id="store-name"
                      value={storeForm.name}
                      onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="store-address">Address</Label>
                    <Input
                      id="store-address"
                      value={storeForm.address}
                      onChange={(e) => setStoreForm({ ...storeForm, address: e.target.value })}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full">Create Store</Button>
                </form>
              </DialogContent>
            </Dialog>
          </motion.div>

          {/* Stats Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Stores</CardTitle>
                <Store className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stores.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Stores</CardTitle>
                <Store className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stores.filter(s => s.isActive).length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Stores with Admins</CardTitle>
                <Store className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stores.filter(s => s.adminId).length}</div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Stores Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>All Stores</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Admin</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>QR Expires</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stores.map((store) => (
                      <TableRow key={store._id}>
                        <TableCell className="font-medium">{store.name}</TableCell>
                        <TableCell>{store.address}</TableCell>
                        <TableCell>
                          {store.adminId ? (
                            <div>
                              <div className="font-medium">{store.adminId.name}</div>
                              <div className="text-sm text-gray-500">{store.adminId.email}</div>
                            </div>
                          ) : (
                            'No Admin'
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={store.isActive ? 'default' : 'secondary'}>
                            {store.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(store.qrExpiresAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {new Date(store.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => window.location.href = `/dashboard/super/stores/${store._id}`}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRegenerateQR(store._id)}
                            >
                              <RefreshCw className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}