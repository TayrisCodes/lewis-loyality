import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Customer from "@/models/Customer";
import Visit from "@/models/Visit";
import Store from "@/models/Store";
import Reward from "@/models/Reward";
import { extractTokenFromHeader, verifyToken } from "@/lib/auth";

/**
 * GET /api/admin - Admin dashboard data
 * Query params: ?action=stats|users|visits|stores
 */
export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    // Verify admin token
    const authHeader = request.headers.get("authorization");
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const payload = verifyToken(token);

    if (!payload || (payload.role !== "admin" && payload.role !== "superadmin")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    // Build filters based on role
    const isSuperAdmin = payload.role === "superadmin";
    const storeFilter = isSuperAdmin ? {} : { storeId: payload.storeId };

    switch (action) {
      case "stats": {
        // Get statistics
        const totalUsers = await Customer.countDocuments();
        const totalVisits = await Visit.countDocuments(storeFilter);
        const totalStores = await Store.countDocuments(
          isSuperAdmin ? { isActive: true } : { _id: payload.storeId }
        );

        // Count rewards
        const totalRewards = await Reward.countDocuments(storeFilter);

        // Calculate growth (last 30 days vs previous 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const sixtyDaysAgo = new Date();
        sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);

        const recentVisits = await Visit.countDocuments({
          ...storeFilter,
          timestamp: { $gte: thirtyDaysAgo },
        });

        const previousVisits = await Visit.countDocuments({
          ...storeFilter,
          timestamp: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo },
        });

        const visitGrowth = previousVisits > 0 
          ? Math.round(((recentVisits - previousVisits) / previousVisits) * 100)
          : 100;

        return NextResponse.json({
          stats: {
            totalUsers,
            totalVisits,
            totalRewards,
            totalStores,
            growth: {
              visits: visitGrowth,
              users: 12, // Placeholder
            },
          },
        });
      }

      case "users": {
        const customers = await Customer.find()
          .sort({ createdAt: -1 })
          .limit(100);

        // Get rewards count for each customer
        const usersWithRewards = await Promise.all(
          customers.map(async (c) => {
            const rewardsCount = await Reward.countDocuments({ 
              customerId: c._id,
              ...(isSuperAdmin ? {} : { storeId: payload.storeId })
            });
            
            return {
              name: c.name,
              phone: c.phone,
              totalVisits: c.totalVisits,
              lastVisit: c.lastVisit,
              rewards: rewardsCount,
              createdAt: c.createdAt,
            };
          })
        );

        return NextResponse.json({ users: usersWithRewards });
      }

      case "visits": {
        const visits = await Visit.find(storeFilter)
          .populate("storeId", "name address")
          .sort({ timestamp: -1 })
          .limit(50);

        return NextResponse.json({ visits });
      }

      case "stores": {
        const stores = await Store.find(
          isSuperAdmin ? {} : { _id: payload.storeId }
        );

        return NextResponse.json({ stores });
      }

      case "charts": {
        // Get visits and rewards over last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const visits = await Visit.find({
          ...storeFilter,
          timestamp: { $gte: thirtyDaysAgo },
        }).select("timestamp isReward");

        // Group by date
        const visitsByDate: Record<string, { visits: number; rewards: number }> = {};

        visits.forEach((visit) => {
          const date = visit.timestamp.toISOString().split("T")[0];
          if (!visitsByDate[date]) {
            visitsByDate[date] = { visits: 0, rewards: 0 };
          }
          visitsByDate[date].visits += 1;
          if (visit.rewardEarned) {
            visitsByDate[date].rewards += 1;
          }
        });

        const chartData = Object.entries(visitsByDate)
          .map(([date, data]) => ({
            date,
            visits: data.visits,
            rewards: data.rewards,
          }))
          .sort((a, b) => a.date.localeCompare(b.date));

        // Store performance (pie chart)
        const storeStats = await Visit.aggregate([
          { $match: storeFilter },
          {
            $group: {
              _id: "$storeId",
              count: { $sum: 1 },
            },
          },
        ]);

        const storeIds = storeStats.map((s) => s._id);
        const stores = await Store.find({ _id: { $in: storeIds } });

        const storePerformance = storeStats.map((stat) => {
          const store = stores.find((s) => (s._id as any).toString() === (stat._id as any).toString());
          return {
            name: store?.name || "Unknown",
            value: stat.count,
          };
        });

        return NextResponse.json({
          visitsOverTime: chartData,
          storePerformance,
        });
      }

      default:
        return NextResponse.json(
          { error: "Invalid action parameter" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Admin API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}




