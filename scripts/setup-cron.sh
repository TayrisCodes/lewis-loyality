#!/bin/bash

# Setup cron jobs for scheduled push notifications
# This script sets up cron jobs to send notifications every 3 days (motivation) and every 15 days (expiry reminder)

CRON_SECRET="${CRON_SECRET:-$(openssl rand -hex 32)}"
BASE_URL="${BASE_URL:-http://localhost:3015}"

echo "Setting up cron jobs for scheduled notifications..."
echo "CRON_SECRET: $CRON_SECRET"
echo "BASE_URL: $BASE_URL"

# Create crontab entry for motivation notifications (every 3 days at 10 AM)
(crontab -l 2>/dev/null | grep -v "motivation notifications"; echo "0 10 */3 * * curl -X POST \"$BASE_URL/api/cron/notifications?type=motivation&secret=$CRON_SECRET\" > /dev/null 2>&1") | crontab -

# Create crontab entry for expiry reminders (every 15 days at 11 AM)
(crontab -l 2>/dev/null | grep -v "expiry reminder notifications"; echo "0 11 */15 * * curl -X POST \"$BASE_URL/api/cron/notifications?type=expiry&secret=$CRON_SECRET\" > /dev/null 2>&1") | crontab -

# Also run daily check (at 9 AM) to send both if needed
(crontab -l 2>/dev/null | grep -v "daily notification check"; echo "0 9 * * * curl -X POST \"$BASE_URL/api/cron/notifications?type=all&secret=$CRON_SECRET\" > /dev/null 2>&1") | crontab -

echo "✅ Cron jobs set up successfully!"
echo ""
echo "Current crontab:"
crontab -l

echo ""
echo "⚠️  Add CRON_SECRET to your .env file:"
echo "CRON_SECRET=$CRON_SECRET"




