import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Download,
  TrendingUp,
  Brain,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileSpreadsheet,
  FileText,
  Sparkles,
  Package,
} from 'lucide-react';
import { useRealtimeProducts } from '@/hooks/useRealtimeProducts';
import { useRealtimeTransactions } from '@/hooks/useRealtimeTransactions';
import { exportToCSV, exportToPDF } from '@/utils/exportUtils';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from 'recharts';

interface ProductForecast {
  id: string;
  sku: string;
  name: string;
  currentStock: number;
  avgDailyUsage: number;
  daysUntilStockout: number;
  recommendedAction: 'reorder_now' | 'reorder_soon' | 'sufficient';
  confidence: number;
}

const ForecastingPage: React.FC = () => {
  const { products, isLoading: productsLoading } = useRealtimeProducts();
  const { transactions, isLoading: transactionsLoading } = useRealtimeTransactions();
  const [selectedTimeframe, setSelectedTimeframe] = useState<'daily' | 'weekly'>('weekly');

  // Calculate forecasts based on real transaction data
  const forecasts = useMemo<ProductForecast[]>(() => {
    if (products.length === 0) return [];

    // Calculate average daily usage for each product based on last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return products.map(product => {
      const productTxns = transactions.filter(
        t => t.product_id === product.id && 
             t.type === 'stock_out' && 
             new Date(t.created_at) >= thirtyDaysAgo
      );

      const totalOut = productTxns.reduce((sum, t) => sum + t.quantity, 0);
      const avgDailyUsage = totalOut / 30;
      
      const daysUntilStockout = avgDailyUsage > 0 
        ? Math.floor(product.current_stock / avgDailyUsage)
        : product.current_stock > 0 ? 999 : 0;

      let recommendedAction: 'reorder_now' | 'reorder_soon' | 'sufficient';
      if (product.current_stock === 0 || daysUntilStockout <= 7) {
        recommendedAction = 'reorder_now';
      } else if (daysUntilStockout <= 14 || product.current_stock <= product.reorder_level) {
        recommendedAction = 'reorder_soon';
      } else {
        recommendedAction = 'sufficient';
      }

      // Confidence based on amount of historical data
      const confidence = Math.min(95, 60 + productTxns.length * 5);

      return {
        id: product.id,
        sku: product.sku,
        name: product.name,
        currentStock: product.current_stock,
        avgDailyUsage: Math.round(avgDailyUsage * 10) / 10,
        daysUntilStockout,
        recommendedAction,
        confidence,
      };
    }).sort((a, b) => a.daysUntilStockout - b.daysUntilStockout);
  }, [products, transactions]);

  // Calculate transaction trends for charts
  const transactionTrends = useMemo(() => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dailyData = new Map<string, { demand: number; optimal: number }>();

    transactions
      .filter(t => new Date(t.created_at) >= sevenDaysAgo)
      .forEach(t => {
        const day = new Date(t.created_at).toLocaleDateString('en-US', { weekday: 'short' });
        const existing = dailyData.get(day) || { demand: 0, optimal: 0 };
        if (t.type === 'stock_out') {
          existing.demand += t.quantity;
        }
        existing.optimal = existing.demand * 1.1; // 10% buffer
        dailyData.set(day, existing);
      });

    return Array.from(dailyData.entries()).map(([day, data]) => ({
      day,
      demand: data.demand,
      optimal: Math.round(data.optimal),
    }));
  }, [transactions]);

  const criticalProducts = forecasts.filter(f => f.recommendedAction === 'reorder_now');
  const warningProducts = forecasts.filter(f => f.recommendedAction === 'reorder_soon');
  const safeProducts = forecasts.filter(f => f.recommendedAction === 'sufficient');

  const avgConfidence = forecasts.length > 0
    ? Math.round(forecasts.reduce((sum, f) => sum + f.confidence, 0) / forecasts.length)
    : 0;

  const handleExport = (format: 'csv' | 'pdf') => {
    const data = forecasts.map(f => ({
      SKU: f.sku,
      Product: f.name,
      'Current Stock': f.currentStock,
      'Avg Daily Usage': f.avgDailyUsage,
      'Days Until Stockout': f.daysUntilStockout === 999 ? 'N/A' : f.daysUntilStockout,
      'Confidence %': f.confidence,
      'Recommended Action': f.recommendedAction.replace('_', ' ').toUpperCase(),
    }));

    if (format === 'csv') {
      exportToCSV(data, 'demand_forecast_report');
    } else {
      exportToPDF('AI Demand Forecast Report', data, [
        { header: 'SKU', key: 'SKU' },
        { header: 'Product', key: 'Product' },
        { header: 'Stock', key: 'Current Stock' },
        { header: 'Daily Usage', key: 'Avg Daily Usage' },
        { header: 'Action', key: 'Recommended Action' },
      ]);
    }
    toast.success(`Forecast exported as ${format.toUpperCase()}`);
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'reorder_now':
        return { label: 'Reorder Now', class: 'badge-danger', icon: AlertTriangle };
      case 'reorder_soon':
        return { label: 'Reorder Soon', class: 'badge-warning', icon: Clock };
      default:
        return { label: 'Sufficient', class: 'badge-success', icon: CheckCircle };
    }
  };

  const isLoading = productsLoading || transactionsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Brain className="h-7 w-7 text-primary" />
            AI Demand Forecasting
          </h2>
          <p className="text-muted-foreground">
            Predictive analytics based on your transaction history
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-muted">
            <Button
              variant={selectedTimeframe === 'daily' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setSelectedTimeframe('daily')}
            >
              Daily
            </Button>
            <Button
              variant={selectedTimeframe === 'weekly' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setSelectedTimeframe('weekly')}
            >
              Weekly
            </Button>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('pdf')}>
                <FileText className="h-4 w-4 mr-2" />
                Export as PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* AI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="stat-card glow-primary">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">AI Confidence</p>
                <p className="text-3xl font-bold text-primary mt-1">{avgConfidence}%</p>
                <p className="text-xs text-muted-foreground mt-1">Based on history</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Critical Items</p>
                <p className="text-3xl font-bold text-destructive mt-1">{criticalProducts.length}</p>
                <p className="text-xs text-muted-foreground mt-1">Need immediate action</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10">
                <AlertTriangle className="h-6 w-6 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Warning Items</p>
                <p className="text-3xl font-bold text-warning mt-1">{warningProducts.length}</p>
                <p className="text-xs text-muted-foreground mt-1">Monitor closely</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-warning/10">
                <Clock className="h-6 w-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Healthy Items</p>
                <p className="text-3xl font-bold text-success mt-1">{safeProducts.length}</p>
                <p className="text-xs text-muted-foreground mt-1">Stock sufficient</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10">
                <CheckCircle className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Demand Pattern Chart */}
        <Card className="chart-container">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Brain className="h-5 w-5 text-accent" />
              {selectedTimeframe === 'daily' ? 'Daily' : 'Weekly'} Demand Pattern
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {transactionTrends.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={transactionTrends}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="day" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="demand"
                      name="Actual Demand"
                      stroke="hsl(var(--chart-primary))"
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--chart-primary))' }}
                    />
                    <Line
                      type="monotone"
                      dataKey="optimal"
                      name="Optimal Stock"
                      stroke="hsl(var(--chart-secondary))"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={{ fill: 'hsl(var(--chart-secondary))' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center h-full">
                  <Brain className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-semibold">No demand data yet</p>
                  <p className="text-sm text-muted-foreground">
                    Record stock-out transactions to see demand patterns
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stock Health Overview */}
        <Card className="chart-container">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Stock Health Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {forecasts.length > 0 ? (
                <div className="space-y-4 h-full overflow-y-auto pr-2">
                  {forecasts.slice(0, 8).map(forecast => {
                    const badge = getActionBadge(forecast.recommendedAction);
                    return (
                      <div key={forecast.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{forecast.name}</p>
                          <p className="text-xs text-muted-foreground">{forecast.sku}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm font-bold">{forecast.currentStock}</p>
                            <p className="text-xs text-muted-foreground">in stock</p>
                          </div>
                          <span className={badge.class}>{badge.label}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full">
                  <Package className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-lg font-semibold">No products to forecast</p>
                  <p className="text-sm text-muted-foreground">
                    Add products to see stock health predictions
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Forecast Table */}
      <Card className="glass-card overflow-hidden">
        <CardHeader className="border-b border-border/50">
          <CardTitle className="text-lg font-semibold">Product Demand Predictions</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead className="text-muted-foreground">SKU</TableHead>
                <TableHead className="text-muted-foreground">Product</TableHead>
                <TableHead className="text-muted-foreground text-right">Current Stock</TableHead>
                <TableHead className="text-muted-foreground text-right">Avg Daily Usage</TableHead>
                <TableHead className="text-muted-foreground text-right">Days Until Stockout</TableHead>
                <TableHead className="text-muted-foreground text-right">Confidence</TableHead>
                <TableHead className="text-muted-foreground">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {forecasts.length > 0 ? (
                forecasts.map((forecast) => {
                  const badge = getActionBadge(forecast.recommendedAction);
                  const IconComponent = badge.icon;
                  return (
                    <TableRow key={forecast.id} className="table-row-hover border-border/30">
                      <TableCell className="font-mono text-sm">{forecast.sku}</TableCell>
                      <TableCell className="font-medium">{forecast.name}</TableCell>
                      <TableCell className="text-right">
                        <span className={cn(
                          'font-bold',
                          forecast.recommendedAction === 'reorder_now' && 'text-destructive'
                        )}>
                          {forecast.currentStock}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {forecast.avgDailyUsage}/day
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={cn(
                          'font-bold',
                          forecast.daysUntilStockout <= 7 && 'text-destructive',
                          forecast.daysUntilStockout > 7 && forecast.daysUntilStockout <= 14 && 'text-warning',
                          forecast.daysUntilStockout > 14 && 'text-success'
                        )}>
                          {forecast.daysUntilStockout === 999 ? 'N/A' : `${forecast.daysUntilStockout} days`}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full"
                              style={{ width: `${forecast.confidence}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium">{forecast.confidence}%</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={cn('flex items-center gap-1.5', badge.class)}>
                          <IconComponent className="h-3 w-3" />
                          {badge.label}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center py-8">
                      <Brain className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-lg font-semibold">No forecasts available</p>
                      <p className="text-sm text-muted-foreground">
                        Add products and record transactions to generate predictions
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
};

export default ForecastingPage;
