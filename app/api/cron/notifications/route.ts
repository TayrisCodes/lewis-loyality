import { NextRequest, NextResponse } from 'next/server';
import {
  sendMotivationNotifications,
  sendExpiryReminderNotifications,
  sendAllScheduledNotifications,
} from '@/lib/scheduledNotifications';

/**
 * POST /api/cron/notifications
 * 
 * Scheduled notification endpoint
 * Can be called by cron jobs or scheduled tasks
 * 
 * Query params:
 * - type: 'motivation' | 'expiry' | 'all' (default: 'all')
 * - secret: Secret key for authentication (optional, set CRON_SECRET env var)
 */
export async function POST(request: NextRequest) {
  try {
    // Optional authentication via secret key
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    const type = searchParams.get('type') || 'all';
    
    const expectedSecret = process.env.CRON_SECRET;
    if (expectedSecret && secret !== expectedSecret) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    let result: any;
    
    switch (type) {
      case 'motivation':
        const motivationCount = await sendMotivationNotifications();
        result = { success: true, motivation: motivationCount };
        break;
        
      case 'expiry':
        const expiryCount = await sendExpiryReminderNotifications();
        result = { success: true, expiryReminder: expiryCount };
        break;
        
      case 'all':
      default:
        result = await sendAllScheduledNotifications();
        result.success = true;
        break;
    }
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[Cron] Notification error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to send scheduled notifications',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/notifications
 * 
 * Test endpoint to trigger notifications manually
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'all';
  
  try {
    let result: any;
    
    switch (type) {
      case 'motivation':
        const motivationCount = await sendMotivationNotifications();
        result = { success: true, motivation: motivationCount };
        break;
        
      case 'expiry':
        const expiryCount = await sendExpiryReminderNotifications();
        result = { success: true, expiryReminder: expiryCount };
        break;
        
      case 'all':
      default:
        result = await sendAllScheduledNotifications();
        result.success = true;
        break;
    }
    
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[Cron] Notification error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to send scheduled notifications',
      },
      { status: 500 }
    );
  }
}




