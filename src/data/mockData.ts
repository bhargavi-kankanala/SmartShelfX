import { Product, Transaction, Vendor, PurchaseOrder, Alert, DemandForecast, AuditLog, Category, ForecastData } from '@/types/inventory';

export const CATEGORIES: Category[] = [
  { id: 'cat_001', name: 'Electronics', productsCount: 45 },
  { id: 'cat_002', name: 'Office Supplies', productsCount: 120 },
  { id: 'cat_003', name: 'Furniture', productsCount: 35 },
  { id: 'cat_004', name: 'Food & Beverages', productsCount: 89 },
  { id: 'cat_005', name: 'Healthcare', productsCount: 67 },
];

export const VENDORS: Vendor[] = [
  { id: 'vnd_001', name: 'Acme Supplies', email: 'contact@acme.com', phone: '+1 555-0100', address: '123 Industrial Ave, NY', productsCount: 45, performance: 92, createdAt: new Date('2023-01-15') },
  { id: 'vnd_002', name: 'TechPro Distributors', email: 'sales@techpro.com', phone: '+1 555-0101', address: '456 Tech Park, CA', productsCount: 38, performance: 88, createdAt: new Date('2023-03-20') },
  { id: 'vnd_003', name: 'Global Goods Inc', email: 'orders@globalgods.com', phone: '+1 555-0102', address: '789 Commerce Blvd, TX', productsCount: 62, performance: 95, createdAt: new Date('2023-02-10') },
  { id: 'vnd_004', name: 'Prime Materials', email: 'info@primemats.com', phone: '+1 555-0103', address: '321 Supply St, FL', productsCount: 29, performance: 78, createdAt: new Date('2023-05-05') },
  { id: 'vnd_005', name: 'QuickStock Co', email: 'support@quickstock.com', phone: '+1 555-0104', address: '654 Warehouse Way, WA', productsCount: 51, performance: 85, createdAt: new Date('2023-04-12') },
];

export const PRODUCTS: Product[] = [
  { id: 'prd_001', sku: 'ELEC-001', name: 'Wireless Mouse Pro', description: 'Ergonomic wireless mouse with precision tracking', category: 'Electronics', vendorId: 'vnd_001', vendorName: 'Acme Supplies', price: 49.99, currentStock: 156, reorderLevel: 50, createdAt: new Date('2024-01-10'), updatedAt: new Date('2024-03-15') },
  { id: 'prd_002', sku: 'ELEC-002', name: 'USB-C Hub 7-in-1', description: 'Multi-port USB-C hub with HDMI output', category: 'Electronics', vendorId: 'vnd_002', vendorName: 'TechPro Distributors', price: 79.99, currentStock: 42, reorderLevel: 30, createdAt: new Date('2024-01-12'), updatedAt: new Date('2024-03-10') },
  { id: 'prd_003', sku: 'OFF-001', name: 'Premium Notebook A5', description: 'Hardcover notebook with 200 pages', category: 'Office Supplies', vendorId: 'vnd_003', vendorName: 'Global Goods Inc', price: 12.99, currentStock: 523, reorderLevel: 100, createdAt: new Date('2024-01-15'), updatedAt: new Date('2024-03-18') },
  { id: 'prd_004', sku: 'OFF-002', name: 'Gel Pen Set (12pc)', description: 'Premium gel pens in assorted colors', category: 'Office Supplies', vendorId: 'vnd_003', vendorName: 'Global Goods Inc', price: 18.99, currentStock: 245, reorderLevel: 75, createdAt: new Date('2024-01-18'), updatedAt: new Date('2024-03-12') },
  { id: 'prd_005', sku: 'FURN-001', name: 'Ergonomic Office Chair', description: 'Adjustable office chair with lumbar support', category: 'Furniture', vendorId: 'vnd_004', vendorName: 'Prime Materials', price: 299.99, currentStock: 18, reorderLevel: 20, createdAt: new Date('2024-01-20'), updatedAt: new Date('2024-03-20') },
  { id: 'prd_006', sku: 'FURN-002', name: 'Standing Desk Electric', description: 'Height adjustable electric standing desk', category: 'Furniture', vendorId: 'vnd_004', vendorName: 'Prime Materials', price: 549.99, currentStock: 8, reorderLevel: 15, createdAt: new Date('2024-01-22'), updatedAt: new Date('2024-03-08') },
  { id: 'prd_007', sku: 'FOOD-001', name: 'Organic Coffee Beans 1kg', description: 'Premium arabica coffee beans', category: 'Food & Beverages', vendorId: 'vnd_005', vendorName: 'QuickStock Co', price: 24.99, currentStock: 89, reorderLevel: 40, createdAt: new Date('2024-01-25'), updatedAt: new Date('2024-03-22') },
  { id: 'prd_008', sku: 'FOOD-002', name: 'Green Tea Box (50 bags)', description: 'Organic green tea bags', category: 'Food & Beverages', vendorId: 'vnd_005', vendorName: 'QuickStock Co', price: 15.99, currentStock: 167, reorderLevel: 60, createdAt: new Date('2024-01-28'), updatedAt: new Date('2024-03-25') },
  { id: 'prd_009', sku: 'HLTH-001', name: 'First Aid Kit Premium', description: 'Complete first aid kit with 150 items', category: 'Healthcare', vendorId: 'vnd_001', vendorName: 'Acme Supplies', price: 45.99, currentStock: 34, reorderLevel: 25, createdAt: new Date('2024-02-01'), updatedAt: new Date('2024-03-15') },
  { id: 'prd_010', sku: 'HLTH-002', name: 'Hand Sanitizer 500ml', description: '70% alcohol hand sanitizer', category: 'Healthcare', vendorId: 'vnd_001', vendorName: 'Acme Supplies', price: 8.99, currentStock: 412, reorderLevel: 150, createdAt: new Date('2024-02-05'), updatedAt: new Date('2024-03-28') },
  { id: 'prd_011', sku: 'ELEC-003', name: 'Mechanical Keyboard RGB', description: 'Gaming mechanical keyboard with RGB backlight', category: 'Electronics', vendorId: 'vnd_002', vendorName: 'TechPro Distributors', price: 129.99, currentStock: 5, reorderLevel: 20, createdAt: new Date('2024-02-08'), updatedAt: new Date('2024-03-30') },
  { id: 'prd_012', sku: 'ELEC-004', name: '27" 4K Monitor', description: 'Ultra HD IPS display monitor', category: 'Electronics', vendorId: 'vnd_002', vendorName: 'TechPro Distributors', price: 399.99, currentStock: 12, reorderLevel: 10, createdAt: new Date('2024-02-10'), updatedAt: new Date('2024-03-28') },
];

export const TRANSACTIONS: Transaction[] = [
  { id: 'txn_001', type: 'stock_in', productId: 'prd_001', productName: 'Wireless Mouse Pro', productSku: 'ELEC-001', quantity: 100, handler: 'John Warehouse', reference: 'PO-2024-001', notes: 'Regular restocking', timestamp: new Date('2024-03-20T09:30:00') },
  { id: 'txn_002', type: 'stock_out', productId: 'prd_003', productName: 'Premium Notebook A5', productSku: 'OFF-001', quantity: 50, handler: 'John Warehouse', reference: 'ORD-2024-156', notes: 'Bulk order for Corp XYZ', timestamp: new Date('2024-03-20T11:45:00') },
  { id: 'txn_003', type: 'stock_in', productId: 'prd_007', productName: 'Organic Coffee Beans 1kg', productSku: 'FOOD-001', quantity: 60, handler: 'John Warehouse', reference: 'PO-2024-002', timestamp: new Date('2024-03-21T08:15:00') },
  { id: 'txn_004', type: 'stock_out', productId: 'prd_005', productName: 'Ergonomic Office Chair', productSku: 'FURN-001', quantity: 5, handler: 'John Warehouse', reference: 'ORD-2024-157', notes: 'Office setup order', timestamp: new Date('2024-03-21T14:20:00') },
  { id: 'txn_005', type: 'stock_out', productId: 'prd_011', productName: 'Mechanical Keyboard RGB', productSku: 'ELEC-003', quantity: 8, handler: 'John Warehouse', reference: 'ORD-2024-158', timestamp: new Date('2024-03-22T10:00:00') },
  { id: 'txn_006', type: 'stock_in', productId: 'prd_010', productName: 'Hand Sanitizer 500ml', productSku: 'HLTH-002', quantity: 200, handler: 'John Warehouse', reference: 'PO-2024-003', notes: 'Emergency restock', timestamp: new Date('2024-03-22T15:30:00') },
  { id: 'txn_007', type: 'stock_out', productId: 'prd_002', productName: 'USB-C Hub 7-in-1', productSku: 'ELEC-002', quantity: 15, handler: 'John Warehouse', reference: 'ORD-2024-159', timestamp: new Date('2024-03-23T09:45:00') },
  { id: 'txn_008', type: 'stock_in', productId: 'prd_004', productName: 'Gel Pen Set (12pc)', productSku: 'OFF-002', quantity: 100, handler: 'John Warehouse', reference: 'PO-2024-004', timestamp: new Date('2024-03-23T13:00:00') },
];

export const PURCHASE_ORDERS: PurchaseOrder[] = [
  {
    id: 'po_001',
    vendorId: 'vnd_002',
    vendorName: 'TechPro Distributors',
    status: 'pending',
    items: [
      { productId: 'prd_011', productName: 'Mechanical Keyboard RGB', productSku: 'ELEC-003', quantity: 30, unitPrice: 89.99 },
      { productId: 'prd_012', productName: '27" 4K Monitor', productSku: 'ELEC-004', quantity: 15, unitPrice: 320.00 },
    ],
    totalAmount: 7499.70,
    createdAt: new Date('2024-03-25'),
    updatedAt: new Date('2024-03-25'),
  },
  {
    id: 'po_002',
    vendorId: 'vnd_004',
    vendorName: 'Prime Materials',
    status: 'approved',
    items: [
      { productId: 'prd_005', productName: 'Ergonomic Office Chair', productSku: 'FURN-001', quantity: 20, unitPrice: 220.00 },
      { productId: 'prd_006', productName: 'Standing Desk Electric', productSku: 'FURN-002', quantity: 10, unitPrice: 450.00 },
    ],
    totalAmount: 8900.00,
    createdAt: new Date('2024-03-24'),
    updatedAt: new Date('2024-03-25'),
  },
  {
    id: 'po_003',
    vendorId: 'vnd_001',
    vendorName: 'Acme Supplies',
    status: 'completed',
    items: [
      { productId: 'prd_001', productName: 'Wireless Mouse Pro', productSku: 'ELEC-001', quantity: 100, unitPrice: 35.00 },
    ],
    totalAmount: 3500.00,
    createdAt: new Date('2024-03-20'),
    updatedAt: new Date('2024-03-22'),
  },
];

export const ALERTS: Alert[] = [
  { id: 'alt_001', type: 'low_stock', title: 'Low Stock Alert', message: 'Mechanical Keyboard RGB is below reorder level (5 remaining)', productId: 'prd_011', severity: 'critical', isRead: false, createdAt: new Date('2024-03-28T08:00:00') },
  { id: 'alt_002', type: 'low_stock', title: 'Low Stock Alert', message: 'Standing Desk Electric is below reorder level (8 remaining)', productId: 'prd_006', severity: 'critical', isRead: false, createdAt: new Date('2024-03-28T08:05:00') },
  { id: 'alt_003', type: 'low_stock', title: 'Stock Warning', message: 'Ergonomic Office Chair approaching reorder level (18 remaining)', productId: 'prd_005', severity: 'warning', isRead: false, createdAt: new Date('2024-03-28T08:10:00') },
  { id: 'alt_004', type: 'reorder', title: 'Reorder Suggestion', message: 'AI recommends restocking Mechanical Keyboard RGB within 3 days', productId: 'prd_011', severity: 'info', isRead: true, createdAt: new Date('2024-03-27T14:00:00') },
  { id: 'alt_005', type: 'vendor_response', title: 'Vendor Response', message: 'Prime Materials approved PO-002 for furniture restock', severity: 'info', isRead: true, createdAt: new Date('2024-03-25T16:30:00') },
  { id: 'alt_006', type: 'expiry', title: 'Expiry Warning', message: 'Organic Coffee Beans batch BC-2024-01 expires in 30 days', productId: 'prd_007', severity: 'warning', isRead: false, createdAt: new Date('2024-03-28T09:00:00') },
];

export const DEMAND_FORECASTS: DemandForecast[] = [
  { productId: 'prd_001', productName: 'Wireless Mouse Pro', productSku: 'ELEC-001', currentStock: 156, forecastedDemand: 45, daysUntilStockout: 21, recommendedAction: 'sufficient', confidence: 92 },
  { productId: 'prd_002', productName: 'USB-C Hub 7-in-1', productSku: 'ELEC-002', currentStock: 42, forecastedDemand: 18, daysUntilStockout: 14, recommendedAction: 'reorder_soon', confidence: 88 },
  { productId: 'prd_003', productName: 'Premium Notebook A5', productSku: 'OFF-001', currentStock: 523, forecastedDemand: 85, daysUntilStockout: 42, recommendedAction: 'sufficient', confidence: 95 },
  { productId: 'prd_005', productName: 'Ergonomic Office Chair', productSku: 'FURN-001', currentStock: 18, forecastedDemand: 8, daysUntilStockout: 14, recommendedAction: 'reorder_soon', confidence: 85 },
  { productId: 'prd_006', productName: 'Standing Desk Electric', productSku: 'FURN-002', currentStock: 8, forecastedDemand: 5, daysUntilStockout: 10, recommendedAction: 'reorder_now', confidence: 90 },
  { productId: 'prd_011', productName: 'Mechanical Keyboard RGB', productSku: 'ELEC-003', currentStock: 5, forecastedDemand: 12, daysUntilStockout: 3, recommendedAction: 'reorder_now', confidence: 94 },
  { productId: 'prd_012', productName: '27" 4K Monitor', productSku: 'ELEC-004', currentStock: 12, forecastedDemand: 6, daysUntilStockout: 14, recommendedAction: 'reorder_soon', confidence: 87 },
];

export const AUDIT_LOGS: AuditLog[] = [
  { id: 'log_001', userId: 'usr_001', userName: 'System Administrator', action: 'UPDATE', entityType: 'Product', entityId: 'prd_001', details: 'Updated reorder level from 40 to 50', timestamp: new Date('2024-03-28T10:30:00') },
  { id: 'log_002', userId: 'usr_002', userName: 'John Warehouse', action: 'STOCK_IN', entityType: 'Transaction', entityId: 'txn_006', details: 'Added 200 units of Hand Sanitizer 500ml', timestamp: new Date('2024-03-22T15:30:00') },
  { id: 'log_003', userId: 'usr_001', userName: 'System Administrator', action: 'CREATE', entityType: 'Product', entityId: 'prd_012', details: 'Added new product: 27" 4K Monitor', timestamp: new Date('2024-02-10T14:00:00') },
  { id: 'log_004', userId: 'usr_002', userName: 'John Warehouse', action: 'STOCK_OUT', entityType: 'Transaction', entityId: 'txn_005', details: 'Dispatched 8 units of Mechanical Keyboard RGB', timestamp: new Date('2024-03-22T10:00:00') },
  { id: 'log_005', userId: 'usr_001', userName: 'System Administrator', action: 'DELETE', entityType: 'Product', entityId: 'prd_old_001', details: 'Removed discontinued product: Legacy Mouse PS/2', timestamp: new Date('2024-03-15T09:00:00') },
];

export const FORECAST_CHART_DATA: ForecastData[] = [
  { date: 'Week 1', actual: 120, predicted: 115 },
  { date: 'Week 2', actual: 145, predicted: 140 },
  { date: 'Week 3', actual: 138, predicted: 145 },
  { date: 'Week 4', actual: 160, predicted: 155 },
  { date: 'Week 5', actual: 175, predicted: 170 },
  { date: 'Week 6', actual: 0, predicted: 185 },
  { date: 'Week 7', actual: 0, predicted: 195 },
  { date: 'Week 8', actual: 0, predicted: 210 },
];

export const getStockHealth = () => ({
  totalProducts: PRODUCTS.length,
  lowStockCount: PRODUCTS.filter(p => p.currentStock <= p.reorderLevel && p.currentStock > 0).length,
  outOfStockCount: PRODUCTS.filter(p => p.currentStock === 0).length,
  overStockCount: PRODUCTS.filter(p => p.currentStock > p.reorderLevel * 3).length,
  healthScore: 78,
});
