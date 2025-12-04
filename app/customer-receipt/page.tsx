'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Store as StoreIcon, Camera, Upload } from 'lucide-react';
import Image from 'next/image';
import ReceiptUploader from '@/components/ReceiptUploader';

interface Store {
  _id: string;
  name: string;
  address?: string;
  branchName?: string;
  allowReceiptUploads?: boolean;
}

export default function CustomerReceiptPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [uploadMode, setUploadMode] = useState<'camera' | 'upload' | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectingStore, setSelectingStore] = useState(true);

  useEffect(() => {
    const phoneParam = searchParams.get('phone');
    const storeIdParam = searchParams.get('storeId');
    const modeParam = searchParams.get('mode'); // 'camera' or 'upload'
    
    setPhone(phoneParam);
    
    // If storeId is provided, fetch and select it automatically
    if (storeIdParam) {
      fetchStoreAndSelect(storeIdParam).then(() => {
        // After store is selected, set the mode
        if (modeParam === 'camera' || modeParam === 'upload') {
          setUploadMode(modeParam);
        }
      });
    } else {
      fetchStores();
      // Set mode immediately if no store selection needed (though we always need store)
      if (modeParam === 'camera' || modeParam === 'upload') {
        // Will be set after store selection
      }
    }
  }, [searchParams]);

  const fetchStores = async () => {
    try {
      const response = await fetch('/api/store');
      if (response.ok) {
        const data = await response.json();
        // Filter stores that allow receipt uploads
        const availableStores = (data.stores || []).filter(
          (store: Store) => store.allowReceiptUploads !== false
        );
        setStores(availableStores);
      }
    } catch (error) {
      console.error('Error fetching stores:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStoreAndSelect = async (storeId: string) => {
    try {
      const response = await fetch(`/api/store?id=${storeId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.store) {
          if (data.store.allowReceiptUploads === false) {
            alert('Receipt uploads are currently disabled for this store. Please use QR code scanning instead.');
            router.push(`/dashboard/customer`);
            return;
          }
          setSelectedStore(data.store);
          setSelectingStore(false);
        }
      }
    } catch (error) {
      console.error('Error fetching store:', error);
      fetchStores(); // Fallback to store list
    } finally {
      setLoading(false);
    }
  };

  const handleStoreSelect = (store: Store) => {
    setSelectedStore(store);
    setSelectingStore(false);
    
    // If mode was set in URL, apply it now
    const modeParam = searchParams.get('mode');
    if (modeParam === 'camera' || modeParam === 'upload') {
      setUploadMode(modeParam);
    }
  };

  const handleBack = () => {
    if (selectingStore) {
      router.push('/dashboard/customer');
    } else {
      setSelectingStore(true);
      setSelectedStore(null);
      setUploadMode(null);
    }
  };

  const handleSuccess = (result: any) => {
    console.log('Receipt approved:', result);
    // Redirect to customer dashboard after success
    setTimeout(() => {
      router.push('/dashboard/customer');
    }, 2000);
  };

  const handleError = (error: string) => {
    console.error('Upload error:', error);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50" style={{ backgroundColor: '#F4F4F4' }}>
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative pb-20" style={{ backgroundColor: '#F4F4F4' }}>
      {/* Background Image - Full Page Cover */}
      <div className="fixed inset-0 -z-10">
        <Image
          src="/Vector (6).png"
          alt="Background"
          fill
          className="object-cover"
          style={{ filter: 'blur(8px)' }}
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-white/70"></div>
      </div>
      
      <div className="max-w-md mx-auto relative min-h-screen pb-20" style={{ maxWidth: '430px' }}>
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <button
            onClick={handleBack}
            className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h1 className="text-xl font-bold text-gray-900">
            {selectingStore ? 'Upload Receipt' : 'Upload Receipt'}
          </h1>
          <div className="w-10"></div> {/* Spacer */}
        </div>

        <AnimatePresence mode="wait">
          {selectingStore ? (
            // Store Selection View
            <motion.div
              key="store-selection"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="relative px-6 pb-6 min-h-[calc(100vh-200px)]"
            >

              {/* Content */}
              <div className="relative z-10">
                <div className="mb-6 pt-4">
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">
                    Where did you buy?
                  </h2>
                  <p className="text-sm text-gray-600">
                    Select the store where you made your purchase
                  </p>
                </div>

                {stores.length === 0 ? (
                  <div className="text-center py-12">
                    <StoreIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600 mb-2">No stores available</p>
                    <p className="text-sm text-gray-500 mb-4">
                      You can upload receipt and we'll auto-detect the store from receipt TIN
                    </p>
                    <button
                      onClick={() => {
                        setSelectingStore(false);
                        const modeParam = searchParams.get('mode');
                        if (modeParam === 'camera' || modeParam === 'upload') {
                          setUploadMode(modeParam);
                        }
                      }}
                      className="px-6 py-3 bg-orange-500 text-white rounded-lg font-semibold hover:bg-orange-600 transition-colors"
                    >
                      Continue Without Selecting Store
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      {stores.map((store) => (
                        <motion.button
                          key={store._id}
                          onClick={() => handleStoreSelect(store)}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className="w-full text-left p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-all shadow-sm"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                              <StoreIcon className="w-6 h-6 text-orange-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-gray-900 mb-1">
                                {store.name}
                              </h3>
                              {store.branchName && (
                                <p className="text-sm text-gray-600 mb-1">
                                  {store.branchName}
                                </p>
                              )}
                              {store.address && (
                                <p className="text-xs text-gray-500 truncate">
                                  {store.address}
                                </p>
                              )}
                            </div>
                            <div className="flex-shrink-0">
                              <div className="w-6 h-6 rounded-full border-2 border-gray-300"></div>
                            </div>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                    
                    {/* Skip Store Selection Option */}
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <p className="text-sm text-gray-600 mb-3 text-center">
                        Or skip store selection and we'll auto-detect from receipt TIN
                      </p>
                      <motion.button
                        onClick={() => {
                          setSelectingStore(false);
                          const modeParam = searchParams.get('mode');
                          if (modeParam === 'camera' || modeParam === 'upload') {
                            setUploadMode(modeParam);
                          }
                        }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full p-4 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-all text-center"
                      >
                        <p className="font-semibold text-gray-900">
                          Skip Store Selection
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Store will be detected from receipt
                        </p>
                      </motion.button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          ) : (
            // Upload/Camera View
            <motion.div
              key="upload-view"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="px-6 pb-6"
            >
              {/* Selected Store Info or Auto-detect Message */}
              {selectedStore ? (
                <div className="mb-6 p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-500 flex items-center justify-center flex-shrink-0">
                      <StoreIcon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900">
                        {selectedStore.name}
                      </h3>
                      {selectedStore.branchName && (
                        <p className="text-sm text-gray-600">
                          {selectedStore.branchName}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center flex-shrink-0">
                      <StoreIcon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900">
                        Store Auto-Detection Enabled
                      </h3>
                      <p className="text-sm text-gray-600">
                        We'll automatically detect the store from your receipt TIN
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Receipt Uploader - Works with or without selected store */}
              <div className="mb-6">
                {uploadMode ? (
                  <ReceiptUploader
                    storeId={selectedStore?._id}
                    customerPhone={phone || undefined}
                    onSuccess={handleSuccess}
                    onError={handleError}
                    autoStartCamera={uploadMode === 'camera'}
                    autoStartUpload={uploadMode === 'upload'}
                  />
                ) : (
                  <div className="space-y-3">
                    <button
                      onClick={() => setUploadMode('camera')}
                      className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all flex items-center justify-center gap-3"
                    >
                      <Camera className="w-6 h-6 text-green-600" />
                      <span className="font-semibold text-gray-900">Open Camera</span>
                    </button>
                    
                    <button
                      onClick={() => setUploadMode('upload')}
                      className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-all flex items-center justify-center gap-3"
                    >
                      <Upload className="w-6 h-6 text-orange-600" />
                      <span className="font-semibold text-gray-900">Upload Receipt</span>
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
