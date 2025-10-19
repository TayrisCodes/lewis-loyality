# 🗄️ Database Reset Guide

## Current Issue

Your MongoDB instance requires authentication, but we need to find the correct credentials.

## Option 1: Find Correct MongoDB Credentials

### Check MongoDB Connection String

Try one of these methods to find your MongoDB credentials:

1. **Check environment files:**
```bash
# Look for any env files with MongoDB credentials
find /home/blih -name ".env*" -type f 2>/dev/null | xargs grep -l MONGODB_URI 2>/dev/null
```

2. **Check MongoDB configuration:**
```bash
# If MongoDB is installed via package manager
cat /etc/mongod.conf
```

3. **Check Docker containers:**
```bash
# If running in Docker
docker ps -a | grep mongo
docker inspect <container-name> | grep -A 5 MONGO_INITDB
```

## Option 2: Reset MongoDB Without Authentication

### Stop Current MongoDB:
```bash
sudo systemctl stop mongod
# OR if using Docker
docker stop <mongo-container-name>
```

### Start MongoDB WITHOUT Authentication:
```bash
# Edit mongod.conf and comment out security.authorization
sudo nano /etc/mongod.conf

# Then restart
sudo systemctl start mongod
```

### Update Lewis Loyalty `.env.local`:
```env
MONGODB_URI=mongodb://localhost:27017/lewis-loyalty
```

### Run Reset:
```bash
npm run reset-db
```

## Option 3: Manual Database Reset (RECOMMENDED)

### Using mongosh directly:
```bash
# Connect to MongoDB with correct credentials
mongosh "mongodb://YOUR_USER:YOUR_PASSWORD@localhost:27017/lewis-loyalty?authSource=admin"

# Then run:
use lewis-loyalty
db.dropDatabase()
exit
```

### Then seed fresh data:
```bash
cd /home/blih/blih\ pro/liwis
npm run seed
```

## Option 4: Docker Compose Fresh Start

If you want to use the Docker Compose setup:

```bash
cd /home/blih/blih\ pro/liwis

# Stop and remove all containers
docker-compose down -v

# Start fresh MongoDB
docker-compose up -d mongodb

# Wait 5 seconds for MongoDB to start
sleep 5

# Update .env.local
cat > .env.local << 'EOF'
MONGODB_URI=mongodb://admin:password123@localhost:27017/lewis-loyalty?authSource=admin
JWT_SECRET=your-super-secret-jwt-key-change-in-production-12345
WHATSAPP_TOKEN=your-whatsapp-cloud-api-token
WHATSAPP_PHONE_ID=your-whatsapp-phone-number-id
DEFAULT_ADMIN_EMAIL=superadmin@lewisloyalty.com
DEFAULT_ADMIN_PASSWORD=admin123
NEXT_PUBLIC_APP_URL=http://localhost:3000
EOF

# Now reset and seed
npm run reset-db
```

## Quick Commands Reference

### Clear Database Only:
```bash
npm run clear-db
```

### Seed Database Only:
```bash
npm run seed
```

### Clear + Seed (Full Reset):
```bash
npm run reset-db
```

## What Gets Created After Seeding

- **3 Stores:** Addis Ababa, Hawassa, Adama
- **1 SuperAdmin:** superadmin@lewisloyalty.com / admin123
- **3 Store Admins:** admin1@lewisloyalty.com, admin2@lewisloyalty.com, admin3@lewisloyalty.com / admin123
- **10 Customers:** Test customers with Ethiopian names
- **~70 Visits:** Random visits across stores
- **~14 Rewards:** Earned rewards for testing

## Testing After Reset

```bash
# Start the app
npm run dev

# Open browser
http://localhost:3000

# Login as SuperAdmin
Email: superadmin@lewisloyalty.com
Password: admin123
```

## Troubleshooting

### "Authentication failed"
- Correct credentials needed in MONGODB_URI
- Or disable MongoDB authentication temporarily

### "Port already in use"
- MongoDB already running on port 27017
- Find and use existing MongoDB or stop it first

### "Cannot find module"
- Run: `npm install`

---

## Need Help?

Contact: support@bilhtech.com



