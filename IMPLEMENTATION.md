# ProcureFlow - Step-by-Step Implementation Guide

This guide walks you through implementing and running the ProcureFlow platform from scratch.

## Prerequisites

- Node.js 18+ installed
- npm or yarn package manager
- Git (optional, for version control)

## Step 1: Project Setup

### 1.1 Install Dependencies

```bash
cd procureflow
npm install
```

This installs:
- Next.js 16 (React framework)
- Prisma (ORM for database)
- NextAuth.js (Authentication)
- bcryptjs (Password hashing)
- TypeScript and related types

### 1.2 Environment Configuration

Create `.env.local` file:

```bash
cp .env.example .env.local
```

Edit `.env.local` and set:

```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="generate-a-random-secret-here"
NEXTAUTH_URL="http://localhost:3000"
```

**Generate NEXTAUTH_SECRET:**
```bash
# On macOS/Linux:
openssl rand -base64 32

# Or use an online generator
```

## Step 2: Database Setup

### 2.1 Generate Prisma Client

```bash
npx prisma generate
```

This creates the Prisma client based on `schema.prisma`.

### 2.2 Run Database Migrations

```bash
npx prisma migrate dev
```

This:
- Creates the SQLite database file (`dev.db`)
- Creates all tables based on the schema
- Sets up relationships and constraints

### 2.3 (Optional) Seed Sample Data

```bash
npm run db:seed
```

Or use the API endpoint after starting the server:
```bash
curl -X POST http://localhost:3000/api/seed
```

This creates:
- A sample business (Acme Electronics)
- Sample suppliers
- Sample products
- Sample orders with various statuses
- Inventory lots
- Ledger entries

**Default Login Credentials (after seeding):**
- Email: `rahul@acme.com`
- Password: `password123`

## Step 3: Start Development Server

```bash
npm run dev
```

The server starts at: **http://localhost:3000**

## Step 4: Verify Implementation

### 4.1 Test Authentication

1. Navigate to http://localhost:3000
2. You'll be redirected to `/login`
3. Register a new account or use seeded credentials
4. After login, you should see the dashboard

### 4.2 Test Core Features

#### A. Supplier Management
- Go to `/dashboard/suppliers`
- Click "+ Add Supplier"
- Fill in supplier details
- Verify supplier appears in list
- Test Edit and Delete

#### B. Product Management
- Go to `/dashboard/products`
- Click "+ Add Product"
- Fill in product details (name, price, reorder level)
- Link to a supplier
- Verify product appears in list

#### C. Order Management
- Go to `/dashboard/orders`
- Click "+ New Order"
- Select supplier and add products
- Place order
- View order details
- Update order status (PLACED → ACCEPTED → IN_MANUFACTURING → DISPATCHED → DELIVERED)
- Check timeline view

#### D. Manufacturing Stages
- When order status is "IN_MANUFACTURING"
- View manufacturing stages
- Update stages: PENDING → IN_PROGRESS → COMPLETED

#### E. Inventory Management
- Mark an order as "DELIVERED"
- Go to `/dashboard/inventory`
- Verify inventory lots are created automatically
- Check stock levels
- Record stock usage
- Verify FIFO deduction

#### F. Digital Ledger
- Go to `/dashboard/ledger`
- Verify ledger entries are created when orders are delivered
- Test filters (supplier, product, date range)

#### G. AI Insights
- Go to `/dashboard`
- Check "AI Insights" section
- Verify insights like:
  - Low stock alerts
  - Days remaining estimates
  - Slow-moving inventory warnings

#### H. AI Assistant
- Go to `/dashboard/assistant`
- Try queries like:
  - "Where is my order from [supplier name]?"
  - "How much stock is left for [product name]?"
  - "Should I reorder [product name]?"
  - "What did I purchase last month?"
  - "How is my business doing?"

## Step 5: Database Management

### View Database in Prisma Studio

```bash
npx prisma studio
```

Opens a GUI at http://localhost:5555 to view and edit database records.

### Create New Migration

When you modify `schema.prisma`:

```bash
npx prisma migrate dev --name your_migration_name
```

### Reset Database (Development Only)

```bash
npx prisma migrate reset
```

⚠️ **Warning**: This deletes all data!

## Step 6: Production Deployment

### 6.1 Switch to PostgreSQL

Update `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Update `.env.local`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/procureflow"
```

Run migrations:

```bash
npx prisma migrate deploy
```

### 6.2 Deploy to Vercel

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your repository
4. Add environment variables:
   - `DATABASE_URL`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL` (your domain)
5. Deploy!

## Architecture Overview

### File Structure

```
procureflow/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── migrations/            # Database migrations
├── src/
│   ├── app/
│   │   ├── api/               # API routes (backend)
│   │   │   ├── orders/       # Order endpoints
│   │   │   ├── inventory/    # Inventory endpoints
│   │   │   ├── ledger/        # Ledger endpoints
│   │   │   ├── suppliers/    # Supplier CRUD
│   │   │   ├── products/     # Product CRUD
│   │   │   ├── ai/           # AI chat & insights
│   │   │   └── auth/         # Authentication
│   │   ├── dashboard/        # Frontend pages
│   │   │   ├── orders/       # Order management UI
│   │   │   ├── inventory/    # Inventory UI
│   │   │   ├── ledger/       # Ledger UI
│   │   │   ├── suppliers/    # Supplier management
│   │   │   ├── products/     # Product management
│   │   │   └── assistant/    # AI chat interface
│   │   ├── login/            # Login page
│   │   └── register/        # Registration page
│   └── lib/
│       ├── prisma.ts         # Prisma client
│       ├── auth.ts           # NextAuth config
│       ├── helpers.ts           # Utility functions
│       ├── ai-engine.ts    # AI insights logic
│       └── ai-chat.ts      # Natural language processing
└── public/                  # Static assets
```

### Data Flow

1. **User Action** → Frontend (React component)
2. **API Call** → `/api/*` route
3. **Authentication** → `getSessionUser()` verifies session
4. **Database Query** → Prisma with `businessId` filter
5. **Response** → JSON data back to frontend
6. **UI Update** → React state updates

### Multi-Tenant Isolation

Every database query includes:

```typescript
where: { businessId: user.businessId }
```

This ensures complete data isolation between businesses.

## Troubleshooting

### Database Issues

**Error: "Database file locked"**
- Close Prisma Studio if open
- Restart the dev server

**Error: "Migration failed"**
- Check `prisma/migrations/` folder
- Try: `npx prisma migrate reset` (⚠️ deletes data)

### Authentication Issues

**Error: "Unauthorized"**
- Check `.env.local` has `NEXTAUTH_SECRET`
- Restart dev server after changing env vars
- Clear browser cookies

### Build Issues

**Error: "Module not found"**
- Run `npm install` again
- Delete `node_modules` and `.next` folders, then reinstall

**Error: "Prisma client not generated"**
- Run `npx prisma generate`

## Next Steps

1. **Customize Business Logic**: Modify AI insights in `src/lib/ai-engine.ts`
2. **Add Features**: Extend API routes and frontend pages
3. **Styling**: Modify `src/app/globals.css` for custom themes
4. **Database**: Add new models in `prisma/schema.prisma`
5. **Deploy**: Follow Step 6 for production deployment

## Support

For issues or questions:
1. Check `ARCHITECTURE.md` for system design details
2. Review `README.md` for feature documentation
3. Check Prisma and Next.js documentation

---

**You're all set!** 🚀 The ProcureFlow platform is ready to use.
