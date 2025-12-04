'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, CheckCircle, AlertCircle, Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Html5Qrcode } from 'html5-qrcode';

interface QRCodeScannerProps {
  onScan: (qrCodeData: string) => Promise<void>;
  onClose: () => void;
  isOpen: boolean;
}

/**
 * QR Code Scanner Component
 * Uses html5-qrcode library to scan QR codes from camera or image
 */
export default function QRCodeScanner({ onScan, onClose, isOpen }: QRCodeScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerDivRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stop scanner when component unmounts or dialog closes
  useEffect(() => {
    if (!isOpen) {
      stopScanner();
    }
    return () => {
      stopScanner();
    };
  }, [isOpen]);

  const stopScanner = async () => {
    if (scannerRef.current && cameraActive) {
      try {
        await scannerRef.current.stop();
        await scannerRef.current.clear();
      } catch (err) {
        // Ignore errors when stopping
      }
      scannerRef.current = null;
      setCameraActive(false);
    }
  };

  const startCameraScan = async () => {
    if (!scannerDivRef.current) return;

    try {
      await stopScanner(); // Stop any existing scanner
      
      setScanning(true);
      setError(null);
      setSuccess(false);
      setMessage(null);

      const html5QrCode = new Html5Qrcode(scannerDivRef.current.id);
      scannerRef.current = html5QrCode;

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        async (decodedText) => {
          // QR code scanned successfully
          setScanning(true);
          setMessage('Processing QR code...');
          try {
            await onScan(decodedText);
            setSuccess(true);
            setMessage('Discount applied successfully!');
            await stopScanner();
            setTimeout(() => {
              handleClose();
            }, 2000);
          } catch (err: any) {
            setError(err.message || 'Failed to process QR code. Please try again.');
            setScanning(false);
            setMessage(null);
          }
        },
        (errorMessage) => {
          // Ignore scanning errors (just keep scanning)
        }
      );

      setCameraActive(true);
      setScanning(false);
      setMessage('Point camera at QR code...');
    } catch (err: any) {
      console.error('Error starting camera:', err);
      setError('Could not access camera. Please ensure you have granted camera permissions or use file upload.');
      setScanning(false);
      setCameraActive(false);
      setMessage(null);
    }
  };

  const handleFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setScanning(true);
    setError(null);
    setSuccess(false);
    setMessage('Reading QR code from image...');

    try {
      const html5QrCode = new Html5Qrcode('qr-file-reader');
      
      const decodedText = await html5QrCode.scanFile(file, true);
      
      if (!decodedText) {
        setError('Could not read QR code from image. Please try again.');
        setScanning(false);
        setMessage(null);
        return;
      }

      setMessage('Processing QR code...');
      await onScan(decodedText);
      setSuccess(true);
      setMessage('Discount applied successfully!');
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to scan QR code. Please try again.';
      setError(errorMsg);
      setScanning(false);
      setMessage(null);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleStartCamera = () => {
    startCameraScan();
  };

  const handleStartFile = () => {
    fileInputRef.current?.click();
  };

  const handleClose = async () => {
    await stopScanner();
    setScanning(false);
    setError(null);
    setSuccess(false);
    setMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Scan Discount QR Code</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileScan}
          />

          {/* Hidden div for file reader */}
          <div id="qr-file-reader" className="hidden" />

          {/* Scanner container */}
          <div className="relative">
            <div 
              ref={scannerDivRef}
              id="qr-scanner"
              className="w-full min-h-[300px] bg-black rounded-lg overflow-hidden"
            />
            {!cameraActive && !scanning && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
                <div className="text-center space-y-2">
                  <Camera className="h-12 w-12 mx-auto text-gray-400" />
                  <p className="text-sm text-gray-600">Camera not active</p>
                </div>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="text-center space-y-2">
            <p className="text-sm text-gray-600">
              Point your camera at the customer's discount QR code or upload an image
            </p>
          </div>

          {/* Status Messages */}
          <AnimatePresence>
            {message && !error && !success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center justify-center gap-2 p-3 bg-blue-50 rounded-lg"
              >
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                <p className="text-sm text-blue-600">{message}</p>
              </motion.div>
            )}

            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center justify-center gap-2 p-4 bg-green-50 rounded-lg"
              >
                <CheckCircle className="h-5 w-5 text-green-600" />
                <p className="text-sm text-green-600 font-medium">{message || 'Discount applied successfully!'}</p>
              </motion.div>
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-start gap-2 p-4 bg-red-50 rounded-lg"
              >
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-red-600 font-medium">Scan Failed</p>
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Action Buttons */}
          <div className="flex gap-2">
            {!cameraActive && (
              <>
                <Button
                  onClick={handleStartCamera}
                  disabled={scanning || success}
                  className="flex-1"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Start Camera
                </Button>
                <Button
                  onClick={handleStartFile}
                  disabled={scanning || success}
                  variant="outline"
                  className="flex-1"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Image
                </Button>
              </>
            )}
            {cameraActive && (
              <Button
                onClick={handleClose}
                disabled={scanning && !error}
                variant="outline"
                className="w-full"
              >
                Stop & Close
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
