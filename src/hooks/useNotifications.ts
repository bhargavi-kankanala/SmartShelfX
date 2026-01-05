import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface VendorEmailData {
  vendorEmail: string;
  vendorName: string;
  type: 'purchase_order' | 'stock_request' | 'order_update';
  data: {
    orderId?: string;
    productName?: string;
    quantity?: number;
    totalAmount?: number;
    requesterName?: string;
    status?: string;
    notes?: string;
  };
}

interface SMSData {
  phoneNumber: string;
  type: 'critical_stock' | 'out_of_stock' | 'urgent_order';
  data: {
    productName?: string;
    currentStock?: number;
    reorderLevel?: number;
    vendorName?: string;
    orderId?: string;
  };
}

export const useNotifications = () => {
  const sendVendorEmail = async (data: VendorEmailData): Promise<boolean> => {
    try {
      console.log('Sending vendor email:', data);
      
      const { data: result, error } = await supabase.functions.invoke('send-vendor-email', {
        body: data,
      });

      if (error) {
        console.error('Error sending email:', error);
        return false;
      }

      console.log('Email sent successfully:', result);
      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      return false;
    }
  };

  const sendSMSAlert = async (data: SMSData): Promise<boolean> => {
    try {
      console.log('Sending SMS alert:', data);
      
      const { data: result, error } = await supabase.functions.invoke('send-sms-alert', {
        body: data,
      });

      if (error) {
        console.error('Error sending SMS:', error);
        return false;
      }

      console.log('SMS sent successfully:', result);
      return true;
    } catch (error) {
      console.error('Error sending SMS:', error);
      return false;
    }
  };

  const notifyVendorOfPO = async (
    vendorId: string,
    orderId: string,
    productNames: string,
    totalAmount: number,
    requesterName: string
  ) => {
    // Get vendor details
    const { data: vendor } = await supabase
      .from('vendors')
      .select('name, email, phone')
      .eq('id', vendorId)
      .single();

    if (!vendor) {
      console.error('Vendor not found');
      return;
    }

    // Send email notification
    const emailSent = await sendVendorEmail({
      vendorEmail: vendor.email,
      vendorName: vendor.name,
      type: 'purchase_order',
      data: {
        orderId,
        productName: productNames,
        totalAmount,
        requesterName,
      },
    });

    if (emailSent) {
      toast.success('Email notification sent to vendor');
    }
  };

  const notifyVendorOfStockRequest = async (
    vendorId: string,
    productName: string,
    quantity: number,
    requesterName: string,
    notes?: string
  ) => {
    // Get vendor details
    const { data: vendor } = await supabase
      .from('vendors')
      .select('name, email, phone')
      .eq('id', vendorId)
      .single();

    if (!vendor) {
      console.error('Vendor not found');
      return;
    }

    // Send email notification
    await sendVendorEmail({
      vendorEmail: vendor.email,
      vendorName: vendor.name,
      type: 'stock_request',
      data: {
        productName,
        quantity,
        requesterName,
        notes,
      },
    });
  };

  const notifyCriticalStock = async (
    vendorId: string,
    productName: string,
    currentStock: number,
    reorderLevel: number
  ) => {
    // Get vendor details
    const { data: vendor } = await supabase
      .from('vendors')
      .select('name, email, phone')
      .eq('id', vendorId)
      .single();

    if (!vendor) {
      console.error('Vendor not found');
      return;
    }

    // Send SMS for critical alerts if phone is available
    if (vendor.phone) {
      await sendSMSAlert({
        phoneNumber: vendor.phone,
        type: currentStock === 0 ? 'out_of_stock' : 'critical_stock',
        data: {
          productName,
          currentStock,
          reorderLevel,
          vendorName: vendor.name,
        },
      });
    }
  };

  return {
    sendVendorEmail,
    sendSMSAlert,
    notifyVendorOfPO,
    notifyVendorOfStockRequest,
    notifyCriticalStock,
  };
};
