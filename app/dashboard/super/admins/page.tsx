'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sidebar } from '@/components/dashboard/sidebar';
import { motion } from 'framer-motion';
import { Users, Plus, UserCheck, UserX, Calendar, Edit, Trash2, Key, Loader2 } from 'lucide-react';
import { ToastNotification, useToast } from '@/components/ui/toast-notification';

interface Admin {
  _id: string;
  name: string;
  email: string;
  storeId?: { name: string; address: string };
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
}

interface Store {
  _id: string;
  name: string;
  address: string;
  adminId?: { name: string; email: string };
  isActive: boolean;
}

export default function SuperAdminAdminsPage() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast, success, error: showError, hideToast } = useToast();
  const [createAdminOpen, setCreateAdminOpen] = useState(false);
  const [editAdminOpen, setEditAdminOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null);
  const [adminForm, setAdminForm] = useState({ name: '', email: '', password: '', storeId: '' });
  const [editForm, setEditForm] = useState({ name: '', email: '', storeId: '', isActive: true });
  const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' });
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [adminsRes, storesRes] = await Promise.all([
        fetch('/api/super/admins'),
        fetch('/api/super/stores'),
      ]);

      if (adminsRes.ok) {
        const adminsData = await adminsRes.json();
        setAdmins(adminsData);
      }

      if (storesRes.ok) {
        const storesData = await storesRes.json();
        setStores(storesData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate that a store is selected
    if (!adminForm.storeId) {
      showError('Please select a store for the admin');
      return;
    }
    
    try {
      const response = await fetch('/api/super/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(adminForm),
      });

      if (response.ok) {
        setCreateAdminOpen(false);
        setAdminForm({ name: '', email: '', password: '', storeId: '' });
        fetchData();
        success('Admin created successfully!');
      } else {
        const data = await response.json();
        showError(data.error || 'Failed to create admin');
      }
    } catch (error) {
      console.error('Error creating admin:', error);
      showError('Failed to create admin');
    }
  };

  const handleEditAdmin = (admin: Admin) => {
    setSelectedAdmin(admin);
    // Extract storeId - it might be an object with _id or a string
    const storeId = admin.storeId 
      ? (typeof admin.storeId === 'object' && '_id' in admin.storeId 
          ? (admin.storeId as any)._id 
          : (admin.storeId as any))
      : '';
    setEditForm({
      name: admin.name,
      email: admin.email,
      storeId: storeId,
      isActive: admin.isActive
    });
    setEditAdminOpen(true);
  };

  const handleUpdateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdmin) return;

    setProcessing('update');
    try {
      const response = await fetch(`/api/super/admins/${selectedAdmin._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });

      if (response.ok) {
        setEditAdminOpen(false);
        setSelectedAdmin(null);
        fetchData();
        success('Admin updated successfully!');
      } else {
        const data = await response.json();
        showError(data.error || 'Failed to update admin');
      }
    } catch (error) {
      console.error('Error updating admin:', error);
      showError('Failed to update admin');
    } finally {
      setProcessing(null);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdmin) return;

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      showError('Passwords do not match');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      showError('Password must be at least 6 characters long');
      return;
    }

    setProcessing('password');
    try {
      const response = await fetch(`/api/super/admins/${selectedAdmin._id}/change-password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: passwordForm.newPassword }),
      });

      const data = await response.json();
      if (response.ok) {
        setChangePasswordOpen(false);
        setSelectedAdmin(null);
        setPasswordForm({ newPassword: '', confirmPassword: '' });
        success('Password changed successfully!');
      } else {
        showError(data.error || 'Failed to change password');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      showError('Failed to change password');
    } finally {
      setProcessing(null);
    }
  };

  const handleDeleteAdmin = async () => {
    if (!selectedAdmin) return;

    setProcessing('delete');
    try {
      const response = await fetch(`/api/super/admins/${selectedAdmin._id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setDeleteConfirmOpen(false);
        setSelectedAdmin(null);
        fetchData();
        success('Admin deleted successfully!');
      } else {
        const data = await response.json();
        showError(data.error || 'Failed to delete admin');
      }
    } catch (error) {
      console.error('Error deleting admin:', error);
      showError('Failed to delete admin');
    } finally {
      setProcessing(null);
    }
  };

  const openDeleteConfirm = (admin: Admin) => {
    setSelectedAdmin(admin);
    setDeleteConfirmOpen(true);
  };

  const openChangePassword = (admin: Admin) => {
    setSelectedAdmin(admin);
    setPasswordForm({ newPassword: '', confirmPassword: '' });
    setChangePasswordOpen(true);
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
              <h1 className="text-3xl font-bold">Admins Management</h1>
              <p className="text-gray-600 mt-1">Manage all admin users in the system</p>
            </div>
            <Dialog open={createAdminOpen} onOpenChange={setCreateAdminOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Admin
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Admin</DialogTitle>
                  <DialogDescription>
                    Create a new admin user and assign them to a store. The admin will be able to manage their assigned store.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateAdmin} className="space-y-4">
                  <div>
                    <Label htmlFor="admin-name">Name</Label>
                    <Input
                      id="admin-name"
                      value={adminForm.name}
                      onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="admin-email">Email</Label>
                    <Input
                      id="admin-email"
                      type="email"
                      value={adminForm.email}
                      onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="admin-password">Password</Label>
                    <Input
                      id="admin-password"
                      type="password"
                      value={adminForm.password}
                      onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="admin-store">Assign Store <span className="text-red-500">*</span></Label>
                    <Select value={adminForm.storeId} onValueChange={(value) => setAdminForm({ ...adminForm, storeId: value })} required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a store" />
                      </SelectTrigger>
                      <SelectContent>
                        {stores.filter(store => !store.adminId && store.isActive).map((store) => (
                          <SelectItem key={store._id} value={store._id}>
                            {store.name} - {store.address}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full">Create Admin</Button>
                </form>
              </DialogContent>
            </Dialog>
          </motion.div>

          {/* Stats Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-4 gap-4"
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Admins</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{admins.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Admins</CardTitle>
                <UserCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{admins.filter(a => a.isActive).length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Assigned to Stores</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{admins.filter(a => a.storeId).length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Unassigned Admins</CardTitle>
                <UserX className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{admins.filter(a => !a.storeId).length}</div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Admins Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>All Admins</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Store</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {admins.map((admin) => (
                      <TableRow key={admin._id}>
                        <TableCell className="font-medium">{admin.name}</TableCell>
                        <TableCell>{admin.email}</TableCell>
                        <TableCell>
                          {admin.storeId ? (
                            <div>
                              <div className="font-medium">{admin.storeId.name}</div>
                              <div className="text-sm text-gray-500">{admin.storeId.address}</div>
                            </div>
                          ) : (
                            <Badge variant="outline">Unassigned</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={admin.isActive ? 'default' : 'secondary'}>
                            {admin.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {admin.lastLogin ? (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(admin.lastLogin).toLocaleDateString()}
                            </div>
                          ) : (
                            'Never'
                          )}
                        </TableCell>
                        <TableCell>
                          {new Date(admin.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditAdmin(admin)}
                              disabled={processing !== null}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openChangePassword(admin)}
                              disabled={processing !== null}
                            >
                              <Key className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openDeleteConfirm(admin)}
                              disabled={processing !== null}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              {processing === 'delete' && selectedAdmin?._id === admin._id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
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

      {/* Edit Admin Dialog */}
      <Dialog open={editAdminOpen} onOpenChange={setEditAdminOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Admin</DialogTitle>
            <DialogDescription>
              Update admin information and store assignment. Changes will take effect immediately.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateAdmin} className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-store">Assign Store</Label>
              <Select 
                value={editForm.storeId} 
                onValueChange={(value) => setEditForm({ ...editForm, storeId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a store (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Unassigned</SelectItem>
                  {stores.filter(store => store.isActive).map((store) => {
                    const currentStoreId = selectedAdmin?.storeId 
                      ? (typeof selectedAdmin.storeId === 'object' && '_id' in selectedAdmin.storeId 
                          ? (selectedAdmin.storeId as any)._id?.toString()
                          : (selectedAdmin.storeId as any)?.toString())
                      : '';
                    const hasOtherAdmin = store.adminId && 
                      (typeof store.adminId === 'object' && '_id' in store.adminId
                        ? (store.adminId as any)._id?.toString() !== currentStoreId
                        : (store.adminId as any)?.toString() !== currentStoreId);
                    
                    return (
                      <SelectItem 
                        key={store._id} 
                        value={store._id}
                        disabled={hasOtherAdmin}
                      >
                        {store.name} - {store.address}
                        {hasOtherAdmin && ' (Has Admin)'}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="edit-active"
                checked={editForm.isActive}
                onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="edit-active">Active</Label>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={processing === 'update'} className="flex-1">
                {processing === 'update' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Admin'
                )}
              </Button>
              <Button type="button" variant="outline" onClick={() => setEditAdminOpen(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Password for {selectedAdmin?.name}</DialogTitle>
            <DialogDescription>
              Enter a new password for this admin user. The password must be at least 6 characters long.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                required
                minLength={6}
              />
            </div>
            <div>
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                required
                minLength={6}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={processing === 'password'} className="flex-1">
                {processing === 'password' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Changing...
                  </>
                ) : (
                  'Change Password'
                )}
              </Button>
              <Button type="button" variant="outline" onClick={() => setChangePasswordOpen(false)}>
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Admin</DialogTitle>
            <DialogDescription>
              This action cannot be undone. The admin will be permanently removed from the system.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Are you sure you want to delete <strong>{selectedAdmin?.name}</strong>? This action cannot be undone.
            </p>
            <div className="flex gap-2">
              <Button
                variant="destructive"
                onClick={handleDeleteAdmin}
                disabled={processing === 'delete'}
                className="flex-1"
              >
                {processing === 'delete' ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete Admin'
                )}
              </Button>
              <Button type="button" variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Toast Notification */}
      <ToastNotification toast={toast} onClose={hideToast} />
    </div>
  );
}