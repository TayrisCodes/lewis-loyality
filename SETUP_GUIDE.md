# Lewis Loyalty System - Quick Setup Guide

## 🚀 Quick Start (5 minutes)

### Prerequisites
- Node.js 18+ installed
- Docker and Docker Compose installed (for MongoDB)

### Step 1: Clone and Install
```bash
cd /path/to/lewis-loyalty
npm install
```

### Step 2: Environment Setup
Create `.env.local` file in the project root:
```bash
cp .env.example .env.local
```

The default values in `.env.local` work with the docker-compose setup:
```env
MONGODB_URI=mongodb://admin:password123@localhost:27020/lewis-loyalty?authSource=admin
JWT_SECRET=lewis-loyalty-jwt-secret-2024-change-in-production
APP_SECRET=lewis-loyalty-qr-secret-2024-change-in-production
NEXT_PUBLIC_BASE_URL=http://localhost:3000
WHATSAPP_ENABLED=false
NODE_ENV=development
```

### Step 3: Start MongoDB
```bash
docker-compose up -d
```

This will start:
- MongoDB on port 27020
- Mongo Express (Web UI) on port 8081

**Access Mongo Express**: http://localhost:8081
- Username: `admin`
- Password: `admin`

### Step 4: Seed Super Admin
```bash
npx tsx scripts/seed-super-admin.ts
```

This creates the initial super admin account:
- **Email**: `admin@lewisloyalty.com`
- **Password**: `admin123`

### Step 5: Start Development Server
```bash
npm run dev
```

The application will be available at: http://localhost:3000

### Step 6: Login as Super Admin
1. Go to http://localhost:3000/login
2. Enter credentials:
   - Email: `admin@lewisloyalty.com`
   - Password: `admin123`
3. You'll be redirected to the Super Admin Dashboard

## 📋 What to Do Next

### As Super Admin:

1. **Create a Store**:
   - Click "Create Store" button
   - Enter store name and address
   - A QR code will be automatically generated

2. **Create a Store Admin**:
   - Click "Create Admin" button
   - Enter admin details and assign to a store
   - The admin can now login and manage their store

### As Store Admin:

1. **Login**:
   - Use the credentials created by super admin
   - You'll be redirected to Store Dashboard

2. **Display QR Code**:
   - View the daily QR code on your dashboard
   - Click "Print QR" to print it for display in store

3. **Monitor Visits**:
   - See real-time customer visits
   - Track reward redemptions

### As Customer:

1. **Scan QR Code**:
   - Scan the store's QR code with your phone camera
   - Or manually visit: http://localhost:3000/visit?storeId=XXX&token=YYY

2. **Register (First Time)**:
   - Enter your name and phone number
   - Your visit is automatically recorded

3. **Return Visits**:
   - Scan the QR code again
   - You'll be recognized automatically
   - Earn rewards after 5 visits (configurable)

## 🔄 Daily QR Code Regeneration

### Automatic (Production)
Start the cron job in a separate terminal or as a background service:
```bash
npx tsx scripts/cron-job.ts
```

This will automatically regenerate all store QR codes daily at 00:00 UTC.

### Manual (Development)
Regenerate QR codes manually:
```bash
npx tsx scripts/daily-qr-regeneration.ts
```

Or use the "Regenerate QR" button in the Super Admin or Store Admin dashboard.

## 🧪 Testing the Complete Flow

### Test Store Creation:
1. Login as super admin
2. Create store "Test Store" at "123 Main St"
3. Create admin user for the store
4. Logout

### Test Admin Functions:
1. Login as store admin
2. View and print the QR code
3. Keep dashboard open to see visits

### Test Customer Journey:
1. On your phone (or another browser):
   - Scan the printed QR code
   - Register as a new customer
   - See success screen
2. Visit 4 more times (scan QR code each time)
3. On the 5th visit, you'll earn a reward!
4. Check WhatsApp for notification (if enabled)

## 📱 Customer Experience Flow

```
┌─────────────────┐
│  Scan QR Code   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Validate Token │
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌──────────────┐
│ Existing        │─Yes─▶│ Welcome Back │
│ Customer?       │      └──────┬───────┘
└────────┬────────┘             │
         │                      │
         No                     │
         │                      │
         ▼                      │
┌─────────────────┐             │
│ Register Form   │             │
└────────┬────────┘             │
         │                      │
         ▼                      │
┌─────────────────┐             │
│ Record Visit    │◀────────────┘
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Check Rewards   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Success Screen  │
│ (with animation)│
└─────────────────┘
```

## 🛠️ Useful Commands

### Database Management
```bash
# Start MongoDB
docker-compose up -d

# Stop MongoDB
docker-compose down

# View MongoDB logs
docker-compose logs -f mongodb

# Reset database (WARNING: Deletes all data)
npm run clear-db
npm run seed
```

### Development
```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

### Scripts
```bash
# Create super admin
npx tsx scripts/seed-super-admin.ts

# Regenerate all QR codes
npx tsx scripts/daily-qr-regeneration.ts

# Start cron jobs
npx tsx scripts/cron-job.ts
```

## 🐛 Troubleshooting

### MongoDB Connection Issues
**Error**: `MongoServerError: Authentication failed`

**Solution**: Make sure MongoDB is running and credentials match:
```bash
docker-compose down
docker-compose up -d
```

### QR Code Images Not Showing
**Error**: QR code images return 404

**Solution**: Check that `public/qrcodes` directory exists:
```bash
mkdir -p public/qrcodes
```

Then regenerate QR codes:
```bash
npx tsx scripts/daily-qr-regeneration.ts
```

### Login Redirect Not Working
**Issue**: After login, redirected to wrong dashboard

**Solution**: Clear browser localStorage and cookies:
```javascript
// Open browser console and run:
localStorage.clear();
// Then try logging in again
```

### Seed Script Fails
**Error**: `Super admin already exists`

**Solution**: This is expected if you've already seeded. To reset:
1. Delete the user from MongoDB
2. Or use Mongo Express to clear the users collection
3. Run seed script again

## 📊 Port Summary

| Service | Port | URL |
|---------|------|-----|
| Next.js App | 3000 | http://localhost:3000 |
| MongoDB | 27020 | mongodb://localhost:27020 |
| Mongo Express | 8081 | http://localhost:8081 |

## 🔐 Default Credentials

### Super Admin
- Email: `admin@lewisloyalty.com`
- Password: `admin123`

### Mongo Express
- Username: `admin`
- Password: `admin`

### MongoDB
- Username: `admin`
- Password: `password123`

**⚠️ IMPORTANT**: Change all default passwords before deploying to production!

## 🎯 Next Steps

1. ✅ Complete setup steps above
2. ✅ Test complete customer flow
3. ✅ Create your first real store
4. ✅ Customize reward rules
5. ✅ Set up production environment
6. ✅ Change all default passwords
7. ✅ Enable WhatsApp notifications (optional)
8. ✅ Deploy to production

## 📚 Additional Resources

- **Main README**: See `README.md` for detailed documentation
- **Implementation Review**: See `IMPLEMENTATION_REVIEW.md` for technical details
- **API Documentation**: See README.md API Endpoints section
- **Deployment Guide**: See `DEPLOYMENT.md`

---

**Need Help?** Check the troubleshooting section or review the implementation documentation.

**Ready for Production?** See `IMPLEMENTATION_REVIEW.md` for the deployment checklist.









