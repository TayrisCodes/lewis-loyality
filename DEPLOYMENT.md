# 🚀 Lewis Loyalty Deployment Guide

## Quick Start

### 1. Install Dependencies
\`\`\`bash
npm install
\`\`\`

### 2. Configure Environment
Copy \`.env.local.example\` to \`.env.local\` and update values:
\`\`\`bash
cp .env.local.example .env.local
\`\`\`

### 3. Start MongoDB
\`\`\`bash
# Local MongoDB
mongod --port 27020

# Or use MongoDB Atlas (cloud)
# Update MONGODB_URI in .env.local
\`\`\`

### 4. Seed Database
\`\`\`bash
npm run seed
\`\`\`

### 5. Run Development
\`\`\`bash
npm run dev
\`\`\`

Visit: http://localhost:3000

## Login Credentials

**SuperAdmin:**
- Email: superadmin@lewisloyalty.com
- Password: admin123

**Store Admin:**
- Email: admin1@lewisloyalty.com
- Password: admin123

## Production Deployment

### Vercel Deployment

1. Install Vercel CLI:
\`\`\`bash
npm i -g vercel
\`\`\`

2. Login to Vercel:
\`\`\`bash
vercel login
\`\`\`

3. Deploy:
\`\`\`bash
vercel --prod
\`\`\`

4. Add environment variables in Vercel dashboard:
   - MONGODB_URI
   - JWT_SECRET
   - WHATSAPP_TOKEN (optional)
   - WHATSAPP_PHONE_ID (optional)

### MongoDB Atlas Setup

1. Create account at https://www.mongodb.com/cloud/atlas
2. Create new cluster
3. Add database user
4. Whitelist IP addresses (0.0.0.0/0 for all)
5. Get connection string
6. Update MONGODB_URI in .env.local

### WhatsApp Business API Setup

1. Go to https://developers.facebook.com
2. Create app → Add WhatsApp product
3. Get Phone Number ID
4. Generate Access Token
5. Add to environment variables

## Troubleshooting

### MongoDB Connection Error
- Ensure MongoDB is running
- Check port (default: 27020)
- Verify MONGODB_URI in .env.local

### Build Errors
\`\`\`bash
# Clear Next.js cache
rm -rf .next
npm run build
\`\`\`

### Port Already in Use
\`\`\`bash
# Change port
PORT=3001 npm run dev
\`\`\`

## Health Checks

### Test API Endpoints
\`\`\`bash
# Check stores
curl http://localhost:3000/api/store

# Test auth (after seeding)
curl -X POST http://localhost:3000/api/auth \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@lewisloyalty.com","password":"admin123"}'
\`\`\`

## Support

For issues: support@bilhtech.com




