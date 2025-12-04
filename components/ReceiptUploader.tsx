"use client";

import { useState, useRef, ChangeEvent, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, Camera, X, CheckCircle, AlertCircle, Clock, RefreshCw, Loader2, FileText, Search, Check, Store as StoreIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import Image from "next/image";

/**
 * Receipt Uploader Component
 * 
 * Features:
 * - Camera capture or file upload
 * - Image preview
 * - Upload progress
 * - Result handling (approved/rejected/flagged)
 * - Retry functionality
 * 
 * Props:
 * - storeId: Store ID for receipt validation
 * - customerPhone: Customer phone number (optional)
 * - onSuccess: Callback when receipt is approved
 * - onError: Callback when upload fails
 */

interface ReceiptUploaderProps {
  storeId?: string;  // Optional - can be identified from receipt TIN
  customerPhone?: string;
  onSuccess?: (result: any) => void;
  onError?: (error: string) => void;
  autoStartCamera?: boolean;  // Auto-start camera when component mounts
  autoStartUpload?: boolean;  // Auto-start file upload dialog when component mounts
}

export default function ReceiptUploader({
  storeId,
  customerPhone,
  onSuccess,
  onError,
  autoStartCamera = false,
  autoStartUpload = false,
}: ReceiptUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState<'upload' | 'ocr' | 'validate' | 'done'>('upload');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [canUpload, setCanUpload] = useState<boolean>(true);
  const [eligibilityMessage, setEligibilityMessage] = useState<string>('');
  const [checkingEligibility, setCheckingEligibility] = useState<boolean>(false);
  const [uploadStartTime, setUploadStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [timeoutReached, setTimeoutReached] = useState<boolean>(false);
  const [isConfident, setIsConfident] = useState<boolean>(false);
  
  // Store selection state
  const [needsStoreSelection, setNeedsStoreSelection] = useState<boolean>(false);
  const [availableStores, setAvailableStores] = useState<any[]>([]);
  const [linkingStore, setLinkingStore] = useState<boolean>(false);
  const [extractedTIN, setExtractedTIN] = useState<string | null>(null);
  const [pendingReceiptId, setPendingReceiptId] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const loadingRef = useRef<HTMLDivElement>(null);

  /**
   * Check if customer can upload (24-hour visit limit)
   */
  useEffect(() => {
    if (!customerPhone) {
      setCanUpload(true); // Allow upload if no phone provided
      return;
    }

    const checkEligibility = async () => {
      setCheckingEligibility(true);
      try {
        const response = await fetch(`/api/customer/receipt/eligibility?phone=${encodeURIComponent(customerPhone)}`);
        const data = await response.json();
        
        if (data.success) {
          setCanUpload(data.canUpload);
          if (!data.canUpload && data.message) {
            setEligibilityMessage(data.message);
          } else {
            setEligibilityMessage('');
          }
        }
      } catch (err) {
        console.error('Error checking eligibility:', err);
        // Allow upload on error (fail open)
        setCanUpload(true);
      } finally {
        setCheckingEligibility(false);
      }
    };

    checkEligibility();
  }, [customerPhone]);

  /**
   * Auto-start native camera if autoStartCamera prop is true
   */
  useEffect(() => {
    if (autoStartCamera && !selectedFile && !checkingEligibility) {
      // Small delay to ensure component is fully mounted
      const timer = setTimeout(() => {
        startCamera();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoStartCamera, selectedFile, checkingEligibility]);

  /**
   * Auto-start file upload if autoStartUpload prop is true
   */
  useEffect(() => {
    if (autoStartUpload && !selectedFile && !checkingEligibility) {
      // Small delay to ensure component is fully mounted
      const timer = setTimeout(() => {
        fileInputRef.current?.click();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [autoStartUpload, selectedFile, checkingEligibility]);

  /**
   * Handle file selection
   */
  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    
    if (!file) return;
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic'];
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Please upload JPG, PNG, or HEIC image.');
      return;
    }
    
    // Validate file size (8MB max)
    const maxSize = 8 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('File too large. Maximum size is 8MB.');
      return;
    }
    
    setSelectedFile(file);
    setError(null);
    setResult(null);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  /**
   * Open native system camera directly (no web-based interface)
   */
  const startCamera = () => {
    // Directly trigger native camera input - opens device's camera app
    cameraInputRef.current?.click();
  };

  /**
   * Fetch stores for selection when store selection is needed
   */
  const fetchStoresForSelection = async () => {
    try {
      const response = await fetch('/api/store');
      if (response.ok) {
        const data = await response.json();
        // Filter stores that allow receipt uploads and are active
        const stores = (data.stores || []).filter(
          (store: any) => store.allowReceiptUploads !== false && store.isActive !== false
        );
        setAvailableStores(stores);
      }
    } catch (error) {
      console.error('Error fetching stores:', error);
      setError('Failed to load stores. Please try again.');
    }
  };

  /**
   * Handle store selection and link receipt to store
   */
  const handleStoreSelectionAndLink = async (selectedStoreId: string) => {
    if (!pendingReceiptId) return;
    
    try {
      setLinkingStore(true);
      setError(null);
      
      const response = await fetch('/api/receipts/link-store', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          receiptId: pendingReceiptId,
          storeId: selectedStoreId,
          customerPhone: customerPhone,
        }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        // Success - receipt linked and validated
        setIsConfident(true);
        setStatusMessage('Receipt approved! 🎉');
        setResult({
          status: data.status || 'approved',
          message: data.reason,
          data: data.data,
        });
        setNeedsStoreSelection(false);
        
        if (onSuccess) {
          onSuccess(data.data || data);
        }
      } else {
        // Validation failed after linking
        setNeedsStoreSelection(false);
        setResult({
          status: data.status || 'rejected',
          reason: data.reason,
          rejectionDetails: data.rejectionDetails,
          receiptId: data.receiptId,
        });
      }
    } catch (error: any) {
      console.error('Error linking store:', error);
      setError(error.message || 'Failed to link store. Please try again.');
    } finally {
      setLinkingStore(false);
    }
  };


  /**
   * Cleanup timeout interval
   */
  const cleanupTimeout = () => {
    if ((window as any).__receiptUploadTimeoutInterval) {
      clearInterval((window as any).__receiptUploadTimeoutInterval);
      delete (window as any).__receiptUploadTimeoutInterval;
    }
  };

  /**
   * Upload receipt to server with real progress tracking
   */
  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a receipt image first');
      return;
    }
    
    setUploading(true);
    setProgress(0);
    setCurrentStep('upload');
    setStatusMessage('Preparing to upload receipt...');
    setError(null);
    setResult(null);
    const startTime = Date.now();
    setUploadStartTime(startTime);
    setElapsedSeconds(0);
    setTimeoutReached(false);
    setIsConfident(false);
    
    // Auto-scroll to loading section
    setTimeout(() => {
      if (loadingRef.current) {
        loadingRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
    
    // Start timeout tracking
    const timeoutInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setElapsedSeconds(elapsed);
      
      if (elapsed > 60) {
        setTimeoutReached(true);
        clearInterval(timeoutInterval);
      }
    }, 1000);
    
    // Store interval for cleanup
    (window as any).__receiptUploadTimeoutInterval = timeoutInterval;
    
    return new Promise<void>((resolve, reject) => {
      // STEP 1: Upload with real progress tracking
      setCurrentStep('upload');
      setStatusMessage('Uploading receipt image...');
      
      // Create form data
      const formData = new FormData();
      formData.append('file', selectedFile);
      if (storeId) {
        formData.append('storeId', storeId);
      }
      if (customerPhone) {
        formData.append('phone', customerPhone);
      }
      
      // Use XMLHttpRequest for real upload progress tracking
      const xhr = new XMLHttpRequest();
      
      // Track upload progress (0-40% for actual file upload)
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          // Upload progress: 0-40% of total
          const uploadPercent = (e.loaded / e.total) * 40;
          setProgress(Math.min(uploadPercent, 40));
        }
      });
      
      // Upload complete, now waiting for server processing
      xhr.upload.addEventListener('load', () => {
        setProgress(40);
        setCurrentStep('ocr');
        setStatusMessage('Reading receipt text (OCR processing)... This should take less than 10 seconds...');
        
        // Simulate progress during OCR processing (40-99% with gradual slowdown, never stops)
        let ocrProgress = 40;
        let elapsedTime = 0;
        const startTime = Date.now();
        
        const ocrProgressInterval = setInterval(() => {
          // Check if response received
          if (xhr.readyState === 4) {
            clearInterval(ocrProgressInterval);
            return;
          }
          
          elapsedTime = (Date.now() - startTime) / 1000; // seconds
          
          // Gradual progress with slowdown (continues past 95%):
          // - First 10 seconds: faster progress (40% -> 70%)
          // - Next 10 seconds: slower progress (70% -> 88%)
          // - Next 30 seconds: very slow progress (88% -> 96%)
          // - After 50 seconds: extremely slow progress (96% -> 98%)
          // - After 90 seconds: minimal progress (98% -> 99%)
          let increment: number;
          let maxProgress: number;
          
          // Updated progress simulation for faster OCR (<10s typical)
          if (elapsedTime < 5) {
            // Fast phase: ~8% per second for first 5s (40% -> 80%)
            increment = 1.6;
            maxProgress = 80;
          } else if (elapsedTime < 10) {
            // Medium phase: ~2% per second for next 5s (80% -> 90%)
            increment = 0.4;
            maxProgress = 90;
          } else if (elapsedTime < 20) {
            // Slow phase: ~0.5% per second (90% -> 95% over 10s)
            increment = 0.1;
            maxProgress = 95;
          } else if (elapsedTime < 30) {
            // Very slow phase: ~0.1% per second (95% -> 97% over 10s)
            increment = 0.02;
            maxProgress = 97;
          } else {
            // Extremely slow phase: ~0.05% per second (97% -> 99%)
            increment = 0.01;
            maxProgress = 99;
          }
          
          ocrProgress = Math.min(ocrProgress + increment, maxProgress);
          setProgress(ocrProgress);
          
          // Store last progress for smooth transition
          (xhr as any)._lastProgress = ocrProgress;
          
          // Update message based on elapsed time with helpful feedback
          const minutes = Math.floor(elapsedTime / 60);
          const seconds = Math.round(elapsedTime % 60);
          const timeStr = minutes > 0 ? `${minutes}m ${seconds}s` : `${Math.round(elapsedTime)}s`;
          
          // Updated messages for faster OCR expectations
          if (elapsedTime > 15) {
            setStatusMessage(`OCR is taking longer than expected (${timeStr}). Please wait, this is normal for complex receipts...`);
          } else if (elapsedTime > 10) {
            setStatusMessage(`Still processing receipt (${timeStr}). Complex receipts may take a bit longer...`);
          } else if (elapsedTime > 8) {
            setStatusMessage(`Reading receipt text (OCR processing)... Almost done... (${timeStr})`);
          }
        }, 200); // Update more frequently for smoother progress
        
        // Store interval to clear if request completes quickly
        (xhr as any)._ocrInterval = ocrProgressInterval;
      });
      
      // Handle response
      xhr.addEventListener('load', () => {
        // Clear OCR progress interval if still running
        if ((xhr as any)._ocrInterval) {
          clearInterval((xhr as any)._ocrInterval);
        }
        
        // Set progress to current OCR progress or 99% if it's lower
        const currentProgress = (xhr as any)._lastProgress || 99;
        setProgress(Math.max(currentProgress, 99));
        setCurrentStep('validate');
        setStatusMessage('Validating receipt information...');
        
        // Only process 200/201 responses in load handler
        // All 400+ responses (including rejections) are handled in loadend
        if (xhr.status !== 200 && xhr.status !== 201) {
          // Let loadend handle non-200 responses
          return;
        }
        
        try {
          const data = JSON.parse(xhr.responseText);
          
          // Mark response as handled immediately to prevent loadend from treating it as error
          responseHandled = true;
            
            // Validation complete
            setTimeout(() => {
              setCurrentStep('done');
              setProgress(100);
              
              setTimeout(() => {
                if (data.success && data.status === 'approved') {
                  // Success - receipt approved
                  setIsConfident(true);
                  setStatusMessage('Receipt approved! 🎉');
                  setResult({
                    status: 'approved',
                    message: data.message,
                    data: data.data,
                  });
                  
                  if (onSuccess) {
                    onSuccess(data.data);
                  }
                } else if (data.status === 'rejected') {
                  // Rejected - clear rule violation
                  setIsConfident(false);
                  setStatusMessage('Validation complete');
                  setResult({
                    status: 'rejected',
                    reason: data.reason,
                    rejectionDetails: data.rejectionDetails, // Include detailed rejection information
                    canRetake: data.canRetake,
                    canRequestReview: data.canRequestReview,
                    receiptId: data.receiptId,
                  });
                } else if (data.status === 'needs_store_selection') {
                  // Store selection needed - TIN not linked or multiple stores with same TIN
                  setIsConfident(false);
                  setStatusMessage('Please select the store for this receipt');
                  setNeedsStoreSelection(true);
                  setPendingReceiptId(data.receiptId);
                  setExtractedTIN(data.extractedTIN || null);
                  
                  // If matchingStores provided (multiple stores with same TIN), use those
                  // Otherwise fetch all available stores
                  if (data.matchingStores && data.matchingStores.length > 0) {
                    setAvailableStores(data.matchingStores);
                  } else {
                    // Fetch available stores
                    fetchStoresForSelection();
                  }
                } else if (data.status === 'flagged') {
                  // Flagged - needs manual review (but system is confident)
                  setIsConfident(true);
                  setStatusMessage('Receipt submitted for review');
                  setResult({
                    status: 'flagged',
                    reason: data.reason,
                    rejectionDetails: data.rejectionDetails, // Include detailed rejection information
                    canRetake: data.canRetake,
                    canRequestReview: data.canRequestReview,
                    receiptId: data.receiptId,
                  });
                } else {
                  // Error
                  setStatusMessage('Processing failed');
                  setError(data.error || 'Upload failed. Please try again.');
                  if (onError) {
                    onError(data.error || 'Upload failed');
                  }
                }
                
                setUploading(false);
                cleanupTimeout();
                resolve();
              }, 300);
            }, 500);
        } catch (err) {
          console.error('Response parsing error:', err);
          // Don't set responseHandled for parse errors, let loadend handle it
          // Only reject if it's a 200 response (unexpected parse error)
          if (xhr.status === 200 || xhr.status === 201) {
            setStatusMessage('Processing failed');
            setError('Failed to process response. Please try again.');
            if (onError) {
              onError('Response parsing failed');
            }
            cleanupTimeout();
            setUploading(false);
            reject(err);
          }
        }
      });
      
      // Handle errors
      xhr.addEventListener('error', () => {
        setStatusMessage('Upload failed');
        setError('Network error. Please check your connection and try again.');
        if (onError) {
          onError('Network error');
        }
        cleanupTimeout();
        setUploading(false);
        setCurrentStep('done');
        reject(new Error('Network error'));
      });
      
      xhr.addEventListener('abort', () => {
        setStatusMessage('Upload cancelled');
        cleanupTimeout();
        setUploading(false);
        setCurrentStep('done');
        reject(new Error('Upload cancelled'));
      });
      
      // Handle all responses in loadend (fires after load, handles all status codes)
      // This ensures we catch rejections (400) and flags (202) properly
      let responseHandled = false;
      
      xhr.addEventListener('loadend', () => {
        // Skip if response was already handled in 'load' event
        if (responseHandled) return;
        
        // Handle all responses here to catch rejections/flags that might not be handled in 'load'
        try {
          const responseText = xhr.responseText;
          if (!responseText) {
            // No response body - treat as error
            setStatusMessage('Processing failed');
            setError(`Server error (${xhr.status})`);
            if (onError) {
              onError('Server error');
            }
            cleanupTimeout();
            setUploading(false);
            setCurrentStep('done');
            reject(new Error(`HTTP ${xhr.status}`));
            return;
          }
          
          const data = JSON.parse(responseText);
          
          // Check if this is a rejection/flag response (even with 400 status)
          if (data.status === 'rejected' || data.status === 'flagged') {
            // Handle rejection/flag response
            setIsConfident(data.status === 'flagged'); // Flagged means confident, rejected means not
            setCurrentStep('done');
            setProgress(100);
            setStatusMessage(data.status === 'rejected' ? 'Validation complete' : 'Receipt submitted for review');
            // Clear any error state since we're handling this as a valid response
            setError(null);
            setResult({
              status: data.status,
              reason: data.reason,
              rejectionDetails: data.rejectionDetails,
              canRetake: data.canRetake,
              canRequestReview: data.canRequestReview,
              receiptId: data.receiptId,
            });
            cleanupTimeout();
            setUploading(false);
            responseHandled = true;
            resolve(); // Resolve promise, don't reject - this is a valid response
            return;
          }
          
          // For other 400+ responses without rejection/flag status, treat as error
          if (xhr.status >= 400) {
            setStatusMessage('Processing failed');
            setError(data.error || `Server error (${xhr.status})`);
            if (onError) {
              onError(data.error || 'Server error');
            }
            cleanupTimeout();
            setUploading(false);
            setCurrentStep('done');
            reject(new Error(`HTTP ${xhr.status}`));
            return;
          }
        } catch (parseError) {
          // JSON parse failed or other error
          if (xhr.status >= 400) {
            setStatusMessage('Processing failed');
            setError(`Server error (${xhr.status})`);
            if (onError) {
              onError('Server error');
            }
            cleanupTimeout();
            setUploading(false);
            setCurrentStep('done');
            reject(new Error(`HTTP ${xhr.status}`));
          }
        }
      });
      
      // Start upload
      xhr.open('POST', '/api/receipts/upload');
      xhr.send(formData);
    }).catch((err) => {
      console.error('Upload error:', err);
      // Only show generic error if we don't already have a result (rejection/flag)
      // This prevents showing error messages when rejection details are already displayed
      if (!result) {
        setStatusMessage('Upload failed');
        setError('Upload failed. Please check your connection and try again.');
        if (onError) {
          onError('Upload failed');
        }
        cleanupTimeout();
        setUploading(false);
        setCurrentStep('done');
      }
      // If result is already set (rejection/flag handled), don't overwrite it
    });
  };

  /**
   * Clear selection and start over
   */
  const handleRetry = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
    setProgress(0);
    setCurrentStep('upload');
    setStatusMessage('');
  };

  /**
   * Request manual review
   */
  const handleRequestReview = async () => {
    if (!result?.receiptId) return;
    
    try {
      // Update receipt status to request manual review
      // This would be a new API endpoint: POST /api/receipts/:id/request-review
      console.log('Requesting manual review for:', result.receiptId);
      
      // For now, just show confirmation
      alert('Your receipt has been submitted for manual review. We will notify you once reviewed.');
      
    } catch (err) {
      console.error('Request review error:', err);
    }
  };

  return (
    <div className="w-full relative">
      {/* Background Image - Full Page Cover */}
      <div className="fixed inset-0 -z-10">
        <Image
          src="/Vector (6).png"
          alt="Background"
          fill
          className="object-cover"
          style={{ filter: 'blur(8px)' }}
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-white/90"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 space-y-6 p-6">
          {/* File input hidden elements */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/heic"
            onChange={handleFileSelect}
            className="hidden"
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            className="hidden"
          />
          {/* Error Alert - Only show if we don't have a rejection/flag result */}
          <AnimatePresence>
            {error && !result && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3"
              >
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                </div>
                <button
                  onClick={() => setError(null)}
                  className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Store Selection UI - When TIN not linked to store or multiple stores share TIN */}
          <AnimatePresence>
            {needsStoreSelection && !result && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="p-6 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-lg space-y-4"
              >
                <div className="text-center">
                  <StoreIcon className="h-16 w-16 text-blue-600 dark:text-blue-400 mx-auto mb-3" />
                  <h3 className="text-xl font-bold text-blue-900 dark:text-blue-100 mb-2">
                    Store Selection Required
                  </h3>
                  <p className="text-blue-800 dark:text-blue-200 mb-4">
                    {availableStores.length > 1 
                      ? `We found ${availableStores.length} stores with the same TIN number.`
                      : "We couldn't automatically detect the store from the receipt TIN."
                    }
                    {extractedTIN && (
                      <span className="block mt-2 text-sm">
                        Receipt TIN: <span className="font-mono font-bold">{extractedTIN}</span>
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mb-6">
                    Please select the store where you made this purchase:
                  </p>
                </div>

                {availableStores.length === 0 ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-600" />
                    <p className="text-sm text-blue-600">Loading stores...</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {availableStores.map((store) => (
                      <motion.button
                        key={store._id}
                        onClick={() => handleStoreSelectionAndLink(store._id)}
                        disabled={linkingStore}
                        whileHover={{ scale: linkingStore ? 1 : 1.02 }}
                        whileTap={{ scale: linkingStore ? 1 : 0.98 }}
                        className="w-full text-left p-4 bg-white dark:bg-gray-800 border-2 border-blue-200 dark:border-blue-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900 flex items-center justify-center flex-shrink-0">
                            <StoreIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                              {store.name}
                            </h4>
                            {store.branchName && (
                              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                                {store.branchName}
                              </p>
                            )}
                            {store.address && (
                              <p className="text-xs text-gray-500 dark:text-gray-500 truncate">
                                {store.address}
                              </p>
                            )}
                          </div>
                          {linkingStore && (
                            <Loader2 className="w-5 h-5 animate-spin text-blue-600 flex-shrink-0" />
                          )}
                        </div>
                      </motion.button>
                    ))}
                  </div>
                )}

                {error && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Result Display */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                {result.status === 'approved' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative p-8 rounded-xl text-center space-y-6 overflow-hidden"
                    style={{
                      background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                    }}
                  >
                    {/* Success Animation */}
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", delay: 0.2 }}
                      className="relative z-10"
                    >
                      <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <CheckCircle className="h-16 w-16 text-white" />
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-2">
                        Receipt Accepted
                      </h3>
                      <p className="text-white/90 mb-4">
                        Your visit has been counted successfully!
                      </p>
                      <div className="bg-white/20 rounded-lg p-4 space-y-2">
                        <p className="text-white font-semibold">
                          Visit Count: <span className="text-2xl">{result.data?.visitCount || 0}</span>
                        </p>
                        {result.data?.rewardEarned && (
                          <p className="text-lg font-bold text-yellow-300">
                            🎁 Check your rewards!
                          </p>
                        )}
                      </div>
                    </motion.div>
                  </motion.div>
                )}

                {result.status === 'rejected' && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative p-8 rounded-xl space-y-6 overflow-hidden"
                    style={{
                      background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                    }}
                  >
                    <div className="relative z-10 text-center">
                      <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="h-16 w-16 text-white" />
                      </div>
                      <h3 className="text-2xl font-bold text-white mb-3">
                        Receipt Not Accepted
                      </h3>
                      <p className="text-white/90 mb-4 text-lg">
                        {result.reason}
                      </p>
                    </div>
                    
                    {/* Detailed rejection reasons - simplified for modern design */}
                    {result.rejectionDetails && result.rejectionDetails.length > 0 && (
                      <div className="relative z-10 bg-white/10 rounded-lg p-4 space-y-2">
                        <h4 className="text-sm font-semibold text-white mb-3">
                          Receipt Information:
                        </h4>
                        <div className="space-y-2">
                          {result.rejectionDetails.map((detail: any, index: number) => (
                            <div
                              key={index}
                              className="p-3 bg-white/20 rounded-lg text-left"
                            >
                              <p className="text-sm font-medium text-white">
                                {detail.message}
                              </p>
                              {(detail.found !== undefined || detail.expected !== undefined) && (
                                <div className="text-xs mt-2 space-y-1 text-white/80">
                                  {detail.found !== undefined && (
                                    <p>Extracted: <span className="font-medium">{String(detail.found)}</span></p>
                                  )}
                                  {detail.expected !== undefined && (
                                    <p>Expected: <span className="font-medium">{String(detail.expected)}</span></p>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {result.canRetake && (
                      <div className="relative z-10 text-center pt-4">
                        <Button
                          onClick={handleRetry}
                          className="bg-white text-red-600 hover:bg-white/90 font-semibold px-6 py-2"
                        >
                          <Camera className="mr-2 h-4 w-4" />
                          Retake Photo
                        </Button>
                      </div>
                    )}
                  </motion.div>
                )}

                {result.status === 'flagged' && (
                  <div className="p-6 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-800 rounded-lg space-y-4">
                    <div className="text-center">
                      <Clock className="h-16 w-16 text-yellow-600 dark:text-yellow-400 mx-auto mb-3" />
                      <h3 className="text-xl font-bold text-yellow-900 dark:text-yellow-100 mb-2">
                        Manual Review Needed
                      </h3>
                      <p className="text-yellow-800 dark:text-yellow-200 mb-4">
                        {result.reason}
                      </p>
                    </div>
                    
                    {/* Detailed rejection reasons */}
                    {result.rejectionDetails && result.rejectionDetails.length > 0 && (
                      <div className="mt-4 space-y-3">
                        <h4 className="text-sm font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                          Why this receipt needs review:
                        </h4>
                        <div className="space-y-2">
                          {result.rejectionDetails.map((detail: any, index: number) => (
                            <div
                              key={index}
                              className="p-3 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-lg text-left"
                            >
                              <div className="flex items-start gap-2">
                                <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100 mb-1">
                                    {detail.message}
                                  </p>
                                  {(detail.found !== undefined || detail.expected !== undefined) && (
                                    <div className="text-xs text-yellow-700 dark:text-yellow-300 mt-1 space-y-1">
                                      {detail.found !== undefined && (
                                        <p>Found: <span className="font-medium">{String(detail.found)}</span></p>
                                      )}
                                      {detail.expected !== undefined && (
                                        <p>Expected: <span className="font-medium">{String(detail.expected)}</span></p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex gap-3 justify-center pt-2">
                      {result.canRetake && (
                        <Button
                          onClick={handleRetry}
                          variant="outline"
                          className="border-yellow-300 dark:border-yellow-700"
                        >
                          <Camera className="mr-2 h-4 w-4" />
                          Retake Photo
                        </Button>
                      )}
                      {result.canRequestReview && (
                        <Button
                          onClick={handleRequestReview}
                          className="bg-yellow-600 hover:bg-yellow-700 text-white"
                        >
                          Submit for Review
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Upload Options */}
          {!selectedFile && !result && (
            <div className="space-y-4">
              {/* Eligibility Check Message */}
              {!canUpload && eligibilityMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg"
                >
                  <div className="flex items-start gap-3">
                    <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                        Upload Temporarily Disabled
                      </p>
                      <p className="text-xs text-yellow-800 dark:text-yellow-200 mt-1">
                        {eligibilityMessage}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Camera Capture */}
                <Button
                  onClick={startCamera}
                  className="h-32 bg-gradient-to-br from-brand-green to-green-600 hover:from-brand-green/90 hover:to-green-600/90 text-white"
                  size="lg"
                  disabled={!canUpload || checkingEligibility}
                >
                  <div className="flex flex-col items-center gap-2">
                    <Camera className="h-8 w-8" />
                    <span className="text-sm font-medium">
                      {checkingEligibility ? 'Checking...' : 'Take Photo'}
                    </span>
                  </div>
                </Button>

                {/* File Upload */}
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                  className="h-32 border-2 border-dashed"
                  size="lg"
                  disabled={!canUpload || checkingEligibility}
                >
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-8 w-8" />
                    <span className="text-sm font-medium">
                      {checkingEligibility ? 'Checking...' : 'Choose File'}
                    </span>
                  </div>
                </Button>
              </div>

              <p className="text-xs text-center text-muted-foreground">
                Maximum file size: 8MB • Formats: JPG, PNG, HEIC
                {!canUpload && ' • Only one approved receipt per 24 hours allowed'}
              </p>
            </div>
          )}

          {/* Image Preview */}
          {selectedFile && previewUrl && !result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="relative rounded-lg overflow-hidden border-2 border-gray-200 dark:border-gray-700">
                <img
                  src={previewUrl}
                  alt="Receipt preview"
                  className="w-full h-auto max-h-96 object-contain bg-gray-50 dark:bg-gray-900"
                />
                
                {!uploading && (
                  <button
                    onClick={handleRetry}
                    className="absolute top-2 right-2 p-2 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="text-sm text-muted-foreground text-center">
                <p className="font-medium">{selectedFile.name}</p>
                <p>{(selectedFile.size / 1024).toFixed(2)} KB</p>
              </div>

              {/* Modern Loading Animation */}
              {uploading && (
                <div ref={loadingRef} className="relative space-y-6 py-8">
                  {/* Background Image with Overlay */}
                  <div className="absolute inset-0 -mx-4 rounded-lg overflow-hidden">
                    <Image
                      src="/Vector (6).png"
                      alt="Background"
                      fill
                      className="object-cover"
                      style={{ filter: 'blur(8px)', transform: 'scale(1.1)' }}
                    />
                    <div className="absolute inset-0 bg-white/90"></div>
                  </div>

                  {/* Loading Animation */}
                  <div className="relative z-10">
                    <div className="flex flex-col items-center justify-center space-y-6">
                      {/* Modern Spinning Loader */}
                      <div className="relative w-24 h-24">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                          className="absolute inset-0 rounded-full border-4 border-transparent"
                          style={{
                            borderTopColor: '#FF701A',
                            borderRightColor: '#FF701A',
                          }}
                        />
                        <motion.div
                          animate={{ rotate: -360 }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                          className="absolute inset-2 rounded-full border-4 border-transparent"
                          style={{
                            borderBottomColor: '#FF701A',
                            borderLeftColor: '#FF701A',
                          }}
                        />
                        <div className="absolute inset-6 rounded-full" style={{ backgroundColor: '#FF701A' }}>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <Loader2 className="w-6 h-6 text-white animate-spin" />
                          </div>
                        </div>
                      </div>

                      {/* Status Message */}
                      <div className="text-center space-y-3">
                        <p className="text-lg font-semibold text-gray-900">
                          Processing your receipt...
                        </p>
                        {elapsedSeconds < 60 ? (
                          <p className="text-sm text-gray-600">
                            This usually takes 45-60 seconds. Please hold on.
                          </p>
                        ) : timeoutReached && !isConfident ? (
                          <div className="space-y-3">
                            <p className="text-sm text-orange-600 font-medium">
                              Processing is taking longer than expected.
                            </p>
                            <p className="text-xs text-gray-600 mb-3">
                              You may retake the photo if needed, or we'll notify you when processing is complete.
                            </p>
                            <Button
                              onClick={handleRetry}
                              variant="outline"
                              className="border-orange-500 text-orange-600 hover:bg-orange-50"
                            >
                              <Camera className="mr-2 h-4 w-4" />
                              Retake Photo
                            </Button>
                          </div>
                        ) : timeoutReached && isConfident ? (
                          <p className="text-sm text-gray-600">
                            We'll notify you when your visit is counted. You can check your visit count after a few minutes.
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Upload Button */}
              {!uploading && (
                <Button
                  onClick={handleUpload}
                  className="w-full bg-brand-green hover:bg-brand-green/90 text-white"
                  size="lg"
                  disabled={uploading || !canUpload}
                >
                  <Upload className="mr-2 h-5 w-5" />
                  {!canUpload ? 'Upload Disabled (24-hour limit)' : 'Upload Receipt'}
                </Button>
              )}
            </motion.div>
          )}

      </div>
    </div>
  );
}

