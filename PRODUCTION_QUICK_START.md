# ⚡ Lewis Loyalty - Production Quick Start

## 🚀 Quick Deploy (5 Minutes)

### **Method 1: Vercel (Easiest)**

```bash
# 1. Install Vercel CLI
npm install -g vercel

# 2. Login to Vercel
vercel login

# 3. Deploy
vercel --prod

# 4. Set environment variables in Vercel dashboard
# MONGODB_URI, JWT_SECRET, etc.
```

**Done!** Your app is live at `your-project.vercel.app`

---

### **Method 2: VPS (Most Control)**

```bash
# 1. SSH into your server
ssh root@your_server_ip

# 2. Clone repository
cd /var/www
git clone https://github.com/yourusername/lewis-loyalty.git
cd lewis-loyalty

# 3. Install dependencies
npm install

# 4. Create environment file
nano .env.production
# Add: MONGODB_URI, JWT_SECRET, NODE_ENV=production

# 5. Build application
npm run build

# 6. Start with PM2
pm2 start npm --name "lewis-loyalty" -- start
pm2 save
pm2 startup

# 7. Setup Nginx reverse proxy
# (See full guide for Nginx config)

# 8. Get SSL certificate
certbot --nginx -d lewisloyalty.com
```

**Done!** Your app is live at `https://lewisloyalty.com`

---

## 🔑 Required Environment Variables

```env
# Required
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/lewis_loyalty
JWT_SECRET=your-super-secret-jwt-key-32-chars-minimum
NODE_ENV=production

# Optional
NEXT_PUBLIC_API_URL=https://your-domain.com
WHATSAPP_API_KEY=your_whatsapp_key
WHATSAPP_API_URL=https://api.whatsapp.com
```

---

## 📦 Build Commands

```bash
# Development
npm run dev              # Start dev server (localhost:3000)

# Production
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run linter
```

---

## 🧪 Test Production Build Locally

```bash
# 1. Build
npm run build

# 2. Start
npm run start

# 3. Test
curl http://localhost:3000
# Should see Lewis Loyalty landing page
```

---

## 📱 Key URLs After Deployment

| URL | Purpose |
|-----|---------|
| `/` | Customer landing page |
| `/customer` | QR code scanner |
| `/customer-auth` | Customer sign in/up |
| `/dashboard/customer` | Customer dashboard |
| `/login` | Admin login |
| `/dashboard/admin` | Store admin dashboard |
| `/dashboard/super` | Super admin dashboard |

---

## 👥 Default Admin Accounts

After seeding the database:

### **Super Admin**
- Email: `admin@lewisloyalty.com`
- Password: `admin123`
- Access: All features

### **Store Admin**
- Email: `admin1@lewisloyalty.com`
- Password: `admin123`
- Access: Single store management

⚠️ **Change these passwords in production!**

---

## 🗄️ Database Setup

### **Option 1: MongoDB Atlas (Cloud)**

1. Create cluster at [mongodb.com/cloud/atlas](https://mongodb.com/cloud/atlas)
2. Get connection string
3. Add to environment variables
4. Run seed script:
   ```bash
   npm run seed
   ```

### **Option 2: Local MongoDB**

```bash
# Install MongoDB
# Ubuntu/Debian:
apt install -y mongodb

# Start MongoDB
systemctl start mongodb

# Use connection string
MONGODB_URI=mongodb://localhost:27017/lewis_loyalty
```

---

## 🔒 Security Checklist

- [ ] Change default admin passwords
- [ ] Use strong JWT_SECRET (32+ characters)
- [ ] Enable HTTPS (SSL certificate)
- [ ] Configure MongoDB authentication
- [ ] Whitelist only necessary IPs
- [ ] Enable firewall (ufw)
- [ ] Regular security updates

---

## 🎯 Performance Tips

```bash
# Enable caching in Nginx
# Add to /etc/nginx/sites-available/your-site

location /_next/static/ {
    expires 365d;
    add_header Cache-Control "public, immutable";
}

# Enable Gzip compression
gzip on;
gzip_types text/plain text/css application/json application/javascript;
```

---

## 📊 Monitoring (PM2)

```bash
# View logs
pm2 logs lewis-loyalty

# Monitor resources
pm2 monit

# Restart app
pm2 restart lewis-loyalty

# View status
pm2 status
```

---

## 🔄 Deploy Updates

### **Vercel**
```bash
git push origin main  # Auto-deploys
```

### **VPS**
```bash
cd /var/www/lewis-loyalty
git pull origin main
npm install
npm run build
pm2 restart lewis-loyalty
```

---

## 🆘 Common Issues

### **Build Fails**
```bash
# Clear cache and rebuild
rm -rf .next node_modules
npm install
npm run build
```

### **App Won't Start**
```bash
# Check logs
pm2 logs lewis-loyalty

# Check if port is in use
lsof -i :3000

# Kill process on port
kill -9 $(lsof -t -i:3000)
```

### **Database Connection Error**
```bash
# Check MongoDB is running
systemctl status mongodb

# Test connection string
mongo "your_connection_string"
```

---

## 📞 Quick Help

### **Where to find logs?**
- **PM2**: `pm2 logs lewis-loyalty`
- **Nginx**: `/var/log/nginx/error.log`
- **Application**: Check PM2 logs

### **How to restart?**
```bash
pm2 restart lewis-loyalty
systemctl restart nginx
```

### **How to check status?**
```bash
pm2 status
systemctl status nginx
systemctl status mongodb
```

---

## ✅ Production Ready!

Your Lewis Loyalty application is ready to deploy!

**Next Steps:**
1. Choose deployment method (Vercel or VPS)
2. Set up environment variables
3. Deploy application
4. Configure database
5. Test all features
6. Change default passwords
7. Launch! 🚀

---

**Full Documentation**: See `PRODUCTION_DEPLOYMENT_GUIDE.md`

**Build Status**: ✅ Ready
**Last Build**: Success
**Version**: 1.0.0

