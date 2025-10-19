# Comprehensive Seed Data Guide

This guide explains the comprehensive seed data available in the Lewis Loyalty System and how to use it for development and testing.

## 📦 What's Included

### Seed Scripts Available

1. **`seed-super-admin.ts`** - Minimal seeding (just super admin)
2. **`seed-complete.ts`** - Basic seeding with sample data
3. **`seed-comprehensive.ts`** - **NEW!** Full realistic data for development & demo

## 🚀 Quick Start

### Option 1: Comprehensive Seed (Recommended for Development)

```bash
# Clear database and seed with comprehensive data
npm run reset-db:full

# Or just run comprehensive seed
npm run seed:comprehensive
```

### Option 2: Basic Seed

```bash
# Clear database and seed with basic data
npm run reset-db

# Or just run basic seed
npm run seed
```

### Option 3: Super Admin Only

```bash
npm run seed:super
```

## 📊 Comprehensive Seed Data Details

### Statistics

The comprehensive seed generates:

- **2 Super Admins** - System administrators
- **15 Stores** - Across Addis Ababa and major Ethiopian cities
  - 13 Active stores
  - 2 Inactive stores (for testing)
- **13 Store Admins** - One per active store
- **100 Customers** - Realistic Ethiopian names
- **~1,500-2,000 Visits** - Spanning 90 days with realistic patterns
- **~200-300 Rewards** - Mix of used, unused, and expired
- **15 Reward Rules** - Varied configurations per store

### Store Locations

#### Addis Ababa (10 stores)
1. Lewis Coffee - Bole
2. Lewis Coffee - Piassa
3. Lewis Coffee - Meskel Square
4. Lewis Coffee - CMC
5. Lewis Coffee - Kazanchis
6. Lewis Coffee - Sarbet
7. Lewis Coffee - 22 Mazoria
8. Lewis Coffee - Aware
9. Lewis Coffee - Megenagna
10. Lewis Coffee - Mexico

#### Other Cities (5 stores)
11. Lewis Coffee - Bahir Dar
12. Lewis Coffee - Hawassa
13. Lewis Coffee - Mekelle
14. Lewis Coffee - Dire Dawa (Inactive)
15. Lewis Coffee - Adama (Inactive)

### Customer Visit Patterns

The seed creates realistic customer behaviors:

- **10% Very Frequent** - 30-60 visits (3-5 times/week)
- **25% Frequent** - 12-27 visits (1-2 times/week)
- **40% Regular** - 5-12 visits (2-4 times/month)
- **25% Occasional** - 1-3 visits (rare visitors)

#### Additional Realism
- Customers have 1-2 favorite stores (70% loyal to one store)
- 80% of visits are to favorite stores
- Visit dates span last 90 days with natural spacing
- Recent visits weighted toward present

### Reward Rules Variations

Different stores have different reward configurations:

| Visits Needed | Reward Type |
|--------------|-------------|
| 3 | Free Small Coffee |
| 4 | Free Cappuccino |
| 5 | Free Medium Coffee |
| 5 | 50% Off Next Purchase |
| 6 | Free Latte + Cake |
| 7 | Free Large Coffee + Pastry |
| 8 | Lewis Gold Card (10% Always) |
| 10 | Free Coffee for a Week |

### Reward Status Distribution

- **~30% Used** - Older rewards (>7 days) have 70% usage rate
- **~60% Unused** - Recent rewards have lower usage
- **~10% Expired** - Some rewards past 30-day expiration

## 🔐 Login Credentials

### Super Admins

| Email | Password | Role |
|-------|----------|------|
| admin@lewisloyalty.com | admin123 | Super Administrator |
| manager@lewisloyalty.com | admin123 | System Manager |

### Store Admins

All store admins use password: **admin123**

| Email | Store |
|-------|-------|
| admin1@lewisloyalty.com | Lewis Coffee - Bole |
| admin2@lewisloyalty.com | Lewis Coffee - Piassa |
| admin3@lewisloyalty.com | Lewis Coffee - Meskel Square |
| admin4@lewisloyalty.com | Lewis Coffee - CMC |
| admin5@lewisloyalty.com | Lewis Coffee - Kazanchis |
| ... | ... |
| admin13@lewisloyalty.com | Lewis Coffee - Mekelle |

### Sample Customers

Phone numbers follow pattern: `+251[prefix][7-digits]`

Example customers will be displayed after seeding completes.

## 🧪 Testing Scenarios

### 1. Analytics Testing

With 90 days of data and ~2000 visits:
- Test daily visit charts
- Test top stores ranking
- Test customer activity trends
- Test reward redemption rates

### 2. Customer Journey Testing

Use any customer phone number from seed output:
```bash
# After running seed, you'll see:
# Sample Customers (for testing):
#   1. Name:  Abebe Bekele
#      Phone: +25191XXXXXXX
#      Visits: 45
```

Then:
1. Visit `/visit?storeId=[storeId]&token=[token]`
2. Enter the customer's phone
3. Test existing customer flow
4. Record new visit and check reward eligibility

### 3. Admin Dashboard Testing

Login as store admin to test:
- View real visit history
- See customer lists with actual data
- Test QR regeneration
- View reward issuance stats
- Filter and sort tables

### 4. Super Admin Testing

Login as super admin to test:
- View system-wide analytics with real charts
- Manage multiple stores
- See active vs inactive stores
- Test admin assignment
- View top performing stores

### 5. Edge Cases

The seed includes:
- **Inactive stores** - Test filtering/permissions
- **Expired rewards** - Test expiration logic
- **Multi-store customers** - Test cross-store visits
- **High-frequency visitors** - Test reward calculation
- **Zero-visit customers** - Test empty states

## 🔄 Workflow Examples

### Development Workflow

```bash
# 1. Start fresh with comprehensive data
npm run reset-db:full

# 2. Start development server
npm run dev

# 3. Start cron jobs (optional, for QR regeneration testing)
npm run cron

# 4. Test features with realistic data
```

### Demo Preparation

```bash
# 1. Ensure MongoDB is running
docker-compose up -d

# 2. Seed with comprehensive data
npm run seed:comprehensive

# 3. Start application
npm run dev

# 4. Open http://localhost:3000
# 5. Login with super admin credentials
```

### Testing New Features

```bash
# If you need clean slate
npm run clear-db

# For basic testing
npm run seed

# For comprehensive testing
npm run seed:comprehensive
```

## 📈 Expected Database Size

After comprehensive seeding:

- **Collections**: 6 (User, Store, Customer, Visit, Reward, RewardRule)
- **Documents**: ~2,300-2,500
- **Disk Size**: ~2-5 MB (with indexes)
- **Seed Time**: ~30-60 seconds

## 🎯 Use Cases

### For Developers

- **Frontend Development**: Test UI with real data volumes
- **Performance Testing**: Query optimization with realistic dataset
- **Edge Case Testing**: Various customer behaviors included
- **Integration Testing**: Complete workflows with actual data

### For Demos

- **Client Presentations**: Show realistic analytics
- **Feature Showcases**: Demonstrate with actual usage patterns
- **Training**: Use for staff training with real scenarios

### For QA

- **Regression Testing**: Consistent dataset for testing
- **Load Testing**: Base data for performance tests
- **User Acceptance Testing**: Realistic scenarios

## 🔧 Customization

To customize the seed data, edit `scripts/seed-comprehensive.ts`:

```typescript
// Adjust number of customers
const numCustomers = 100; // Change this

// Adjust date range
const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // Change days

// Adjust customer type distribution
const customerTypes = {
  veryFrequent: Math.floor(customers.length * 0.1), // Adjust percentages
  frequent: Math.floor(customers.length * 0.25),
  regular: Math.floor(customers.length * 0.40),
  occasional: Math.floor(customers.length * 0.25),
};
```

## 🐛 Troubleshooting

### Seed Script Fails

```bash
# Check MongoDB is running
docker-compose ps

# Check environment variables
cat .env.local

# Verify required variables are set:
# - MONGODB_URI
# - JWT_SECRET
# - APP_SECRET
```

### Slow Seeding

The comprehensive seed takes 30-60 seconds due to:
- 100 customers
- ~2000 visits with timestamp calculations
- ~300 rewards with status logic
- QR code image generation for 15 stores

This is normal. You'll see progress indicators.

### Out of Memory

If seeding fails with memory error:
```bash
# Reduce customer count in script
# Or increase Node memory:
NODE_OPTIONS=--max-old-space-size=4096 npm run seed:comprehensive
```

## 📝 Notes

- All passwords are `admin123` for development convenience
- Customer phone numbers are sequential for easy testing
- Visit timestamps are randomly distributed for realism
- Reward usage is probabilistic (mimics real behavior)
- QR codes are valid for 24 hours from seed time

## 🎉 What's Next?

After seeding:

1. **Login as Super Admin**: View system analytics
2. **Login as Store Admin**: See store-specific data
3. **Test Customer Flow**: Use sample phone numbers
4. **Explore Features**: All features work with realistic data
5. **Build New Features**: Test against comprehensive dataset

---

**Happy Development! 🚀**







