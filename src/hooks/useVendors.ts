import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export interface Vendor {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  address: string | null;
  performance: number | null;
  created_at: string;
  updated_at: string;
}

export const useVendors = () => {
  const { user, profile, getUserRole } = useAuth();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const role = getUserRole();

  const fetchVendors = useCallback(async () => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    try {
      let query = supabase.from('vendors').select('*');
      
      // Role-based filtering
      if (role === 'vendor' && profile?.vendor_id) {
        // Vendors only see their own vendor
        query = query.eq('id', profile.vendor_id);
      } else {
        // Admins and warehouse managers see all vendors
        query = query.order('name', { ascending: true });
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching vendors:', error);
        return;
      }

      setVendors(data || []);
    } catch (error) {
      console.error('Error fetching vendors:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, role, profile?.vendor_id]);

  useEffect(() => {
    fetchVendors();

    // Set up realtime subscription for vendors
    const channel = supabase
      .channel('vendors-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vendors',
        },
        () => {
          fetchVendors();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchVendors]);

  const addVendor = async (vendorData: Omit<Vendor, 'id' | 'created_at' | 'updated_at'>): Promise<Vendor | null> => {
    try {
      const { data, error } = await supabase
        .from('vendors')
        .insert(vendorData)
        .select()
        .single();

      if (error) {
        console.error('Error adding vendor:', error);
        return null;
      }

      // Realtime will handle the refetch
      return data;
    } catch (error) {
      console.error('Error adding vendor:', error);
      return null;
    }
  };

  const updateVendor = async (id: string, vendorData: Partial<Vendor>): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('vendors')
        .update(vendorData)
        .eq('id', id);

      if (error) {
        console.error('Error updating vendor:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error updating vendor:', error);
      return false;
    }
  };

  const deleteVendor = async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('vendors')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting vendor:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error deleting vendor:', error);
      return false;
    }
  };

  return {
    vendors,
    isLoading,
    refetch: fetchVendors,
    addVendor,
    updateVendor,
    deleteVendor,
  };
};
