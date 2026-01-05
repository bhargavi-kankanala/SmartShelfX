import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
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

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { vendorEmail, vendorName, type, data }: EmailRequest = await req.json();

    console.log(`Sending ${type} email to ${vendorEmail}`);

    let subject = '';
    let htmlContent = '';

    switch (type) {
      case 'purchase_order':
        subject = `New Purchase Order #${data.orderId?.slice(0, 8)} - SmartShelfX`;
        htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; padding: 20px; }
              .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
              .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 30px; text-align: center; }
              .header h1 { margin: 0; font-size: 24px; }
              .content { padding: 30px; }
              .order-details { background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0; }
              .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
              .detail-row:last-child { border-bottom: none; }
              .btn { display: inline-block; background: #6366f1; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 20px; }
              .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>📦 New Purchase Order</h1>
              </div>
              <div class="content">
                <p>Hello ${vendorName},</p>
                <p>You have received a new purchase order that requires your attention.</p>
                
                <div class="order-details">
                  <div class="detail-row">
                    <span><strong>Order ID:</strong></span>
                    <span>#${data.orderId?.slice(0, 8)}</span>
                  </div>
                  <div class="detail-row">
                    <span><strong>From:</strong></span>
                    <span>${data.requesterName || 'Warehouse Manager'}</span>
                  </div>
                  ${data.productName ? `
                  <div class="detail-row">
                    <span><strong>Product:</strong></span>
                    <span>${data.productName}</span>
                  </div>
                  ` : ''}
                  ${data.quantity ? `
                  <div class="detail-row">
                    <span><strong>Quantity:</strong></span>
                    <span>${data.quantity} units</span>
                  </div>
                  ` : ''}
                  ${data.totalAmount ? `
                  <div class="detail-row">
                    <span><strong>Total Amount:</strong></span>
                    <span>₹${data.totalAmount.toLocaleString()}</span>
                  </div>
                  ` : ''}
                </div>
                
                <p>Please log in to your SmartShelfX dashboard to review and respond to this order.</p>
                
                <a href="${Deno.env.get('SITE_URL') || 'https://smartshelfx.lovable.app'}" class="btn">View Order</a>
              </div>
              <div class="footer">
                <p>SmartShelfX - Inventory Management System</p>
                <p>This is an automated notification. Please do not reply to this email.</p>
              </div>
            </div>
          </body>
          </html>
        `;
        break;

      case 'stock_request':
        subject = `New Stock Request - ${data.productName || 'General'} - SmartShelfX`;
        htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; padding: 20px; }
              .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
              .header { background: linear-gradient(135deg, #f59e0b, #d97706); color: white; padding: 30px; text-align: center; }
              .header h1 { margin: 0; font-size: 24px; }
              .content { padding: 30px; }
              .order-details { background: #fff7ed; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #fed7aa; }
              .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #fed7aa; }
              .detail-row:last-child { border-bottom: none; }
              .btn { display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; margin-top: 20px; }
              .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>📋 New Stock Request</h1>
              </div>
              <div class="content">
                <p>Hello ${vendorName},</p>
                <p>A warehouse manager has requested stock from your inventory.</p>
                
                <div class="order-details">
                  ${data.productName ? `
                  <div class="detail-row">
                    <span><strong>Product:</strong></span>
                    <span>${data.productName}</span>
                  </div>
                  ` : ''}
                  <div class="detail-row">
                    <span><strong>Quantity Requested:</strong></span>
                    <span>${data.quantity} units</span>
                  </div>
                  <div class="detail-row">
                    <span><strong>Requested By:</strong></span>
                    <span>${data.requesterName || 'Warehouse Manager'}</span>
                  </div>
                  ${data.notes ? `
                  <div class="detail-row">
                    <span><strong>Notes:</strong></span>
                    <span>${data.notes}</span>
                  </div>
                  ` : ''}
                </div>
                
                <p>Please log in to approve or reject this request.</p>
                
                <a href="${Deno.env.get('SITE_URL') || 'https://smartshelfx.lovable.app'}/stock-requests" class="btn">Review Request</a>
              </div>
              <div class="footer">
                <p>SmartShelfX - Inventory Management System</p>
              </div>
            </div>
          </body>
          </html>
        `;
        break;

      case 'order_update':
        const statusColor = data.status === 'approved' ? '#22c55e' : data.status === 'rejected' ? '#ef4444' : '#6366f1';
        const statusEmoji = data.status === 'approved' ? '✅' : data.status === 'rejected' ? '❌' : '📦';
        
        subject = `Order ${data.status?.toUpperCase()} - #${data.orderId?.slice(0, 8)} - SmartShelfX`;
        htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; padding: 20px; }
              .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
              .header { background: ${statusColor}; color: white; padding: 30px; text-align: center; }
              .header h1 { margin: 0; font-size: 24px; }
              .content { padding: 30px; }
              .status-badge { display: inline-block; background: ${statusColor}20; color: ${statusColor}; padding: 8px 16px; border-radius: 20px; font-weight: bold; margin: 10px 0; }
              .footer { text-align: center; padding: 20px; color: #64748b; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>${statusEmoji} Order ${data.status?.toUpperCase()}</h1>
              </div>
              <div class="content">
                <p>Hello ${vendorName},</p>
                <p>Your order #${data.orderId?.slice(0, 8)} has been <strong>${data.status}</strong>.</p>
                
                <div class="status-badge">${data.status?.toUpperCase()}</div>
                
                ${data.notes ? `<p><strong>Notes:</strong> ${data.notes}</p>` : ''}
                
                <p>Log in to view the details.</p>
              </div>
              <div class="footer">
                <p>SmartShelfX - Inventory Management System</p>
              </div>
            </div>
          </body>
          </html>
        `;
        break;
    }

    const emailResponse = await resend.emails.send({
      from: "SmartShelfX <onboarding@resend.dev>",
      to: [vendorEmail],
      subject,
      html: htmlContent,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-vendor-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
