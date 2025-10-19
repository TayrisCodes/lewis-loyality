"use client";

import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";

interface ProgressBarProps {
  visitCount: number;
  maxVisits?: number;
  storeName?: string;
}

export default function ProgressBar({
  visitCount,
  maxVisits = 5,
  storeName,
}: ProgressBarProps) {
  const progress = (visitCount / maxVisits) * 100;
  const remaining = maxVisits - visitCount;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full space-y-2"
    >
      <div className="flex justify-between items-center text-sm">
        <span className="font-medium text-foreground">
          {visitCount}/{maxVisits} visits
        </span>
        {remaining > 0 ? (
          <span className="text-muted-foreground">
            {remaining} more to reward
          </span>
        ) : (
          <span className="text-green-600 dark:text-green-400 font-semibold">
            🎁 Reward earned!
          </span>
        )}
      </div>
      <Progress value={progress} variant="gold" className="h-3" />
      {storeName && (
        <p className="text-xs text-muted-foreground text-center">{storeName}</p>
      )}
    </motion.div>
  );
}




