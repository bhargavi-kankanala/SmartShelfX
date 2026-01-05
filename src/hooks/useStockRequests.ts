import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { useNotifications } from './useNotifications';

export interface StockRequest {
  id: string;
  product_id: string | null;
  vendor_id: string;
  requested_by: string | null;
  requested_by_name: string | null;
  requested_by_role: string;
  quantity: number;
  status: string;
  notes: string | null;
  response_notes: string | null;
  responded_at: string | null;
  created_at: string;
  updated_at: string;
  products?: { name: string; sku: string } | null;
  vendors?: { name: string } | null;
}

export const useStockRequests = () => {
  const { user, profile, getUserRole } = useAuth();
  const { notifyVendorOfStockRequest } = useNotifications();
  const [requests, setRequests] = useState<StockRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const role = getUserRole();

  const fetchRequests = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      let query = supabase
        .from('stock_requests')
        .select(`
          *,
          products:product_id(name, sku),
          vendors:vendor_id(name)
        `)
        .order('created_at', { ascending: false });

      // Vendors should only see requests for their vendor_id
      if (role === 'vendor' && profile?.vendor_id) {
        query = query.eq('vendor_id', profile.vendor_id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching stock requests:', error);
        return;
      }

      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching stock requests:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, role, profile?.vendor_id]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Real-time subscription
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('stock-requests-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stock_requests',
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const { data } = await supabase
              .from('stock_requests')
              .select(`
                *,
                products:product_id(name, sku),
                vendors:vendor_id(name)
              `)
              .eq('id', payload.new.id)
              .single();

            if (data) {
              setRequests(prev => [data, ...prev]);
              if (role === 'vendor') {
                toast.info('New Request', { 
                  description: `New stock request for ${data.products?.name || 'product'}` 
                });
              }
            }
          } else if (payload.eventType === 'UPDATE') {
            const { data } = await supabase
              .from('stock_requests')
              .select(`
                *,
                products:product_id(name, sku),
                vendors:vendor_id(name)
              `)
              .eq('id', payload.new.id)
              .single();

            if (data) {
              setRequests(prev => prev.map(r => r.id === data.id ? data : r));
              if (data.status !== 'pending' && role !== 'vendor') {
                toast.info('Request Updated', {
                  description: `Request ${data.status} by vendor`
                });
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, role]);

  const createRequest = async (data: {
    product_id?: string;
    vendor_id: string;
    quantity: number;
    notes?: string;
  }): Promise<StockRequest | null> => {
    try {
      const { data: newRequest, error } = await supabase
        .from('stock_requests')
        .insert({
          product_id: data.product_id || null,
          vendor_id: data.vendor_id,
          quantity: data.quantity,
          notes: data.notes || null,
          requested_by: user?.id,
          requested_by_name: profile?.full_name || 'Unknown',
          requested_by_role: role || 'unknown',
        })
        .select(`
          *,
          products:product_id(name, sku),
          vendors:vendor_id(name)
        `)
        .single();

      if (error) {
        console.error('Error creating request:', error);
        return null;
      }

      // Get vendor user_ids to send notification
      const { data: vendorProfiles } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('vendor_id', data.vendor_id)
        .eq('role', 'vendor');

      // Create notification for vendor users
      const productName = newRequest.products?.name || 'General Stock';
      if (vendorProfiles && vendorProfiles.length > 0) {
        for (const vp of vendorProfiles) {
          await supabase.from('alerts').insert({
            type: 'stock_request',
            title: 'New Stock Request',
            message: `${profile?.full_name || 'Warehouse Manager'} requested ${data.quantity} units of ${productName}. ${data.notes ? `Notes: ${data.notes}` : ''}`,
            severity: 'info',
            user_id: vp.user_id,
          });
        }
      }

      // Send email notification to vendor
      try {
        await notifyVendorOfStockRequest(
          data.vendor_id,
          productName,
          data.quantity,
          profile?.full_name || 'Warehouse Manager',
          data.notes
        );
      } catch (emailError) {
        console.error('Email notification failed (non-blocking):', emailError);
      }

      // Create audit log
      await supabase.from('audit_logs').insert({
        user_id: user?.id,
        user_name: profile?.full_name || profile?.email,
        action: 'CREATE',
        entity_type: 'StockRequest',
        entity_id: newRequest.id,
        details: `Stock request for ${productName} (qty: ${data.quantity})`,
      });

      return newRequest;
    } catch (error) {
      console.error('Error creating request:', error);
      return null;
    }
  };

  const respondToRequest = async (
    requestId: string, 
    status: 'approved' | 'rejected',
    responseNotes?: string
  ): Promise<boolean> => {
    try {
      // Get the request to send notification
      const request = requests.find(r => r.id === requestId);
      
      const { error } = await supabase
        .from('stock_requests')
        .update({
          status,
          response_notes: responseNotes || null,
          responded_at: new Date().toISOString(),
        })
        .eq('id', requestId);

      if (error) {
        console.error('Error responding to request:', error);
        return false;
      }

      // Create notification alert for the requester
      if (request) {
        const productName = request.products?.name || 'product';
        const alertMessage = status === 'approved'
          ? `Your stock request for ${productName} (qty: ${request.quantity}) has been approved by the vendor.`
          : `Your stock request for ${productName} (qty: ${request.quantity}) has been rejected. ${responseNotes ? `Reason: ${responseNotes}` : ''}`;

        await supabase.from('alerts').insert({
          type: 'vendor_response',
          title: status === 'approved' ? 'Request Approved' : 'Request Rejected',
          message: alertMessage,
          severity: status === 'approved' ? 'info' : 'warning',
          user_id: request.requested_by,
        });

        // Create audit log
        await supabase.from('audit_logs').insert({
          user_id: user?.id,
          user_name: profile?.full_name || profile?.email,
          action: 'UPDATE',
          entity_type: 'StockRequest',
          entity_id: requestId,
          details: `${status === 'approved' ? 'Approved' : 'Rejected'} stock request for ${productName}`,
        });
      }

      return true;
    } catch (error) {
      console.error('Error responding to request:', error);
      return false;
    }
  };

  const pendingCount = requests.filter(r => r.status === 'pending').length;

  return {
    requests,
    isLoading,
    refetch: fetchRequests,
    createRequest,
    respondToRequest,
    pendingCount,
  };
};
