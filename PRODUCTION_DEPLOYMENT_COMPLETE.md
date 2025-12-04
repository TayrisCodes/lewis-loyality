# 🚀 Lewis Loyalty - Complete Production Deployment Guide

**Version**: 2.0  
**Last Updated**: November 2025  
**Status**: ✅ PRODUCTION READY

---

## 📋 Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Configuration](#environment-configuration)
3. [Deployment Options](#deployment-options)
4. [Security Hardening](#security-hardening)
5. [Database Setup](#database-setup)
6. [Post-Deployment Tasks](#post-deployment-tasks)
7. [Monitoring & Maintenance](#monitoring--maintenance)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 Pre-Deployment Checklist

### ✅ Required Actions

- [ ] **Code Review**: All features tested and working
- [ ] **Security Audit**: Middleware re-enabled, secrets generated
- [ ] **Environment Variables**: All production values configured
- [ ] **Database**: Production MongoDB instance ready
- [ ] **Domain**: DNS configured and propagated
- [ ] **SSL Certificate**: HTTPS enabled
- [ ] **Backups**: Automated backup strategy in place
- [ ] **Monitoring**: Error tracking and logging configured

### ⚠️ CRITICAL Security Items

- [ ] Changed `JWT_SECRET` to 64-character random string
- [ ] Changed `APP_SECRET` to 64-character random string
- [ ] Changed `DEFAULT_ADMIN_PASSWORD` to strong password
- [ ] Middleware authentication **ENABLED** (no longer disabled)
- [ ] MongoDB authentication enabled
- [ ] HTTPS/SSL configured
- [ ] Firewall rules configured (if VPS)

---

## 🔐 Environment Configuration

### Step 1: Copy Environment Template

```bash
cd /root/lewis-loyality
cp .env.example .env
```

### Step 2: Generate Strong Secrets

```bash
# Generate JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate APP_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 3: Configure Production .env

Edit `.env` with your production values:

```env
# =============================================================================
# PRODUCTION CONFIGURATION
# =============================================================================

# Database - MongoDB Atlas (Recommended)
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/lewis-loyalty?retryWrites=true&w=majority

# Security Secrets (USE YOUR GENERATED VALUES)
JWT_SECRET=your_64_char_random_secret_here
APP_SECRET=your_64_char_random_secret_here

# Application URLs (YOUR DOMAIN)
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXT_PUBLIC_BASE_URL=https://yourdomain.com

# Admin Credentials
DEFAULT_ADMIN_EMAIL=superadmin@lewisloyalty.com
DEFAULT_ADMIN_PASSWORD=YourStrongPassword123!

# WhatsApp (Optional)
WHATSAPP_ENABLED=false
WHATSAPP_TOKEN=your_whatsapp_token
WHATSAPP_PHONE_ID=your_phone_id

# Environment
NODE_ENV=production
```

---

## 🌐 Deployment Options

Choose the deployment method that best fits your needs:

### Option 1: Docker Deployment (Recommended)

**Best for**: Full control, easy scaling, consistent environments

#### Step-by-Step:

```bash
# 1. Ensure .env is configured
cp .env.example .env
# Edit .env with production values

# 2. Build and start services
docker-compose -f docker-compose.production.yml up -d

# 3. Wait for services to be healthy
docker-compose -f docker-compose.production.yml ps

# 4. Seed the database
docker-compose -f docker-compose.production.yml exec app npm run seed

# 5. View logs
docker-compose -f docker-compose.production.yml logs -f app
```

#### Docker Management Commands:

```bash
# Stop all services
docker-compose -f docker-compose.production.yml down

# Restart application
docker-compose -f docker-compose.production.yml restart app

# Scale application (multiple instances)
docker-compose -f docker-compose.production.yml up -d --scale app=3

# View application logs
docker-compose -f docker-compose.production.yml logs -f app

# Access MongoDB shell
docker exec -it lewis-loyalty-mongodb-prod mongosh -u admin -p

# Backup database
docker exec lewis-loyalty-mongodb-prod mongodump --out /backups/$(date +%Y%m%d)

# Restore database
docker exec lewis-loyalty-mongodb-prod mongorestore /backups/YYYYMMDD
```

---

### Option 2: Vercel Deployment (Easiest)

**Best for**: Quick deployment, automatic SSL, serverless

#### Step-by-Step:

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Login to Vercel
vercel login

# 3. Deploy
vercel --prod

# 4. Configure environment variables in Vercel dashboard
# Go to: Settings → Environment Variables
# Add all variables from .env
```

#### Environment Variables to Add in Vercel:

- `MONGODB_URI`
- `JWT_SECRET`
- `APP_SECRET`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_BASE_URL`
- `DEFAULT_ADMIN_EMAIL`
- `DEFAULT_ADMIN_PASSWORD`
- `WHATSAPP_ENABLED`
- `WHATSAPP_TOKEN` (if enabled)
- `WHATSAPP_PHONE_ID` (if enabled)
- `NODE_ENV=production`

---

### Option 3: VPS Deployment (Traditional)

**Best for**: Maximum control, custom configurations

#### Prerequisites:

- Ubuntu 20.04+ or similar Linux distribution
- Node.js 20+
- MongoDB 7.0+
- Nginx
- SSL certificate (Let's Encrypt)

#### Complete Setup:

```bash
# ============================================
# 1. SERVER SETUP
# ============================================

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 (Process Manager)
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx

# Install MongoDB (if hosting on same server)
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update
sudo apt install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod

# ============================================
# 2. APPLICATION SETUP
# ============================================

# Create application directory
sudo mkdir -p /var/www/lewis-loyalty
sudo chown -R $USER:$USER /var/www/lewis-loyalty

# Clone or upload your code
cd /var/www/lewis-loyalty
# Option A: Clone from Git
git clone https://github.com/yourusername/lewis-loyalty.git .
# Option B: Upload via scp from local machine
# scp -r /root/lewis-loyality/* user@server:/var/www/lewis-loyalty/

# Install dependencies
npm install

# Configure environment
cp .env.example .env
nano .env  # Edit with production values

# Build application
npm run build

# ============================================
# 3. PM2 SETUP
# ============================================

# Start application with PM2
pm2 start npm --name "lewis-loyalty" -- start

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Run the command that PM2 outputs

# Monitor application
pm2 monit

# ============================================
# 4. NGINX CONFIGURATION
# ============================================

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/lewis-loyalty

# Paste this configuration:
```

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Static files caching
    location /_next/static {
        proxy_pass http://localhost:3000;
        proxy_cache_valid 200 365d;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/lewis-loyalty /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx

# ============================================
# 5. SSL SETUP (Let's Encrypt)
# ============================================

# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Test auto-renewal
sudo certbot renew --dry-run

# ============================================
# 6. FIREWALL SETUP
# ============================================

# Configure UFW firewall
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable

# ============================================
# 7. SEED DATABASE
# ============================================

cd /var/www/lewis-loyalty
npm run seed

# Verify seeding
pm2 logs lewis-loyalty
```

---

## 🗄️ Database Setup

### MongoDB Atlas (Recommended for Production)

#### Step 1: Create Cluster

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up / Log in
3. Create a new cluster (Free tier available)
4. Choose region closest to your users

#### Step 2: Configure Security

```bash
# Database Access
1. Click "Database Access"
2. Add New Database User
   - Username: lewis_admin
   - Password: [Generate strong password]
   - Database User Privileges: Read and write to any database

# Network Access
3. Click "Network Access"
4. Add IP Address
   - For testing: 0.0.0.0/0 (Allow from anywhere)
   - For production: Add your server's IP addresses
```

#### Step 3: Get Connection String

1. Click "Connect" on your cluster
2. Choose "Connect your application"
3. Copy the connection string
4. Replace `<password>` with your database password
5. Add to your `.env` file

Example:
```env
MONGODB_URI=mongodb+srv://lewis_admin:yourpassword@cluster0.mongodb.net/lewis-loyalty?retryWrites=true&w=majority
```

#### Step 4: Seed Production Database

```bash
# Make sure .env has production MONGODB_URI
npm run seed

# Verify data
# Use MongoDB Compass or Atlas UI to check collections
```

---

## 🔒 Security Hardening

### Application Security

#### 1. Middleware Protection (CRITICAL)

**Status**: ✅ Re-enabled (was disabled for debugging)

Verify middleware is active in `middleware.ts`:

```typescript
export function middleware(request: NextRequest) {
  // Should NOT have: return NextResponse.next()
  // Should have: Full authentication logic
}
```

#### 2. Strong Secrets

```bash
# Generate 64-character random secrets
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Update .env:
JWT_SECRET=[generated-secret-1]
APP_SECRET=[generated-secret-2]
```

#### 3. Admin Password

```env
# Change from default
DEFAULT_ADMIN_PASSWORD=VeryStrongPassword123!@#$

# After first login, change password through admin panel
```

#### 4. Environment Variables

```bash
# Never commit .env to Git
echo ".env" >> .gitignore
echo ".env.*" >> .gitignore

# Use environment-specific files
.env.development
.env.production
.env.local  # This should be in .gitignore
```

### Server Security (VPS Only)

#### 1. SSH Security

```bash
# Disable root login
sudo nano /etc/ssh/sshd_config
# Set: PermitRootLogin no
# Set: PasswordAuthentication no (use SSH keys only)

# Restart SSH
sudo systemctl restart sshd
```

#### 2. Firewall

```bash
# UFW (Ubuntu)
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable

# Check status
sudo ufw status
```

#### 3. Fail2Ban (Brute Force Protection)

```bash
# Install
sudo apt install fail2ban

# Configure
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
sudo nano /etc/fail2ban/jail.local

# Enable and start
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

#### 4. MongoDB Security

```bash
# Enable authentication
sudo nano /etc/mongod.conf

# Add:
security:
  authorization: enabled

# Restart MongoDB
sudo systemctl restart mongod

# Create admin user
mongosh
use admin
db.createUser({
  user: "admin",
  pwd: "SecurePassword123!",
  roles: [ { role: "userAdminAnyDatabase", db: "admin" } ]
})
```

---

## ✅ Post-Deployment Tasks

### 1. Verify Deployment

```bash
# Check if application is running
curl https://yourdomain.com

# Check health endpoint (if implemented)
curl https://yourdomain.com/api/health

# Check database connection
# Try logging in to admin panel
```

### 2. Initial Login and Configuration

1. **Access Admin Panel**
   ```
   URL: https://yourdomain.com/login
   Email: superadmin@lewisloyalty.com
   Password: [Your configured password]
   ```

2. **Change Admin Password**
   - Navigate to Settings/Profile
   - Update password to a new strong password
   - Save changes

3. **Create Store Admins**
   - Go to Super Admin → Admins
   - Create admin accounts for each store
   - Provide credentials to store managers

4. **Configure Stores**
   - Go to Super Admin → Stores
   - Add/Edit store information
   - Generate QR codes for each store
   - Download and print QR codes

### 3. Test All Functionality

#### Super Admin Tests
- [ ] Login works
- [ ] Dashboard displays data
- [ ] Can create stores
- [ ] Can create admin users
- [ ] Can generate QR codes
- [ ] Analytics display correctly

#### Store Admin Tests
- [ ] Login works
- [ ] Can see store dashboard
- [ ] Can view customers
- [ ] Can view visits
- [ ] Can print QR codes
- [ ] Can manage rewards

#### Customer Tests
- [ ] QR scanning works
- [ ] Customer registration works
- [ ] Visit recording works
- [ ] Reward system works
- [ ] Mobile responsiveness
- [ ] WhatsApp notifications (if enabled)

### 4. Configure Backups

#### MongoDB Atlas (Automatic)
- Enable continuous backup in Atlas dashboard
- Configure backup schedule
- Test restore process

#### VPS (Manual/Automated)
```bash
# Create backup script
sudo nano /usr/local/bin/backup-lewis-loyalty.sh

#!/bin/bash
BACKUP_DIR="/backups/lewis-loyalty"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Backup MongoDB
mongodump --uri="mongodb://admin:password@localhost:27017/lewis-loyalty" --out="$BACKUP_DIR/db_$TIMESTAMP"

# Backup application files
tar -czf "$BACKUP_DIR/app_$TIMESTAMP.tar.gz" /var/www/lewis-loyalty

# Keep only last 30 days
find $BACKUP_DIR -type f -mtime +30 -delete

echo "Backup completed: $TIMESTAMP"

# Make executable
sudo chmod +x /usr/local/bin/backup-lewis-loyalty.sh

# Add to crontab (daily at 2 AM)
sudo crontab -e
0 2 * * * /usr/local/bin/backup-lewis-loyalty.sh
```

---

## 📊 Monitoring & Maintenance

### Application Monitoring

#### PM2 Monitoring (VPS)
```bash
# Real-time monitoring
pm2 monit

# View logs
pm2 logs lewis-loyalty

# View specific number of lines
pm2 logs lewis-loyalty --lines 100

# Clear logs
pm2 flush lewis-loyalty

# Restart on high memory
pm2 restart lewis-loyalty --max-memory-restart 500M
```

#### Docker Monitoring
```bash
# View container stats
docker stats

# View logs
docker-compose -f docker-compose.production.yml logs -f app

# Check health
docker-compose -f docker-compose.production.yml ps
```

### Performance Monitoring

#### Setup Monitoring Tools

**Option 1: PM2 Plus (Paid)**
```bash
pm2 link [secret-key] [public-key]
```

**Option 2: Sentry (Error Tracking)**
```bash
npm install @sentry/nextjs

# Configure in next.config.js
```

**Option 3: New Relic (APM)**
```bash
npm install newrelic
# Follow New Relic setup guide
```

### Regular Maintenance Tasks

#### Daily
- [ ] Check application logs for errors
- [ ] Monitor server resources (CPU, Memory, Disk)
- [ ] Verify backups completed successfully

#### Weekly
- [ ] Review application performance metrics
- [ ] Check for security updates
- [ ] Review user activity logs
- [ ] Test backup restore process (monthly)

#### Monthly
- [ ] Update dependencies (security patches)
- [ ] Review and rotate logs
- [ ] Database optimization
- [ ] Performance review

```bash
# Update dependencies
npm outdated
npm update

# Check for security vulnerabilities
npm audit
npm audit fix

# Database maintenance (MongoDB)
mongosh
use lewis-loyalty
db.runCommand({ compact: 'visits' })
db.runCommand({ compact: 'customers' })
db.runCommand({ compact: 'rewards' })
```

---

## 🔧 Troubleshooting

### Common Issues

#### Issue 1: Application Won't Start

```bash
# Check logs
pm2 logs lewis-loyalty --lines 50

# Common causes:
# 1. Environment variables not set
cat .env

# 2. Database connection failed
# Check MONGODB_URI is correct

# 3. Port already in use
lsof -i :3000
kill -9 [PID]

# 4. Permission issues
sudo chown -R $USER:$USER /var/www/lewis-loyalty
```

#### Issue 2: Database Connection Failed

```bash
# Test MongoDB connection
mongosh "mongodb://localhost:27017/lewis-loyalty"

# Check MongoDB is running
sudo systemctl status mongod

# Check MongoDB logs
sudo tail -f /var/log/mongodb/mongod.log

# For MongoDB Atlas:
# - Verify IP whitelist
# - Check connection string
# - Verify credentials
```

#### Issue 3: 502 Bad Gateway (Nginx)

```bash
# Check Nginx configuration
sudo nginx -t

# Check Nginx logs
sudo tail -f /var/log/nginx/error.log

# Check if application is running
curl http://localhost:3000

# Restart services
pm2 restart lewis-loyalty
sudo systemctl restart nginx
```

#### Issue 4: SSL Certificate Issues

```bash
# Renew certificate
sudo certbot renew

# Force renewal
sudo certbot renew --force-renewal

# Check certificate expiry
sudo certbot certificates

# Test SSL configuration
curl -I https://yourdomain.com
```

#### Issue 5: High Memory Usage

```bash
# Check memory usage
pm2 monit

# Restart with memory limit
pm2 restart lewis-loyalty --max-memory-restart 500M

# Clear node cache
npm cache clean --force

# Check for memory leaks in logs
pm2 logs lewis-loyalty | grep "memory"
```

### Getting Help

1. **Check Documentation**
   - README.md
   - PRODUCTION_READY_CHECKLIST.md
   - PROJECT_SUMMARY.md

2. **Review Logs**
   ```bash
   # Application logs
   pm2 logs lewis-loyalty
   
   # Nginx logs
   sudo tail -f /var/log/nginx/error.log
   
   # System logs
   sudo journalctl -u mongod -f
   ```

3. **Database Check**
   ```bash
   # Connect to database
   mongosh [your-connection-string]
   
   # Check collections
   show dbs
   use lewis-loyalty
   show collections
   
   # Count documents
   db.customers.countDocuments()
   db.visits.countDocuments()
   ```

---

## 📞 Quick Reference

### URLs After Deployment

| URL | Purpose | Access |
|-----|---------|--------|
| `https://yourdomain.com/` | Customer landing page | Public |
| `https://yourdomain.com/customer` | QR scanner | Public |
| `https://yourdomain.com/customer-auth` | Customer sign in/up | Public |
| `https://yourdomain.com/login` | Admin login | Public |
| `https://yourdomain.com/dashboard/super` | Super admin dashboard | Super admin only |
| `https://yourdomain.com/dashboard/admin` | Store admin dashboard | Store admins |
| `https://yourdomain.com/dashboard/customer` | Customer dashboard | Customers |

### Default Credentials (CHANGE IMMEDIATELY!)

```
Super Admin:
Email: superadmin@lewisloyalty.com
Password: [Your configured password from .env]

Store Admin (Example):
Email: admin1@lewisloyalty.com
Password: admin123
```

### Important Commands

```bash
# Application Management
pm2 restart lewis-loyalty
pm2 logs lewis-loyalty
pm2 monit

# Nginx
sudo systemctl restart nginx
sudo nginx -t

# MongoDB
sudo systemctl restart mongod
mongosh

# SSL Certificate
sudo certbot renew

# Backups
/usr/local/bin/backup-lewis-loyalty.sh

# View Logs
pm2 logs
sudo tail -f /var/log/nginx/error.log
```

---

## 🎉 Deployment Complete!

Your Lewis Loyalty application is now:
- ✅ Deployed to production
- ✅ Secured with HTTPS
- ✅ Database configured and seeded
- ✅ Monitoring enabled
- ✅ Backups configured
- ✅ Ready for users!

**Next Steps:**
1. Share login credentials with store managers
2. Print QR codes for stores
3. Train staff on the system
4. Monitor first week closely
5. Collect feedback and iterate

**Remember:**
- Change all default passwords
- Monitor logs regularly
- Keep dependencies updated
- Test backups monthly
- Review security quarterly

---

**Need Help?** Check the troubleshooting section or review the documentation files.

**Version**: 2.0  
**Last Updated**: November 2025  
**Deployment Status**: ✅ PRODUCTION READY


