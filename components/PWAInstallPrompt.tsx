'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const promptFiredRef = useRef(false);

  useEffect(() => {
    // Detect if already installed
    const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches ||
                            (window.navigator as any).standalone ||
                            document.referrer.includes('android-app://');

    if (isStandaloneMode) {
      setIsInstalled(true);
      return;
    }

    // Check if already dismissed
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      const dismissedTime = parseInt(dismissed, 10);
      const now = Date.now();
      // Show again after 7 days
      if (now - dismissedTime < 7 * 24 * 60 * 60 * 1000) {
        return;
      }
    }

    // For browsers that support beforeinstallprompt (Chrome, Edge, Samsung Internet)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      promptFiredRef.current = true;
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show prompt after a delay
      setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Universal fallback: Show prompt after delay for all browsers
    const universalTimeout = setTimeout(() => {
      if (!promptFiredRef.current && !isStandaloneMode) {
        setShowPrompt(true);
      }
    }, 5000);

    // Check if app is already installed
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      clearTimeout(universalTimeout);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      // Chrome, Edge, Samsung Internet - use native prompt
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        setShowPrompt(false);
        setIsInstalled(true);
      }

      setDeferredPrompt(null);
    } else {
      // For other browsers, just dismiss
      setShowPrompt(false);
      localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  // Don't show if already installed
  if (isInstalled || !showPrompt) {
    return null;
  }

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, x: 20, y: 20 }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, x: 20, y: 20 }}
          className="fixed right-4 z-40"
          style={{ bottom: '80px' }}
        >
          {/* Small Install Button */}
          <div className="relative">
            <button
              onClick={handleInstall}
              className="flex items-center gap-2 px-4 py-2.5 text-white font-semibold text-sm rounded-full shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-105 active:scale-95"
              style={{ backgroundColor: '#FF701A' }}
            >
              <Download className="w-4 h-4" />
              <span>Install App</span>
            </button>
            <button
              onClick={handleDismiss}
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors shadow-md"
              aria-label="Close"
            >
              <X className="w-3.5 h-3.5 text-gray-600" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
