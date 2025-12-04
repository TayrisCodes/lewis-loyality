"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Save, ArrowLeft, Receipt, DollarSign, Clock, MapPin, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Sidebar } from "@/components/dashboard/sidebar";
import Loader from "@/components/Loader";
import ErrorAlert from "@/components/ErrorAlert";
import ApiClient, { AuthUtils } from "@/lib/api-client";

/**
 * Store Receipt Settings Page
 * 
 * Allows admins to configure receipt verification settings:
 * - TIN (Tax Identification Number)
 * - Branch name for matching
 * - Minimum receipt amount
 * - Receipt validity hours
 * - Enable/disable receipt uploads
 */

export default function StoreSettingsPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<"superadmin" | "admin">("admin");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [tin, setTin] = useState("");
  const [branchName, setBranchName] = useState("");
  const [minAmount, setMinAmount] = useState("500");
  const [validityHours, setValidityHours] = useState("24");
  const [uploadsEnabled, setUploadsEnabled] = useState(true);

  useEffect(() => {
    // Check authentication using AuthUtils (cookie-based)
    if (!AuthUtils.isAuthenticated() || !AuthUtils.isAdmin()) {
      router.push("/login");
      return;
    }

    const storedRole = AuthUtils.getRole();
    setRole(storedRole as "superadmin" | "admin");
    // Token is in cookie, no need to store in state
    setToken("cookie"); // Placeholder to enable queries
  }, [router]);

  // Fetch current settings
  const { data: settingsData, isLoading, refetch } = useQuery({
    queryKey: ["receipt-settings"],
    queryFn: async () => {
      // Use ApiClient which automatically includes cookies
      return ApiClient.get("/api/admin/store/receipt-settings");
    },
    enabled: !!token,
  });

  // Update form when data is loaded
  useEffect(() => {
    if (settingsData?.settings) {
      setTin(settingsData.settings.tin || "");
      setBranchName(settingsData.settings.branchName || "");
      setMinAmount(settingsData.settings.minReceiptAmount?.toString() || "500");
      setValidityHours(settingsData.settings.receiptValidityHours?.toString() || "24");
      setUploadsEnabled(settingsData.settings.allowReceiptUploads !== false);
    }
  }, [settingsData]);

  // Save settings mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      // Validate inputs
      const minAmountNum = parseFloat(minAmount);
      const validityHoursNum = parseInt(validityHours);

      if (isNaN(minAmountNum) || minAmountNum < 0) {
        throw new Error("Invalid minimum amount");
      }

      if (isNaN(validityHoursNum) || validityHoursNum < 1 || validityHoursNum > 168) {
        throw new Error("Validity hours must be between 1 and 168 (1 week)");
      }

      // Use ApiClient which automatically includes cookies
      return ApiClient.put("/api/admin/store/receipt-settings", {
          tin: tin.trim(),
          branchName: branchName.trim(),
          minReceiptAmount: minAmountNum,
          receiptValidityHours: validityHoursNum,
          allowReceiptUploads: uploadsEnabled,
      });
    },
    onSuccess: (data) => {
      setSuccess(data.message || "Settings saved successfully!");
      setError(null);
      refetch();

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 3000);
    },
    onError: (err: any) => {
      setError(err.message || "Failed to save settings");
      setSuccess(null);
    },
  });

  const handleLogout = async () => {
    await AuthUtils.logout();
  };

  const handleSave = () => {
    saveMutation.mutate();
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader message="Authenticating..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar role={role} onLogout={handleLogout} />

      <div className="ml-64 p-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push("/dashboard/admin")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>

          <h1 className="text-4xl font-bold text-foreground mb-2">Receipt Settings</h1>
          <p className="text-muted-foreground">
            Configure receipt verification rules for your store
          </p>
        </div>

        {/* Error/Success Alerts */}
        {error && <ErrorAlert message={error} type="error" onClose={() => setError(null)} />}
        {success && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-green-800 dark:text-green-200">{success}</p>
          </div>
        )}

        {isLoading ? (
          <div className="py-20">
            <Loader message="Loading settings..." />
          </div>
        ) : (
          <div className="max-w-4xl space-y-6">
            {/* Store Info */}
            {settingsData?.storeName && (
              <Card>
                <CardHeader>
                  <CardTitle>Store Information</CardTitle>
                  <CardDescription>Settings apply to this store</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div>
                      <Label className="text-muted-foreground">Store Name</Label>
                      <p className="text-lg font-semibold">{settingsData.storeName}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Store ID</Label>
                      <p className="text-sm font-mono">{settingsData.storeId}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* TIN Configuration */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-blue-600" />
                  <div>
                    <CardTitle>Tax Identification Number (TIN)</CardTitle>
                    <CardDescription>
                      Receipts must contain this TIN to be valid
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="tin">TIN</Label>
                  <Input
                    id="tin"
                    type="text"
                    placeholder="e.g., 0003169685"
                    value={tin}
                    onChange={(e) => setTin(e.target.value)}
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    This should match the TIN on your receipts exactly
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Branch Configuration */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-green-600" />
                  <div>
                    <CardTitle>Branch Name</CardTitle>
                    <CardDescription>
                      Receipts should mention this branch/location
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="branchName">Branch Name</Label>
                  <Input
                    id="branchName"
                    type="text"
                    placeholder="e.g., Bole, Piassa, Banbis"
                    value={branchName}
                    onChange={(e) => setBranchName(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Receipt text must contain this keyword (flexible matching)
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Amount & Validity Configuration */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <DollarSign className="h-5 w-5 text-yellow-600" />
                  <div>
                    <CardTitle>Purchase Requirements</CardTitle>
                    <CardDescription>
                      Minimum amount and time limits for receipt validity
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Minimum Amount */}
                  <div className="space-y-2">
                    <Label htmlFor="minAmount">Minimum Amount (ETB)</Label>
                    <Input
                      id="minAmount"
                      type="number"
                      min="0"
                      step="50"
                      placeholder="500"
                      value={minAmount}
                      onChange={(e) => setMinAmount(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Receipts below this amount will be rejected
                    </p>
                  </div>

                  {/* Validity Hours */}
                  <div className="space-y-2">
                    <Label htmlFor="validityHours">Validity Window (Hours)</Label>
                    <Input
                      id="validityHours"
                      type="number"
                      min="1"
                      max="168"
                      step="1"
                      placeholder="24"
                      value={validityHours}
                      onChange={(e) => setValidityHours(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Maximum age for receipts (1-168 hours)
                    </p>
                  </div>
                </div>

                {/* Quick presets */}
                <div className="border-t pt-4">
                  <Label className="text-sm font-medium mb-3 block">Quick Presets</Label>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setValidityHours("24")}
                    >
                      Same Day (24h)
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setValidityHours("48")}
                    >
                      2 Days (48h)
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setValidityHours("168")}
                    >
                      1 Week (168h)
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Enable/Disable Receipt Uploads */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Receipt className="h-5 w-5 text-purple-600" />
                  <div>
                    <CardTitle>Receipt Upload Feature</CardTitle>
                    <CardDescription>
                      Enable or disable receipt uploads for this store
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <div className="flex-1">
                    <Label htmlFor="uploadsEnabled" className="text-base font-medium">
                      Allow Receipt Uploads
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      When disabled, customers can only use QR codes for check-ins
                    </p>
                  </div>
                  <Switch
                    id="uploadsEnabled"
                    checked={uploadsEnabled}
                    onCheckedChange={setUploadsEnabled}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Current Rules Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Current Validation Rules</CardTitle>
                <CardDescription>
                  Summary of what receipts must meet to be approved
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-3">
                    <span className="text-green-600 dark:text-green-400">✓</span>
                    <div>
                      <p className="font-medium">TIN Validation</p>
                      <p className="text-muted-foreground">
                        Receipt must contain TIN: {tin || "Not configured"}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <span className="text-green-600 dark:text-green-400">✓</span>
                    <div>
                      <p className="font-medium">Branch Verification</p>
                      <p className="text-muted-foreground">
                        Receipt must mention: {branchName || "Not configured"}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <span className="text-green-600 dark:text-green-400">✓</span>
                    <div>
                      <p className="font-medium">Minimum Purchase</p>
                      <p className="text-muted-foreground">
                        Total must be at least {minAmount} ETB
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <span className="text-green-600 dark:text-green-400">✓</span>
                    <div>
                      <p className="font-medium">Date Requirement</p>
                      <p className="text-muted-foreground">
                        Receipt must be within {validityHours} hours
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <span className="text-green-600 dark:text-green-400">✓</span>
                    <div>
                      <p className="font-medium">Duplicate Prevention</p>
                      <p className="text-muted-foreground">
                        Invoice number and barcode must be unique
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end gap-4">
              <Button
                variant="outline"
                onClick={() => router.push("/dashboard/admin")}
                disabled={saveMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="bg-brand-green hover:bg-brand-green/90 text-white min-w-32"
                size="lg"
              >
                <Save className="mr-2 h-5 w-5" />
                {saveMutation.isPending ? "Saving..." : "Save Settings"}
              </Button>
            </div>

            {/* Help Text */}
            <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <CardHeader>
                <CardTitle className="text-base">💡 Tips</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-blue-900 dark:text-blue-100">
                <p>
                  <strong>TIN:</strong> This must match exactly. Get it from your official receipts.
                </p>
                <p>
                  <strong>Branch Name:</strong> Use a short, distinctive keyword like "Bole" or "Banbis".
                </p>
                <p>
                  <strong>Minimum Amount:</strong> Set this to prevent low-value transaction abuse.
                </p>
                <p>
                  <strong>Validity:</strong> 24 hours (same day) is recommended to prevent old receipt reuse.
                </p>
                <p>
                  <strong>Upload Toggle:</strong> Disable if you want QR-only check-ins temporarily.
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}

