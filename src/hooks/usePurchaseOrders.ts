import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { useNotifications } from './useNotifications';

export interface PurchaseOrderItem {
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  unitPrice: number;
}

export interface PurchaseOrder {
  id: string;
  vendor_id: string;
  vendorName: string;
  status: string;
  items: PurchaseOrderItem[];
  totalAmount: number;
  createdAt: Date;
  updatedAt: Date;
  created_by: string | null;
  created_by_name?: string;
}

export const usePurchaseOrders = () => {
  const { user, profile, getUserRole } = useAuth();
  const { notifyVendorOfPO, sendVendorEmail } = useNotifications();
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const role = getUserRole();

  const fetchPurchaseOrders = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      let query = supabase
        .from('purchase_orders')
        .select(`
          *,
          vendors:vendor_id(name, email)
        `)
        .order('created_at', { ascending: false });

      // Vendors only see POs for their vendor_id
      if (role === 'vendor' && profile?.vendor_id) {
        query = query.eq('vendor_id', profile.vendor_id);
      }

      const { data: orders, error } = await query;

      if (error) {
        console.error('Error fetching purchase orders:', error);
        return;
      }

      if (orders) {
        // Fetch items for each order
        const ordersWithItems = await Promise.all(
          orders.map(async (order) => {
            const { data: items } = await supabase
              .from('purchase_order_items')
              .select(`
                *,
                products:product_id(name, sku)
              `)
              .eq('purchase_order_id', order.id);

            return {
              id: order.id,
              vendor_id: order.vendor_id,
              vendorName: order.vendors?.name || 'Unknown',
              status: order.status,
              items: (items || []).map(item => ({
                productId: item.product_id,
                productName: item.products?.name || 'Unknown',
                productSku: item.products?.sku || '-',
                quantity: item.quantity,
                unitPrice: item.unit_price,
              })),
              totalAmount: order.total_amount,
              createdAt: new Date(order.created_at),
              updatedAt: new Date(order.updated_at),
              created_by: order.created_by,
            };
          })
        );

        setPurchaseOrders(ordersWithItems);
      }
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, role, profile?.vendor_id]);

  useEffect(() => {
    fetchPurchaseOrders();
  }, [fetchPurchaseOrders]);

  // Real-time subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('purchase-orders-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'purchase_orders',
        },
        (payload) => {
          console.log('PO change received:', payload);
          fetchPurchaseOrders();
          
          if (payload.eventType === 'INSERT' && role === 'vendor') {
            toast.info('New Purchase Order', {
              description: 'You have a new purchase order to review',
            });
          } else if (payload.eventType === 'UPDATE') {
            const newStatus = (payload.new as any).status;
            if (newStatus === 'approved') {
              toast.success('Purchase Order Approved');
            } else if (newStatus === 'rejected') {
              toast.warning('Purchase Order Rejected');
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, role, fetchPurchaseOrders]);

  const respondToPO = async (
    poId: string,
    status: 'approved' | 'rejected',
    responseNotes?: string
  ): Promise<boolean> => {
    try {
      const po = purchaseOrders.find(p => p.id === poId);
      
      const { error } = await supabase
        .from('purchase_orders')
        .update({ status })
        .eq('id', poId);

      if (error) {
        console.error('Error updating PO status:', error);
        toast.error('Failed to update order');
        return false;
      }

      // Create notification for the requester (warehouse manager/admin)
      if (po && po.created_by) {
        const productNames = po.items.map(i => i.productName).join(', ');
        const alertMessage = status === 'approved'
          ? `Your PO #${poId.slice(0, 8)} for ${productNames} (₹${po.totalAmount.toLocaleString()}) has been approved by ${profile?.full_name || 'Vendor'}.`
          : `Your PO #${poId.slice(0, 8)} for ${productNames} was rejected. ${responseNotes ? `Reason: ${responseNotes}` : ''}`;

        await supabase.from('alerts').insert({
          type: 'order_update',
          title: status === 'approved' ? 'PO Approved' : 'PO Rejected',
          message: alertMessage,
          severity: status === 'approved' ? 'info' : 'warning',
          user_id: po.created_by,
        });
      }

      // Create audit log
      await supabase.from('audit_logs').insert({
        user_id: user?.id,
        user_name: profile?.full_name || profile?.email,
        action: 'UPDATE',
        entity_type: 'PurchaseOrder',
        entity_id: poId,
        details: `Vendor ${status === 'approved' ? 'approved' : 'rejected'} PO${responseNotes ? `. Notes: ${responseNotes}` : ''}`,
      });

      toast.success(`Purchase order ${status}`);
      return true;
    } catch (error) {
      console.error('Error responding to PO:', error);
      toast.error('Failed to update order');
      return false;
    }
  };

  const pendingCount = purchaseOrders.filter(po => po.status === 'pending').length;

  return {
    purchaseOrders,
    isLoading,
    refetch: fetchPurchaseOrders,
    respondToPO,
    pendingCount,
  };
};
