import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Package,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ShoppingCart,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Building2,
  Users,
} from 'lucide-react';
import { useDashboardStats } from '@/hooks/useDashboardStats';
import { useRealtimeAlerts } from '@/hooks/useRealtimeAlerts';
import { useRealtimeTransactions } from '@/hooks/useRealtimeTransactions';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import VendorDashboard from '@/components/VendorDashboard';

const Dashboard: React.FC = () => {
  const { profile, getUserRole } = useAuth();
  const role = getUserRole();

  // Render vendor-specific dashboard
  if (role === 'vendor') {
    return <VendorDashboard />;
  }
  const { stats, categoryStock, transactionTrend, isLoading } = useDashboardStats();
  const { alerts } = useRealtimeAlerts();
  const { transactions } = useRealtimeTransactions();

  const recentTransactions = transactions.slice(0, 5);
  const criticalAlerts = alerts.filter(a => a.severity === 'critical').slice(0, 3);

  const statCards = [
    {
      title: 'Total Products',
      value: stats.totalProducts.toString(),
      icon: Package,
      color: 'primary',
    },
    {
      title: 'Low Stock Items',
      value: stats.lowStockCount.toString(),
      icon: AlertTriangle,
      color: 'warning',
    },
    {
      title: "Today's Transactions",
      value: stats.todayTransactions.toString(),
      icon: ArrowUpRight,
      color: 'accent',
    },
    {
      title: 'Pending Orders',
      value: stats.pendingOrders.toString(),
      icon: ShoppingCart,
      color: 'info',
    },
  ];

  // Empty state component
  const EmptyState = ({ icon: Icon, title, description, actionLabel, actionLink }: {
    icon: React.ElementType;
    title: string;
    description: string;
    actionLabel?: string;
    actionLink?: string;
  }) => (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-xs">{description}</p>
      {actionLabel && actionLink && (
        <Link to={actionLink}>
          <Button size="sm">{actionLabel}</Button>
        </Link>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Banner */}
      <div className="glass-card p-6 glow-primary">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Welcome back, {profile?.full_name || 'User'}!</h2>
            <p className="text-muted-foreground mt-1">
              {stats.totalProducts === 0 
                ? "Get started by adding your first products and vendors."
                : "Here's what's happening with your inventory today."
              }
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 border border-primary/20">
              <TrendingUp className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Stock Health</p>
                <p className="text-lg font-bold text-primary">{stats.healthScore}%</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <Card key={index} className="stat-card overflow-hidden">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-3xl font-bold mt-1">{stat.value}</p>
                </div>
                <div className={cn(
                  'flex h-12 w-12 items-center justify-center rounded-xl',
                  stat.color === 'primary' && 'bg-primary/10 text-primary',
                  stat.color === 'warning' && 'bg-warning/10 text-warning',
                  stat.color === 'accent' && 'bg-accent/10 text-accent',
                  stat.color === 'info' && 'bg-info/10 text-info'
                )}>
                  <stat.icon className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Transaction Trend Chart */}
        <Card className="chart-container">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <CardTitle className="text-lg font-semibold">Transaction Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              {transactionTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={transactionTrend}>
                    <defs>
                      <linearGradient id="colorStockIn" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--chart-primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--chart-primary))" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorStockOut" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--chart-secondary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--chart-secondary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="stockIn"
                      name="Stock In"
                      stroke="hsl(var(--chart-primary))"
                      fillOpacity={1}
                      fill="url(#colorStockIn)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="stockOut"
                      name="Stock Out"
                      stroke="hsl(var(--chart-secondary))"
                      fillOpacity={1}
                      fill="url(#colorStockOut)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState
                  icon={TrendingUp}
                  title="No transaction data yet"
                  description="Transaction trends will appear here once you start recording stock movements."
                  actionLabel="Record Transaction"
                  actionLink="/transactions"
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stock by Category */}
        <Card className="chart-container">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold">Stock by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              {categoryStock.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryStock} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} width={80} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--popover))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="stock" fill="hsl(var(--chart-primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState
                  icon={Package}
                  title="No categories yet"
                  description="Add products with categories to see stock distribution."
                  actionLabel="Add Products"
                  actionLink="/products"
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Critical Alerts */}
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Critical Alerts
            </CardTitle>
            <Link to="/alerts">
              <Button variant="ghost" size="sm" className="text-xs">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {criticalAlerts.length > 0 ? (
              criticalAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20"
                >
                  <div className="h-2 w-2 rounded-full bg-destructive mt-2 animate-pulse" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{alert.title}</p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {alert.message}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No critical alerts
              </p>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Quick Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5 text-primary" />
                <span className="text-sm">Total Vendors</span>
              </div>
              <span className="font-bold">{stats.totalVendors}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <Package className="h-5 w-5 text-accent" />
                <span className="text-sm">Out of Stock</span>
              </div>
              <span className="font-bold text-destructive">{stats.outOfStockCount}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <ShoppingCart className="h-5 w-5 text-warning" />
                <span className="text-sm">Pending Orders</span>
              </div>
              <span className="font-bold">{stats.pendingOrders}</span>
            </div>
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Clock className="h-5 w-5 text-accent" />
              Recent Activity
            </CardTitle>
            <Link to="/transactions">
              <Button variant="ghost" size="sm" className="text-xs">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentTransactions.length > 0 ? (
              recentTransactions.map((txn) => (
                <div
                  key={txn.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-muted/30"
                >
                  <div className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-lg',
                    txn.type === 'stock_in' ? 'bg-success/10 text-success' : 'bg-accent/10 text-accent'
                  )}>
                    {txn.type === 'stock_in' ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <TrendingDown className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{txn.products?.name || 'Unknown Product'}</p>
                    <p className="text-xs text-muted-foreground">
                      {txn.type === 'stock_in' ? '+' : '-'}{txn.quantity} units
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(txn.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))
            ) : (
              <EmptyState
                icon={Clock}
                title="No recent activity"
                description="Transactions will appear here once you start recording stock movements."
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
