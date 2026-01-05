import React, { useState, useMemo } from 'react';
import { useRealtimeProducts } from '@/hooks/useRealtimeProducts';
import { useRealtimeTransactions } from '@/hooks/useRealtimeTransactions';
import { useVendors } from '@/hooks/useVendors';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { Download, FileSpreadsheet, FileText, TrendingUp, Package, Building2, ArrowUpDown } from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from 'date-fns';
import { exportToCSV, exportToExcel, exportToPDF } from '@/utils/exportUtils';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

const ReportsPage: React.FC = () => {
  const { products } = useRealtimeProducts();
  const { transactions } = useRealtimeTransactions();
  const { vendors } = useVendors();
  const { getUserRole, profile } = useAuth();
  const role = getUserRole();
  const [dateRange, setDateRange] = useState('30');

  // Filter products for vendors
  const filteredProducts = useMemo(() => {
    if (role === 'vendor' && profile?.vendor_id) {
      return products.filter(p => p.vendor_id === profile.vendor_id);
    }
    return products;
  }, [products, role, profile]);

  // Monthly trend data
  const monthlyTrends = useMemo(() => {
    const days = parseInt(dateRange);
    const startDate = subDays(new Date(), days);
    const dateInterval = eachDayOfInterval({ start: startDate, end: new Date() });
    
    return dateInterval.map(date => {
      const dayStr = format(date, 'yyyy-MM-dd');
      const dayTransactions = transactions.filter(t => 
        t.created_at && format(parseISO(t.created_at), 'yyyy-MM-dd') === dayStr
      );
      
      const stockIn = dayTransactions
        .filter(t => t.type === 'stock_in')
        .reduce((sum, t) => sum + t.quantity, 0);
      const stockOut = dayTransactions
        .filter(t => t.type === 'stock_out')
        .reduce((sum, t) => sum + t.quantity, 0);
      
      return {
        date: format(date, 'MMM dd'),
        stockIn,
        stockOut,
        net: stockIn - stockOut,
      };
    });
  }, [transactions, dateRange]);

  // Vendor performance data
  const vendorPerformance = useMemo(() => {
    return vendors.map(vendor => {
      const vendorProducts = products.filter(p => p.vendor_id === vendor.id);
      const totalStock = vendorProducts.reduce((sum, p) => sum + p.current_stock, 0);
      const lowStockCount = vendorProducts.filter(p => p.current_stock <= p.reorder_level).length;
      
      return {
        id: vendor.id,
        name: vendor.name,
        productsCount: vendorProducts.length,
        totalStock,
        lowStockCount,
        performance: vendor.performance || 80,
      };
    });
  }, [vendors, products]);

  // Stock movement history
  const stockMovementHistory = useMemo(() => {
    return transactions.slice(0, 50).map(t => ({
      id: t.id,
      date: t.created_at ? format(parseISO(t.created_at), 'MMM dd, yyyy HH:mm') : '-',
      product: t.products?.name || 'Unknown',
      sku: t.products?.sku || '-',
      type: t.type,
      quantity: t.quantity,
      handler: t.handler_name || 'System',
    }));
  }, [transactions]);

  // Inventory summary
  const inventorySummary = useMemo(() => {
    const totalProducts = filteredProducts.length;
    const totalStock = filteredProducts.reduce((sum, p) => sum + p.current_stock, 0);
    const lowStock = filteredProducts.filter(p => p.current_stock <= p.reorder_level && p.current_stock > 0).length;
    const outOfStock = filteredProducts.filter(p => p.current_stock === 0).length;
    const inStock = totalProducts - lowStock - outOfStock;
    
    return { totalProducts, totalStock, lowStock, outOfStock, inStock };
  }, [filteredProducts]);

  // Category distribution
  const categoryDistribution = useMemo(() => {
    const categories: Record<string, number> = {};
    filteredProducts.forEach(p => {
      const cat = p.categories?.name || 'Uncategorized';
      categories[cat] = (categories[cat] || 0) + 1;
    });
    return Object.entries(categories).map(([name, value]) => ({ name, value }));
  }, [filteredProducts]);

  // Export handlers
  const handleExportInventory = (format: 'csv' | 'excel' | 'pdf') => {
    const data = filteredProducts.map(p => ({
      SKU: p.sku,
      Name: p.name,
      Category: p.categories?.name || '-',
      Vendor: p.vendors?.name || '-',
      'Current Stock': p.current_stock,
      'Reorder Level': p.reorder_level,
      Status: p.current_stock === 0 ? 'Out of Stock' : p.current_stock <= p.reorder_level ? 'Low Stock' : 'In Stock',
    }));

    if (format === 'csv') exportToCSV(data, 'inventory_report');
    else if (format === 'excel') exportToExcel(data, 'inventory_report');
    else exportToPDF('Inventory Report', data, [
      { header: 'SKU', key: 'SKU' },
      { header: 'Name', key: 'Name' },
      { header: 'Category', key: 'Category' },
      { header: 'Stock', key: 'Current Stock' },
      { header: 'Status', key: 'Status' },
    ]);
  };

  const handleExportTransactions = (format: 'csv' | 'excel' | 'pdf') => {
    const data = stockMovementHistory.map(t => ({
      Date: t.date,
      Product: t.product,
      SKU: t.sku,
      Type: t.type === 'stock_in' ? 'Stock In' : 'Stock Out',
      Quantity: t.quantity,
      Handler: t.handler,
    }));

    if (format === 'csv') exportToCSV(data, 'transactions_report');
    else if (format === 'excel') exportToExcel(data, 'transactions_report');
    else exportToPDF('Stock Movement Report', data, [
      { header: 'Date', key: 'Date' },
      { header: 'Product', key: 'Product' },
      { header: 'Type', key: 'Type' },
      { header: 'Qty', key: 'Quantity' },
      { header: 'Handler', key: 'Handler' },
    ]);
  };

  const handleExportVendors = (format: 'csv' | 'excel' | 'pdf') => {
    const data = vendorPerformance.map(v => ({
      Vendor: v.name,
      Products: v.productsCount,
      'Total Stock': v.totalStock,
      'Low Stock Items': v.lowStockCount,
      'Performance %': v.performance,
    }));

    if (format === 'csv') exportToCSV(data, 'vendor_report');
    else if (format === 'excel') exportToExcel(data, 'vendor_report');
    else exportToPDF('Vendor Performance Report', data, [
      { header: 'Vendor', key: 'Vendor' },
      { header: 'Products', key: 'Products' },
      { header: 'Stock', key: 'Total Stock' },
      { header: 'Low Stock', key: 'Low Stock Items' },
      { header: 'Perf %', key: 'Performance %' },
    ]);
  };

  const chartConfig = {
    stockIn: { label: 'Stock In', color: 'hsl(var(--chart-1))' },
    stockOut: { label: 'Stock Out', color: 'hsl(var(--chart-2))' },
    net: { label: 'Net Change', color: 'hsl(var(--primary))' },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Reports & Analytics</h1>
          <p className="text-muted-foreground">Comprehensive inventory analytics and exportable reports</p>
        </div>
        <Select value={dateRange} onValueChange={setDateRange}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Date Range" />
          </SelectTrigger>
          <SelectContent className="bg-popover border shadow-lg">
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="card-elevated">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Products</p>
                <p className="text-2xl font-bold">{inventorySummary.totalProducts}</p>
              </div>
              <Package className="h-8 w-8 text-primary opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card className="card-elevated">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Stock Units</p>
                <p className="text-2xl font-bold">{inventorySummary.totalStock.toLocaleString()}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500 opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card className="card-elevated">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Low Stock Items</p>
                <p className="text-2xl font-bold text-yellow-600">{inventorySummary.lowStock}</p>
              </div>
              <ArrowUpDown className="h-8 w-8 text-yellow-500 opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card className="card-elevated">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Out of Stock</p>
                <p className="text-2xl font-bold text-destructive">{inventorySummary.outOfStock}</p>
              </div>
              <Package className="h-8 w-8 text-destructive opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different reports */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="trends">Monthly Trends</TabsTrigger>
          <TabsTrigger value="vendors">Vendor Performance</TabsTrigger>
          <TabsTrigger value="movement">Stock Movement</TabsTrigger>
        </TabsList>

        {/* Monthly Trends Tab */}
        <TabsContent value="trends" className="space-y-4">
          <Card className="card-elevated">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Stock Movement Trends</CardTitle>
                <CardDescription>Daily stock in/out over the selected period</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleExportTransactions('csv')}>
                  <Download className="h-4 w-4 mr-1" /> CSV
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleExportTransactions('excel')}>
                  <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleExportTransactions('pdf')}>
                  <FileText className="h-4 w-4 mr-1" /> PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[350px] w-full">
                <LineChart data={monthlyTrends}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="stockIn" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="stockOut" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="net" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Category Distribution */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="card-elevated">
              <CardHeader>
                <CardTitle>Category Distribution</CardTitle>
                <CardDescription>Products by category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryDistribution}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {categoryDistribution.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="card-elevated">
              <CardHeader>
                <CardTitle>Inventory Health</CardTitle>
                <CardDescription>Stock status overview</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={[
                      { name: 'In Stock', value: inventorySummary.inStock, fill: 'hsl(var(--chart-1))' },
                      { name: 'Low Stock', value: inventorySummary.lowStock, fill: 'hsl(var(--chart-4))' },
                      { name: 'Out of Stock', value: inventorySummary.outOfStock, fill: 'hsl(var(--destructive))' },
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="name" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                        {[
                          { fill: 'hsl(var(--chart-1))' },
                          { fill: 'hsl(var(--chart-4))' },
                          { fill: 'hsl(var(--destructive))' },
                        ].map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Vendor Performance Tab */}
        <TabsContent value="vendors" className="space-y-4">
          <Card className="card-elevated">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Vendor Performance</CardTitle>
                <CardDescription>Performance metrics for all vendors</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleExportVendors('csv')}>
                  <Download className="h-4 w-4 mr-1" /> CSV
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleExportVendors('excel')}>
                  <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleExportVendors('pdf')}>
                  <FileText className="h-4 w-4 mr-1" /> PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor</TableHead>
                    <TableHead className="text-center">Products</TableHead>
                    <TableHead className="text-center">Total Stock</TableHead>
                    <TableHead className="text-center">Low Stock</TableHead>
                    <TableHead className="text-center">Performance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vendorPerformance.map((vendor) => (
                    <TableRow key={vendor.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          {vendor.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{vendor.productsCount}</TableCell>
                      <TableCell className="text-center">{vendor.totalStock.toLocaleString()}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={vendor.lowStockCount > 0 ? 'destructive' : 'outline'}>
                          {vendor.lowStockCount}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={vendor.performance >= 80 ? 'default' : vendor.performance >= 50 ? 'secondary' : 'destructive'}>
                          {vendor.performance}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {vendorPerformance.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No vendor data available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Stock Movement Tab */}
        <TabsContent value="movement" className="space-y-4">
          <Card className="card-elevated">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Stock Movement History</CardTitle>
                <CardDescription>Recent stock in/out transactions</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleExportInventory('csv')}>
                  <Download className="h-4 w-4 mr-1" /> CSV
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleExportInventory('excel')}>
                  <FileSpreadsheet className="h-4 w-4 mr-1" /> Excel
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleExportInventory('pdf')}>
                  <FileText className="h-4 w-4 mr-1" /> PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-center">Quantity</TableHead>
                    <TableHead>Handler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stockMovementHistory.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell className="text-sm">{t.date}</TableCell>
                      <TableCell className="font-medium">{t.product}</TableCell>
                      <TableCell className="text-muted-foreground">{t.sku}</TableCell>
                      <TableCell>
                        <Badge variant={t.type === 'stock_in' ? 'default' : 'secondary'}>
                          {t.type === 'stock_in' ? 'Stock In' : 'Stock Out'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-medium">
                        <span className={t.type === 'stock_in' ? 'text-green-600' : 'text-red-600'}>
                          {t.type === 'stock_in' ? '+' : '-'}{t.quantity}
                        </span>
                      </TableCell>
                      <TableCell>{t.handler}</TableCell>
                    </TableRow>
                  ))}
                  {stockMovementHistory.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No transactions found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ReportsPage;
