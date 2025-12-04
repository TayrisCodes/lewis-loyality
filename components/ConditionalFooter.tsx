'use client';

import { usePathname } from 'next/navigation';
import BlihFooter from '@/components/BlihFooter';
import PWAInstallPrompt from '@/components/PWAInstallPrompt';

/**
 * Conditionally renders footer and PWA install prompt only on customer pages
 * Hidden on admin/superadmin login and dashboard pages
 */
export default function ConditionalFooter() {
  const pathname = usePathname();
  
  // Pages where footer and install prompt should be visible
  const customerPages = [
    '/customer-auth',
    '/customer',
    '/dashboard/customer',
    '/rewards',
    '/customer-receipt',
  ];
  
  // Don't show on admin/superadmin pages or login page
  const isAdminPage = pathname?.startsWith('/dashboard/admin') || 
                     pathname?.startsWith('/dashboard/super') ||
                     pathname === '/login';
  
  if (isAdminPage) {
    return null;
  }
  
  // Check if current page is a customer page
  const isCustomerPage = customerPages.some(path => pathname?.startsWith(path));
  
  // Only show on customer pages
  if (!isCustomerPage) {
    return null;
  }
  
  return (
    <>
      <BlihFooter />
      <PWAInstallPrompt />
    </>
  );
}
