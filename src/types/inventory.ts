export type UserRole = 'admin' | 'warehouse_manager' | 'vendor';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  vendorId?: string;
  warehouseId?: string;
  createdAt: Date;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  vendorId: string;
  vendorName: string;
  price: number;
  currentStock: number;
  reorderLevel: number;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Transaction {
  id: string;
  type: 'stock_in' | 'stock_out';
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  handler: string;
  reference?: string;
  notes?: string;
  timestamp: Date;
}

export interface Vendor {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  productsCount: number;
  performance: number;
  createdAt: Date;
}

export interface PurchaseOrder {
  id: string;
  vendorId: string;
  vendorName: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  items: PurchaseOrderItem[];
  totalAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PurchaseOrderItem {
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  unitPrice: number;
}

export interface Alert {
  id: string;
  type: 'low_stock' | 'expiry' | 'reorder' | 'vendor_response';
  title: string;
  message: string;
  productId?: string;
  severity: 'info' | 'warning' | 'critical';
  isRead: boolean;
  createdAt: Date;
}

export interface ForecastData {
  date: string;
  actual: number;
  predicted: number;
}

export interface DemandForecast {
  productId: string;
  productName: string;
  productSku: string;
  currentStock: number;
  forecastedDemand: number;
  daysUntilStockout: number;
  recommendedAction: 'reorder_now' | 'reorder_soon' | 'sufficient';
  confidence: number;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  timestamp: Date;
}

export interface StockHealth {
  totalProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  overStockCount: number;
  healthScore: number;
}

export interface Category {
  id: string;
  name: string;
  productsCount: number;
}
