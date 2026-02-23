# ProcureFlow - Quick Start Guide

Get up and running in 5 minutes! ⚡

## Option 1: Automated Setup (Recommended)

```bash
# Run the setup script
npm run setup
# or
bash setup.sh
```

This will:
- ✅ Install all dependencies
- ✅ Generate Prisma client
- ✅ Create `.env.local` with secure secrets
- ✅ Run database migrations
- ✅ Optionally seed sample data

## Option 2: Manual Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Environment

Create `.env.local`:

```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="your-random-secret-here"
NEXTAUTH_URL="http://localhost:3000"
```

Generate secret:
```bash
openssl rand -base64 32
```

### 3. Setup Database

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# (Optional) Seed sample data
npm run db:seed
```

### 4. Start Server

```bash
npm run dev
```

Visit: **http://localhost:3000**

## First Login

### If you seeded data:
- **Email**: `rahul@acme.com`
- **Password**: `password123`

### Or register a new account:
1. Click "Create one" on login page
2. Fill in your details
3. Your business account will be created automatically

## What's Next?

1. **Add Suppliers** → `/dashboard/suppliers`
2. **Add Products** → `/dashboard/products`
3. **Create Orders** → `/dashboard/orders`
4. **Track Inventory** → `/dashboard/inventory`
5. **View Ledger** → `/dashboard/ledger`
6. **Ask AI Assistant** → `/dashboard/assistant`

## Common Commands

```bash
# Start development server
npm run dev

# View database in browser
npm run db:studio

# Create new migration
npm run db:migrate -- --name migration_name

# Seed database
npm run db:seed
```

## Troubleshooting

**Port 3000 already in use?**
```bash
# Kill the process
lsof -ti:3000 | xargs kill -9
```

**Database locked?**
- Close Prisma Studio if open
- Restart dev server

**Module not found?**
```bash
rm -rf node_modules .next
npm install
```

---

**Ready to go!** 🚀 Check `IMPLEMENTATION.md` for detailed documentation.
