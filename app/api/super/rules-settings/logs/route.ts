import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import SystemSettingsLog from '@/models/SystemSettingsLog';
import { verifyToken } from '@/lib/auth';

/**
 * GET /api/super/rules-settings/logs
 * Get audit logs for system settings changes (superadmin only)
 */
export async function GET(request: NextRequest) {
  try {
    // Verify super admin authentication
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'superadmin') {
      return NextResponse.json({ error: 'Unauthorized - Super admin only' }, { status: 401 });
    }

    await connectDB();

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const section = searchParams.get('section'); // Filter by section
    const userId = searchParams.get('userId'); // Filter by user
    const startDate = searchParams.get('startDate'); // Filter by date range
    const endDate = searchParams.get('endDate');

    // Build query
    const query: any = {};
    
    if (section) {
      query.section = section;
    }
    
    if (userId) {
      query.changedBy = userId;
    }
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    // Calculate pagination
    const skip = (page - 1) * limit;

    // Get logs with pagination
    const logs = await SystemSettingsLog.find(query)
      .populate('changedBy', 'name email')
      .populate('settingsId')
      .sort({ createdAt: -1 }) // Most recent first
      .skip(skip)
      .limit(limit)
      .lean();

    // Get total count for pagination
    const totalCount = await SystemSettingsLog.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limit);

    // Format logs for response
    const formattedLogs = logs.map((log: any) => ({
      _id: log._id,
      settingsId: log.settingsId?._id || log.settingsId,
      changedBy: {
        _id: log.changedBy?._id || log.changedBy,
        name: log.changedBy?.name || log.changedByName,
        email: log.changedBy?.email || log.changedByEmail,
      },
      section: log.section,
      field: log.field,
      changes: log.changes,
      action: log.action,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      createdAt: log.createdAt,
    }));

    return NextResponse.json({
      success: true,
      logs: formattedLogs,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      }
    });

  } catch (error: any) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch audit logs', details: error.message },
      { status: 500 }
    );
  }
}

