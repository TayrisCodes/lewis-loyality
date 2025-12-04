"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Receipt, Eye, CheckCircle, XCircle, Clock, Search, Filter, Shield, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sidebar } from "@/components/dashboard/sidebar";
import Loader from "@/components/Loader";
import { formatDateTime } from "@/lib/utils";
import Image from "next/image";
import ApiClient, { AuthUtils } from "@/lib/api-client";

/**
 * Admin Receipts Management Page
 * 
 * Features:
 * - View all receipts (tabbed: Flagged | Approved | Rejected | All)
 * - Search by phone or invoice
 * - Filter by status
 * - Pagination
 * - Quick review links
 * - Statistics cards
 */

export default function AdminReceiptsPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<"superadmin" | "admin">("admin");
  const [activeTab, setActiveTab] = useState("flagged");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [fraudFilter, setFraudFilter] = useState<string>("all"); // all, high, medium, low
  const limit = 20;

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

  // Fetch receipts
  const { data: receiptsData, isLoading, refetch } = useQuery({
    queryKey: ["receipts", activeTab, searchQuery, page, fraudFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeTab !== "all") {
        params.append("status", activeTab);
      }
      if (searchQuery) {
        params.append("search", searchQuery);
      }
      if (fraudFilter !== "all") {
        params.append("fraudFilter", fraudFilter);
      }
      params.append("page", page.toString());
      params.append("limit", limit.toString());

      // Use ApiClient which automatically includes cookies
      return ApiClient.get(`/api/admin/receipts?${params}`);
    },
    enabled: !!token,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const handleLogout = async () => {
    await AuthUtils.logout();
  };

  const handleViewReceipt = (receiptId: string) => {
    router.push(`/dashboard/admin/receipts/${receiptId}`);
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader message="Authenticating..." />
      </div>
    );
  }

  const stats = receiptsData?.stats || {
    pending: 0,
    approved: 0,
    rejected: 0,
    flagged: 0,
    flagged_manual_requested: 0,
  };

  const receipts = receiptsData?.receipts || [];
  const pagination = receiptsData?.pagination || { page: 1, pages: 1, total: 0 };

  return (
    <div className="min-h-screen bg-background">
      <Sidebar role={role} onLogout={handleLogout} />

      <div className="ml-64 p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Receipt Management</h1>
          <p className="text-muted-foreground">
            Review and manage customer receipt submissions
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Needs Review</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.flagged + stats.flagged_manual_requested}</div>
              <p className="text-xs text-muted-foreground">Awaiting admin review</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.approved}</div>
              <p className="text-xs text-muted-foreground">Visits counted</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Rejected</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.rejected}</div>
              <p className="text-xs text-muted-foreground">Not eligible</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <Receipt className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.pending + stats.approved + stats.rejected + stats.flagged + stats.flagged_manual_requested}
              </div>
              <p className="text-xs text-muted-foreground">All receipts</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter Bar */}
        <div className="mb-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by phone number or invoice number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {/* Fraud Score Filter */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <Label className="text-sm font-medium">Fraud Score:</Label>
            </div>
            <div className="flex gap-2">
              <Button
                variant={fraudFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFraudFilter("all")}
              >
                All
              </Button>
              <Button
                variant={fraudFilter === "high" ? "default" : "outline"}
                size="sm"
                onClick={() => setFraudFilter("high")}
                className={fraudFilter === "high" ? "bg-red-600 hover:bg-red-700" : ""}
              >
                High (≥70)
              </Button>
              <Button
                variant={fraudFilter === "medium" ? "default" : "outline"}
                size="sm"
                onClick={() => setFraudFilter("medium")}
                className={fraudFilter === "medium" ? "bg-yellow-600 hover:bg-yellow-700" : ""}
              >
                Medium (40-69)
              </Button>
              <Button
                variant={fraudFilter === "low" ? "default" : "outline"}
                size="sm"
                onClick={() => setFraudFilter("low")}
                className={fraudFilter === "low" ? "bg-green-600 hover:bg-green-700" : ""}
              >
                Low (&lt;40)
              </Button>
            </div>
          </div>
        </div>

        {/* Receipts List */}
        <Card>
          <CardHeader>
            <CardTitle>Receipts</CardTitle>
            <CardDescription>View and manage customer receipt submissions</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="flagged">
                  Flagged
                  {(stats.flagged + stats.flagged_manual_requested) > 0 && (
                    <Badge variant="destructive" className="ml-2">
                      {stats.flagged + stats.flagged_manual_requested}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="approved">Approved</TabsTrigger>
                <TabsTrigger value="rejected">Rejected</TabsTrigger>
                <TabsTrigger value="all">All</TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab}>
                {isLoading ? (
                  <div className="py-20">
                    <Loader message="Loading receipts..." />
                  </div>
                ) : receipts.length === 0 ? (
                  <div className="py-20 text-center text-muted-foreground">
                    <Receipt className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>No receipts found</p>
                    {(fraudFilter !== "all" || searchQuery) && (
                      <p className="text-sm mt-2">Try adjusting your filters</p>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Fraud Review Notice */}
                    {activeTab === "flagged" && receipts.some((r: any) => r.fraudScore !== undefined && r.fraudScore > 40) && (
                      <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-semibold text-yellow-900 dark:text-yellow-100">
                              Fraud Review Required
                            </p>
                            <p className="text-sm text-yellow-800 dark:text-yellow-200 mt-1">
                              Some receipts in this list have been flagged due to fraud detection. 
                              Review fraud scores and indicators before approving.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Preview</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Store</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Fraud Score</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Submitted</TableHead>
                          <TableHead>Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {receipts.map((receipt: any) => (
                          <TableRow 
                            key={receipt._id}
                            className={
                              receipt.fraudScore !== undefined && receipt.fraudScore > 40
                                ? "bg-yellow-50/50 dark:bg-yellow-900/10 border-l-4 border-l-yellow-500"
                                : ""
                            }
                          >
                            <TableCell>
                              <div className="relative w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded overflow-hidden">
                                {receipt.imageUrl && (
                                  <img
                                    src={receipt.imageUrl}
                                    alt="Receipt"
                                    className="w-full h-full object-cover cursor-pointer hover:opacity-75"
                                    onClick={() => handleViewReceipt(receipt._id)}
                                  />
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">
                                  {receipt.customerId?.name || receipt.customerPhone || "Unknown"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {receipt.customerPhone}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>
                              {receipt.storeId?.name || "Unknown Store"}
                            </TableCell>
                            <TableCell>
                              {receipt.totalAmount ? `${receipt.totalAmount.toFixed(2)} ETB` : "N/A"}
                            </TableCell>
                            <TableCell>
                              {receipt.dateOnReceipt || "N/A"}
                            </TableCell>
                            <TableCell>
                              {receipt.fraudScore !== undefined ? (
                                <div className="flex items-center gap-2">
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
                                    <Shield className="h-3 w-3 mr-1" />
                                    {receipt.fraudScore}
                                  </Badge>
                                  {receipt.fraudScore >= 40 && (
                                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">N/A</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {receipt.status === "approved" && (
                                  <Badge variant="default" className="bg-green-600">
                                    <CheckCircle className="h-3 w-3 mr-1" />
                                    Approved
                                  </Badge>
                                )}
                                {receipt.status === "rejected" && (
                                  <Badge variant="destructive">
                                    <XCircle className="h-3 w-3 mr-1" />
                                    Rejected
                                  </Badge>
                                )}
                                {(receipt.status === "flagged" || receipt.status === "flagged_manual_requested") && (
                                  <Badge variant="secondary" className="bg-yellow-600 text-white">
                                    <Clock className="h-3 w-3 mr-1" />
                                    Review
                                  </Badge>
                                )}
                                {receipt.status === "pending" && (
                                  <Badge variant="outline">
                                    <Clock className="h-3 w-3 mr-1" />
                                    Pending
                                  </Badge>
                                )}
                                {/* Highlight suspicious receipts */}
                                {receipt.fraudScore !== undefined && receipt.fraudScore > 40 && (
                                  <Badge variant="outline" className="border-orange-500 text-orange-700 dark:text-orange-400">
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                    Suspicious
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {formatDateTime(receipt.createdAt)}
                            </TableCell>
                            <TableCell>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleViewReceipt(receipt._id)}
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {/* Pagination */}
                    {pagination.pages > 1 && (
                      <div className="flex items-center justify-between mt-6">
                        <p className="text-sm text-muted-foreground">
                          Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, pagination.total)} of {pagination.total} receipts
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={page === 1}
                            onClick={() => setPage(page - 1)}
                          >
                            Previous
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={page === pagination.pages}
                            onClick={() => setPage(page + 1)}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

