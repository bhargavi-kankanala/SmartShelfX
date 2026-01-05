import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

export interface Alert {
  id: string;
  type: string;
  title: string;
  message: string;
  product_id: string | null;
  severity: string;
  is_read: boolean;
  user_id: string | null;
  created_at: string;
}

export const useRealtimeAlerts = () => {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAlerts = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching alerts:', error);
        return;
      }

      setAlerts(data || []);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  useEffect(() => {
    if (!user) return;

    // Subscribe to real-time alerts
    const channel = supabase
      .channel('alerts-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'alerts',
        },
        (payload) => {
          const newAlert = payload.new as Alert;
          setAlerts((prev) => [newAlert, ...prev]);
          
          // Show toast notification for new alerts
          const toastType = newAlert.severity === 'critical' ? 'error' : 
                           newAlert.severity === 'warning' ? 'warning' : 'info';
          
          if (toastType === 'error') {
            toast.error(newAlert.title, { description: newAlert.message });
          } else if (toastType === 'warning') {
            toast.warning(newAlert.title, { description: newAlert.message });
          } else {
            toast.info(newAlert.title, { description: newAlert.message });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'alerts',
        },
        (payload) => {
          const updatedAlert = payload.new as Alert;
          setAlerts((prev) =>
            prev.map((a) => (a.id === updatedAlert.id ? updatedAlert : a))
          );
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'alerts',
        },
        (payload) => {
          const deletedId = payload.old.id;
          setAlerts((prev) => prev.filter((a) => a.id !== deletedId));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const markAsRead = async (alertId: string) => {
    const { error } = await supabase
      .from('alerts')
      .update({ is_read: true })
      .eq('id', alertId);

    if (error) {
      toast.error('Failed to mark alert as read');
    }
  };

  const dismissAlert = async (alertId: string) => {
    const { error } = await supabase
      .from('alerts')
      .delete()
      .eq('id', alertId);

    if (error) {
      toast.error('Failed to dismiss alert');
    }
  };

  const unreadCount = alerts.filter((a) => !a.is_read).length;

  return {
    alerts,
    isLoading,
    unreadCount,
    markAsRead,
    dismissAlert,
    refetch: fetchAlerts,
  };
};
