export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  businessId: string;
  businessName: string;
  role: string;
  subscriptionActive?: boolean;
  subscriptionStatus?: string;
}

// Dashboard
export interface DashboardStats {
  totalOrders: number;
  activeOrders: number;
  totalCustomers: number;
  totalProducts: number;
  totalStockValue: number;
  totalStockUnits: number;
  totalSpent: number;
}

export interface DashboardData {
  stats: DashboardStats;
  recentOrders: Order[];
}

export interface Insight {
  type: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
}

// Orders
export interface OrderItem {
  product: { name: string };
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface StatusHistory {
  status: string;
  note?: string;
  changedBy?: { id: string; name: string };
  createdAt: string;
}

export interface ManufacturingStage {
  id: string;
  stage: string;
  status: string;
  note?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  notes?: string;
  createdAt: string;
  customer: { id: string; name: string };
  createdBy?: { id: string; name: string };
  items: OrderItem[];
  statusHistory?: StatusHistory[];
  manufacturingStages?: ManufacturingStage[];
}

// Products & Inventory
export interface Product {
  id: string;
  name: string;
  sku?: string;
  description?: string;
  unitPrice: number;
  unit: string;
  reorderLevel: number;
  customer?: { id: string; name: string };
  createdBy?: { id: string; name: string };
}

export interface InventoryLot {
  id: string;
  lotNumber: string;
  quantity: number;
  remainingQty: number;
  costPerUnit: number;
  receivedAt: string;
}

export interface InventoryItem {
  productId: string;
  productName: string;
  sku?: string;
  unit: string;
  customerName?: string;
  reorderLevel: number;
  totalStock: number;
  totalUsed: number;
  dailyUsageRate: number;
  daysRemaining: number | null;
  isLowStock: boolean;
  lots: InventoryLot[];
}

// Customers
export interface Customer {
  id: string;
  name: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address?: string;
  createdBy?: { id: string; name: string };
  _count: { products: number; orders: number };
}

// Ledger
export interface LedgerEntry {
  id: string;
  type: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  description?: string;
  customerId?: string;
  createdAt: string;
  product: { id: string; name: string };
  order?: { id: string; orderNumber: string };
}

export interface LedgerSummary {
  totalSales: number;
  totalRevenue: number;
  totalItemsSold: number;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  image?: string;
  createdAt: string;
}
