"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

type Step = 1 | 2;

export default function RegisterPage() {
  const [step, setStep] = React.useState<Step>(1);
  const [phone, setPhone] = React.useState("");
  const [name, setName] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");

  const checkPhone = async () => {
    if (!phone.trim()) {
      setError("Please enter a phone number");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/customer/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim() }),
      });

      const data = await response.json();

      if (response.ok && data.exists) {
        // Customer exists - save to localStorage and redirect to visit page
        localStorage.setItem("customerPhone", phone.trim());
        localStorage.setItem("customerName", data.name);
        window.location.href = "/dashboard/customer";
      } else {
        // Customer doesn't exist - show name field
        nextStep();
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!name.trim()) {
      setError("Please enter your name");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/customer/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim() }),
      });

      const data = await response.json();

      if (response.ok) {
        // Save to localStorage
        localStorage.setItem("customerPhone", phone.trim());
        localStorage.setItem("customerName", name.trim());
        
        // Registration successful - redirect to visit page
        window.location.href = "/dashboard/customer";
      } else {
        setError(data.error || "Registration failed. Please try again.");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => setStep((prev) => (prev < 2 ? ((prev + 1) as Step) : prev));
  const prevStep = () => {
    setStep((prev) => (prev > 1 ? ((prev - 1) as Step) : prev));
    setError("");
  };

  const stepVariants = {
    enter: { opacity: 0, x: 50 },
    center: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -50 },
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800">
      {/* Logo Section */}
      <div className="mb-8">
        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-primary rounded-2xl flex items-center justify-center shadow-lg">
          <span className="text-2xl sm:text-3xl font-bold text-primary-foreground">L</span>
        </div>
      </div>

      {/* Card Container */}
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 sm:p-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white mb-2">
            Welcome to Lewis Loyalty
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {step === 1 ? "Enter your phone number to get started" : "Complete your registration"}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-4"
            >
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="Enter your phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      checkPhone();
                    }
                  }}
                  className="mt-1"
                  disabled={loading}
                />
              </div>

              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-red-600 dark:text-red-400"
                >
                  {error}
                </motion.p>
              )}

              <Button onClick={checkPhone} className="mt-4 w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking...
                  </>
                ) : (
                  "Continue"
                )}
              </Button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3 }}
              className="flex flex-col gap-4"
            >
              <div className="mb-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <span className="font-semibold">Phone:</span> {phone}
                </p>
              </div>

              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleRegister();
                    }
                  }}
                  className="mt-1"
                  disabled={loading}
                  autoFocus
                />
              </div>

              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-red-600 dark:text-red-400"
                >
                  {error}
                </motion.p>
              )}

              <div className="flex gap-3 mt-2">
                <Button variant="outline" onClick={prevStep} className="flex-1" disabled={loading}>
                  Back
                </Button>
                <Button onClick={handleRegister} className="flex-1" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Registering...
                    </>
                  ) : (
                    "Submit"
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Already have an account?{" "}
          <a href="/dashboard/customer" className="text-primary hover:underline font-medium">
            Go to Dashboard
          </a>
        </p>
      </div>
    </div>
  );
}







