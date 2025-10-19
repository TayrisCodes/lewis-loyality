"use client";

import { useEffect } from "react";
import { AlertCircle, CheckCircle, WifiOff, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ErrorAlertProps {
  message: string;
  type?: "error" | "network" | "success";
  onClose: () => void;
  autoClose?: boolean;
  duration?: number;
}

export default function ErrorAlert({
  message,
  type = "error",
  onClose,
  autoClose = true,
  duration = 5000,
}: ErrorAlertProps) {
  useEffect(() => {
    if (autoClose) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [autoClose, duration, onClose]);

  const config = {
    error: {
      icon: AlertCircle,
      bgColor: "bg-red-50 dark:bg-red-900/20",
      borderColor: "border-red-500",
      textColor: "text-red-800 dark:text-red-200",
      iconColor: "text-red-500",
    },
    network: {
      icon: WifiOff,
      bgColor: "bg-orange-50 dark:bg-orange-900/20",
      borderColor: "border-orange-500",
      textColor: "text-orange-800 dark:text-orange-200",
      iconColor: "text-orange-500",
    },
    success: {
      icon: CheckCircle,
      bgColor: "bg-green-50 dark:bg-green-900/20",
      borderColor: "border-green-500",
      textColor: "text-green-800 dark:text-green-200",
      iconColor: "text-green-500",
    },
  };

  const { icon: Icon, bgColor, borderColor, textColor, iconColor } =
    config[type];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -50, scale: 0.9 }}
        className="fixed top-4 right-4 z-50 max-w-md"
      >
        <div
          className={`${bgColor} ${borderColor} border-l-4 p-4 rounded-lg shadow-lg`}
        >
          <div className="flex items-start">
            <Icon className={`${iconColor} h-5 w-5 mr-3 flex-shrink-0 mt-0.5`} />
            <div className="flex-1">
              <p className={`${textColor} text-sm font-medium`}>{message}</p>
            </div>
            <button
              onClick={onClose}
              className={`${textColor} hover:opacity-70 ml-3`}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}




