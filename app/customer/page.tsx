"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, QrCode as QrIcon, Scan, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import ErrorAlert from "@/components/ErrorAlert";

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export default function CustomerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [Html5Qrcode, setHtml5Qrcode] = useState<any>(null);
  const [qrCodeScanner, setQrCodeScanner] = useState<any>(null);
  const [storeSettings, setStoreSettings] = useState<{
    allowQrScanning: boolean;
    allowReceiptUploads: boolean;
  } | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  
  // Get storeId from URL if present
  const storeId = searchParams.get('storeId') || searchParams.get('store');
  const phone = searchParams.get('phone');

  useEffect(() => {
    // Dynamically import html5-qrcode only on client side
    import("html5-qrcode").then((module) => {
      setHtml5Qrcode(() => module.Html5Qrcode);
    });

    // Fetch store settings if storeId is provided
    if (storeId) {
      fetch(`/api/store?id=${storeId}`)
        .then(res => res.json())
        .then(data => {
          setStoreSettings({
            allowQrScanning: data.allowQrScanning !== false,
            allowReceiptUploads: data.allowReceiptUploads !== false
          });
          setLoadingSettings(false);
        })
        .catch(err => {
          console.error('Error fetching store settings:', err);
          // Default to both enabled if we can't fetch settings
          setStoreSettings({
            allowQrScanning: true,
            allowReceiptUploads: true
          });
          setLoadingSettings(false);
        });
    } else {
      // No storeId, show both options by default
      setStoreSettings({
        allowQrScanning: true,
        allowReceiptUploads: true
      });
      setLoadingSettings(false);
    }

    // Cleanup function to stop camera when component unmounts
    return () => {
      if (qrCodeScanner) {
        qrCodeScanner.stop().catch((err: any) => {
          console.error("Error stopping scanner on cleanup:", err);
        });
      }
    };
  }, [qrCodeScanner, storeId]);

  const startScanning = async () => {
    if (!Html5Qrcode) {
      setError("QR Scanner not loaded yet. Please wait a moment and try again.");
      return;
    }

    setScanning(true);
    setLoading(true);
    setError(null);

    try {
      // Check if we're on HTTPS or localhost
      const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost';
      if (!isSecure) {
        setError("Camera access requires HTTPS. Please use a secure connection.");
        setScanning(false);
        setLoading(false);
        return;
      }

      // Check if camera is available
      const devices = await Html5Qrcode.getCameras();
      if (devices.length === 0) {
        setError("No camera found. Please ensure your device has a camera and grant permission.");
        setScanning(false);
        setLoading(false);
        return;
      }

      const html5QrCode = new Html5Qrcode("qr-reader");
      setQrCodeScanner(html5QrCode);

      // Try to start with back camera first, fallback to any available camera
      let cameraId = null;
      try {
        // Look for back camera
        const backCamera = devices.find((device: any) => 
          device.label.toLowerCase().includes('back') || 
          device.label.toLowerCase().includes('rear') ||
          device.label.toLowerCase().includes('environment')
        );
        cameraId = backCamera ? backCamera.id : devices[0].id;
      } catch (e) {
        cameraId = devices[0].id;
      }

      await html5QrCode.start(
        cameraId,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText: string) => {
          // Success callback
          html5QrCode.stop().then(() => {
            try {
              const qrData = JSON.parse(decodedText);
              if (qrData.storeId) {
                // Redirect to scan flow with store ID
                router.push(`/scan-v3?store=${qrData.storeId}`);
              } else {
                setError("Invalid QR code format");
                setScanning(false);
                setLoading(false);
              }
            } catch (err) {
              setError("Invalid QR code format");
              setScanning(false);
              setLoading(false);
            }
          }).catch((stopErr: any) => {
            console.error("Error stopping scanner:", stopErr);
            setScanning(false);
          });
        },
        (errorMessage: string) => {
          // Error callback - only show meaningful errors
          if (errorMessage.includes("NotFoundException") || 
              errorMessage.includes("NotAllowedError") ||
              errorMessage.includes("NotFoundError")) {
            setError("Camera permission denied or not found. Please check your camera settings.");
            setScanning(false);
            setLoading(false);
          }
          // Ignore other scanning errors (like "No QR code found")
        }
      );

      // Camera started successfully
      setLoading(false);
    } catch (err: any) {
      console.error("Camera error:", err);
      let errorMessage = "Failed to start camera";
      
      if (err.name === "NotAllowedError") {
        errorMessage = "Camera permission denied. Please allow camera access and try again.";
      } else if (err.name === "NotFoundError") {
        errorMessage = "No camera found. Please ensure your device has a camera.";
      } else if (err.name === "NotSupportedError") {
        errorMessage = "Camera not supported on this device or browser.";
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      setScanning(false);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      {error && (
        <ErrorAlert
          message={error}
          type="error"
          onClose={() => setError(null)}
        />
      )}

      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => router.push("/")}
        className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Home
      </Button>

      <div className="max-w-2xl mx-auto mt-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-0 shadow-2xl">
            <CardHeader className="text-center space-y-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
                className="mx-auto w-24 h-24 bg-brand-coral rounded-full flex items-center justify-center"
              >
                <QrIcon className="h-12 w-12 text-white" />
              </motion.div>
              <CardTitle className="text-3xl font-bold text-gray-900 dark:text-white">
                Scan QR Code
              </CardTitle>
              <CardDescription>
                Scan the QR code at the store to earn rewards
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {loadingSettings ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Loading...</p>
                </div>
              ) : !storeSettings?.allowQrScanning && !storeSettings?.allowReceiptUploads ? (
                <div className="text-center py-8 space-y-4">
                  <div className="text-5xl">🔒</div>
                  <h3 className="text-xl font-semibold">Check-in Temporarily Unavailable</h3>
                  <p className="text-muted-foreground">
                    This store's check-in systems are currently disabled. Please contact store staff for assistance.
                  </p>
                </div>
              ) : !scanning ? (
                <div className="text-center space-y-4">
                  {storeSettings?.allowQrScanning && (
                    <>
                      <Button
                        size="lg"
                        onClick={startScanning}
                        disabled={loading}
                        className="w-full bg-brand-green hover:bg-brand-green/90"
                      >
                        <Scan className="mr-2 h-5 w-5" />
                        {loading ? "Starting Camera..." : "Start Camera Scanning"}
                      </Button>

                      <p className="text-sm text-muted-foreground">
                        Point your camera at the store's QR code
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Make sure to allow camera access when prompted
                      </p>
                    </>
                  )}
                  
                  {/* Divider - only show if both are enabled */}
                  {storeSettings?.allowQrScanning && storeSettings?.allowReceiptUploads && (
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-gray-300 dark:border-gray-600" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white dark:bg-gray-800 px-2 text-gray-500 dark:text-gray-400">
                          Or
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {/* Alternative: Upload Receipt */}
                  {storeSettings?.allowReceiptUploads && (
                    <>
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={() => {
                          const params = new URLSearchParams();
                          if (storeId) {
                            params.append('storeId', storeId);
                          }
                          if (phone) {
                            params.append('phone', phone);
                          }
                          const queryString = params.toString();
                          const url = `/customer-receipt${queryString ? `?${queryString}` : ''}`;
                          router.push(url);
                        }}
                        className="w-full border-2 border-brand-coral text-brand-coral hover:bg-brand-coral hover:text-white"
                      >
                        <Receipt className="mr-2 h-5 w-5" />
                        Upload Receipt Instead
                      </Button>
                      
                      <p className="text-xs text-center text-muted-foreground">
                        Take a photo of your receipt for instant verification
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div
                    id="qr-reader"
                    className="rounded-lg overflow-hidden border-4 border-brand-green"
                  />
                  <Button
                    variant="outline"
                    onClick={async () => {
                      if (qrCodeScanner) {
                        try {
                          await qrCodeScanner.stop();
                        } catch (err) {
                          console.error("Error stopping scanner:", err);
                        }
                      }
                      setScanning(false);
                      setLoading(false);
                      setQrCodeScanner(null);
                    }}
                    className="w-full"
                  >
                    Cancel Scanning
                  </Button>
                </div>
              )}

            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}




