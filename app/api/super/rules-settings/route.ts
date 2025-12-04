import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import SystemSettings from '@/models/SystemSettings';
import SystemSettingsLog from '@/models/SystemSettingsLog';
import { verifyToken } from '@/lib/auth';
import User from '@/models/SystemUser';
import { clearSettingsCache } from '@/lib/systemSettings';

/**
 * GET /api/super/rules-settings
 * Get current system settings
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

    // Get or create system settings (singleton pattern)
    let settings = await SystemSettings.findOne();
    if (!settings) {
      // Create default settings if none exist
      settings = await SystemSettings.create({});
    }

    return NextResponse.json({
      success: true,
      settings: {
        validationRules: settings.validationRules,
        visitLimits: settings.visitLimits,
        rewardRules: settings.rewardRules,
        rewardSettings: settings.rewardSettings,
        updatedBy: settings.updatedBy,
        updatedByEmail: settings.updatedByEmail,
        updatedAt: settings.updatedAt,
        createdAt: settings.createdAt,
      }
    });

  } catch (error: any) {
    console.error('Error fetching system settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch system settings', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/super/rules-settings
 * Update system settings (superadmin only)
 */
export async function PUT(request: NextRequest) {
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

    // Get user info for audit log
    const user = await User.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get request body
    const body = await request.json();
    const { validationRules, visitLimits, rewardRules, rewardSettings, action, storeIds } = body;

    // Get or create system settings
    let settings = await SystemSettings.findOne();
    if (!settings) {
      settings = await SystemSettings.create({});
    }

    // Store previous values for audit log
    const previousSettings = {
      validationRules: JSON.parse(JSON.stringify(settings.validationRules)),
      visitLimits: JSON.parse(JSON.stringify(settings.visitLimits)),
      rewardRules: JSON.parse(JSON.stringify(settings.rewardRules)),
      rewardSettings: JSON.parse(JSON.stringify(settings.rewardSettings)),
    };

    // Determine which sections were changed
    const changedSections: string[] = [];
    if (validationRules) changedSections.push('validationRules');
    if (visitLimits) changedSections.push('visitLimits');
    if (rewardRules) changedSections.push('rewardRules');
    if (rewardSettings) changedSections.push('rewardSettings');

    // Update settings (merge with existing)
    const updateData: any = {};
    if (validationRules) {
      updateData['validationRules'] = {
        ...settings.validationRules,
        ...validationRules
      };
    }
    if (visitLimits) {
      updateData['visitLimits'] = {
        ...settings.visitLimits,
        ...visitLimits
      };
    }
    if (rewardRules) {
      updateData['rewardRules'] = {
        ...settings.rewardRules,
        ...rewardRules
      };
    }
    if (rewardSettings) {
      updateData['rewardSettings'] = {
        ...settings.rewardSettings,
        ...rewardSettings
      };
    }

    // Add updatedBy tracking
    updateData['updatedBy'] = user._id;
    updateData['updatedByEmail'] = user.email;

    // Update settings
    Object.assign(settings, updateData);
    await settings.save();
    
    // Clear settings cache to ensure fresh data
    clearSettingsCache();

    // Get client IP and user agent for audit log
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Create audit log entries for each changed section
    const logPromises = changedSections.map(async (section) => {
      const before = previousSettings[section as keyof typeof previousSettings];
      const after = settings[section as keyof typeof settings];

      // Create detailed change description
      const changes = detectChanges(before, after);
      
      return SystemSettingsLog.create({
        settingsId: settings._id,
        changedBy: user._id,
        changedByEmail: user.email,
        changedByName: user.name,
        section: section as any,
        changes: {
          before,
          after,
          description: changes.length > 0 ? changes.join('; ') : `${section} updated`
        },
        action: 'update',
        ipAddress: ipAddress.split(',')[0].trim(), // Get first IP if multiple
        userAgent
      });
    });

    await Promise.all(logPromises);

    return NextResponse.json({
      success: true,
      message: 'System settings updated successfully',
      settings: {
        validationRules: settings.validationRules,
        visitLimits: settings.visitLimits,
        rewardRules: settings.rewardRules,
        rewardSettings: settings.rewardSettings,
        updatedBy: settings.updatedBy,
        updatedByEmail: settings.updatedByEmail,
        updatedAt: settings.updatedAt,
      }
    });

  } catch (error: any) {
    console.error('Error updating system settings:', error);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      return NextResponse.json(
        { 
          error: 'Validation failed', 
          details: Object.values(error.errors).map((e: any) => e.message).join(', ')
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to update system settings', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Helper function to detect changes between old and new values
 */
function detectChanges(before: any, after: any): string[] {
  const changes: string[] = [];
  
  if (!before || !after) return changes;

  // Compare each field
  for (const key in after) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      const beforeValue = Array.isArray(before[key]) 
        ? before[key].join(', ') 
        : typeof before[key] === 'object' 
          ? JSON.stringify(before[key]) 
          : before[key];
      
      const afterValue = Array.isArray(after[key]) 
        ? after[key].join(', ') 
        : typeof after[key] === 'object' 
          ? JSON.stringify(after[key]) 
          : after[key];
      
      changes.push(`${key}: "${beforeValue}" → "${afterValue}"`);
    }
  }

  return changes;
}

