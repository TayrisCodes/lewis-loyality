"use client";

import { motion } from "framer-motion";

interface LoaderProps {
  size?: "sm" | "md" | "lg";
  message?: string;
}

export default function Loader({ size = "md", message }: LoaderProps) {
  const sizeClasses = {
    sm: "h-6 w-6 border-2",
    md: "h-10 w-10 border-3",
    lg: "h-16 w-16 border-4",
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <motion.div
        className={`${sizeClasses[size]} border-navy border-t-transparent rounded-full`}
        animate={{ rotate: 360 }}
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: "linear",
        }}
      />
      {message && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 text-sm text-muted-foreground"
        >
          {message}
        </motion.p>
      )}
    </div>
  );
}




