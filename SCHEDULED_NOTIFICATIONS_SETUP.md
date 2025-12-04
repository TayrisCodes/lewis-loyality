# Scheduled Push Notifications Setup

## ✅ Implementation Complete

Scheduled push notifications have been implemented with the following features:

### Notification Types

1. **Motivation Notifications** (Every 3 days)
   - Encourages customers to visit
   - Sends if customer hasn't visited in 3+ days
   - Message: "Visit Us Today! 🛒"

2. **Expiry Reminder Notifications** (Every 15 days)
   - Reminds customers about their visit period ending
   - Sends if 15 days or less remaining in period
   - Message: "⏰ Complete Your Mission!"
   - Shows remaining visits needed

---

## 🔧 Setup Instructions

### 1. Add VAPID Keys to Environment

The VAPID keys have been generated. Add them to your `.env.production` file:

```env
# VAPID Keys for Push Notifications
VAPID_PUBLIC_KEY=BHz_aVsngBwAXamAH0PKK0pbcF3_EbzA_mh77FPvppF8Vt4XNgcjaCS1HDwWvwxlCA8kC799LXEdeuU3p8uVyF4
VAPID_PRIVATE_KEY=SvmqMePNqxVkjqAThKxlQwRQhul9bxZjJot0jVoj_Rs
VAPID_SUBJECT=mailto:contact@lewisretails.com
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BHz_aVsngBwAXamAH0PKK0pbcF3_EbzA_mh77FPvppF8Vt4XNgcjaCS1HDwWvwxlCA8kC799LXEdeuU3p8uVyF4

# Cron Secret (Optional - for securing cron endpoints)
CRON_SECRET=your-secret-key-here
```

### 2. Docker Configuration

The VAPID keys have been added to `docker-compose.production.yml`. Make sure your `.env.production` file includes all the VAPID keys above.

### 3. Setup Cron Jobs

#### Option A: Using System Cron (Recommended)

1. SSH into your production server
2. Run the setup script:

```bash
cd /root/lewis-loyality
chmod +x scripts/setup-cron.sh
CRON_SECRET=$(openssl rand -hex 32) BASE_URL=http://localhost:3015 ./scripts/setup-cron.sh
```

3. The script will:
   - Set up motivation notifications (every 3 days at 10 AM)
   - Set up expiry reminders (every 15 days at 11 AM)
   - Set up daily check (every day at 9 AM)

#### Option B: Using External Cron Service

Use a service like:
- **cron-job.org** (free)
- **EasyCron** (free tier)
- **SetCronJob** (free tier)

Configure them to call:
- Motivation: `POST http://your-domain:3015/api/cron/notifications?type=motivation&secret=YOUR_SECRET`
- Expiry: `POST http://your-domain:3015/api/cron/notifications?type=expiry&secret=YOUR_SECRET`

Schedule:
- Motivation: Every 3 days
- Expiry: Every 15 days

#### Option C: Manual Testing

Test the notifications manually:

```bash
# Test motivation notifications
curl -X POST "http://localhost:3015/api/cron/notifications?type=motivation"

# Test expiry reminders
curl -X POST "http://localhost:3015/api/cron/notifications?type=expiry"

# Test all notifications
curl -X POST "http://localhost:3015/api/cron/notifications?type=all"
```

---

## 📋 API Endpoints

### POST /api/cron/notifications

Send scheduled notifications.

**Query Parameters:**
- `type` (optional): `motivation` | `expiry` | `all` (default: `all`)
- `secret` (optional): Secret key for authentication

**Response:**
```json
{
  "success": true,
  "motivation": 5,
  "expiryReminder": 3
}
```

---

## 🔄 How It Works

### Motivation Notifications (Every 3 Days)

1. System checks all customers with active push subscriptions
2. Calculates days since last visit
3. If ≥ 3 days, sends motivation notification
4. Respects customer notification preferences

### Expiry Reminder Notifications (Every 15 Days)

1. System checks all customers with active push subscriptions
2. Calculates reward period status
3. If period has ≤ 15 days remaining, sends reminder
4. Shows remaining visits needed to complete mission
5. Respects customer notification preferences

---

## 📝 Files Created

- ✅ `lib/scheduledNotifications.ts` - Scheduled notification logic
- ✅ `lib/rewardStatusHelper.ts` - Helper to get reward status
- ✅ `app/api/cron/notifications/route.ts` - Cron endpoint
- ✅ `scripts/setup-cron.sh` - Cron setup script
- ✅ `scripts/generate-vapid-keys.js` - VAPID key generator

---

## 🔐 Security

- Optional `CRON_SECRET` for securing cron endpoints
- Check notification preferences before sending
- Graceful error handling

---

## ✅ Testing Checklist

- [ ] VAPID keys added to environment
- [ ] Docker configuration updated
- [ ] Server restarted
- [ ] Test motivation notification manually
- [ ] Test expiry reminder manually
- [ ] Cron jobs configured
- [ ] Verify notifications are being sent

---

## 🚀 Next Steps

1. Add VAPID keys to `.env.production`
2. Update Docker with new environment variables
3. Restart Docker containers
4. Setup cron jobs
5. Test notifications
6. Monitor notification delivery

The scheduled notification system is ready! 🎉




