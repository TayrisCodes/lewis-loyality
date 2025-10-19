import cron from 'node-cron';
import regenerateQRCodes from './daily-qr-regeneration';

export function startCronJobs() {
  // Run daily at 00:00 UTC (midnight)
  cron.schedule('0 0 * * *', async () => {
    console.log('Running daily QR regeneration...');
    try {
      await regenerateQRCodes();
      console.log('Daily QR regeneration completed successfully');
    } catch (error) {
      console.error('Error in daily QR regeneration:', error);
    }
  }, {
    timezone: 'UTC'
  });

  console.log('Cron jobs started - QR regeneration scheduled for 00:00 UTC daily');
}

// For manual testing
if (require.main === module) {
  console.log('Starting cron jobs...');
  startCronJobs();
}