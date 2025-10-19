import { Client, LocalAuth } from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';

let client: Client | null = null;
let isReady = false;

export function initializeWhatsApp() {
  if (client) return client;

  client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    },
  });

  client.on('qr', (qr) => {
    console.log('WhatsApp QR Code:');
    qrcode.generate(qr, { small: true });
  });

  client.on('ready', () => {
    console.log('WhatsApp client is ready!');
    isReady = true;
  });

  client.on('auth_failure', (msg) => {
    console.error('WhatsApp authentication failed:', msg);
  });

  client.initialize();

  return client;
}

export async function sendWhatsAppMessage(phone: string, message: string): Promise<boolean> {
  if (!client || !isReady) {
    console.error('WhatsApp client not initialized or not ready');
    return false;
  }

  try {
    // Format phone number for WhatsApp (remove + and add @c.us)
    const formattedPhone = phone.replace('+', '') + '@c.us';

    await client.sendMessage(formattedPhone, message);
    console.log(`WhatsApp message sent to ${phone}`);
    return true;
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    return false;
  }
}

export function getWhatsAppStatus() {
  return {
    initialized: !!client,
    ready: isReady,
  };
}

export async function sendWelcomeMessage(phone: string, name: string): Promise<boolean> {
  const message = `Welcome to Lewis Loyalty, ${name}! 🎉\n\nThank you for joining our loyalty program. Start earning rewards with every visit!`;
  return sendWhatsAppMessage(phone, message);
}

export async function sendVisitMessage(phone: string, name: string, visitCount: number): Promise<boolean> {
  const message = `Hi ${name}! 👋\n\nThank you for your visit! This is visit #${visitCount}. Keep visiting to earn more rewards!`;
  return sendWhatsAppMessage(phone, message);
}

export async function sendRewardMessage(phone: string, name: string, rewardType: string): Promise<boolean> {
  const message = `Congratulations ${name}! 🎁\n\nYou've earned a reward: ${rewardType}\n\nShow this message at our store to redeem your reward!`;
  return sendWhatsAppMessage(phone, message);
}
