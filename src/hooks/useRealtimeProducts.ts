import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  category_id: string | null;
  vendor_id: string | null;
  price: number;
  current_stock: number;
  reorder_level: number;
  image_url: string | null;
  created_at: string;
  updated_at: string;
  categories?: { name: string } | null;
  vendors?: { name: string } | null;
}

export const useRealtimeProducts = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProducts = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          categories:category_id(name),
          vendors:vendor_id(name)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching products:', error);
        return;
      }

      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    if (!user) return;

    // Subscribe to real-time product changes
    const channel = supabase
      .channel('products-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products',
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            // Fetch the new product with relations
            const { data } = await supabase
              .from('products')
              .select(`
                *,
                categories:category_id(name),
                vendors:vendor_id(name)
              `)
              .eq('id', payload.new.id)
              .single();

            if (data) {
              setProducts((prev) => [data, ...prev]);
              toast.success('New product added', { description: data.name });
            }
          } else if (payload.eventType === 'UPDATE') {
            const { data } = await supabase
              .from('products')
              .select(`
                *,
                categories:category_id(name),
                vendors:vendor_id(name)
              `)
              .eq('id', payload.new.id)
              .single();

            if (data) {
              setProducts((prev) =>
                prev.map((p) => (p.id === data.id ? data : p))
              );
              
              // Check for low stock notification
              if (payload.old.current_stock > payload.new.reorder_level && 
                  payload.new.current_stock <= payload.new.reorder_level) {
                toast.warning('Low Stock Alert', {
                  description: `${data.name} is running low (${data.current_stock} units)`,
                });
              }
            }
          } else if (payload.eventType === 'DELETE') {
            setProducts((prev) => prev.filter((p) => p.id !== payload.old.id));
            toast.info('Product deleted');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    products,
    isLoading,
    refetch: fetchProducts,
  };
};
