import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export interface AuditLog {
  id: string;
  user_id: string | null;
  user_name: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: string | null;
  created_at: string;
}

export const useAuditLogs = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Error fetching audit logs:', error);
        return;
      }

      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    if (!user) return;

    // Real-time subscription for audit logs
    const channel = supabase
      .channel('audit-logs-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'audit_logs',
        },
        (payload) => {
          setLogs((prev) => [payload.new as AuditLog, ...prev.slice(0, 99)]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    logs,
    isLoading,
    refetch: fetchLogs,
  };
};

// Helper function to create audit log entries
export const createAuditLog = async (
  action: string,
  entityType: string,
  entityId: string | null,
  details: string | null,
  userName?: string | null
) => {
  const { data: { user } } = await supabase.auth.getUser();
  
  const { error } = await supabase.from('audit_logs').insert({
    user_id: user?.id || null,
    user_name: userName || user?.email || 'System',
    action,
    entity_type: entityType,
    entity_id: entityId,
    details,
  });

  if (error) {
    console.error('Error creating audit log:', error);
  }
};
