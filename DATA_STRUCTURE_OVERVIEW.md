# 🗂️ Lewis Loyalty System - Data Structure Overview

## System Architecture & Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                        LEWIS LOYALTY SYSTEM                         │
└─────────────────────────────────────────────────────────────────────┘

                           ┌──────────────┐
                           │  SUPER ADMIN │
                           │   (2 users)  │
                           └──────┬───────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │   Manages All Stores      │
                    │   & System Settings       │
                    └─────────────┬─────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
   ┌────▼────┐              ┌────▼────┐              ┌────▼────┐
   │ STORE 1 │              │ STORE 2 │    ...       │ STORE 15│
   │  Bole   │              │ Piassa  │              │  Adama  │
   └────┬────┘              └────┬────┘              └────┬────┘
        │                         │                         │
   ┌────▼────┐              ┌────▼────┐              ┌────▼────┐
   │ ADMIN 1 │              │ ADMIN 2 │    ...       │   None  │
   └─────────┘              └─────────┘              └─────────┘
        │                         │                         │
   ┌────▼────┐              ┌────▼────┐              ┌────▼────┐
   │ REWARD  │              │ REWARD  │              │ REWARD  │
   │  RULE   │              │  RULE   │              │  RULE   │
   │ 3 visits│              │ 5 visits│              │    -    │
   └────┬────┘              └────┬────┘              └────┬────┘
        │                         │                         │
        └─────────────┬───────────┴─────────────────────────┘
                      │
              ┌───────▼────────┐
              │   CUSTOMERS    │
              │   (100 total)  │
              └───────┬────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
   ┌────▼────┐   ┌───▼────┐   ┌───▼────┐
   │ VISITS  │   │ VISITS │   │ VISITS │
   │  ~900   │   │  ~900  │   │  ~900  │
   └────┬────┘   └────┬───┘   └────┬───┘
        │             │             │
        └─────────────┼─────────────┘
                      │
              ┌───────▼────────┐
              │    REWARDS     │
              │   (~100 total) │
              └────────────────┘
```

## 📊 Database Collections & Relationships

### 1️⃣ SystemUser Collection
```javascript
{
  _id: ObjectId,
  name: "Super Administrator",
  email: "admin@lewisloyalty.com",
  passwordHash: "bcrypt_hash...",
  role: "superadmin" | "admin",
  storeId: ObjectId,           // Only for admins
  isActive: true,
  lastLogin: Date,
  createdAt: Date,
  updatedAt: Date
}
```
**Count**: 15 (2 superadmins + 13 admins)
**Relationships**: 
- Admin → Store (one-to-one)

### 2️⃣ Store Collection
```javascript
{
  _id: ObjectId,
  name: "Lewis Coffee - Bole",
  address: "123 Bole Road, Addis Ababa",
  lat: 9.0320,
  lng: 38.7469,
  adminId: ObjectId,           // Ref: SystemUser
  qrToken: "hmac_sha256_hash...",
  qrUrl: "/visit?storeId=...&token=...",
  qrExpiresAt: Date,           // Midnight UTC
  isActive: true,
  createdAt: Date,
  updatedAt: Date
}
```
**Count**: 15 (13 active, 2 inactive)
**Relationships**:
- Store ← Admin (one-to-one)
- Store → RewardRule (one-to-one)
- Store → Visits (one-to-many)
- Store → Rewards (one-to-many)

### 3️⃣ RewardRule Collection
```javascript
{
  _id: ObjectId,
  storeId: ObjectId,           // Ref: Store
  visitsNeeded: 5,             // 3, 4, 5, 6, 7, 8, or 10
  rewardValue: "Free Medium Coffee",
  isActive: true,
  createdAt: Date,
  updatedAt: Date
}
```
**Count**: 13 (one per active store)
**Relationships**:
- RewardRule → Store (many-to-one)

### 4️⃣ Customer Collection
```javascript
{
  _id: ObjectId,
  name: "Abebe Bekele",
  phone: "+251911234567",      // Unique identifier
  totalVisits: 35,             // Aggregate count
  lastVisit: Date,
  createdAt: Date,
  updatedAt: Date
}
```
**Count**: 100
**Distribution**:
- Very Frequent (10): 30-60 visits each
- Frequent (25): 12-27 visits each
- Regular (40): 5-12 visits each
- Occasional (25): 1-3 visits each

**Relationships**:
- Customer → Visits (one-to-many)
- Customer → Rewards (one-to-many)

### 5️⃣ Visit Collection
```javascript
{
  _id: ObjectId,
  customerId: ObjectId,        // Ref: Customer
  storeId: ObjectId,           // Ref: Store
  timestamp: Date,             // Visit date/time
  rewardEarned: false,         // true if reward issued
  // Indexed on customerId, storeId, timestamp
}
```
**Count**: ~900
**Distribution**:
- Last 7 days: ~65 visits
- Last 30 days: ~315 visits
- Last 90 days: ~900 visits

**Temporal Pattern**:
```
Day 0 (90 days ago)  →  Today
     ▁▂▃▄▅▆▇█████
```

**Relationships**:
- Visit → Customer (many-to-one)
- Visit → Store (many-to-one)

### 6️⃣ Reward Collection
```javascript
{
  _id: ObjectId,
  customerId: ObjectId,        // Ref: Customer
  storeId: ObjectId,           // Ref: Store
  code: "LEWIS1729XXX",        // Unique redemption code
  rewardType: "Free Medium Coffee",
  issuedAt: Date,
  expiresAt: Date,             // issuedAt + 30 days
  status: "unused" | "used",
  usedAt: Date,                // Only if status = "used"
}
```
**Count**: ~100
**Distribution**:
- Unused: ~33 (33%)
- Used: ~60 (60%)
- Expired (unused): ~15 (15%)

**Relationships**:
- Reward → Customer (many-to-one)
- Reward → Store (many-to-one)

## 🔗 Relationship Diagram

```
┌──────────────┐
│ SystemUser   │
│              │◄─────────┐
│ role:        │          │
│ - superadmin │          │ adminId
│ - admin      │          │
└──────────────┘          │
                          │
┌──────────────┐     ┌────┴────────┐      ┌──────────────┐
│ RewardRule   │────►│   Store     │◄─────│   Visit      │
│              │     │             │      │              │
│ visitsNeeded │     │ qrToken     │      │ timestamp    │
│ rewardValue  │     │ qrExpiresAt │◄───┐ │ rewardEarned │
└──────────────┘     └─────────────┘    │ └──────┬───────┘
                                        │        │
                     ┌──────────────┐   │        │ customerId
                     │   Reward     │───┘        │
                     │              │            │
                     │ code         │◄───────────┤
                     │ status       │            │
                     │ expiresAt    │            │
                     └──────┬───────┘            │
                            │                    │
                            │ customerId         │
                            │                    │
                     ┌──────▼────────────────────▼──┐
                     │        Customer              │
                     │                              │
                     │ phone (unique)               │
                     │ totalVisits (calculated)     │
                     └──────────────────────────────┘
```

## 🔄 Data Flow: Customer Visit

```
1. Customer Scans QR Code
   └─► QR contains: storeId + token + date

2. System Validates QR
   └─► Check: Store exists, token valid, not expired

3. Customer Identification
   ├─► Phone number lookup in Customer collection
   │   ├─► Found: Retrieve customer
   │   └─► Not Found: Create new customer
   
4. Duplicate Check
   └─► Check Visit collection for same customer in last 24h
       ├─► Duplicate: Reject with error
       └─► Allowed: Continue

5. Create Visit Record
   └─► Insert into Visit collection
       ├─► customerId
       ├─► storeId
       ├─► timestamp: now
       └─► rewardEarned: false (initially)

6. Check Reward Eligibility
   ├─► Get RewardRule for this store
   ├─► Count customer's visits to THIS store
   └─► If (visitCount % visitsNeeded === 0):
       └─► Reward earned!

7. Create Reward (if eligible)
   └─► Insert into Reward collection
       ├─► Generate unique code
       ├─► Set expiresAt = now + 30 days
       ├─► Update visit.rewardEarned = true
       └─► Send WhatsApp notification (optional)

8. Update Customer
   └─► Increment totalVisits
   └─► Update lastVisit

9. Return Success Response
   └─► Visit count, reward info, progress
```

## 📈 Key Metrics & Calculations

### Customer Activity
```javascript
// Active customers (visited in last 30 days)
activeCustomers = Customer.find({
  lastVisit: { $gte: thirtyDaysAgo }
}).count()

// Average visits per customer
avgVisits = totalVisits / totalCustomers
```

### Store Performance
```javascript
// Visits per store
Visit.aggregate([
  { $group: { 
      _id: "$storeId", 
      visitCount: { $sum: 1 } 
  }},
  { $sort: { visitCount: -1 }}
])

// Top stores
// → Typically Bole, Piassa, Meskel Square lead
```

### Reward Analytics
```javascript
// Redemption rate
redemptionRate = usedRewards / totalRewards * 100
// → ~60% in comprehensive seed

// Expiration rate
expirationRate = expiredRewards / totalRewards * 100
// → ~15% in comprehensive seed

// Pending redemptions
pendingRedemptions = Reward.find({ 
  status: "unused",
  expiresAt: { $gt: now }
}).count()
```

### Visit Trends
```javascript
// Daily visits (last 7 days)
Visit.aggregate([
  { $match: { timestamp: { $gte: sevenDaysAgo }}},
  { $group: {
      _id: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" }},
      visits: { $sum: 1 }
  }},
  { $sort: { _id: 1 }}
])
// → Average ~9 visits/day
```

## 🎯 Indexes for Performance

```javascript
// Automatic indexes
SystemUser: { email: 1, role: 1 }
Store: { qrToken: 1, qrExpiresAt: 1, isActive: 1 }
Customer: { phone: 1 } // unique
RewardRule: { storeId: 1 }
Visit: { customerId: 1, timestamp: -1 }
Visit: { storeId: 1, timestamp: -1 }
Reward: { customerId: 1 }
Reward: { code: 1 } // unique
```

## 💾 Storage Estimates

```
Collection        Documents    Avg Size    Total Size
─────────────────────────────────────────────────────
SystemUser        15           ~300B       ~4.5 KB
Store             15           ~500B       ~7.5 KB
RewardRule        13           ~200B       ~2.6 KB
Customer          100          ~200B       ~20 KB
Visit             900          ~150B       ~135 KB
Reward            100          ~250B       ~25 KB
─────────────────────────────────────────────────────
TOTAL             1,143                    ~195 KB (data)
                                           ~3-5 MB (with indexes)
```

## 🔐 Security Considerations

### Authentication
- JWT tokens (24h expiry)
- HTTP-only cookies
- bcrypt password hashing (12 rounds)

### QR Code Security
- HMAC-SHA256 signature
- Daily rotation
- Server-side validation only
- No sensitive data in QR

### Data Access
- Role-based permissions
- Admin scoped to specific store
- Customer data accessed only by phone

## 🚀 Scalability Notes

### Current Seed (Development)
```
Customers:  100
Visits:     900
Stores:     15
```

### Production Estimates (1 year)
```
Customers:  10,000+
Visits:     100,000+
Stores:     50+
Rewards:    10,000+

Storage:    ~50-100 MB
Query time: <100ms (with indexes)
```

### Optimization Strategies
1. **Compound indexes** on frequent queries
2. **Aggregation pipelines** for analytics
3. **Caching** for store/reward rules
4. **Archive old visits** (> 1 year)
5. **Sharding** by storeId for multi-region

---

**📚 Related Documentation**
- [SEED_DATA_GUIDE.md](./SEED_DATA_GUIDE.md) - How to use seed data
- [COMPREHENSIVE_SEED_SUMMARY.md](./COMPREHENSIVE_SEED_SUMMARY.md) - What was created
- [README.md](./README.md) - Main project documentation







