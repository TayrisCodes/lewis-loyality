'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { Printer, QrCode, Store, MapPin } from 'lucide-react';

interface Store {
  _id: string;
  name: string;
  address: string;
  qrToken: string;
  qrExpiresAt: string;
}

function PrintQRPageContent() {
  const searchParams = useSearchParams();
  const storeId = searchParams.get('storeId');
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (storeId) {
      fetchStore();
    }
  }, [storeId]);

  const fetchStore = async () => {
    try {
      const response = await fetch('/api/admin/store');
      if (response.ok) {
        const storeData = await response.json();
        setStore(storeData);
      }
    } catch (error) {
      console.error('Error fetching store:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-red-600">Store not found</div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-white p-8 print:p-4">
      <div className="max-w-2xl mx-auto">
        {/* Print Header - Hidden in print */}
        <div className="flex justify-between items-center mb-8 print:hidden">
          <h1 className="text-2xl font-bold">QR Code Print Preview</h1>
          <Button onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Print QR Code
          </Button>
        </div>

        {/* QR Code Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <Card className="border-2 border-gray-300 print:shadow-none print:border print:border-gray-400">
            <CardHeader className="text-center pb-4">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Store className="w-6 h-6 text-gray-600" />
                <CardTitle className="text-xl">{store.name}</CardTitle>
              </div>
              <div className="flex items-center justify-center gap-1 text-gray-600">
                <MapPin className="w-4 h-4" />
                <span className="text-sm">{store.address}</span>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* QR Code */}
              <div className="flex justify-center">
                <div className="p-4 bg-white border-2 border-gray-200 rounded-lg print:border print:border-gray-300">
                  <img
                    src={`/qrcodes/${store._id}-${new Date().toISOString().split('T')[0].replace(/-/g, '')}.png`}
                    alt="Store QR Code"
                    className="w-64 h-64 print:w-48 print:h-48"
                  />
                </div>
              </div>

              {/* Token Info */}
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <QrCode className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded print:bg-transparent print:px-0 print:py-0">
                    {store.qrToken}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  Valid until: {new Date(store.qrExpiresAt).toLocaleDateString()}
                </div>
              </div>

              {/* Instructions */}
              <div className="text-center space-y-2 print:text-xs">
                <h3 className="font-semibold text-gray-800">How to Use</h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>1. Display this QR code prominently in your store</p>
                  <p>2. Customers scan with their phone camera</p>
                  <p>3. They register/login and earn loyalty points</p>
                  <p>4. Reward them based on their visit count</p>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t pt-4 print:border-t print:border-gray-300">
                <div className="text-center text-xs text-gray-500">
                  <p>Lewis Loyalty System</p>
                  <p>Generated on {new Date().toLocaleDateString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Print Instructions - Hidden in print */}
        <div className="mt-8 p-4 bg-gray-50 rounded-lg print:hidden">
          <h3 className="font-semibold mb-2">Print Instructions:</h3>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• Use high-quality paper for best QR code scanning</li>
            <li>• Print at actual size for optimal readability</li>
            <li>• Laminate for weather protection if displaying outdoors</li>
            <li>• Test the printed QR code with a phone before displaying</li>
          </ul>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .print\\:border {
            border-width: 1px !important;
          }
          .print\\:text-xs {
            font-size: 0.75rem !important;
          }
        }
      `}</style>
    </div>
  );
}

export default function PrintQRPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <PrintQRPageContent />
    </Suspense>
  );
}




