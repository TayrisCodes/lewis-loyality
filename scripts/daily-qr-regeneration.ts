import mongoose from 'mongoose';
import Store from '@/models/Store';
import { generateQRToken, generateQRImage, generateQRUrl } from '@/lib/qr-generator';

async function regenerateQRCodes() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);

    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    tomorrow.setHours(0, 0, 0, 0);

    const stores = await Store.find({ isActive: true });

    for (const store of stores) {
      const storeId = (store._id as mongoose.Types.ObjectId).toString();
      const token = generateQRToken(storeId, today);
      const qrUrl = generateQRUrl(storeId, token, today);
      const qrImageUrl = await generateQRImage(token, storeId, today);

      await Store.findByIdAndUpdate(store._id, {
        qrToken: token,
        qrUrl,
        qrExpiresAt: tomorrow,
      });

      console.log(`Regenerated QR for store: ${store.name}`);
    }

    console.log(`QR regeneration completed for ${stores.length} stores`);
  } catch (error) {
    console.error('Error regenerating QR codes:', error);
  } finally {
    await mongoose.disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  regenerateQRCodes();
}

export default regenerateQRCodes;