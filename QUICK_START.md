# ⚡ Lewis Loyalty - Quick Start Guide

## 🚀 Get Running in 5 Minutes

### Step 1: Start MongoDB
```bash
# Open a new terminal and run:
mongod --port 27020
```
Leave this terminal running.

### Step 2: Seed the Database
```bash
# In your project directory:
cd /home/blih/blih\ pro/liwis
npm run seed
```

Expected output:
```
🌱 Starting database seeding...
✅ Connected to MongoDB
✅ Created 3 stores
✅ Created 4 admins
✅ Created 10 customers
✅ Created ~70 visits
🎉 Database seeding completed successfully!
```

### Step 3: Start the Application
```bash
npm run dev
```

Open: **http://localhost:3000**

---

## 🎯 Try These Flows

### 1. Admin Dashboard
1. Go to http://localhost:3000
2. Login with:
   - Email: `superadmin@lewisloyalty.com`
   - Password: `admin123`
3. Explore the dashboard:
   - View metrics (customers, visits, rewards)
   - Check charts (area & pie charts)
   - See recent activity
   - Toggle dark mode

### 2. Customer Check-in
1. Click "Customer Scan" button (top-left on login page)
2. Or go directly to: http://localhost:3000/customer
3. Click "Check My Rewards" instead of scanning
4. Enter test phone: `0911234567`
5. See customer "Abebe Kebede" with visits and rewards!

### 3. Rewards Page
1. Go to http://localhost:3000/rewards
2. Enter phone: `0933456789`
3. View "Dawit Alemayehu"'s rewards and visit history

---

## 📱 Test Pages

| Page | URL | Description |
|------|-----|-------------|
| Landing | http://localhost:3000 | Redirects to login |
| Login | http://localhost:3000/login | Admin authentication |
| QR Scanner | http://localhost:3000/customer | Customer QR scanning |
| Rewards | http://localhost:3000/rewards | View personal rewards |
| Dashboard | http://localhost:3000/dashboard-v4 | Admin analytics |

---

## 👤 Test Accounts

### SuperAdmin (Full Access)
```
Email: superadmin@lewisloyalty.com
Password: admin123
Role: SuperAdmin (all stores)
```

### Store Admins (Store-Specific)
```
Email: admin1@lewisloyalty.com
Password: admin123
Store: Lewis Addis Ababa Branch

Email: admin2@lewisloyalty.com
Password: admin123
Store: Lewis Hawassa Branch

Email: admin3@lewisloyalty.com
Password: admin123
Store: Lewis Adama Branch
```

### Test Customers (No login needed)
```
Phone: 0911234567 - Abebe Kebede (multiple visits)
Phone: 0922345678 - Tigist Alemu
Phone: 0933456789 - Dawit Alemayehu (has rewards!)
Phone: 0944567890 - Hanna Bekele
```

---

## 🛠️ Development Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Seed/reset database
npm run seed

# Run linter
npm run lint
```

---

## 🐛 Troubleshooting

### "Cannot connect to MongoDB"
```bash
# Make sure MongoDB is running:
mongod --port 27020
```

### "Port 3000 already in use"
```bash
# Kill the process or use a different port:
PORT=3001 npm run dev
```

### "Module not found" errors
```bash
# Reinstall dependencies:
rm -rf node_modules package-lock.json
npm install
```

### Clear Next.js cache
```bash
rm -rf .next
npm run dev
```

---

## 📊 What You'll See

### Dashboard Metrics
- **Total Customers**: ~10
- **Total Visits**: ~70
- **Rewards Issued**: ~14
- **Active Stores**: 3

### Charts
- **Area Chart**: Visit trends over last 30 days
- **Pie Chart**: Visit distribution across stores

### Recent Activity
- Last 10 visits with timestamps
- Reward badges for 5th visits

---

## 🎨 Features to Explore

1. **Dark Mode**: Click moon/sun icon in dashboard sidebar
2. **Real-time Updates**: Dashboard refreshes every 30 seconds
3. **Responsive Design**: Try on mobile (resize browser)
4. **Progress Bars**: Shows X/5 visits to next reward
5. **Animations**: Smooth transitions throughout
6. **Rewards**: Check customers with rewards earned

---

## 📝 Next Steps

1. ✅ **Test all flows** - Login, scan, rewards
2. ✅ **Explore dashboard** - Metrics, charts, activity
3. ✅ **Try dark mode** - Toggle theme
4. ✅ **Check mobile view** - Resize browser
5. 📖 **Read README.md** - Full documentation
6. 🚀 **Deploy** - See DEPLOYMENT.md

---

## 💡 Pro Tips

- Store codes are in seed output (e.g., "1234")
- Use `admin1@lewisloyalty.com` to see single-store admin view
- Use `superadmin@lewisloyalty.com` to see all stores
- Check rewards page with phone `0933456789` to see rewards earned
- Visit history shows last 30 days on charts

---

## 🆘 Need Help?

- 📖 Full docs: `README.md`
- 🚀 Deployment: `DEPLOYMENT.md`
- 📊 Summary: `PROJECT_SUMMARY.md`

---

**Built with ❤️ by Bilh Technology Solution**

🎉 **Enjoy your Lewis Loyalty Platform!** 🚀




