import { NextResponse } from 'next/server';
import Store from '@/models/Store';
import { requireAdmin } from '@/lib/auth';
import { generateQRToken, generateQRImage, generateQRUrl } from '@/lib/qr-generator';

export async function POST() {
  try {
    const user = await requireAdmin();

    const store = await Store.findById(user.storeId);
    if (!store) {
      return NextResponse.json(
        { error: 'Store not found' },
        { status: 404 }
      );
    }

    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    tomorrow.setHours(0, 0, 0, 0);

    const storeId = (store._id as any).toString();
    const token = generateQRToken(storeId, today);
    const qrUrl = generateQRUrl(storeId, token, today);
    const qrImageUrl = await generateQRImage(token, storeId, today);

    await Store.findByIdAndUpdate(store._id, {
      qrToken: token,
      qrUrl,
      qrExpiresAt: tomorrow,
    });

    return NextResponse.json({
      message: 'QR code regenerated successfully',
      qrToken: token,
      qrUrl,
      qrExpiresAt: tomorrow,
    });
  } catch (error) {
    console.error('Generate QR error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}