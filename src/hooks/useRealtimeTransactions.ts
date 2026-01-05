import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

export interface Transaction {
  id: string;
  type: string;
  product_id: string;
  quantity: number;
  handler_id: string | null;
  handler_name: string | null;
  reference: string | null;
  notes: string | null;
  created_at: string;
  products?: { name: string; sku: string } | null;
}

export const useRealtimeTransactions = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTransactions = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          products:product_id(name, sku)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error fetching transactions:', error);
        return;
      }

      setTransactions(data || []);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    if (!user) return;

    // Subscribe to real-time transaction changes
    const channel = supabase
      .channel('transactions-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transactions',
        },
        async (payload) => {
          // Fetch the new transaction with relations
          const { data } = await supabase
            .from('transactions')
            .select(`
              *,
              products:product_id(name, sku)
            `)
            .eq('id', payload.new.id)
            .single();

          if (data) {
            setTransactions((prev) => [data, ...prev]);
            
            const type = data.type === 'stock_in' ? 'Stock In' : 'Stock Out';
            toast.success(`${type} Recorded`, {
              description: `${data.quantity} units of ${data.products?.name || 'product'}`,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    transactions,
    isLoading,
    refetch: fetchTransactions,
  };
};
