# 🌱 Seed Data Quick Reference

## Commands

```bash
# Comprehensive seed (RECOMMENDED)
npm run seed:comprehensive
npm run reset-db:full          # Clear + Comprehensive

# Basic seed
npm run seed
npm run reset-db               # Clear + Basic

# Super admin only
npm run seed:super
```

## 🔐 Login Credentials (All passwords: `admin123`)

### Super Admins
- `admin@lewisloyalty.com`
- `manager@lewisloyalty.com`

### Store Admins
- `admin1@lewisloyalty.com` → Lewis Coffee - Bole
- `admin2@lewisloyalty.com` → Lewis Coffee - Piassa
- `admin3@lewisloyalty.com` → Lewis Coffee - Meskel Square
- ... (admin4 through admin13)

### Test Customers
Check console output after seeding for sample phone numbers.

## 📊 Data Generated (Comprehensive)

| Type | Count | Notes |
|------|-------|-------|
| Super Admins | 2 | System access |
| Stores | 15 | 13 active, 2 inactive |
| Store Admins | 13 | One per active store |
| Customers | 100 | Ethiopian names |
| Visits | ~1,500-2,000 | 90-day history |
| Rewards | ~200-300 | Mixed status |
| Reward Rules | 15 | Varied configs (3-10 visits) |

## 🏪 Store Locations

### Addis Ababa
Bole • Piassa • Meskel Square • CMC • Kazanchis • Sarbet • 22 Mazoria • Aware • Megenagna • Mexico

### Other Cities
Bahir Dar • Hawassa • Mekelle • Dire Dawa* • Adama*

*Inactive stores for testing

## 🎁 Reward Configurations

| Visits | Reward |
|--------|--------|
| 3 | Free Small Coffee |
| 4 | Free Cappuccino |
| 5 | Free Medium Coffee / 50% Off |
| 6 | Free Latte + Cake |
| 7 | Free Large Coffee + Pastry |
| 8 | Lewis Gold Card (10% Always) |
| 10 | Free Coffee for a Week |

## 👥 Customer Distribution

- **10%** Very Frequent (30-60 visits)
- **25%** Frequent (12-27 visits)
- **40%** Regular (5-12 visits)
- **25%** Occasional (1-3 visits)

## 🧪 Test Scenarios

✅ View analytics with real data
✅ Test customer journey (existing & new)
✅ Test reward calculation at various thresholds
✅ Test admin dashboards with actual visits
✅ Test inactive store filtering
✅ Test expired reward handling
✅ Test multi-store customer visits
✅ Test QR code regeneration

## ⏱️ Seed Time

- **Basic Seed**: ~5-10 seconds
- **Comprehensive Seed**: ~30-60 seconds (progress shown)

## 🔧 Quick Setup

```bash
# 1. Start MongoDB
docker-compose up -d

# 2. Seed database
npm run seed:comprehensive

# 3. Start app
npm run dev

# 4. Open browser
http://localhost:3000/login

# 5. Login with admin@lewisloyalty.com / admin123
```

## 📝 Environment Check

Ensure `.env.local` has:
```env
MONGODB_URI=mongodb://admin:password123@localhost:27020/lewis-loyalty?authSource=admin
JWT_SECRET=your-jwt-secret
APP_SECRET=your-app-secret-for-qr-tokens
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

## 🎯 Access URLs

- **Login**: http://localhost:3000/login
- **Super Admin Dashboard**: http://localhost:3000/dashboard/super
- **Store Admin Dashboard**: http://localhost:3000/dashboard/admin
- **Customer Visit**: http://localhost:3000/visit?storeId=[id]&token=[token]
- **MongoDB UI**: http://localhost:8081 (admin/admin)

---

For detailed information, see [SEED_DATA_GUIDE.md](./SEED_DATA_GUIDE.md)







