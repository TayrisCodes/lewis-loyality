import QRCode from "qrcode";
import { generateToken } from "./auth";

export interface QRData {
  storeId: string;
  storeName: string;
  token: string;
  generatedAt: number;
}

/**
 * Generate QR code data URL for a store
 */
export async function generateQRCode(
  storeId: string,
  storeName: string
): Promise<{ qrDataURL: string; token: string }> {
  // Generate a token for validation
  const token = generateToken({
    userId: storeId,
    email: `store-${storeId}@qr`,
    role: "admin",
    storeId,
  });

  const qrData: QRData = {
    storeId,
    storeName,
    token,
    generatedAt: Date.now(),
  };

  // Convert to JSON and generate QR code
  const dataString = JSON.stringify(qrData);
  const qrDataURL = await QRCode.toDataURL(dataString, {
    errorCorrectionLevel: "H",
    type: "image/png",
    width: 500,
    margin: 2,
    color: {
      dark: "#1A237E", // Navy
      light: "#FFFFFF",
    },
  });

  return { qrDataURL, token };
}

/**
 * Parse QR code data
 */
export function parseQRData(qrString: string): QRData | null {
  try {
    const data = JSON.parse(qrString);
    if (data.storeId && data.token) {
      return data as QRData;
    }
    return null;
  } catch (error) {
    console.error("Failed to parse QR data:", error);
    return null;
  }
}

/**
 * Validate QR code (check if not expired - 30 days)
 */
export function validateQRCode(qrData: QRData): boolean {
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  const now = Date.now();
  const age = now - qrData.generatedAt;
  return age < thirtyDays;
}




