import crypto from 'crypto';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';

function getAppSecret(): string {
  const secret = process.env.APP_SECRET;
  if (!secret) {
    throw new Error('APP_SECRET environment variable is not set');
  }
  return secret;
}

function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
}

export function generateQRToken(storeId: string, date: string): string {
  const APP_SECRET = getAppSecret();
  const data = `${APP_SECRET}${storeId}${date}`;
  return crypto.createHmac('sha256', APP_SECRET).update(data).digest('hex');
}

export function generateQRUrl(storeId: string, token: string, date: string): string {
  const BASE_URL = getBaseUrl();
  return `${BASE_URL}/visit?storeId=${storeId}&token=${token}&date=${date}`;
}

export async function generateQRImage(token: string, storeId: string, date: string): Promise<string> {
  const qrData = generateQRUrl(storeId, token, date);
  const fileName = `${storeId}-${date}.png`;
  const filePath = path.join(process.cwd(), 'public', 'qrcodes', fileName);

  // Ensure directory exists
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Generate QR code image
  await QRCode.toFile(filePath, qrData, {
    width: 300,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF'
    }
  });

  return `/qrcodes/${fileName}`;
}

export function getQRImagePath(storeId: string, date: string): string {
  return path.join(process.cwd(), 'public', 'qrcodes', `${storeId}-${date}.png`);
}