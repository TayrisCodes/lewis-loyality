# Lewis Loyalty System

A comprehensive QR-first loyalty system built with Next.js, TypeScript, MongoDB, and modern UI components.

## Features

### Super Admin Module
- Full system control and analytics
- Store and admin user management
- Daily QR code generation and management
- Global analytics dashboard
- System settings and configuration

### Admin (Store Manager) Module
- Store-specific dashboard
- QR code generation and printing
- Visit tracking and customer management
- Reward rules configuration
- Manual OTP verification

### Customer Module (QR-First UX)
- Camera-first entry via QR scanning
- Frictionless registration and visit recording
- Reward progress tracking
- WhatsApp notifications
- Mobile-optimized experience

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, TailwindCSS
- **UI**: Shadcn/UI, Framer Motion
- **Backend**: Next.js API Routes
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT with secure cookies
- **QR Generation**: qrcode npm package
- **Notifications**: WhatsApp Web.js
- **Scheduling**: node-cron

## Environment Variables

Create a `.env.local` file with the following variables:

```env
# MongoDB URI with authentication (matches docker-compose setup)
MONGODB_URI=mongodb://admin:password123@localhost:27020/lewis-loyalty?authSource=admin

# JWT Secret - Change this in production!
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# App Secret for QR Token Generation - Change this in production!
APP_SECRET=your-app-secret-for-qr-tokens-change-in-production

# Next.js Public Base URL
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# WhatsApp Integration (set to false to disable)
WHATSAPP_ENABLED=false
```

**Note**: Copy `.env.example` to `.env.local` and update the values for your environment.

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables in `.env.local`

4. Start MongoDB (using docker-compose):
   ```bash
   docker-compose up -d
   ```

5. Seed the database:
   
   **Option A: Comprehensive seed (Recommended for development)**
   ```bash
   npm run seed:comprehensive
   ```
   This creates 100 customers, 15 stores, ~900 visits, and realistic data for testing.
   
   **Option B: Basic seed**
   ```bash
   npm run seed
   ```
   
   **Option C: Super admin only**
   ```bash
   npm run seed:super
   ```

6. Start the development server:
   ```bash
   npm run dev
   ```

## Usage

### Super Admin
- Login at `/login` with super admin credentials
- Access dashboard at `/dashboard/super`
- Default credentials: `admin@lewisloyalty.com` / `admin123`

### Store Admin
- Login at `/login` with store admin credentials
- Access dashboard at `/dashboard/admin`

### Customer
- Scan store QR code or visit `/visit?storeId=...&token=...`
- Register or login automatically
- View rewards at `/dashboard/customer`

## API Endpoints

### Super Admin APIs
- `POST /api/super/auth/login` - Super admin login
- `GET /api/super/stores` - List all stores
- `POST /api/super/stores` - Create store
- `PUT /api/super/stores/:id` - Update store
- `DELETE /api/super/stores/:id` - Delete store
- `POST /api/super/stores/:id/generate-qr` - Regenerate QR
- `GET /api/super/admins` - List admin users
- `POST /api/super/admins` - Create admin
- `PUT /api/super/admins/:id` - Update admin
- `DELETE /api/super/admins/:id` - Delete admin
- `GET /api/super/analytics` - System analytics

### Admin APIs
- `POST /api/admin/auth/login` - Admin login
- `GET /api/admin/store` - Get store info
- `POST /api/admin/store/generate-qr` - Generate QR
- `GET /api/admin/visits` - List visits
- `GET /api/admin/customers` - List customers
- `POST /api/admin/rewards/rules` - Create reward rules

### Customer APIs
- `POST /api/customer/validate-qr` - Validate QR token
- `POST /api/customer/check` - Check if phone exists
- `POST /api/customer/register` - Register new customer
- `POST /api/customer/scan` - Record visit and check rewards

## QR Code System

- Daily QR codes expire at midnight UTC
- Tokens use HMAC_SHA256 with APP_SECRET
- QR images stored in `/public/qrcodes/`
- Automatic regeneration via cron job

## WhatsApp Integration

- Uses whatsapp-web.js for notifications
- Requires QR code scan for initial setup
- Sends reward notifications automatically

## Database Models

- **User**: System users (superadmin/admin)
- **Store**: Store information and QR data
- **Customer**: Customer profiles and visit counts
- **Visit**: Visit records with timestamps
- **Reward**: Earned rewards with codes
- **RewardRule**: Store-specific reward configurations

## Scripts

- `scripts/seed-super-admin.ts` - Create initial super admin
- `scripts/seed-complete.ts` - Basic seeding with sample data
- `scripts/seed-comprehensive.ts` - **NEW!** Comprehensive seeding with realistic data
- `scripts/daily-qr-regeneration.ts` - Manual QR regeneration
- `scripts/cron-job.ts` - Start scheduled jobs

### Seed Data Documentation

- **[SEED_DATA_GUIDE.md](./SEED_DATA_GUIDE.md)** - Complete guide to seed data
- **[SEED_QUICK_REFERENCE.md](./SEED_QUICK_REFERENCE.md)** - Quick reference for credentials and commands
- **[COMPREHENSIVE_SEED_SUMMARY.md](./COMPREHENSIVE_SEED_SUMMARY.md)** - Visual summary of generated data

## Development

- Start cron jobs: `npx tsx scripts/cron-job.ts`
- Run tests: `npm test`
- Build for production: `npm run build`

## Deployment

1. Build the application:
   ```bash
   npm run build
   ```

2. Start production server:
   ```bash
   npm start
   ```

3. Set up cron jobs on your server for daily QR regeneration

## Security

- JWT-based authentication with secure cookies
- Server-side QR token validation
- Rate limiting on sensitive endpoints
- Input validation and sanitization
- HTTPS required in production

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details
