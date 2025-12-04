# 🚀 Production Setup with MongoDB Atlas

This guide will help you configure the Lewis Loyalty System for production using MongoDB Atlas.

## 📋 Prerequisites

1. MongoDB Atlas account (create one at https://www.mongodb.com/cloud/atlas)
2. Docker and Docker Compose installed
3. Domain name configured (for production URLs)

## 🔧 Step 1: MongoDB Atlas Setup

### 1.1 Create MongoDB Atlas Cluster

1. Log in to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a new cluster (free tier M0 is fine for testing)
3. Wait for cluster to be created (takes 3-5 minutes)

### 1.2 Configure Database Access

1. Go to **Security → Database Access**
2. Click **Add New Database User**
3. Create user with:
   - **Username**: `lewis` (or your preferred username)
   - **Password**: `tare5960` (or generate a strong password)
   - **Database User Privileges**: **Read and write to any database**

### 1.3 Configure Network Access

1. Go to **Security → Network Access**
2. Click **Add IP Address**
3. For production, add your server's IP address
4. For testing, you can temporarily allow **0.0.0.0/0** (allow from anywhere)
   ⚠️ **WARNING**: Remove this in production and use specific IPs only!

### 1.4 Get Connection String

1. Go to **Database → Connect**
2. Click **Connect your application**
3. Select **Node.js** as driver
4. Copy the connection string (it will look like):
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/<database>?retryWrites=true&w=majority
   ```

### 1.5 Update Connection String

Replace the placeholders:
- `<username>` → Your database username (e.g., `lewis`)
- `<password>` → Your database password (e.g., `tare5960`)
- `<database>` → Your database name (e.g., `dokimas_cosmetics`)

**Your final connection string should be:**
```
mongodb+srv://lewis:tare5960@cluster0.0gwcnq5.mongodb.net/dokimas_cosmetics?retryWrites=true&w=majority
```

## 🔐 Step 2: Create Production Environment File

Create a `.env.production` file in the project root:

```bash
# Copy the example file
cp .env.production.example .env.production

# Edit with your values
nano .env.production
```

### Required Variables

```env
# MongoDB Atlas Connection (REQUIRED)
MONGODB_URI=mongodb+srv://lewis:tare5960@cluster0.0gwcnq5.mongodb.net/dokimas_cosmetics?retryWrites=true&w=majority

# Security Secrets (REQUIRED - Generate strong secrets!)
# Generate secrets: openssl rand -base64 32
JWT_SECRET=your-generated-jwt-secret-min-32-characters-long
APP_SECRET=your-generated-app-secret-min-32-characters-long

# Application URLs (REQUIRED - Replace with your domain)
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
NEXT_PUBLIC_APP_URL=https://yourdomain.com

# Environment
NODE_ENV=production
```

### Optional Variables

```env
# Admin Default Credentials (Optional - for initial setup)
DEFAULT_ADMIN_EMAIL=admin@lewisloyalty.com
DEFAULT_ADMIN_PASSWORD=ChangeThisPassword123!

# WhatsApp Integration (Optional)
WHATSAPP_ENABLED=false
WHATSAPP_TOKEN=
WHATSAPP_PHONE_ID=
```

### Generate Strong Secrets

```bash
# Generate JWT_SECRET
openssl rand -base64 32

# Generate APP_SECRET
openssl rand -base64 32
```

## 🐳 Step 3: Prepare Directories

Create necessary directories for file storage:

```bash
# Create directories
mkdir -p uploads/receipts
mkdir -p public/qrcodes
mkdir -p backups

# Set permissions
chmod 755 uploads/receipts
chmod 755 public/qrcodes
chmod 755 backups
```

## 🚀 Step 4: Build and Deploy

### 4.1 Build Docker Image

```bash
# Build production image
docker-compose -f docker-compose.production.yml --env-file .env.production build
```

### 4.2 Start Application

```bash
# Start application
docker-compose -f docker-compose.production.yml --env-file .env.production up -d
```

### 4.3 Check Logs

```bash
# View all logs
docker-compose -f docker-compose.production.yml logs -f

# View app logs only
docker-compose -f docker-compose.production.yml logs -f app
```

### 4.4 Verify Connection

```bash
# Test MongoDB Atlas connection
docker-compose -f docker-compose.production.yml exec app node -e "require('./lib/db').default().then(() => console.log('✅ Connected to Atlas!')).catch(e => console.error('❌ Connection failed:', e.message))"
```

You should see: `✅ Connected to Atlas!`

## 📊 Step 5: Seed Initial Data (Optional)

### 5.1 Seed Super Admin

```bash
# Set environment variable
export MONGODB_URI="mongodb+srv://lewis:tare5960@cluster0.0gwcnq5.mongodb.net/dokimas_cosmetics?retryWrites=true&w=majority"

# Seed super admin
npm run seed:super
```

### 5.2 Seed Sample Data (Development Only)

```bash
# Seed comprehensive test data
npm run seed:comprehensive
```

**⚠️ WARNING**: Only run seed scripts in production for initial setup!

## ✅ Step 6: Verify Deployment

### 6.1 Check Application Health

```bash
# Check if app is running
curl http://localhost:3015/api/health

# Or visit in browser
open http://localhost:3015
```

### 6.2 Access Application

- **Main App**: `http://your-domain.com` (or `http://localhost:3015`)
- **Admin Login**: `http://your-domain.com/login`

### 6.3 Test Database Connection

Check application logs for:
```
✅ MongoDB Atlas connected successfully
   Database: dokimas_cosmetics
   Host: cluster0.0gwcnq5.mongodb.net
```

## 🔒 Step 7: Security Checklist

- [ ] ✅ Strong `JWT_SECRET` generated and set
- [ ] ✅ Strong `APP_SECRET` generated and set
- [ ] ✅ MongoDB Atlas password is strong
- [ ] ✅ Network Access restricted to server IP (not 0.0.0.0/0)
- [ ] ✅ `.env.production` file is in `.gitignore` (not committed)
- [ ] ✅ Default admin password changed after first login
- [ ] ✅ HTTPS/SSL configured (for production domain)
- [ ] ✅ Firewall rules configured on server

## 📝 Step 8: Useful Commands

### View Logs

```bash
# All logs
docker-compose -f docker-compose.production.yml logs -f

# App logs only
docker-compose -f docker-compose.production.yml logs -f app

# Last 100 lines
docker-compose -f docker-compose.production.yml logs --tail=100 app
```

### Restart Application

```bash
# Restart app
docker-compose -f docker-compose.production.yml restart app

# Rebuild and restart
docker-compose -f docker-compose.production.yml --env-file .env.production build --no-cache app
docker-compose -f docker-compose.production.yml --env-file .env.production up -d
```

### Stop Application

```bash
# Stop app
docker-compose -f docker-compose.production.yml stop

# Stop and remove containers
docker-compose -f docker-compose.production.yml down
```

### Scale Application

```bash
# Run multiple instances (load balancing)
docker-compose -f docker-compose.production.yml --env-file .env.production up -d --scale app=3
```

### Check Receipt Uploads

```bash
# List receipts
ls -la uploads/receipts/

# Check storage usage
du -sh uploads/receipts/*
```

## 🐛 Troubleshooting

### Connection Issues

**Problem**: Cannot connect to MongoDB Atlas

**Solutions**:
1. Check network access in Atlas dashboard (your IP must be allowed)
2. Verify connection string is correct
3. Check if password has special characters (URL encode if needed)
4. Verify database user has correct permissions

```bash
# Test connection from container
docker-compose -f docker-compose.production.yml exec app node -e "require('./lib/db').default().catch(e => console.error(e))"
```

### Application Won't Start

**Problem**: Container exits immediately

**Solutions**:
1. Check logs: `docker-compose -f docker-compose.production.yml logs app`
2. Verify `.env.production` file exists and has all required variables
3. Check if ports are available: `netstat -tulpn | grep 3015`

### Build Failures

**Problem**: Docker build fails

**Solutions**:
1. Clear Docker cache: `docker system prune -a`
2. Rebuild without cache: `docker-compose -f docker-compose.production.yml build --no-cache`
3. Check Dockerfile for syntax errors

## 📚 Additional Resources

- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [MongoDB Connection String Guide](https://docs.mongodb.com/manual/reference/connection-string/)
- [Next.js Production Deployment](https://nextjs.org/docs/deployment)

## 🎉 You're All Set!

Your application is now running in production with MongoDB Atlas! 🚀

### Next Steps:

1. Configure reverse proxy (Nginx) for HTTPS
2. Set up domain DNS records
3. Configure SSL certificates
4. Set up monitoring and alerts
5. Configure backups for MongoDB Atlas
6. Review security settings

---

**Need Help?** Check the application logs or MongoDB Atlas dashboard for more details.

