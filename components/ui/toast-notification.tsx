'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, X, AlertCircle, Info } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastNotificationProps {
  toast: Toast | null;
  onClose: () => void;
}

export function ToastNotification({ toast, onClose }: ToastNotificationProps) {
  useEffect(() => {
    if (toast) {
      const duration = toast.duration || 5000;
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [toast, onClose]);

  if (!toast) return null;

  const icons = {
    success: CheckCircle2,
    error: XCircle,
    warning: AlertCircle,
    info: Info,
  };

  const colors = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };

  const Icon = icons[toast.type];
  const colorClass = colors[toast.type];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -50, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        className={`fixed top-4 right-4 z-50 max-w-md w-full p-4 rounded-lg border shadow-lg ${colorClass}`}
      >
        <div className="flex items-start gap-3">
          <Icon className="h-5 w-5 flex-shrink-0 mt-0.5" />
          <p className="flex-1 text-sm font-medium">{toast.message}</p>
          <button
            onClick={onClose}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export function useToast() {
  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = (
    type: ToastType,
    message: string,
    duration?: number
  ) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToast({ id, type, message, duration });
  };

  const hideToast = () => {
    setToast(null);
  };

  return {
    toast,
    showToast,
    hideToast,
    success: (message: string, duration?: number) =>
      showToast('success', message, duration),
    error: (message: string, duration?: number) =>
      showToast('error', message, duration),
    warning: (message: string, duration?: number) =>
      showToast('warning', message, duration),
    info: (message: string, duration?: number) =>
      showToast('info', message, duration),
  };
}

