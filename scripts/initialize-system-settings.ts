#!/usr/bin/env tsx
/**
 * Initialize System Settings
 * 
 * Creates the SystemSettings document with current hardcoded values as defaults.
 * This script should be run once to populate initial settings.
 */

// Load environment variables
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });
dotenv.config();

import connectDB from '../lib/db';
import SystemSettings from '../models/SystemSettings';
import SystemUser from '../models/SystemUser';

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

async function initializeSystemSettings() {
  try {
    log('\n🚀 Initializing System Settings...\n', colors.cyan);
    
    // Connect to database
    await connectDB();
    log('✅ Connected to database', colors.green);
    
    // Check if settings already exist
    const existingSettings = await SystemSettings.findOne();
    
    if (existingSettings) {
      log('⚠️  System settings already exist. Skipping initialization.', colors.yellow);
      log('\n📋 Current Settings:', colors.blue);
      console.log(JSON.stringify({
        validationRules: existingSettings.validationRules,
        visitLimits: existingSettings.visitLimits,
        rewardRules: existingSettings.rewardRules,
        rewardSettings: existingSettings.rewardSettings,
      }, null, 2));
      return;
    }
    
    // Create default settings with current hardcoded values
    log('📝 Creating default system settings...', colors.blue);
    
    // Find a superadmin user for updatedBy field
    const superadmin = await SystemUser.findOne({ role: 'superadmin' });
    
    if (!superadmin) {
      log('⚠️  No superadmin user found. Settings will be created with system defaults.', colors.yellow);
      log('💡 Tip: Settings will be properly linked when first updated by a superadmin.', colors.cyan);
    } else {
      log(`✅ Found superadmin: ${superadmin.email}`, colors.green);
    }
    
    const defaultSettings = await SystemSettings.create({
      validationRules: {
        allowedTINs: ['0003169685'], // Current hardcoded TIN
        minReceiptAmount: 2000, // Current default min amount
        receiptValidityHours: 24, // Current default validity
        requireStoreActive: true,
        requireReceiptUploadsEnabled: true,
      },
      visitLimits: {
        visitLimitHours: 24, // Current 24-hour visit limit
      },
      rewardRules: {
        requiredVisits: 5, // Current hardcoded value
        rewardPeriodDays: 45, // Current hardcoded value
      },
      rewardSettings: {
        discountPercent: 10, // Current default discount
        initialExpirationDays: 45, // Current expiration after creation
        redemptionExpirationDays: 30, // Current expiration after redemption
      },
      // Set updatedBy fields if superadmin exists
      updatedBy: superadmin?._id || null,
      updatedByEmail: superadmin?.email || 'system',
      updatedByName: superadmin?.name || 'System Initialization',
    });
    
    log('✅ System settings initialized successfully!', colors.green);
    
    log('\n📋 Default Settings Created:', colors.blue);
    console.log(JSON.stringify({
      validationRules: defaultSettings.validationRules,
      visitLimits: defaultSettings.visitLimits,
      rewardRules: defaultSettings.rewardRules,
      rewardSettings: defaultSettings.rewardSettings,
    }, null, 2));
    
    log('\n✨ You can now manage these settings via the superadmin dashboard!', colors.cyan);
    
  } catch (error: any) {
    log(`❌ Error initializing system settings: ${error.message}`, colors.red);
    console.error(error);
    process.exit(1);
  } finally {
    // Close database connection
    const mongoose = require('mongoose');
    await mongoose.disconnect();
    log('\n✅ Database connection closed', colors.green);
  }
}

// Run if called directly
if (require.main === module) {
  initializeSystemSettings().catch(console.error);
}

export default initializeSystemSettings;

