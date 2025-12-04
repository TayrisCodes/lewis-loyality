"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle, XCircle, Eye, AlertTriangle, Shield, AlertCircle, FileSearch } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sidebar } from "@/components/dashboard/sidebar";
import Loader from "@/components/Loader";
import { formatDateTime } from "@/lib/utils";
import ErrorAlert from "@/components/ErrorAlert";
import ApiClient, { AuthUtils } from "@/lib/api-client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/**
 * Receipt Review Page
 * 
 * Allows admins to:
 * - View full receipt image
 * - See OCR extracted text
 * - View parsed fields
 * - Compare against store rules
 * - Approve or reject receipt
 * - Add notes for audit trail
 */

export default function ReceiptReviewPage() {
  const router = useRouter();
  const params = useParams();
  const receiptId = params.receiptId as string;
  
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<"superadmin" | "admin">("admin");
  const [notes, setNotes] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState<string>("");  // For assigning store when missing
  
  // Fetch stores list (for super admin to assign store)
  const { data: storesData } = useQuery({
    queryKey: ["stores-list"],
    queryFn: async () => {
      if (role === "superadmin") {
        return ApiClient.get("/api/super/stores");
      }
      return [];
    },
    enabled: role === "superadmin" && !!token,
  });

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

  // Fetch receipt details
  const { data: receiptData, isLoading, refetch } = useQuery({
    queryKey: ["receipt-detail", receiptId],
    queryFn: async () => {
      // Use ApiClient which automatically includes cookies
      return ApiClient.get(`/api/admin/receipts/${receiptId}/review`);
    },
    enabled: !!token && !!receiptId,
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async () => {
      // Use ApiClient which automatically includes cookies
      const body: any = {
          action: "approve",
          notes: notes || undefined,
      };
      
      // If receipt has no storeId and super admin selected a store, include it
      if (!receiptData?.receipt?.storeId && selectedStoreId && role === "superadmin") {
        body.storeId = selectedStoreId;
      }

      return ApiClient.post(`/api/admin/receipts/${receiptId}/review`, body);
    },
    onSuccess: (data) => {
      setSuccess(data.message || "Receipt approved successfully!");
      refetch();
      
      // Redirect after 2 seconds
      setTimeout(() => {
        router.push("/dashboard/admin/receipts");
      }, 2000);
    },
    onError: (err: any) => {
      setError(err.message || "Failed to approve receipt");
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async () => {
      if (!rejectReason.trim()) {
        throw new Error("Rejection reason is required");
      }

      // Use ApiClient which automatically includes cookies
      return ApiClient.post(`/api/admin/receipts/${receiptId}/review`, {
          action: "reject",
          reason: rejectReason,
          notes: notes || undefined,
      });
    },
    onSuccess: (data) => {
      setSuccess(data.message || "Receipt rejected successfully!");
      refetch();
      
      // Redirect after 2 seconds
      setTimeout(() => {
        router.push("/dashboard/admin/receipts");
      }, 2000);
    },
    onError: (err: any) => {
      setError(err.message || "Failed to reject receipt");
    },
  });

  const handleLogout = async () => {
    await AuthUtils.logout();
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader message="Authenticating..." />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar role={role} onLogout={handleLogout} />
        <div className="ml-64 p-8">
          <Loader message="Loading receipt..." />
        </div>
      </div>
    );
  }

  const receipt = receiptData?.receipt;

  if (!receipt) {
    return (
      <div className="min-h-screen bg-background">
        <Sidebar role={role} onLogout={handleLogout} />
        <div className="ml-64 p-8">
          <Card>
            <CardContent className="py-20 text-center">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-yellow-600" />
              <p className="text-lg font-semibold">Receipt not found</p>
              <Button onClick={() => router.push("/dashboard/admin/receipts")} className="mt-4">
                Back to Receipts
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const isReviewable = receipt.status === "flagged" || receipt.status === "flagged_manual_requested";
  const isProcessed = receipt.status === "approved" || receipt.status === "rejected";

  return (
    <div className="min-h-screen bg-background">
      <Sidebar role={role} onLogout={handleLogout} />

      <div className="ml-64 p-8">
        {/* Error/Success Alerts */}
        {error && <ErrorAlert message={error} type="error" onClose={() => setError(null)} />}
        {success && (
          <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-green-800 dark:text-green-200">{success}</p>
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" onClick={() => router.push("/dashboard/admin/receipts")} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Receipts
          </Button>
          
          <h1 className="text-4xl font-bold text-foreground mb-2">Receipt Review</h1>
          <p className="text-muted-foreground">
            Receipt ID: {receipt._id}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Receipt Image */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Receipt Image</CardTitle>
                <CardDescription>Full resolution receipt photo</CardDescription>
              </CardHeader>
              <CardContent>
                {receipt.imageUrl && (
                  <div className="relative bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                    <img
                      src={receipt.imageUrl}
                      alt="Receipt"
                      className="w-full h-auto"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* OCR Text */}
            <Card>
              <CardHeader>
                <CardTitle>Extracted Text (OCR)</CardTitle>
                <CardDescription>Text extracted from receipt image</CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-gray-50 dark:bg-gray-900 p-4 rounded border overflow-x-auto whitespace-pre-wrap">
                  {receipt.ocrText || "No text extracted"}
                </pre>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Details & Actions */}
          <div className="space-y-6">
            {/* Status & Info */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Receipt Status</CardTitle>
                  {receipt.status === "approved" && (
                    <Badge variant="default" className="bg-green-600">Approved</Badge>
                  )}
                  {receipt.status === "rejected" && (
                    <Badge variant="destructive">Rejected</Badge>
                  )}
                  {(receipt.status === "flagged" || receipt.status === "flagged_manual_requested") && (
                    <Badge variant="secondary" className="bg-yellow-600 text-white">Needs Review</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-muted-foreground">Customer</Label>
                  <p className="font-medium">
                    {receipt.customerId?.name || receipt.customerPhone || "Unknown"}
                  </p>
                  <p className="text-sm text-muted-foreground">{receipt.customerPhone}</p>
                </div>
                
                <div>
                  <Label className="text-muted-foreground">Store</Label>
                  {receipt.storeId ? (
                    <>
                      <p className="font-medium">{receipt.storeId.name}</p>
                      <p className="text-sm text-muted-foreground">{receipt.storeId.address}</p>
                    </>
                  ) : (
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="font-medium text-yellow-900 dark:text-yellow-100">No Store Assigned</p>
                          <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
                            This receipt was uploaded without scanning QR code. Store needs to be assigned during review.
                          </p>
                          {receipt.tin && (
                            <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                              Extracted TIN: <span className="font-mono font-semibold">{receipt.tin}</span>
                            </p>
                          )}
                          {receipt.branchText && (
                            <p className="text-xs text-yellow-700 dark:text-yellow-300">
                              Extracted Branch: <span className="font-semibold">{receipt.branchText}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                <div>
                  <Label className="text-muted-foreground">Submitted</Label>
                  <p>{formatDateTime(receipt.createdAt)}</p>
                </div>
                
                {receipt.reason && (
                  <div>
                    <Label className="text-muted-foreground">Reason</Label>
                    <p className="text-sm">{receipt.reason}</p>
                  </div>
                )}
                
                {receipt.flags && receipt.flags.length > 0 && (
                  <div>
                    <Label className="text-muted-foreground">Flags</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {receipt.flags.map((flag: string, index: number) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {flag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Fraud Detection Scores */}
            {(receipt.fraudScore !== undefined || receipt.tamperingScore !== undefined || receipt.aiDetectionScore !== undefined) && (
              <Card className="border-l-4 border-l-orange-500">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-orange-600" />
                    Fraud Detection
                  </CardTitle>
                  <CardDescription>Automated fraud risk assessment</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Overall Fraud Score */}
                  {receipt.fraudScore !== undefined && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-muted-foreground">Overall Fraud Score</Label>
                        <Badge
                          variant={
                            receipt.fraudScore >= 70
                              ? "destructive"
                              : receipt.fraudScore >= 40
                              ? "secondary"
                              : "default"
                          }
                          className={
                            receipt.fraudScore >= 70
                              ? "bg-red-600"
                              : receipt.fraudScore >= 40
                              ? "bg-yellow-600"
                              : "bg-green-600"
                          }
                        >
                          {receipt.fraudScore}/100
                        </Badge>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            receipt.fraudScore >= 70
                              ? "bg-red-600"
                              : receipt.fraudScore >= 40
                              ? "bg-yellow-600"
                              : "bg-green-600"
                          }`}
                          style={{ width: `${receipt.fraudScore}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {receipt.fraudScore >= 70
                          ? "High risk - Auto-rejected"
                          : receipt.fraudScore >= 40
                          ? "Suspicious - Flagged for review"
                          : "Low risk"}
                      </p>
                    </div>
                  )}

                  {/* Tampering Score */}
                  {receipt.tamperingScore !== undefined && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-muted-foreground">Tampering Score</Label>
                        <Badge variant="outline">{receipt.tamperingScore}/100</Badge>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            receipt.tamperingScore >= 50 ? "bg-orange-600" : "bg-gray-400"
                          }`}
                          style={{ width: `${receipt.tamperingScore}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* AI Detection Score */}
                  {receipt.aiDetectionScore !== undefined && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-muted-foreground">AI Generation Probability</Label>
                        <Badge variant="outline">{receipt.aiDetectionScore}/100</Badge>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            receipt.aiDetectionScore >= 50 ? "bg-purple-600" : "bg-gray-400"
                          }`}
                          style={{ width: `${receipt.aiDetectionScore}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Fraud Flags */}
                  {receipt.fraudFlags && receipt.fraudFlags.length > 0 && (
                    <div>
                      <Label className="text-muted-foreground">Fraud Indicators</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {receipt.fraudFlags.map((flag: string, index: number) => (
                          <Badge key={index} variant="outline" className="text-xs bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            {flag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Image Hash */}
                  {receipt.imageHash && (
                    <div>
                      <Label className="text-muted-foreground">Image Hash (pHash)</Label>
                      <p className="font-mono text-xs bg-gray-50 dark:bg-gray-900 p-2 rounded border break-all">
                        {receipt.imageHash}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Used for duplicate detection
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Fraud Investigation Section */}
            {receipt.fraudScore !== undefined && receipt.fraudScore > 0 && (
              <Card className="border-l-4 border-l-red-500">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileSearch className="h-5 w-5 text-red-600" />
                    Fraud Investigation
                  </CardTitle>
                  <CardDescription>Detailed fraud analysis and comparisons</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Warning for high fraud scores */}
                  {receipt.fraudScore >= 70 && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-semibold text-red-900 dark:text-red-100">
                            High Fraud Risk Detected
                          </p>
                          <p className="text-sm text-red-800 dark:text-red-200 mt-1">
                            This receipt was automatically rejected due to high fraud indicators. Review carefully before overriding.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Suspicious activity warning */}
                  {receipt.fraudScore >= 40 && receipt.fraudScore < 70 && (
                    <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-semibold text-yellow-900 dark:text-yellow-100">
                            Suspicious Activity Detected
                          </p>
                          <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
                            This receipt has been flagged for manual review due to suspicious indicators.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tampering Indicators */}
                  {receipt.tamperingScore !== undefined && receipt.tamperingScore > 0 && (
                    <div>
                      <Label className="text-muted-foreground">Image Tampering Indicators</Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Score: {receipt.tamperingScore}/100
                        {receipt.tamperingScore >= 50 && (
                          <span className="text-orange-600 font-semibold ml-2">
                            (High - Possible image manipulation)
                          </span>
                        )}
                      </p>
                    </div>
                  )}

                  {/* AI Detection Indicators */}
                  {receipt.aiDetectionScore !== undefined && receipt.aiDetectionScore > 0 && (
                    <div>
                      <Label className="text-muted-foreground">AI Generation Indicators</Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Probability: {receipt.aiDetectionScore}%
                        {receipt.aiDetectionScore >= 50 && (
                          <span className="text-purple-600 font-semibold ml-2">
                            (High - Possible AI-generated image)
                          </span>
                        )}
                      </p>
                    </div>
                  )}

                  {/* Note about duplicate detection */}
                  {receipt.imageHash && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <p className="text-xs text-blue-800 dark:text-blue-200">
                        <strong>Duplicate Detection:</strong> This image hash can be used to find similar receipts. 
                        Check for receipts with the same imageHash to identify potential duplicates.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Parsed Fields */}
            <Card>
              <CardHeader>
                <CardTitle>Parsed Fields</CardTitle>
                <CardDescription>Automatically extracted information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">TIN</Label>
                    <p className="font-mono text-sm">{receipt.tin || "Not found"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Invoice No</Label>
                    <p className="font-mono text-sm">{receipt.invoiceNo || "Not found"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Date</Label>
                    <p className="text-sm">{receipt.dateOnReceipt || "Not found"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Amount</Label>
                    <p className="text-sm font-semibold">
                      {receipt.totalAmount ? `${receipt.totalAmount.toFixed(2)} ETB` : "Not found"}
                    </p>
                  </div>
                </div>
                
                {receipt.branchText && (
                  <div>
                    <Label className="text-muted-foreground">Branch Text</Label>
                    <p className="text-sm">{receipt.branchText}</p>
                  </div>
                )}
                
                {receipt.barcodeData && (
                  <div>
                    <Label className="text-muted-foreground">Barcode</Label>
                    <p className="font-mono text-sm">{receipt.barcodeData}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Store Rules Comparison - Only show if store is assigned */}
            {receipt.storeId && (
            <Card>
              <CardHeader>
                <CardTitle>Store Requirements</CardTitle>
                <CardDescription>Expected values for this store</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Expected TIN</Label>
                      <p className="font-mono text-sm">{receipt.storeId.tin || "Not configured"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Expected Branch</Label>
                      <p className="text-sm">{receipt.storeId.branchName || "Not configured"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Minimum Amount</Label>
                      <p className="text-sm">{receipt.storeId.minReceiptAmount || 500} ETB</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Validity</Label>
                      <p className="text-sm">{receipt.storeId.receiptValidityHours || 24} hours</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Store Matching Helper - Show when no storeId and super admin */}
            {!receipt.storeId && role === "superadmin" && receipt.tin && (
              <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-blue-600" />
                    Store Matching Helper
                  </CardTitle>
                  <CardDescription>Help identify the correct store from extracted receipt data</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-muted-foreground">Receipt TIN</Label>
                      <p className="font-mono text-sm font-semibold">{receipt.tin}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Receipt Branch</Label>
                      <p className="text-sm font-semibold">{receipt.branchText || "Not found"}</p>
                    </div>
                  </div>
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground mb-2">
                      Look for stores with matching TIN and branch name below, then select the correct store.
                    </p>
                </div>
              </CardContent>
            </Card>
            )}

            {/* Review Actions (only for flagged) */}
            {isReviewable && !isProcessed && (
              <Card>
                <CardHeader>
                  <CardTitle>Review Action</CardTitle>
                  <CardDescription>Approve or reject this receipt</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Store Assignment - Only for super admin when storeId is missing */}
                  {!receipt.storeId && role === "superadmin" && (
                    <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <Label htmlFor="store-select" className="text-yellow-900 dark:text-yellow-100 font-semibold">
                        Assign Store (Required) *
                      </Label>
                      <p className="text-xs text-yellow-800 dark:text-yellow-200 mb-2 mt-1">
                        Select the store this receipt belongs to before approving.
                      </p>
                      <Select value={selectedStoreId} onValueChange={setSelectedStoreId}>
                        <SelectTrigger id="store-select" className="w-full mt-2">
                          <SelectValue placeholder="Select a store..." />
                        </SelectTrigger>
                        <SelectContent>
                          {storesData?.map((store: any) => (
                            <SelectItem key={store._id} value={store._id}>
                              <div className="flex flex-col">
                                <span className="font-medium">{store.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  TIN: {store.tin || "Not set"} • Branch: {store.branchName || "Not set"}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {receipt.tin && (
                        <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-2">
                          💡 Tip: Look for stores with TIN <span className="font-mono font-semibold">{receipt.tin}</span>
                          {receipt.branchText && ` and branch "${receipt.branchText}"`}
                        </p>
                      )}
                    </div>
                  )}
                  
                  {/* Notes */}
                  <div>
                    <Label htmlFor="notes">Admin Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      placeholder="Add any notes about this review..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="mt-2"
                      rows={3}
                    />
                  </div>

                  {/* Fraud Warning for Approve */}
                  {receipt.fraudScore !== undefined && receipt.fraudScore > 40 && (
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-semibold text-yellow-900 dark:text-yellow-100">
                            Fraud Risk Warning
                          </p>
                          <p className="text-xs text-yellow-800 dark:text-yellow-200 mt-1">
                            This receipt has a fraud score of {receipt.fraudScore}/100. 
                            {receipt.fraudScore >= 70 && " It was auto-rejected. "}
                            Please review fraud indicators carefully before approving.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Approve Button */}
                  <Button
                    onClick={() => approveMutation.mutate()}
                    disabled={
                      approveMutation.isPending || 
                      rejectMutation.isPending ||
                      (!receipt.storeId && role === "superadmin" && !selectedStoreId)  // Require store selection
                    }
                    className={`w-full text-white ${
                      receipt.fraudScore !== undefined && receipt.fraudScore > 40
                        ? "bg-yellow-600 hover:bg-yellow-700"
                        : "bg-green-600 hover:bg-green-700"
                    }`}
                    size="lg"
                  >
                    <CheckCircle className="mr-2 h-5 w-5" />
                    {approveMutation.isPending ? "Approving..." : "Approve Receipt"}
                    {receipt.fraudScore !== undefined && receipt.fraudScore > 40 && (
                      <span className="ml-2 text-xs">(Override Fraud Warning)</span>
                    )}
                  </Button>

                  {/* Reject Section */}
                  <div className="pt-4 border-t">
                    <Label htmlFor="rejectReason">Rejection Reason (Required)</Label>
                    <Textarea
                      id="rejectReason"
                      placeholder="Why is this receipt being rejected?"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      className="mt-2"
                      rows={2}
                    />
                    
                    <Button
                      onClick={() => rejectMutation.mutate()}
                      disabled={!rejectReason.trim() || approveMutation.isPending || rejectMutation.isPending}
                      variant="destructive"
                      className="w-full mt-4"
                      size="lg"
                    >
                      <XCircle className="mr-2 h-5 w-5" />
                      {rejectMutation.isPending ? "Rejecting..." : "Reject Receipt"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Already Processed */}
            {isProcessed && (
              <Card>
                <CardHeader>
                  <CardTitle>Review Complete</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <p className="font-medium capitalize">{receipt.status}</p>
                  </div>
                  
                  {receipt.reviewedBy && (
                    <div>
                      <Label className="text-muted-foreground">Reviewed By</Label>
                      <p>{receipt.reviewedBy.name || receipt.reviewedBy.email}</p>
                    </div>
                  )}
                  
                  {receipt.reviewedAt && (
                    <div>
                      <Label className="text-muted-foreground">Reviewed At</Label>
                      <p>{formatDateTime(receipt.reviewedAt)}</p>
                    </div>
                  )}
                  
                  {receipt.reviewNotes && (
                    <div>
                      <Label className="text-muted-foreground">Notes</Label>
                      <p className="text-sm">{receipt.reviewNotes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

