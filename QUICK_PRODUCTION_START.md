# ⚡ Lewis Loyalty - Quick Production Start

**Need to deploy quickly? Follow these steps.**

---

## 🚀 5-Minute Production Deployment

### Step 1: Configure Environment (2 minutes)

```bash
cd /root/lewis-loyality

# Copy environment template
cp .env.example .env

# Generate secrets
node -e "console.log('JWT_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"
node -e "console.log('APP_SECRET=' + require('crypto').randomBytes(32).toString('hex'))"

# Edit .env with your values
nano .env
```

**Update these in .env**:
```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/lewis-loyalty
JWT_SECRET=<your-generated-secret>
APP_SECRET=<your-generated-secret>
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
DEFAULT_ADMIN_PASSWORD=<strong-password>
NODE_ENV=production
```

### Step 2: Deploy with Docker (2 minutes)

```bash
# Start all services
docker-compose -f docker-compose.production.yml up -d

# Wait for services to be healthy (check status)
docker-compose -f docker-compose.production.yml ps

# Seed database
docker-compose -f docker-compose.production.yml exec app npm run seed
```

### Step 3: Verify (1 minute)

```bash
# Check if running
curl http://localhost:3000

# View logs
docker-compose -f docker-compose.production.yml logs -f app
```

### Step 4: Access Application

```
Admin Login: http://localhost:3000/login
Email: superadmin@lewisloyalty.com
Password: <your-password-from-env>
```

---

## 🎯 Quick Deployment Options

### Option A: Docker (Easiest)
```bash
docker-compose -f docker-compose.production.yml up -d
```
✅ Everything included: App + MongoDB + Nginx

### Option B: Vercel (Fastest)
```bash
vercel --prod
```
✅ Automatic SSL, CDN, scaling

### Option C: Traditional VPS
```bash
npm install
npm run build
pm2 start npm --name lewis-loyalty -- start
```
✅ Full control, customizable

---

## ⚠️ CRITICAL: Before Going Live

```bash
# 1. Change secrets in .env
JWT_SECRET=[your-random-64-char-string]
APP_SECRET=[your-random-64-char-string]

# 2. Update URLs
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# 3. Verify middleware is enabled
grep -q "TEMPORARILY DISABLED" middleware.ts
# Should return nothing (not found)

# 4. Set production database
MONGODB_URI=mongodb+srv://...  # Use MongoDB Atlas

# 5. Enable HTTPS
# Configure SSL certificate on your domain

# 6. Test build
npm run build
```

---

## 📞 Default Credentials (CHANGE IMMEDIATELY!)

```
Super Admin:
Email: superadmin@lewisloyalty.com
Password: [from DEFAULT_ADMIN_PASSWORD in .env]

Store Admin (after seeding):
Email: admin1@lewisloyalty.com
Password: admin123
```

---

## 🔥 Common Issues

### Issue: "Cannot connect to database"
```bash
# Check MongoDB is running
docker-compose ps

# Check connection string in .env
cat .env | grep MONGODB_URI
```

### Issue: "Port 3000 already in use"
```bash
# Find process
lsof -i :3000

# Kill it
kill -9 [PID]
```

### Issue: "Build failed"
```bash
# Clean and rebuild
rm -rf .next
npm install
npm run build
```

---

## 📚 Full Documentation

| Quick Reference | Full Guides |
|----------------|-------------|
| This file | `PRODUCTION_DEPLOYMENT_COMPLETE.md` |
| Security basics | `SECURITY_GUIDE.md` |
| Environment setup | `.env.example` |
| Complete summary | `PRODUCTION_READINESS_SUMMARY.md` |

---

## ✅ Production Checklist

```
[ ] .env configured with production values
[ ] JWT_SECRET changed (64 chars)
[ ] APP_SECRET changed (64 chars)
[ ] MongoDB production database set up
[ ] HTTPS/SSL enabled
[ ] Admin password changed
[ ] All tests passed
[ ] Backups configured
[ ] Monitoring set up
```

---

## 🎉 You're Ready!

**Next Steps**:
1. Deploy using one of the options above
2. Seed the database
3. Change admin password
4. Share credentials with team
5. Monitor for 24 hours
6. Celebrate! 🚀

---

**Need help?** See `PRODUCTION_DEPLOYMENT_COMPLETE.md` for detailed instructions.

**Version**: 2.0  
**Last Updated**: November 2025  
**Status**: ✅ PRODUCTION READY


