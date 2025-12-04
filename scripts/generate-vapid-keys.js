/**
 * Generate VAPID keys for push notifications
 * 
 * Run with: node scripts/generate-vapid-keys.js
 */

const webpush = require('web-push');

console.log('Generating VAPID keys for push notifications...\n');

const vapidKeys = webpush.generateVAPIDKeys();

console.log('✅ VAPID keys generated successfully!\n');
console.log('Add these to your .env file:\n');
console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log(`VAPID_SUBJECT=mailto:contact@lewisretails.com\n`);
console.log('Also add this to your .env.local or .env.production for the frontend:\n');
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}\n`);
console.log('⚠️  Keep the private key secure! Never commit it to version control.');




