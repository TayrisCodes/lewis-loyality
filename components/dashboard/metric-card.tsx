"use client";

import { motion } from "framer-motion";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface MetricCardProps {
  title: string;
  value: number | string;
  description: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    label: string;
  };
  delay?: number;
}

export default function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  delay = 0,
}: MetricCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <Card className="hover:shadow-lg transition-shadow dark:bg-card">
        <CardContent className="pt-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <h3 className="text-3xl font-bold mt-2 text-foreground">{value}</h3>
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            </div>
            <div className="w-12 h-12 bg-gradient-to-br from-navy to-blue-700 dark:from-gold dark:to-yellow-600 rounded-lg flex items-center justify-center">
              <Icon className="h-6 w-6 text-white dark:text-navy" />
            </div>
          </div>

          {trend && (
            <div className="mt-4 flex items-center gap-2">
              {trend.value > 0 ? (
                <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
              )}
              <span
                className={`text-sm font-medium ${
                  trend.value > 0
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                {trend.value > 0 ? "+" : ""}
                {trend.value}%
              </span>
              <span className="text-xs text-muted-foreground">{trend.label}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}




