'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { User, ArrowLeft, LogOut, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CustomerProfile {
  name: string;
  phone: string;
  totalVisits: number;
  lastVisit: string;
  memberSince?: string;
}

export default function CustomerProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editedName, setEditedName] = useState('');
  const [saving, setSaving] = useState(false);

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
      // Try to fetch from API first
      try {
        const response = await fetch(`/api/customer/${phone}/profile`);
        if (response.ok) {
          const data = await response.json();
          setProfile({
            name: data.name || localStorage.getItem('customerName') || 'Customer',
            phone: data.phone || phone,
            totalVisits: data.totalVisits || parseInt(localStorage.getItem('totalVisits') || '0'),
            lastVisit: data.lastVisit || localStorage.getItem('lastVisit') || new Date().toISOString(),
            memberSince: data.memberSince || data.createdAt || localStorage.getItem('memberSince') || new Date().toISOString(),
          });
          setEditedName(data.name || localStorage.getItem('customerName') || 'Customer');
          return;
        }
      } catch (err) {
        console.log('API fetch failed, using localStorage');
      }

      // Fallback to localStorage
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

  const handleSaveChanges = async () => {
    if (!editedName.trim() || !profile) return;
    
    setSaving(true);
    try {
      // Update localStorage
      localStorage.setItem('customerName', editedName.trim());
      
      // Optionally update via API if endpoint exists
      try {
        await fetch('/api/customer/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: profile.phone,
            name: editedName.trim(),
          }),
        });
      } catch (err) {
        console.log('API update failed, using localStorage only');
      }
      
      setProfile(prev => prev ? { ...prev, name: editedName.trim() } : null);
      alert('Changes saved successfully!');
    } catch (error) {
      console.error('Error saving changes:', error);
      alert('Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    if (confirm('Are you sure you want to sign out?')) {
      localStorage.removeItem('customerPhone');
      localStorage.removeItem('customer_phone');
      localStorage.removeItem('customerName');
      localStorage.removeItem('customer_name');
      localStorage.removeItem('totalVisits');
      localStorage.removeItem('lastVisit');
      localStorage.removeItem('memberSince');
      window.location.href = '/customer-auth';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50" style={{ backgroundColor: '#F4F4F4' }}>
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50" style={{ backgroundColor: '#F4F4F4' }}>
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-4">No profile data found</h2>
          <Button onClick={() => window.location.href = '/customer-auth'}>
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20" style={{ backgroundColor: '#F4F4F4' }}>
      <div className="max-w-md mx-auto bg-white min-h-screen pb-20" style={{ maxWidth: '430px' }}>
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <button
            onClick={() => router.push('/dashboard/customer')}
            className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          
          <button
            onClick={handleLogout}
            className="flex flex-col items-center gap-1 hover:opacity-80 transition-opacity"
          >
            <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center">
              <LogOut className="w-5 h-5 text-gray-600 rotate-180" />
            </div>
            <span className="text-xs text-gray-600">Sign out</span>
          </button>
        </div>

        {/* Personal Information Header */}
        <div className="px-6 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
              <User className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold" style={{ color: '#FF701A' }}>
              Personal Information
            </h1>
          </div>
        </div>

        {/* Form Fields */}
        <div className="px-6 space-y-6 mb-6">
          {/* Name Field */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-900 mb-2">
              Name
            </label>
            <input
              id="name"
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#FF701A] focus:border-[#FF701A] bg-white"
              placeholder="Enter your name"
            />
          </div>

          {/* Phone Number Field */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-900 mb-2">
              Phone Number
            </label>
            <input
              id="phone"
              type="tel"
              value={profile.phone}
              readOnly
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 bg-gray-50 cursor-not-allowed"
            />
            <p className="text-xs mt-1" style={{ color: '#EF4444' }}>
              Phone number can not be changed
            </p>
          </div>
        </div>

        {/* Account Details */}
        <div className="px-6 mb-6 space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-900">Member Since:</span>
            <span className="text-sm font-medium text-gray-900">
              {formatDate(profile.memberSince || profile.lastVisit)}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-900">Last Visit:</span>
            <span className="text-sm font-medium text-gray-900">
              {formatDate(profile.lastVisit)}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-900">Total Visit:</span>
            <span className="text-sm font-medium text-gray-900">
              {profile.totalVisits} {profile.totalVisits === 1 ? 'Time' : 'Times'}
            </span>
          </div>
        </div>

        {/* Save Changes Button */}
        <div className="px-6 mb-4">
          <button
            onClick={handleSaveChanges}
            disabled={saving || !editedName.trim() || editedName.trim() === profile.name}
            className="w-full text-white font-bold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            style={{
              backgroundColor: '#FF701A',
              height: '54px',
              fontFamily: 'Montserrat, sans-serif',
              fontWeight: 700,
              fontSize: '14px',
            }}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        {/* View My Rewards Button */}
        <div className="px-6 mb-6">
          <button
            onClick={() => router.push('/dashboard/customer/rewards')}
            className="w-full text-white font-bold rounded-lg transition-all duration-200 hover:opacity-90 flex items-center justify-center gap-2"
            style={{
              backgroundColor: '#FF701A',
              height: '54px',
              fontFamily: 'Montserrat, sans-serif',
              fontWeight: 700,
              fontSize: '14px',
            }}
          >
            <Gift className="w-5 h-5" />
            View My Rewards
          </button>
        </div>

      </div>

      {/* Add Montserrat font */}
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;700&display=swap');
        body {
          font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
      `}</style>
    </div>
  );
}
