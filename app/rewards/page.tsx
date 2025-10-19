"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Gift, Phone, ArrowLeft, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ErrorAlert from "@/components/ErrorAlert";
import Loader from "@/components/Loader";
import ProgressBar from "@/components/ProgressBar";
import { formatDate } from "@/lib/utils";

export default function RewardsPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customer, setCustomer] = useState<any>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/v2/customer/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      setCustomer(data.customer);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy via-blue-900 to-navy dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4">
      {error && (
        <ErrorAlert
          message={error}
          type="error"
          onClose={() => setError(null)}
        />
      )}

      <Button
        variant="ghost"
        onClick={() => router.push("/customer")}
        className="text-white hover:bg-white/10"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
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
                className="mx-auto w-20 h-20 bg-gradient-to-br from-gold to-yellow-500 rounded-full flex items-center justify-center"
              >
                <Gift className="h-10 w-10 text-navy" />
              </motion.div>
              <CardTitle className="text-3xl font-bold text-navy dark:text-gold">
                My Rewards
              </CardTitle>
              <CardDescription>
                Check your rewards and visit history
              </CardDescription>
            </CardHeader>

            <CardContent>
              {!customer ? (
                <form onSubmit={handleSearch} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="0911234567"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    variant="navy"
                    size="lg"
                    className="w-full"
                    disabled={loading}
                  >
                    {loading ? <Loader size="sm" /> : "Search"}
                  </Button>
                </form>
              ) : (
                <div className="space-y-6">
                  {/* Customer Info */}
                  <div className="text-center pb-4 border-b">
                    <h3 className="text-2xl font-bold text-navy dark:text-gold mb-2">
                      Welcome back, {customer.name}! 👋
                    </h3>
                    <div className="flex justify-center gap-4 text-sm text-muted-foreground">
                      <span>Total Visits: {customer.totalVisits}</span>
                      <span>•</span>
                      <span>Total Rewards: {customer.rewards.length}</span>
                    </div>
                  </div>

                  {/* Rewards Section */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-lg flex items-center gap-2">
                      <Gift className="h-5 w-5 text-gold" />
                      Your Rewards
                    </h4>

                    {customer.rewards.length === 0 ? (
                      <Card className="bg-muted/50">
                        <CardContent className="pt-6 text-center text-muted-foreground">
                          <Gift className="mx-auto h-12 w-12 mb-2 opacity-50" />
                          <p>No rewards yet. Keep visiting to earn!</p>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="space-y-3">
                        {customer.rewards.map((reward: any, index: number) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                          >
                            <Card className="border-gold/50 bg-gradient-to-r from-gold/10 to-yellow-500/10">
                              <CardContent className="pt-4">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <Gift className="h-5 w-5 text-gold" />
                                      <h5 className="font-semibold">{reward.rewardType}</h5>
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                      {reward.storeId?.name || "Unknown Store"}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Earned: {formatDate(reward.dateIssued)}
                                    </p>
                                  </div>
                                  <Badge
                                    variant={reward.status === "unused" ? "gold" : "secondary"}
                                  >
                                    {reward.status === "unused" ? "🟡 UNUSED" : "✓ USED"}
                                  </Badge>
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Store Visits Section */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-lg flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-navy dark:text-gold" />
                      Visits by Store
                    </h4>

                    {customer.storeVisits.length === 0 ? (
                      <Card className="bg-muted/50">
                        <CardContent className="pt-6 text-center text-muted-foreground">
                          <p>No visits yet. Start scanning QR codes!</p>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="space-y-3">
                        {customer.storeVisits.map((visit: any, index: number) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: (customer.rewards.length + index) * 0.1 }}
                          >
                            <Card>
                              <CardContent className="pt-4">
                                <div className="space-y-2">
                                  <div className="flex justify-between items-start">
                                    <div>
                                      <h5 className="font-semibold">
                                        {visit.storeId?.name || "Unknown Store"}
                                      </h5>
                                      <p className="text-xs text-muted-foreground">
                                        Last visit: {formatDate(visit.lastVisit)}
                                      </p>
                                    </div>
                                    <Badge variant="navy">{visit.visitCount} visits</Badge>
                                  </div>
                                  <ProgressBar
                                    visitCount={visit.visitCount % 5}
                                    maxVisits={5}
                                  />
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="pt-4 space-y-2">
                    <Button
                      variant="navy"
                      onClick={() => router.push("/customer")}
                      className="w-full"
                    >
                      Scan QR Code
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setCustomer(null);
                        setPhone("");
                      }}
                      className="w-full"
                    >
                      Check Another Number
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}




