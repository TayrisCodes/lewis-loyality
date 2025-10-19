import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * @returns distance in meters
 */
export function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Check if user is within store radius
 */
export function isWithinStoreRadius(
  userLat: number,
  userLng: number,
  storeLat: number,
  storeLng: number,
  radiusMeters: number = 100
): boolean {
  const distance = calculateDistance(userLat, userLng, storeLat, storeLng);
  return distance <= radiusMeters;
}

/**
 * Format phone number for WhatsApp (remove non-digits)
 */
export function formatPhoneForWhatsApp(phone: string): string {
  return phone.replace(/\D/g, "");
}

/**
 * Validate Ethiopian phone number format
 */
export function validateEthiopianPhone(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, "");
  return /^(09|07)\d{8}$/.test(cleaned);
}

/**
 * Generate random 4-digit code
 */
export function generateDailyCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

/**
 * Format date for display
 */
export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}

/**
 * Format date and time
 */
export function formatDateTime(date: Date | string): string {
  const d = new Date(date);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/**
 * Calculate percentage growth
 */
export function calculateGrowth(current: number, previous: number): number {
  if (previous === 0) return 100;
  return Math.round(((current - previous) / previous) * 100);
}




