"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { MapPin, Phone, User, Gift, CheckCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import ErrorAlert from "@/components/ErrorAlert";
import Loader from "@/components/Loader";
import ProgressBar from "@/components/ProgressBar";

type Step = "location" | "phone" | "name" | "visit" | "success";

function ScanV3PageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const storeId = searchParams.get("store");

  const [step, setStep] = useState<Step>("location");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form data
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [dailyCode, setDailyCode] = useState("");
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [useCode, setUseCode] = useState(false);

  // Store & visit data
  const [store, setStore] = useState<any>(null);
  const [customer, setCustomer] = useState<any>(null);
  const [visitResult, setVisitResult] = useState<any>(null);

  useEffect(() => {
    if (!storeId) {
      setError("No store specified");
      return;
    }

    // Load store details
    fetch(`/api/store`)
      .then((res) => res.json())
      .then((data) => {
        const foundStore = data.stores.find((s: any) => s._id === storeId);
        if (foundStore) {
          setStore(foundStore);
        } else {
          setError("Store not found");
        }
      })
      .catch((err) => setError("Failed to load store"));

    // Check if user is cached
    const cachedPhone = localStorage.getItem("customer_phone");
    if (cachedPhone) {
      setPhone(cachedPhone);
      checkUser(cachedPhone);
    }
  }, [storeId]);

  const checkUser = async (phoneNumber: string) => {
    try {
      const response = await fetch("/api/checkUser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneNumber }),
      });

      const data = await response.json();

      if (data.exists) {
        setCustomer(data.user);
        localStorage.setItem("customer_phone", phoneNumber);
        localStorage.setItem("customer_name", data.user.name);
        setStep("visit");
      } else {
        setStep("name");
      }
    } catch (err) {
      setError("Failed to check user");
    }
  };

  const handleLocationRequest = () => {
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLoading(false);
        setStep("phone");
      },
      (err) => {
        setError("Location access denied. Please enter store code instead.");
        setUseCode(true);
        setLoading(false);
      }
    );
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await checkUser(phone);
    } catch (err) {
      setError("Failed to verify phone number");
    } finally {
      setLoading(false);
    }
  };

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      setCustomer(data.user);
      localStorage.setItem("customer_phone", phone);
      localStorage.setItem("customer_name", name);
      setStep("visit");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVisitSubmit = async () => {
    setLoading(true);

    try {
      const response = await fetch("/api/v2/visit/record", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          storeId,
          location,
          dailyCode: useCode ? dailyCode : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      setVisitResult(data.visit);
      setStep("success");

      // Trigger confetti if reward earned
      if (data.visit.isReward) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#FFD700", "#1A237E"],
        });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!store) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader message="Loading store..." />
      </div>
    );
  }

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

      <div className="max-w-md mx-auto mt-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="border-0 shadow-2xl">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl text-navy dark:text-gold">
                {store.name}
              </CardTitle>
              <CardDescription>{store.address}</CardDescription>
            </CardHeader>

            <CardContent>
              {loading ? (
                <Loader message="Processing..." />
              ) : (
                <>
                  {step === "location" && (
                    <div className="space-y-6">
                      <div className="text-center">
                        <MapPin className="mx-auto h-16 w-16 text-navy dark:text-gold mb-4" />
                        <h3 className="font-semibold text-lg mb-2">Verify Location</h3>
                        <p className="text-sm text-muted-foreground">
                          We need to confirm you're at the store
                        </p>
                      </div>

                      {!useCode ? (
                        <div className="space-y-4">
                          <Button
                            variant="navy"
                            size="lg"
                            onClick={handleLocationRequest}
                            className="w-full"
                          >
                            <MapPin className="mr-2 h-5 w-5" />
                            Use My Location
                          </Button>

                          <Button
                            variant="outline"
                            onClick={() => setUseCode(true)}
                            className="w-full"
                          >
                            Enter Store Code Instead
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <Label htmlFor="code">4-Digit Store Code</Label>
                          <Input
                            id="code"
                            placeholder="1234"
                            value={dailyCode}
                            onChange={(e) => setDailyCode(e.target.value)}
                            maxLength={4}
                          />
                          <Button
                            variant="navy"
                            onClick={() => setStep("phone")}
                            disabled={dailyCode.length !== 4}
                            className="w-full"
                          >
                            Continue
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {step === "phone" && (
                    <form onSubmit={handlePhoneSubmit} className="space-y-6">
                      <div className="text-center">
                        <Phone className="mx-auto h-16 w-16 text-navy dark:text-gold mb-4" />
                        <h3 className="font-semibold text-lg mb-2">Your Phone Number</h3>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="0911234567"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          required
                        />
                      </div>

                      <Button type="submit" variant="navy" size="lg" className="w-full">
                        Continue
                      </Button>
                    </form>
                  )}

                  {step === "name" && (
                    <form onSubmit={handleNameSubmit} className="space-y-6">
                      <div className="text-center">
                        <User className="mx-auto h-16 w-16 text-navy dark:text-gold mb-4" />
                        <h3 className="font-semibold text-lg mb-2">Welcome! What's your name?</h3>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                          id="name"
                          type="text"
                          placeholder="John Doe"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          required
                        />
                      </div>

                      <Button type="submit" variant="navy" size="lg" className="w-full">
                        Register & Continue
                      </Button>
                    </form>
                  )}

                  {step === "visit" && customer && (
                    <div className="space-y-6">
                      <div className="text-center">
                        <h3 className="font-semibold text-lg mb-2">
                          Hi {customer.name}! 👋
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          You're at {store.name}
                        </p>
                      </div>

                      <ProgressBar
                        visitCount={customer.totalVisits || 0}
                        storeName={store.name}
                      />

                      <Button
                        variant="navy"
                        size="lg"
                        onClick={handleVisitSubmit}
                        className="w-full"
                      >
                        <CheckCircle className="mr-2 h-5 w-5" />
                        Record My Visit
                      </Button>
                    </div>
                  )}

                  {step === "success" && visitResult && (
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="space-y-6 text-center"
                    >
                      {visitResult.isReward ? (
                        <>
                          <Gift className="mx-auto h-24 w-24 text-gold" />
                          <h2 className="text-3xl font-bold text-navy dark:text-gold">
                            Congratulations! 🎁
                          </h2>
                          <p className="text-lg">You've earned a Lewis Gift Card!</p>
                          <p className="text-sm text-muted-foreground">
                            Check your WhatsApp for redemption details
                          </p>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="mx-auto h-24 w-24 text-green-600" />
                          <h2 className="text-2xl font-bold text-navy dark:text-gold">
                            Visit Recorded!
                          </h2>
                          <p className="text-lg">
                            Visit #{visitResult.storeVisitCount} at {visitResult.storeName}
                          </p>
                        </>
                      )}

                      <ProgressBar
                        visitCount={visitResult.storeVisitCount}
                        storeName={visitResult.storeName}
                      />

                      <div className="pt-4 space-y-2">
                        <Button
                          variant="navy"
                          onClick={() => router.push("/customer")}
                          className="w-full"
                        >
                          Scan Another QR Code
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => router.push("/rewards")}
                          className="w-full"
                        >
                          View My Rewards
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

export default function ScanV3Page() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <ScanV3PageContent />
    </Suspense>
  );
}
