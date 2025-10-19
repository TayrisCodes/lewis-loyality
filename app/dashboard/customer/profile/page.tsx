'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion } from 'framer-motion';
import { User, Phone, Calendar, TrendingUp, ArrowLeft, LogOut } from 'lucide-react';

interface CustomerProfile {
  name: string;
  phone: string;
  totalVisits: number;
  lastVisit: string;
  memberSince?: string;
}

export default function CustomerProfilePage() {
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editedName, setEditedName] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    const phone = localStorage.getItem('customerPhone') || localStorage.getItem('customer_phone');
    
    if (!phone) {
      window.location.href = '/customer-auth';
      return;
    }

    try {
      const profileData: CustomerProfile = {
        name: localStorage.getItem('customerName') || localStorage.getItem('customer_name') || 'Customer',
        phone,
        totalVisits: parseInt(localStorage.getItem('totalVisits') || '0'),
        lastVisit: localStorage.getItem('lastVisit') || new Date().toISOString(),
        memberSince: localStorage.getItem('memberSince') || new Date().toISOString(),
      };

      setProfile(profileData);
      setEditedName(profileData.name);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveName = () => {
    if (editedName.trim()) {
      localStorage.setItem('customerName', editedName.trim());
      setProfile(prev => prev ? { ...prev, name: editedName.trim() } : null);
      setEditing(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('customerPhone');
    localStorage.removeItem('customer_phone');
    localStorage.removeItem('customerName');
    localStorage.removeItem('customer_name');
    localStorage.removeItem('totalVisits');
    localStorage.removeItem('lastVisit');
    localStorage.removeItem('memberSince');
    window.location.href = '/customer-auth';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex justify-center items-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <h2 className="text-xl font-semibold mb-4">No profile data found</h2>
            <Button onClick={() => window.location.href = '/customer-auth'}>
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <Button
            variant="outline"
            onClick={() => window.location.href = '/dashboard/customer'}
            className="bg-white dark:bg-gray-800"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
            Profile Settings
          </h1>
          <div className="w-32"></div> {/* Spacer for centering */}
        </motion.div>

        {/* Profile Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 dark:text-white">
                <User className="w-5 h-5" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="dark:text-gray-200">Full Name</Label>
                {editing ? (
                  <div className="flex gap-2">
                    <Input
                      id="name"
                      value={editedName}
                      onChange={(e) => setEditedName(e.target.value)}
                      className="dark:bg-gray-700 dark:text-white"
                    />
                    <Button onClick={handleSaveName} size="sm">
                      Save
                    </Button>
                    <Button onClick={() => {
                      setEditing(false);
                      setEditedName(profile.name);
                    }} variant="outline" size="sm">
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                    <span className="dark:text-white">{profile.name}</span>
                    <Button onClick={() => setEditing(true)} variant="ghost" size="sm">
                      Edit
                    </Button>
                  </div>
                )}
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2 dark:text-gray-200">
                  <Phone className="w-4 h-4" />
                  Phone Number
                </Label>
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                  <span className="dark:text-white">{profile.phone}</span>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Phone number cannot be changed
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stats Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 dark:text-white">
                <TrendingUp className="w-5 h-5" />
                Account Statistics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-300">Total Visits</p>
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{profile.totalVisits}</p>
                </div>
                <div className="p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-300">Rewards Earned</p>
                  <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                    {Math.floor(profile.totalVisits / 5)}
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Member Since
                  </span>
                  <span className="font-medium dark:text-white">
                    {new Date(profile.memberSince || profile.lastVisit).toLocaleDateString('en-US', {
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-300 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Last Visit
                  </span>
                  <span className="font-medium dark:text-white">
                    {new Date(profile.lastVisit).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Actions Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="dark:bg-gray-800">
            <CardHeader>
              <CardTitle className="dark:text-white">Account Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start dark:border-gray-600 dark:text-white dark:hover:bg-gray-700"
                onClick={() => window.location.href = '/dashboard/customer'}
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                View My Rewards
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start text-red-600 border-red-200 hover:bg-red-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-900/20"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Footer Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-center text-sm text-gray-500 dark:text-gray-400 pb-6"
        >
          <p>Lewis Loyalty Program</p>
          <p className="mt-1">Earn rewards with every visit</p>
        </motion.div>
      </div>
    </div>
  );
}




