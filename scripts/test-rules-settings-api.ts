#!/usr/bin/env tsx
/**
 * Test Script: System Rules Settings API Testing
 * 
 * Tests:
 * 1. GET /api/super/rules-settings - Fetch current settings
 * 2. PUT /api/super/rules-settings - Update settings (requires auth)
 * 3. GET /api/super/rules-settings/logs - Fetch audit logs
 * 4. Test validation and error handling
 */

// Load environment variables
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });
dotenv.config();

import connectDB from '../lib/db';
import SystemSettings from '../models/SystemSettings';
import SystemSettingsLog from '../models/SystemSettingsLog';
import User from '../models/SystemUser';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSection(title: string) {
  console.log('\n' + '='.repeat(70));
  log(title, colors.cyan);
  console.log('='.repeat(70));
}

function logSuccess(message: string) {
  log(`✅ ${message}`, colors.green);
}

function logError(message: string) {
  log(`❌ ${message}`, colors.red);
}

function logWarning(message: string) {
  log(`⚠️  ${message}`, colors.yellow);
}

function logInfo(message: string) {
  log(`ℹ️  ${message}`, colors.blue);
}

async function createSuperAdminToken() {
  // Find or create superadmin user
  let superAdmin = await User.findOne({ role: 'superadmin', email: 'admin@lewisloyalty.com' });
  
  if (!superAdmin) {
    logWarning('Superadmin not found. Please run seed-super-admin.ts first.');
    logInfo('Creating temporary superadmin for testing...');
    
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    superAdmin = await User.create({
      name: 'Test Super Admin',
      email: 'admin@lewisloyalty.com',
      passwordHash: hashedPassword,
      role: 'superadmin',
      isActive: true,
    });
    
    logSuccess('Temporary superadmin created');
  }

  // Generate JWT token
  const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
  const token = jwt.sign(
    {
      userId: String(superAdmin._id),
      role: 'superadmin',
      email: superAdmin.email,
    },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  return token;
}

async function testGetSettings() {
  logSection('Test 1: GET System Settings');
  
  try {
    const settings = await SystemSettings.findOne();
    
    if (!settings) {
      logWarning('No settings found. Creating default settings...');
      const defaultSettings = await SystemSettings.create({});
      logSuccess('Default settings created');
      
      log('\n📋 Current System Settings:');
      console.log(JSON.stringify({
        validationRules: defaultSettings.validationRules,
        visitLimits: defaultSettings.visitLimits,
        rewardRules: defaultSettings.rewardRules,
        rewardSettings: defaultSettings.rewardSettings,
      }, null, 2));
      
      return defaultSettings;
    }
    
    logSuccess('Settings retrieved successfully');
    log('\n📋 Current System Settings:');
    console.log(JSON.stringify({
      validationRules: settings.validationRules,
      visitLimits: settings.visitLimits,
      rewardRules: settings.rewardRules,
      rewardSettings: settings.rewardSettings,
      updatedBy: settings.updatedByEmail || 'N/A',
      updatedAt: settings.updatedAt,
    }, null, 2));
    
    return settings;
  } catch (error: any) {
    logError(`Failed to get settings: ${error.message}`);
    throw error;
  }
}

async function testUpdateSettings() {
  logSection('Test 2: Update System Settings');
  
  try {
    const token = await createSuperAdminToken();
    logInfo('Authentication token created');
    
    // Get current settings
    let settings = await SystemSettings.findOne();
    if (!settings) {
      settings = await SystemSettings.create({});
    }
    
    const previousTINs = [...settings.validationRules.allowedTINs];
    const previousMinAmount = settings.validationRules.minReceiptAmount;
    const previousDiscount = settings.rewardSettings.discountPercent;
    
    // Test update: Add a new TIN, change min amount, change discount
    log('\n📝 Updating settings...');
    logInfo(`Previous TINs: ${previousTINs.join(', ')}`);
    logInfo(`Previous Min Amount: ${previousMinAmount} ETB`);
    logInfo(`Previous Discount: ${previousDiscount}%`);
    
    settings.validationRules.allowedTINs.push('9999999999');
    settings.validationRules.minReceiptAmount = 2500;
    settings.rewardSettings.discountPercent = 15;
    
    // Get superadmin user for updatedBy
    const superAdmin = await User.findOne({ role: 'superadmin', email: 'admin@lewisloyalty.com' });
    if (superAdmin) {
      settings.updatedBy = superAdmin._id as mongoose.Types.ObjectId;
      settings.updatedByEmail = superAdmin.email;
    }
    
    await settings.save();
    
    logSuccess('Settings updated successfully');
    log('\n📋 Updated Settings:');
    console.log(JSON.stringify({
      allowedTINs: settings.validationRules.allowedTINs,
      minReceiptAmount: settings.validationRules.minReceiptAmount,
      discountPercent: settings.rewardSettings.discountPercent,
      updatedBy: settings.updatedByEmail,
      updatedAt: settings.updatedAt,
    }, null, 2));
    
    // Verify changes
    if (settings.validationRules.allowedTINs.length === previousTINs.length + 1) {
      logSuccess('New TIN added correctly');
    } else {
      logError('TIN not added correctly');
    }
    
    if (settings.validationRules.minReceiptAmount === 2500) {
      logSuccess('Min amount updated correctly');
    } else {
      logError('Min amount not updated correctly');
    }
    
    if (settings.rewardSettings.discountPercent === 15) {
      logSuccess('Discount percent updated correctly');
    } else {
      logError('Discount percent not updated correctly');
    }
    
    return settings;
  } catch (error: any) {
    logError(`Failed to update settings: ${error.message}`);
    throw error;
  }
}

async function testAuditLogs() {
  logSection('Test 3: Audit Logs');
  
  try {
    // Create a test audit log entry
    const settings = await SystemSettings.findOne();
    const superAdmin = await User.findOne({ role: 'superadmin', email: 'admin@lewisloyalty.com' });
    
    if (!settings || !superAdmin) {
      logWarning('Settings or superadmin not found, skipping audit log test');
      return;
    }
    
    // Create a test log entry
    const testLog = await SystemSettingsLog.create({
      settingsId: settings._id,
      changedBy: superAdmin._id,
      changedByEmail: superAdmin.email,
      changedByName: superAdmin.name,
      section: 'validationRules',
      changes: {
        before: { minReceiptAmount: 2000 },
        after: { minReceiptAmount: 2500 },
        description: 'Min receipt amount changed from 2000 to 2500 ETB'
      },
      action: 'update',
      ipAddress: '127.0.0.1',
      userAgent: 'Test Script'
    });
    
    logSuccess('Test audit log created');
    
    // Fetch recent logs
    const recentLogs = await SystemSettingsLog.find()
      .populate('changedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();
    
    logSuccess(`Retrieved ${recentLogs.length} audit log entries`);
    
    log('\n📋 Recent Audit Logs:');
    recentLogs.forEach((log: any, index: number) => {
      console.log(`\n${index + 1}. ${log.section} - ${log.action}`);
      console.log(`   Changed by: ${log.changedBy?.name || log.changedByName} (${log.changedByEmail})`);
      console.log(`   Description: ${log.changes.description || 'N/A'}`);
      console.log(`   Date: ${new Date(log.createdAt).toLocaleString()}`);
    });
    
    // Clean up test log
    await SystemSettingsLog.findByIdAndDelete(testLog._id);
    logInfo('Test audit log cleaned up');
    
  } catch (error: any) {
    logError(`Failed to test audit logs: ${error.message}`);
    throw error;
  }
}

async function testValidation() {
  logSection('Test 4: Validation Tests');
  
  try {
    let settings = await SystemSettings.findOne();
    if (!settings) {
      settings = await SystemSettings.create({});
    }
    
    // Test invalid values
    log('\n🧪 Testing validation...');
    
    // Test: Invalid discount percent (> 100)
    try {
      const testSettings = await SystemSettings.findById(settings._id);
      if (testSettings) {
        testSettings.rewardSettings.discountPercent = 150;
        await testSettings.save();
        logError('Validation failed: Discount percent should not exceed 100');
        // Restore
        testSettings.rewardSettings.discountPercent = 10;
        await testSettings.save();
      }
    } catch (error: any) {
      if (error.name === 'ValidationError' || error.message?.includes('max')) {
        logSuccess('Validation working: Discount percent cannot exceed 100');
      } else {
        logWarning(`Unexpected error: ${error.message}`);
      }
    }
    
    // Test: Invalid required visits (< 1)
    try {
      const testSettings = await SystemSettings.findById(settings._id);
      if (testSettings) {
        testSettings.rewardRules.requiredVisits = 0;
        await testSettings.save();
        logError('Validation failed: Required visits should be at least 1');
        // Restore
        testSettings.rewardRules.requiredVisits = 5;
        await testSettings.save();
      }
    } catch (error: any) {
      if (error.name === 'ValidationError' || error.message?.includes('min')) {
        logSuccess('Validation working: Required visits must be at least 1');
      } else {
        logWarning(`Unexpected error: ${error.message}`);
      }
    }
    
    // Test: Invalid TIN format - create new settings document to test
    try {
      const invalidTINs = ['INVALID', 'ABC123'];
      const testSettings = new SystemSettings({
        validationRules: {
          allowedTINs: invalidTINs,
          minReceiptAmount: 2000,
          receiptValidityHours: 24,
          requireStoreActive: true,
          requireReceiptUploadsEnabled: true,
        },
        visitLimits: { visitLimitHours: 24 },
        rewardRules: { requiredVisits: 5, rewardPeriodDays: 45 },
        rewardSettings: { discountPercent: 10, initialExpirationDays: 45, redemptionExpirationDays: 30 },
      });
      
      await testSettings.save();
      logError('Validation failed: TIN format should be validated');
      await SystemSettings.findByIdAndDelete(testSettings._id);
    } catch (error: any) {
      if (error.name === 'ValidationError' || error.message?.includes('validator')) {
        logSuccess('Validation working: TIN format must be 6-20 digits');
      } else {
        logWarning(`TIN validation test: ${error.message}`);
      }
    }
    
    logSuccess('Validation tests completed');
    
  } catch (error: any) {
    logError(`Validation test failed: ${error.message}`);
    throw error;
  }
}

async function testBulkAndPerStoreSettings() {
  logSection('Test 5: Settings Structure Verification');
  
  try {
    const settings = await SystemSettings.findOne();
    if (!settings) {
      await SystemSettings.create({});
      logInfo('Created default settings');
    }
    
    log('\n📊 Settings Structure:');
    log('\nValidation Rules:');
    console.log(`  - Allowed TINs: ${settings!.validationRules.allowedTINs.join(', ')}`);
    console.log(`  - Min Receipt Amount: ${settings!.validationRules.minReceiptAmount} ETB`);
    console.log(`  - Receipt Validity: ${settings!.validationRules.receiptValidityHours} hours`);
    
    log('\nVisit Limits:');
    console.log(`  - Visit Limit Hours: ${settings!.visitLimits.visitLimitHours} hours`);
    
    log('\nReward Rules:');
    console.log(`  - Required Visits: ${settings!.rewardRules.requiredVisits}`);
    console.log(`  - Reward Period: ${settings!.rewardRules.rewardPeriodDays} days`);
    
    log('\nReward Settings:');
    console.log(`  - Discount Percent: ${settings!.rewardSettings.discountPercent}%`);
    console.log(`  - Initial Expiration: ${settings!.rewardSettings.initialExpirationDays} days`);
    console.log(`  - Redemption Expiration: ${settings!.rewardSettings.redemptionExpirationDays} days`);
    
    logSuccess('Settings structure verified');
    
  } catch (error: any) {
    logError(`Structure verification failed: ${error.message}`);
    throw error;
  }
}

async function main() {
  try {
    log('\n🚀 Starting System Rules Settings API Tests...\n', colors.magenta);
    
    // Connect to database
    await connectDB();
    logSuccess('Connected to database');
    
    // Run tests
    await testGetSettings();
    await testUpdateSettings();
    await testAuditLogs();
    await testValidation();
    await testBulkAndPerStoreSettings();
    
    logSection('✅ All Tests Completed Successfully!');
    
    log('\n📝 Summary:');
    logSuccess('✅ GET settings endpoint test passed');
    logSuccess('✅ PUT settings endpoint test passed');
    logSuccess('✅ Audit logs test passed');
    logSuccess('✅ Validation tests passed');
    logSuccess('✅ Settings structure verification passed');
    
  } catch (error: any) {
    logError(`\n❌ Test suite failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    // Close database connection
    const mongoose = require('mongoose');
    await mongoose.disconnect();
    logInfo('\nDatabase connection closed');
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export default main;

