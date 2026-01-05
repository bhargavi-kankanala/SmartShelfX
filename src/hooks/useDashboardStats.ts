import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export interface DashboardStats {
  totalProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  todayTransactions: number;
  pendingOrders: number;
  totalVendors: number;
  healthScore: number;
}

export interface CategoryStock {
  name: string;
  stock: number;
}

export interface TransactionTrend {
  date: string;
  stockIn: number;
  stockOut: number;
}

export const useDashboardStats = () => {
  const { user, profile, getUserRole } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    todayTransactions: 0,
    pendingOrders: 0,
    totalVendors: 0,
    healthScore: 0,
  });
  const [categoryStock, setCategoryStock] = useState<CategoryStock[]>([]);
  const [transactionTrend, setTransactionTrend] = useState<TransactionTrend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const role = getUserRole();

  const fetchStats = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      // Fetch products with role filtering
      let productsQuery = supabase.from('products').select('id, current_stock, reorder_level, category_id, vendor_id');
      
      if (role === 'vendor' && profile?.vendor_id) {
        productsQuery = productsQuery.eq('vendor_id', profile.vendor_id);
      }
      
      const { data: products } = await productsQuery;

      const totalProducts = products?.length || 0;
      const lowStockCount = products?.filter(p => p.current_stock > 0 && p.current_stock <= p.reorder_level).length || 0;
      const outOfStockCount = products?.filter(p => p.current_stock === 0).length || 0;
      
      // Calculate health score
      const healthScore = totalProducts > 0 
        ? Math.round(((totalProducts - lowStockCount - outOfStockCount) / totalProducts) * 100)
        : 100;

      // Fetch today's transactions
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data: todayTxns } = await supabase
        .from('transactions')
        .select('id')
        .gte('created_at', today.toISOString());

      // Fetch pending orders
      const { data: pendingOrders } = await supabase
        .from('purchase_orders')
        .select('id')
        .eq('status', 'pending');

      // Fetch vendors count
      const { count: vendorCount } = await supabase
        .from('vendors')
        .select('id', { count: 'exact', head: true });

      setStats({
        totalProducts,
        lowStockCount,
        outOfStockCount,
        todayTransactions: todayTxns?.length || 0,
        pendingOrders: pendingOrders?.length || 0,
        totalVendors: vendorCount || 0,
        healthScore,
      });

      // Fetch category stock data
      const { data: categories } = await supabase.from('categories').select('id, name');
      
      if (categories && products) {
        const catStock = categories.map(cat => ({
          name: cat.name,
          stock: products
            .filter(p => p.category_id === cat.id)
            .reduce((sum, p) => sum + p.current_stock, 0),
        })).filter(c => c.stock > 0);
        
        setCategoryStock(catStock);
      }

      // Fetch transaction trends (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      
      const { data: recentTxns } = await supabase
        .from('transactions')
        .select('type, quantity, created_at')
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('created_at', { ascending: true });

      if (recentTxns) {
        const trendMap = new Map<string, { stockIn: number; stockOut: number }>();
        
        recentTxns.forEach(txn => {
          const date = new Date(txn.created_at).toLocaleDateString('en-US', { weekday: 'short' });
          const existing = trendMap.get(date) || { stockIn: 0, stockOut: 0 };
          if (txn.type === 'stock_in') {
            existing.stockIn += txn.quantity;
          } else {
            existing.stockOut += txn.quantity;
          }
          trendMap.set(date, existing);
        });

        setTransactionTrend(
          Array.from(trendMap.entries()).map(([date, data]) => ({
            date,
            stockIn: data.stockIn,
            stockOut: data.stockOut,
          }))
        );
      }

    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, role, profile?.vendor_id]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Real-time subscriptions for live updates
  useEffect(() => {
    if (!user) return;

    // Subscribe to product changes
    const productsChannel = supabase
      .channel('dashboard-products')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        () => fetchStats()
      )
      .subscribe();

    // Subscribe to transaction changes
    const transactionsChannel = supabase
      .channel('dashboard-transactions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transactions' },
        () => fetchStats()
      )
      .subscribe();

    // Subscribe to purchase order changes
    const ordersChannel = supabase
      .channel('dashboard-orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'purchase_orders' },
        () => fetchStats()
      )
      .subscribe();

    // Subscribe to vendor changes
    const vendorsChannel = supabase
      .channel('dashboard-vendors')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'vendors' },
        () => fetchStats()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(productsChannel);
      supabase.removeChannel(transactionsChannel);
      supabase.removeChannel(ordersChannel);
      supabase.removeChannel(vendorsChannel);
    };
  }, [user, fetchStats]);

  return {
    stats,
    categoryStock,
    transactionTrend,
    isLoading,
    refetch: fetchStats,
  };
};
