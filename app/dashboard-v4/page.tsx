"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Users, TrendingUp, Gift, Store } from "lucide-react";
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Sidebar } from "@/components/dashboard/sidebar";
import MetricCard from "@/components/dashboard/metric-card";
import Loader from "@/components/Loader";
import { formatDateTime } from "@/lib/utils";

export default function DashboardV4Page() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [role, setRole] = useState<"superadmin" | "admin">("admin");
  const [email, setEmail] = useState("");

  useEffect(() => {
    const storedToken =
      localStorage.getItem("admin_token") || sessionStorage.getItem("admin_token");
    const storedRole = localStorage.getItem("admin_role") || sessionStorage.getItem("admin_role");
    const storedEmail =
      localStorage.getItem("admin_email") || sessionStorage.getItem("admin_email");

    if (!storedToken) {
      router.push("/login");
      return;
    }

    setToken(storedToken);
    setRole(storedRole as "superadmin" | "admin");
    setEmail(storedEmail || "");
  }, [router]);

  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["stats", token],
    queryFn: async () => {
      if (!token) throw new Error("No token available");
      const response = await fetch("/api/admin?action=stats", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch stats");
      return response.json();
    },
    enabled: !!token,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch chart data
  const { data: chartData } = useQuery({
    queryKey: ["charts", token],
    queryFn: async () => {
      if (!token) throw new Error("No token available");
      const response = await fetch("/api/admin?action=charts", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch charts");
      return response.json();
    },
    enabled: !!token,
  });

  // Fetch recent visits
  const { data: visitsData } = useQuery({
    queryKey: ["visits", token],
    queryFn: async () => {
      if (!token) throw new Error("No token available");
      const response = await fetch("/api/admin?action=visits", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch visits");
      return response.json();
    },
    enabled: !!token,
  });

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    localStorage.removeItem("admin_role");
    localStorage.removeItem("admin_email");
    sessionStorage.removeItem("admin_token");
    sessionStorage.removeItem("admin_role");
    sessionStorage.removeItem("admin_email");
    router.push("/login");
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader message="Authenticating..." />
      </div>
    );
  }

  const COLORS = ["#1A237E", "#FFD700", "#3B82F6", "#10B981"];

  return (
    <div className="min-h-screen bg-background">
      <Sidebar role={role} onLogout={handleLogout} />

      <div className="ml-64 p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Dashboard</h1>
          <p className="text-muted-foreground">
            {role === "superadmin"
              ? "System-wide analytics and management"
              : "Your store's performance overview"}
          </p>
        </div>

        {statsLoading ? (
          <div className="py-20">
            <Loader message="Loading dashboard..." />
          </div>
        ) : (
          <>
            {/* Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <MetricCard
                title="Total Customers"
                value={stats?.stats?.totalUsers || 0}
                description="Registered customers"
                icon={Users}
                trend={{ value: stats?.stats?.growth?.users || 0, label: "this month" }}
                delay={0}
              />
              <MetricCard
                title="Total Visits"
                value={stats?.stats?.totalVisits || 0}
                description="Check-ins recorded"
                icon={TrendingUp}
                trend={{ value: stats?.stats?.growth?.visits || 0, label: "vs last month" }}
                delay={0.1}
              />
              <MetricCard
                title="Rewards Issued"
                value={stats?.stats?.totalRewards || 0}
                description="Gift cards earned"
                icon={Gift}
                delay={0.2}
              />
              <MetricCard
                title="Active Stores"
                value={stats?.stats?.totalStores || 0}
                description="Store locations"
                icon={Store}
                delay={0.3}
              />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Area Chart - Visits Over Time */}
              <Card className="dark:bg-card">
                <CardHeader>
                  <CardTitle>Visits & Rewards Trend</CardTitle>
                  <CardDescription>Last 30 days</CardDescription>
                </CardHeader>
                <CardContent>
                  {chartData?.visitsOverTime?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <AreaChart data={chartData.visitsOverTime}>
                        <defs>
                          <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#1A237E" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#1A237E" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="colorRewards" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#FFD700" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#FFD700" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis
                          dataKey="date"
                          className="text-xs fill-muted-foreground"
                          tickFormatter={(value) => new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        />
                        <YAxis className="text-xs fill-muted-foreground" />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="visits"
                          stroke="#1A237E"
                          fillOpacity={1}
                          fill="url(#colorVisits)"
                        />
                        <Area
                          type="monotone"
                          dataKey="rewards"
                          stroke="#FFD700"
                          fillOpacity={1}
                          fill="url(#colorRewards)"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      No data available
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Pie Chart - Store Performance */}
              <Card className="dark:bg-card">
                <CardHeader>
                  <CardTitle>Store Performance</CardTitle>
                  <CardDescription>Visit distribution</CardDescription>
                </CardHeader>
                <CardContent>
                  {chartData?.storePerformance?.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={chartData.storePerformance}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={(entry) => entry.name}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {chartData.storePerformance.map((_: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "hsl(var(--card))",
                            border: "1px solid hsl(var(--border))",
                            borderRadius: "8px",
                          }}
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      No data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity Table */}
            <Card className="dark:bg-card">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest customer visits</CardDescription>
              </CardHeader>
              <CardContent>
                {visitsData?.visits?.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Phone</TableHead>
                        <TableHead>Store</TableHead>
                        <TableHead>Date & Time</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visitsData.visits.slice(0, 10).map((visit: any) => (
                        <TableRow key={visit._id}>
                          <TableCell className="font-medium">{visit.phone}</TableCell>
                          <TableCell>{visit.storeId?.name || "Unknown"}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDateTime(visit.timestamp)}
                          </TableCell>
                          <TableCell>
                            {visit.isReward ? (
                              <Badge variant="gold">🎁 Reward</Badge>
                            ) : (
                              <Badge variant="secondary">Visit</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="py-8 text-center text-muted-foreground">
                    No recent activity
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}



