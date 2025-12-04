/**
 * System Settings Helper
 * 
 * Provides centralized access to system settings with caching for performance.
 * Falls back to default values if settings are not found in database.
 */

import dbConnect from './db';
import SystemSettings from '@/models/SystemSettings';

// Cache for system settings (in-memory cache)
let settingsCache: any = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes cache TTL

/**
 * Default system settings (fallback if database doesn't have settings)
 */
const DEFAULT_SETTINGS = {
  validationRules: {
    allowedTINs: ['0003169685'],
    minReceiptAmount: 2000,
    receiptValidityHours: 24,
    requireStoreActive: true,
    requireReceiptUploadsEnabled: true,
  },
  visitLimits: {
    visitLimitHours: 24,
  },
  rewardRules: {
    requiredVisits: 5,
    rewardPeriodDays: 45,
  },
  rewardSettings: {
    discountPercent: 10,
    initialExpirationDays: 45,
    redemptionExpirationDays: 30,
  },
};

/**
 * Get system settings with caching
 * 
 * @param forceRefresh - If true, bypass cache and fetch fresh from database
 * @returns System settings object
 */
export async function getSystemSettings(forceRefresh: boolean = false): Promise<any> {
  try {
    const now = Date.now();
    
    // Return cached settings if valid and not forcing refresh
    if (!forceRefresh && settingsCache && (now - cacheTimestamp) < CACHE_TTL) {
      return settingsCache;
    }

    // Connect to database
    await dbConnect();

    // Fetch settings from database
    let settings = await SystemSettings.findOne();
    
    // If no settings exist, use defaults
    if (!settings) {
      console.log('⚠️  SystemSettings not found in database. Using defaults...');
      console.log('⚠️  Initialize SystemSettings via script for production use.');
      
      // Cache defaults
      settingsCache = DEFAULT_SETTINGS;
      cacheTimestamp = now;
      return DEFAULT_SETTINGS;
    }

    // Extract settings object
    const settingsData = {
      validationRules: settings.validationRules || DEFAULT_SETTINGS.validationRules,
      visitLimits: settings.visitLimits || DEFAULT_SETTINGS.visitLimits,
      rewardRules: settings.rewardRules || DEFAULT_SETTINGS.rewardRules,
      rewardSettings: settings.rewardSettings || DEFAULT_SETTINGS.rewardSettings,
    };

    // Update cache
    settingsCache = settingsData;
    cacheTimestamp = now;

    return settingsData;
  } catch (error) {
    console.error('Error fetching system settings:', error);
    
    // Return defaults on error
    if (!settingsCache) {
      settingsCache = DEFAULT_SETTINGS;
      cacheTimestamp = Date.now();
    }
    
    return settingsCache || DEFAULT_SETTINGS;
  }
}

/**
 * Clear the settings cache
 * Call this after updating settings to ensure fresh data
 */
export function clearSettingsCache(): void {
  settingsCache = null;
  cacheTimestamp = 0;
}

/**
 * Get validation rules from system settings
 */
export async function getValidationRules() {
  const settings = await getSystemSettings();
  return settings.validationRules;
}

/**
 * Get visit limits from system settings
 */
export async function getVisitLimits() {
  const settings = await getSystemSettings();
  return settings.visitLimits;
}

/**
 * Get reward rules from system settings
 */
export async function getRewardRules() {
  const settings = await getSystemSettings();
  return settings.rewardRules;
}

/**
 * Get reward settings from system settings
 */
export async function getRewardSettings() {
  const settings = await getSystemSettings();
  return settings.rewardSettings;
}

/**
 * Check if a TIN is allowed
 */
export async function isTINAllowed(tin: string): Promise<boolean> {
  const validationRules = await getValidationRules();
  return validationRules.allowedTINs?.includes(tin) || false;
}

/**
 * Get minimum receipt amount
 */
export async function getMinReceiptAmount(storeMinAmount?: number): Promise<number> {
  const validationRules = await getValidationRules();
  const systemMin = validationRules.minReceiptAmount || DEFAULT_SETTINGS.validationRules.minReceiptAmount;
  
  // Use store-specific minimum if provided and higher than system minimum
  if (storeMinAmount && storeMinAmount >= systemMin) {
    return storeMinAmount;
  }
  
  return systemMin;
}

/**
 * Get receipt validity hours
 */
export async function getReceiptValidityHours(storeValidityHours?: number): Promise<number> {
  const validationRules = await getValidationRules();
  const systemValidity = validationRules.receiptValidityHours || DEFAULT_SETTINGS.validationRules.receiptValidityHours;
  
  // Use store-specific validity if provided
  if (storeValidityHours && storeValidityHours > 0) {
    return storeValidityHours;
  }
  
  return systemValidity;
}

/**
 * Get visit limit hours
 */
export async function getVisitLimitHours(): Promise<number> {
  const visitLimits = await getVisitLimits();
  return visitLimits.visitLimitHours || DEFAULT_SETTINGS.visitLimits.visitLimitHours;
}

/**
 * Get required visits for reward
 */
export async function getRequiredVisits(): Promise<number> {
  const rewardRules = await getRewardRules();
  return rewardRules.requiredVisits || DEFAULT_SETTINGS.rewardRules.requiredVisits;
}

/**
 * Get reward period days
 */
export async function getRewardPeriodDays(): Promise<number> {
  const rewardRules = await getRewardRules();
  return rewardRules.rewardPeriodDays || DEFAULT_SETTINGS.rewardRules.rewardPeriodDays;
}

/**
 * Get discount percent
 */
export async function getDiscountPercent(): Promise<number> {
  const rewardSettings = await getRewardSettings();
  return rewardSettings.discountPercent || DEFAULT_SETTINGS.rewardSettings.discountPercent;
}

/**
 * Get initial expiration days (from reward creation)
 */
export async function getInitialExpirationDays(): Promise<number> {
  const rewardSettings = await getRewardSettings();
  return rewardSettings.initialExpirationDays || DEFAULT_SETTINGS.rewardSettings.initialExpirationDays;
}

/**
 * Get redemption expiration days (after reward is redeemed)
 */
export async function getRedemptionExpirationDays(): Promise<number> {
  const rewardSettings = await getRewardSettings();
  return rewardSettings.redemptionExpirationDays || DEFAULT_SETTINGS.rewardSettings.redemptionExpirationDays;
}

