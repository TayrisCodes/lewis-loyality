'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Store,
  Users,
  Settings,
  BarChart3,
  UserCheck,
  Gift,
  Calendar,
  LogOut,
  User,
  Menu,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuthUtils } from '@/lib/api-client';
import { Logo } from '@/components/ui/logo';

interface SidebarProps {
  role: 'superadmin' | 'admin';
  onLogout?: () => void;
}

const superAdminNavItems = [
  {
    title: 'Dashboard',
    href: '/dashboard/super',
    icon: LayoutDashboard,
  },
  {
    title: 'Stores',
    href: '/dashboard/super/stores',
    icon: Store,
  },
  {
    title: 'Admins',
    href: '/dashboard/super/admins',
    icon: Users,
  },
  {
    title: 'Customers',
    href: '/dashboard/super/customers',
    icon: UserCheck,
  },
  {
    title: 'Analytics',
    href: '/dashboard/super/analytics',
    icon: BarChart3,
  },
  {
    title: 'Check My Rewards',
    href: '/rewards',
    icon: Gift,
  },
  {
    title: 'Settings',
    href: '/dashboard/super/settings',
    icon: Settings,
  },
];

const adminNavItems = [
  {
    title: 'Dashboard',
    href: '/dashboard/admin',
    icon: LayoutDashboard,
  },
  {
    title: 'Visits',
    href: '/dashboard/admin/visits',
    icon: Calendar,
  },
  {
    title: 'Customers',
    href: '/dashboard/admin/customers',
    icon: UserCheck,
  },
  {
    title: 'Rewards',
    href: '/dashboard/admin/rewards',
    icon: Gift,
  },
  {
    title: 'Store',
    href: '/dashboard/admin/store',
    icon: Store,
  },
];

export function Sidebar({ role, onLogout }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [adminName, setAdminName] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  const navItems = role === 'superadmin' ? superAdminNavItems : adminNavItems;

  useEffect(() => {
    setAdminName(AuthUtils.getName());
  }, []);

  const handleLogout = async () => {
    if (onLogout) {
      onLogout();
    } else {
      // Use the AuthUtils logout function which handles both client and server
      await AuthUtils.logout();
    }
  };

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="bg-white/10 backdrop-blur-sm border-white/20"
        >
          {isOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {/* Sidebar overlay for mobile */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed left-0 top-0 z-40 h-full w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 shadow-lg transition-transform duration-300 ease-in-out lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center border-b border-gray-200 dark:border-gray-700 px-6">
            <div className="flex items-center gap-3">
              <Logo size="sm" />
              <div>
                <span className="font-bold text-gray-900 dark:text-white block text-sm">Lewis Retails</span>
                <span className="text-xs text-brand-green">Loyalty</span>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 p-4">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-brand-green/10 text-brand-green dark:bg-brand-green/20"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-brand-coral"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.title}
                </Link>
              );
            })}
          </nav>

          {/* User section */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-full bg-brand-coral/20 flex items-center justify-center">
                <User className="h-4 w-4 text-brand-coral" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {adminName || 'Admin'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{role}</p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="w-full justify-start gap-2"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
