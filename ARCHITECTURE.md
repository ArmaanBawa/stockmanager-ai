# ProcureFlow - System Architecture

## Overview

ProcureFlow is a comprehensive B2B procurement management platform that provides businesses with complete visibility and control over orders, inventory, and purchase records, enhanced with AI-powered decision support.

## System Architecture

### Technology Stack

- **Frontend**: Next.js 16 (React 19) with App Router
- **Backend**: Next.js API Routes (Serverless Functions)
- **Database**: SQLite (via Prisma ORM) - easily upgradeable to PostgreSQL
- **Authentication**: NextAuth.js with JWT sessions
- **AI Engine**: Custom rule-based intelligence with natural language processing
- **Styling**: Custom CSS with modern dark theme

### Architecture Pattern

The system follows a **multi-tenant SaaS architecture** with strict data isolation:

```
┌─────────────────────────────────────────────────────────┐
│                    Client Browser                        │
│              (Next.js React Application)                 │
└────────────────────┬──────────────────────────────────────┘
                     │
                     │ HTTP/HTTPS
                     │
┌────────────────────▼──────────────────────────────────────┐
│              Next.js Server (Vercel/Node.js)              │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Authentication Layer (NextAuth.js)                │  │
│  │  - JWT-based sessions                               │  │
│  │  - Business ID isolation                            │  │
│  └────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────┐  │
│  │  API Routes (Serverless Functions)                  │  │
│  │  - /api/orders                                      │  │
│  │  - /api/inventory                                   │  │
│  │  - /api/ledger                                      │  │
│  │  - /api/ai/chat                                     │  │
│  │  - /api/ai/insights                                 │  │
│  └────────────────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Business Logic Layer                               │  │
│  │  - Order management                                 │  │
│  │  - Inventory tracking                               │  │
│  │  - AI intelligence engine                           │  │
│  │  - Natural language processing                      │  │
│  └────────────────────────────────────────────────────┘  │
└────────────────────┬──────────────────────────────────────┘
                     │
                     │ Prisma ORM
                     │
┌────────────────────▼──────────────────────────────────────┐
│                    SQLite Database                         │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Multi-tenant data with businessId isolation       │  │
│  │  - Business, User, Supplier, Product               │  │
│  │  - Order, OrderItem, OrderStatusHistory            │  │
│  │  - InventoryLot, InventoryUsage                     │  │
│  │  - LedgerEntry, ManufacturingStage                 │  │
│  │  - AiInsight                                       │  │
│  └────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────┘
```

## Database Design

### Core Entities

#### 1. Business (Multi-tenant Root)
- Central entity for data isolation
- Each business has its own suppliers, products, orders, inventory, and ledger
- All queries filter by `businessId` to ensure complete isolation

#### 2. User
- Linked to a Business via `businessId`
- Authentication via email/password (bcrypt hashing)
- Session includes `businessId` for automatic filtering

#### 3. Supplier
- Belongs to a Business
- Stores contact information and details
- Can have multiple Products and Orders

#### 4. Product
- Belongs to a Business
- Optional link to Supplier
- Tracks unit price, reorder level, and unit type
- Connected to Orders, Inventory, and Ledger

#### 5. Order
- Core entity for purchase order management
- Status progression: PLACED → ACCEPTED → IN_MANUFACTURING → DISPATCHED → DELIVERED
- Contains multiple OrderItems
- Tracks status history and manufacturing stages
- Auto-creates InventoryLots and LedgerEntries on DELIVERED

#### 6. OrderStatusHistory
- Permanent audit trail of all status changes
- Timestamped records for timeline visualization

#### 7. ManufacturingStage
- Detailed production tracking when status is IN_MANUFACTURING
- Stages: RAW_MATERIAL_PREP → ASSEMBLY → QUALITY_CHECK → PACKAGING
- Each stage can be PENDING → IN_PROGRESS → COMPLETED

#### 8. InventoryLot
- Lot-wise inventory tracking
- Created automatically when order is DELIVERED
- Tracks initial quantity, remaining quantity, and cost per unit
- FIFO (First In First Out) deduction when stock is used

#### 9. InventoryUsage
- Records when stock is consumed (sold, used in production, etc.)
- Used to calculate daily usage rates and predict stock depletion

#### 10. LedgerEntry
- Permanent digital ledger of all purchases
- Auto-created when orders are delivered
- Filterable by supplier, product, date range
- Acts as audit trail and purchase history

#### 11. AiInsight
- Stores AI-generated recommendations and alerts
- Types: LOW_STOCK, OUT_OF_STOCK, REORDER_SOON, SLOW_MOVING, DUPLICATE_ORDERS, DEMAND_INCREASING
- Severity levels: info, warning, critical

### Data Isolation Strategy

**Every database query includes `businessId` filtering:**

```typescript
// Example from API route
const user = await getSessionUser();
if (!user?.businessId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

const orders = await prisma.order.findMany({
    where: { businessId: user.businessId }, // ← Critical isolation
    // ... rest of query
});
```

This ensures:
- Complete data privacy between businesses
- No cross-tenant data leakage
- Simple, reliable security model

## Order Management System

### Order Lifecycle

```
PLACED
  ↓ (Supplier accepts)
ACCEPTED
  ↓ (Production begins)
IN_MANUFACTURING
  ├─ RAW_MATERIAL_PREP
  ├─ ASSEMBLY
  ├─ QUALITY_CHECK
  └─ PACKAGING
  ↓ (All stages complete)
DISPATCHED
  ↓ (Delivery confirmed)
DELIVERED
  ├─ Auto-create InventoryLots
  └─ Auto-create LedgerEntries
```

### Key Features

1. **Status Tracking**: Every status change is recorded in `OrderStatusHistory` with timestamps
2. **Timeline View**: Visual representation of order progress
3. **Manufacturing Stages**: Detailed production tracking with individual stage status
4. **Automatic Inventory**: When marked DELIVERED, inventory lots are created automatically
5. **Automatic Ledger**: Purchase records are added to digital ledger automatically

## Inventory Management

### Lot-Based Tracking

- Each delivery creates a new `InventoryLot` with unique lot number
- Tracks initial quantity and remaining quantity separately
- FIFO (First In First Out) deduction when stock is used

### Automatic Updates

- **On Order Delivery**: New lots created automatically
- **On Stock Usage**: Remaining quantities updated using FIFO
- **Real-time Calculations**: Total stock, usage rates, days remaining

### Stock Calculations

```typescript
// Daily usage rate (last 30 days)
const recentUsage = inventoryUsages
    .filter(u => new Date(u.createdAt) >= thirtyDaysAgo)
    .reduce((sum, u) => sum + u.quantity, 0);
const dailyUsageRate = recentUsage / 30;

// Days remaining estimate
const daysRemaining = dailyUsageRate > 0 
    ? Math.round(totalStock / dailyUsageRate) 
    : null;
```

## AI Intelligence Engine

### Insight Generation (`/lib/ai-engine.ts`)

The AI engine analyzes business data and generates actionable insights:

#### 1. Low Stock Detection
- Compares current stock to reorder level
- Alerts when stock is at or below threshold

#### 2. Out of Stock Alerts
- Critical alerts when products are completely out of stock

#### 3. Days Remaining Prediction
- Calculates daily usage rate from last 30 days
- Estimates how many days current stock will last
- Warns when less than 14 days remaining

#### 4. Slow-Moving Inventory
- Identifies products with stock but no usage in 30 days
- Helps identify excess inventory

#### 5. Duplicate Order Prevention
- Detects multiple pending orders for same product
- Warns about potential duplicate purchases

#### 6. Demand Prediction
- Analyzes monthly usage trends
- Detects increasing demand patterns
- Suggests increasing order quantities

### AI Assistant (`/lib/ai-chat.ts`)

Natural language interface that understands business queries:

#### Supported Intents

1. **Order Tracking**
   - "Where is my order from XYZ Manufacturing?"
   - "Show me order status"
   - Matches supplier names and shows recent orders

2. **Stock Queries**
   - "How much stock is left for Product A?"
   - "Show me inventory"
   - Provides detailed stock information with usage rates

3. **Reorder Advice**
   - "Should I reorder this product now?"
   - "What needs reordering?"
   - Uses AI insights to provide recommendations

4. **Purchase History**
   - "What did I purchase last month from Supplier X?"
   - "Show me recent purchases"
   - Filters ledger entries by time and supplier

5. **Supplier Information**
   - "Show me my suppliers"
   - Lists all suppliers with order/product counts

6. **Business Summary**
   - "How is my business doing?"
   - "Give me an overview"
   - Provides comprehensive business statistics

#### Intent Recognition

Uses keyword matching and pattern recognition:
- Extracts supplier names from queries
- Matches product names
- Parses time references (last month, last week, etc.)
- Falls back to helpful suggestions if intent unclear

## Security & Access Control

### Authentication Flow

1. User registers/logs in with email and password
2. Password is hashed using bcrypt (12 rounds)
3. NextAuth creates JWT session with `businessId`
4. All API routes verify session and extract `businessId`
5. All database queries filter by `businessId`

### Data Isolation

- **Session-based**: `businessId` stored in JWT token
- **Query-level**: Every Prisma query includes `where: { businessId }`
- **API-level**: `getSessionUser()` helper ensures user is authenticated
- **No cross-tenant access**: Impossible to access another business's data

### Security Best Practices

- Passwords hashed with bcrypt
- JWT tokens for stateless authentication
- Server-side session validation
- SQL injection protection via Prisma ORM
- XSS protection via React's built-in escaping

## API Design

### RESTful Endpoints

#### Orders
- `GET /api/orders` - List orders (with optional status/supplier filters)
- `POST /api/orders` - Create new order
- `GET /api/orders/[id]` - Get order details
- `PUT /api/orders/[id]/status` - Update order status
- `PUT /api/orders/[id]/manufacturing` - Update manufacturing stage

#### Inventory
- `GET /api/inventory` - Get inventory with calculations
- `POST /api/inventory` - Record stock usage

#### Ledger
- `GET /api/ledger` - Get ledger entries (with filters)

#### Suppliers
- `GET /api/suppliers` - List suppliers
- `POST /api/suppliers` - Create supplier
- `PUT /api/suppliers/[id]` - Update supplier
- `DELETE /api/suppliers/[id]` - Delete supplier

#### Products
- `GET /api/products` - List products
- `POST /api/products` - Create product
- `PUT /api/products/[id]` - Update product
- `DELETE /api/products/[id]` - Delete product

#### AI
- `POST /api/ai/chat` - Natural language query
- `GET /api/ai/insights` - Get AI insights

#### Dashboard
- `GET /api/dashboard` - Get dashboard statistics

### Response Format

All API responses follow consistent format:
```typescript
// Success
{ data: {...} }

// Error
{ error: "Error message" }
```

## Frontend Architecture

### Page Structure

- `/` - Landing page
- `/login` - Login page
- `/register` - Registration page
- `/dashboard` - Main dashboard with stats and insights
- `/dashboard/orders` - Order management with timeline view
- `/dashboard/inventory` - Inventory tracking with lot details
- `/dashboard/ledger` - Digital ledger with filtering
- `/dashboard/suppliers` - Supplier management
- `/dashboard/products` - Product management
- `/dashboard/assistant` - AI chat interface

### Component Patterns

- **Client Components**: All pages are client components for interactivity
- **Server Components**: API routes handle server-side logic
- **Shared Styles**: Global CSS with CSS variables for theming
- **Responsive Design**: Mobile-friendly with flexible layouts

### State Management

- React hooks (`useState`, `useEffect`) for local state
- Server-side data fetching via API routes
- Real-time updates via manual refresh (can be enhanced with polling/websockets)

## Deployment Considerations

### Database

Currently using SQLite for development. For production:

1. **PostgreSQL** (Recommended)
   - Update `schema.prisma` datasource
   - Change `provider = "postgresql"`
   - Update `DATABASE_URL` environment variable
   - Run migrations

2. **Connection Pooling**
   - Use Prisma connection pooling for serverless
   - Configure `connection_limit` in Prisma

### Environment Variables

```env
DATABASE_URL="file:./dev.db"  # SQLite (dev) or PostgreSQL connection string (prod)
NEXTAUTH_SECRET="your-secret-key"  # Change in production!
NEXTAUTH_URL="http://localhost:3000"  # Your domain in production
```

### Scaling Considerations

1. **Database**: Upgrade to PostgreSQL for better performance
2. **Caching**: Add Redis for frequently accessed data
3. **File Storage**: Use S3/Cloud Storage for attachments
4. **Background Jobs**: Use queue system for AI insights generation
5. **Real-time Updates**: Add WebSockets for live order tracking
6. **CDN**: Use CDN for static assets

## Future Enhancements

### Potential Features

1. **Supplier Portal**: Allow suppliers to update order status directly
2. **Email Notifications**: Send alerts for order status changes
3. **Advanced Analytics**: Charts and graphs for trends
4. **Export Functionality**: PDF reports, Excel exports
5. **Mobile App**: React Native app for on-the-go access
6. **Integration APIs**: Connect with accounting software, ERPs
7. **Multi-currency Support**: Handle international suppliers
8. **Document Management**: Attach invoices, receipts, contracts
9. **Role-based Permissions**: Admin, Manager, Viewer roles
10. **Advanced AI**: Machine learning for demand forecasting

## Development Workflow

### Setup

```bash
npm install
npx prisma generate
npx prisma migrate dev
npm run db:seed  # Optional: seed with sample data
npm run dev
```

### Database Migrations

```bash
# Create migration
npx prisma migrate dev --name migration_name

# Apply migrations
npx prisma migrate deploy
```

### Code Structure

```
procureflow/
├── prisma/
│   ├── schema.prisma       # Database schema
│   └── migrations/         # Database migrations
├── src/
│   ├── app/
│   │   ├── api/            # API routes
│   │   └── dashboard/         # Frontend pages
│   └── lib/
│       ├── prisma.ts         # Prisma client
│       ├── auth.ts           # NextAuth config
│       ├── helpers.ts         # Utility functions
│       ├── ai-engine.ts      # AI insights generation
│       └── ai-chat.ts        # Natural language processing
└── public/                   # Static assets
```

## Conclusion

ProcureFlow is a well-architected, scalable B2B procurement platform with:

- ✅ Complete multi-tenant data isolation
- ✅ Comprehensive order tracking with manufacturing stages
- ✅ Automatic inventory and ledger management
- ✅ AI-powered insights and natural language assistant
- ✅ Modern, responsive UI
- ✅ Secure authentication and authorization
- ✅ Extensible architecture for future enhancements

The system is production-ready and can be easily scaled and enhanced as business needs grow.
