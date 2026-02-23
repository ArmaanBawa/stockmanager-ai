# ProcureFlow - B2B Procurement Management Platform

A comprehensive B2B software platform designed for businesses that regularly purchase goods from manufacturers or other businesses. ProcureFlow provides complete visibility and control over orders, inventory, and purchase records in one place, enhanced with AI-based decision support.

## 🎯 Key Features

### 1. Business Setup & Multi-Tenancy
- Each business creates an account with complete data isolation
- Add suppliers, products, and business details
- Strict privacy and security with business-level data separation

### 2. Order Management & Tracking
- Create and track purchase orders with unique order IDs
- Real-time order lifecycle tracking:
  - 📋 Order Placed
  - ✅ Accepted by Supplier
  - 🏭 In Manufacturing (with detailed production stages)
  - 🚚 Dispatched
  - 📦 Delivered
- Visual timeline view showing all status changes with timestamps
- Manufacturing stage tracking: Raw Material Prep → Assembly → Quality Check → Packaging

### 3. Inventory & Lot Management
- Automatic inventory updates when orders are delivered
- Lot-wise quantity tracking with unique lot numbers
- Real-time stock level monitoring
- FIFO (First In First Out) stock deduction
- Usage tracking and consumption recording
- Automatic calculation of daily usage rates and days remaining

### 4. Digital Ledger & Records
- Permanent digital ledger of all purchases
- Automatic record creation when orders are delivered
- Filterable by supplier, product, and date range
- Complete audit trail for business records
- Replaces traditional manual ledger books

### 5. AI Intelligence Engine
- **Low Stock Detection**: Alerts when stock falls below reorder level
- **Days Remaining Prediction**: Estimates how long current stock will last
- **Demand Prediction**: Analyzes trends to predict future needs
- **Slow-Moving Inventory**: Identifies excess or unused stock
- **Duplicate Order Prevention**: Warns about multiple pending orders
- **Demand Trend Analysis**: Detects increasing/decreasing demand patterns

### 6. AI Assistant (Natural Language Interface)
Ask questions in plain English:
- "Where is my order from XYZ Manufacturing?"
- "How much stock is left for Product A?"
- "Should I reorder this product now?"
- "What did I purchase last month from Supplier X?"
- "How is my business doing?"
- "Any recommendations?"

The AI understands your intent, retrieves your business data, and responds in clear, actionable language.

### 7. Security & Access Control
- JWT-based authentication with NextAuth.js
- Role-based access control (ready for expansion)
- Complete business-level data isolation
- Secure password hashing with bcrypt

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- SQLite (included) or PostgreSQL for production

### Quick Setup (Automated)

```bash
# Run the automated setup script
npm run setup
# or
bash setup.sh
```

This will install dependencies, setup the database, and optionally seed sample data.

### Manual Setup

See **[QUICKSTART.md](./QUICKSTART.md)** for detailed step-by-step instructions.

**TL;DR:**
```bash
npm install
npx prisma generate
npx prisma migrate dev
npm run db:seed  # Optional
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Default Login (after seeding)
- **Email**: `rahul@acme.com`
- **Password**: `password123`

## 📁 Project Structure

```
procureflow/
├── prisma/
│   ├── schema.prisma          # Database schema
│   ├── migrations/            # Database migrations
│   └── seed.mts               # Seed script
├── src/
│   ├── app/
│   │   ├── api/               # API routes
│   │   │   ├── orders/        # Order management endpoints
│   │   │   ├── inventory/     # Inventory endpoints
│   │   │   ├── ledger/        # Ledger endpoints
│   │   │   ├── ai/            # AI chat and insights
│   │   │   ├── suppliers/     # Supplier CRUD
│   │   │   ├── products/      # Product CRUD
│   │   │   └── auth/          # Authentication
│   │   ├── dashboard/         # Dashboard pages
│   │   │   ├── orders/        # Order management UI
│   │   │   ├── inventory/     # Inventory tracking UI
│   │   │   ├── ledger/        # Digital ledger UI
│   │   │   ├── suppliers/     # Supplier management UI
│   │   │   ├── products/      # Product management UI
│   │   │   └── assistant/     # AI chat interface
│   │   ├── login/             # Login page
│   │   └── register/          # Registration page
│   └── lib/
│       ├── prisma.ts          # Prisma client instance
│       ├── auth.ts            # NextAuth configuration
│       ├── helpers.ts          # Utility functions
│       ├── ai-engine.ts       # AI insights generation
│       └── ai-chat.ts         # Natural language processing
└── public/                     # Static assets
```

## 🗄️ Database Schema

The system uses Prisma ORM with the following core models:

- **Business**: Multi-tenant root entity
- **User**: Authentication and user management
- **Supplier**: Supplier/vendor information
- **Product**: Product catalog with pricing
- **Order**: Purchase orders with status tracking
- **OrderItem**: Order line items
- **OrderStatusHistory**: Audit trail of status changes
- **ManufacturingStage**: Detailed production tracking
- **InventoryLot**: Lot-wise inventory tracking
- **InventoryUsage**: Stock consumption records
- **LedgerEntry**: Digital ledger entries
- **AiInsight**: AI-generated recommendations

See `prisma/schema.prisma` for complete schema definition.

## 🔌 API Endpoints

### Orders
- `GET /api/orders` - List orders (optional: `?status=PLACED&supplierId=xxx`)
- `POST /api/orders` - Create new order
- `GET /api/orders/[id]` - Get order details
- `PUT /api/orders/[id]/status` - Update order status
- `PUT /api/orders/[id]/manufacturing` - Update manufacturing stage

### Inventory
- `GET /api/inventory` - Get inventory with calculations
- `POST /api/inventory` - Record stock usage

### Ledger
- `GET /api/ledger` - Get ledger entries (optional filters: `?supplierId=xxx&productId=xxx&from=2024-01-01&to=2024-12-31`)

### Suppliers
- `GET /api/suppliers` - List suppliers
- `POST /api/suppliers` - Create supplier
- `PUT /api/suppliers/[id]` - Update supplier
- `DELETE /api/suppliers/[id]` - Delete supplier

### Products
- `GET /api/products` - List products
- `POST /api/products` - Create product
- `PUT /api/products/[id]` - Update product
- `DELETE /api/products/[id]` - Delete product

### AI
- `POST /api/ai/chat` - Natural language query
- `GET /api/ai/insights` - Get AI insights

### Dashboard
- `GET /api/dashboard` - Get dashboard statistics

All endpoints require authentication and automatically filter by business ID.

## 🎨 UI Features

- **Modern Dark Theme**: Beautiful, professional interface
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Timeline Views**: Visual order progress tracking
- **Real-time Updates**: Instant feedback on actions
- **Interactive Dashboards**: Comprehensive business overview
- **AI Chat Interface**: Natural language interaction

## 🔒 Security

- **Multi-tenant Isolation**: Every query filters by `businessId`
- **JWT Authentication**: Secure session management
- **Password Hashing**: bcrypt with 12 rounds
- **SQL Injection Protection**: Prisma ORM parameterized queries
- **XSS Protection**: React's built-in escaping

## 🧠 How the AI Works

### Intelligence Engine
The AI engine (`/lib/ai-engine.ts`) continuously analyzes:
- Order history and patterns
- Inventory levels and usage rates
- Stock consumption trends
- Reorder levels and thresholds

It generates insights like:
- Low stock alerts
- Days remaining estimates
- Demand predictions
- Slow-moving inventory warnings
- Duplicate order detection

### Natural Language Assistant
The AI assistant (`/lib/ai-chat.ts`) uses intent recognition to:
1. Parse natural language queries
2. Extract entities (supplier names, product names, dates)
3. Query relevant business data
4. Apply AI logic for recommendations
5. Respond in clear, business-friendly language

The assistant only uses your business data and never hallucinates or accesses external information.

## 📊 Workflow Example

1. **Setup**: Business registers and adds suppliers/products
2. **Order**: Create purchase order with items
3. **Tracking**: Order progresses through statuses with timeline view
4. **Manufacturing**: Track detailed production stages
5. **Delivery**: Mark as delivered → Auto-creates inventory lots and ledger entries
6. **Inventory**: Stock automatically updated, lot-wise tracking begins
7. **Usage**: Record stock consumption → Inventory updated using FIFO
8. **AI Insights**: System analyzes patterns and provides recommendations
9. **AI Assistant**: Ask questions in natural language for quick answers

## 🚢 Deployment

### Environment Variables

Create a `.env` file:

```env
DATABASE_URL="file:./dev.db"  # SQLite for dev, PostgreSQL for prod
NEXTAUTH_SECRET="your-secret-key-here"  # Generate a secure random string
NEXTAUTH_URL="http://localhost:3000"  # Your domain in production
```

### Production Database (PostgreSQL)

1. Update `prisma/schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

2. Update `DATABASE_URL` in `.env`:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/procureflow"
```

3. Run migrations:
```bash
npx prisma migrate deploy
```

### Deploy to Vercel

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy!

## 📚 Documentation

- **[QUICKSTART.md](./QUICKSTART.md)** - Get started in 5 minutes
- **[IMPLEMENTATION.md](./IMPLEMENTATION.md)** - Step-by-step implementation guide
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Detailed system architecture and design decisions
- **[IMPLEMENTATION_CHECKLIST.md](./IMPLEMENTATION_CHECKLIST.md)** - Complete feature checklist

## 🛠️ Development

### Database Migrations

```bash
# Create a new migration
npx prisma migrate dev --name migration_name

# Apply migrations (production)
npx prisma migrate deploy
```

### Seeding Data

```bash
# Using npm script
npm run db:seed

# Or via API (after starting server)
curl -X POST http://localhost:3000/api/seed
```

### Prisma Studio

View and edit database data:
```bash
npx prisma studio
```

## 🎯 Roadmap

Potential future enhancements:
- Supplier portal for status updates
- Email notifications
- Advanced analytics and charts
- PDF/Excel export
- Mobile app
- Integration APIs (accounting, ERPs)
- Multi-currency support
- Document management
- Advanced role-based permissions
- Machine learning for demand forecasting

## 📝 License

This project is private and proprietary.

## 🤝 Support

For questions or issues, please contact the development team.

---

**ProcureFlow** - Smart procurement management powered by AI 🚀
