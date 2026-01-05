import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  Search,
  ShoppingCart,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Clock,
  Send,
  Eye,
  FileSpreadsheet,
  Trash2,
} from 'lucide-react';
import { useVendors } from '@/hooks/useVendors';
import { useRealtimeProducts } from '@/hooks/useRealtimeProducts';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PurchaseOrderItem {
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  unitPrice: number;
}

interface PurchaseOrder {
  id: string;
  vendor_id: string;
  vendorName: string;
  status: string;
  items: PurchaseOrderItem[];
  totalAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

const PurchaseOrdersPage: React.FC = () => {
  const { profile } = useAuth();
  const { vendors, isLoading: vendorsLoading } = useVendors();
  const { products, isLoading: productsLoading } = useRealtimeProducts();
  const { notifyVendorOfPO, sendVendorEmail } = useNotifications();
  
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);

  const [formData, setFormData] = useState({
    vendorId: '',
    items: [] as { productId: string; customName: string; quantity: number; unitPrice: number }[],
  });

  // Fetch purchase orders from Supabase
  React.useEffect(() => {
    const fetchPurchaseOrders = async () => {
      const { data: orders, error } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          vendors:vendor_id(name)
        `)
        .order('created_at', { ascending: false });

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
            };
          })
        );

        setPurchaseOrders(ordersWithItems);
      }
    };

    fetchPurchaseOrders();

    // Real-time subscription
    const channel = supabase
      .channel('purchase-orders-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'purchase_orders',
        },
        () => {
          fetchPurchaseOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredOrders = useMemo(() => {
    return purchaseOrders.filter(po => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!po.id.toLowerCase().includes(query) && !po.vendorName.toLowerCase().includes(query)) {
          return false;
        }
      }
      if (statusFilter !== 'all' && po.status !== statusFilter) {
        return false;
      }
      return true;
    }).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [purchaseOrders, searchQuery, statusFilter]);

  const handleCreatePO = async () => {
    if (!formData.vendorId || formData.items.length === 0) {
      toast.error('Please select a vendor and add at least one item');
      return;
    }

    const validItems = formData.items.filter(item => 
      (item.productId || item.customName) && item.quantity > 0
    );

    if (validItems.length === 0) {
      toast.error('Please add at least one valid item');
      return;
    }

    const totalAmount = validItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const selectedVendor = vendors.find(v => v.id === formData.vendorId);

    // Create purchase order
    const { data: newPO, error: poError } = await supabase
      .from('purchase_orders')
      .insert({
        vendor_id: formData.vendorId,
        total_amount: totalAmount,
        created_by: profile?.user_id || null,
      })
      .select()
      .single();

    if (poError) {
      console.error('Error creating purchase order:', poError);
      toast.error('Failed to create purchase order');
      return;
    }

    // Create purchase order items
    const itemsToInsert = validItems
      .filter(item => item.productId) // Only items with real products
      .map(item => ({
        purchase_order_id: newPO.id,
        product_id: item.productId,
        quantity: item.quantity,
        unit_price: item.unitPrice,
      }));

    if (itemsToInsert.length > 0) {
      const { error: itemsError } = await supabase
        .from('purchase_order_items')
        .insert(itemsToInsert);

      if (itemsError) {
        console.error('Error creating PO items:', itemsError);
      }
    }

    // Get vendor user_id from profiles to send notification
    const { data: vendorProfiles } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('vendor_id', formData.vendorId)
      .eq('role', 'vendor');

    // Create notification for vendor
    const productNames = validItems.map(item => {
      const product = products.find(p => p.id === item.productId);
      return product ? `${product.name} (${item.quantity})` : item.customName || 'Custom Item';
    }).join(', ');

    // Send notification to all vendor users
    if (vendorProfiles && vendorProfiles.length > 0) {
      for (const vp of vendorProfiles) {
        await supabase.from('alerts').insert({
          type: 'purchase_order',
          title: 'New Purchase Order',
          message: `New PO #${newPO.id.slice(0, 8)} from ${profile?.full_name || 'Warehouse Manager'}: ${productNames}. Total: ₹${totalAmount.toLocaleString()}`,
          severity: 'info',
          user_id: vp.user_id,
        });
      }
    } else {
      // Create a general alert for the vendor (viewable by all)
      await supabase.from('alerts').insert({
        type: 'purchase_order',
        title: 'New Purchase Order',
        message: `New PO #${newPO.id.slice(0, 8)} for ${selectedVendor?.name || 'vendor'}: ${productNames}. Total: ₹${totalAmount.toLocaleString()}`,
        severity: 'info',
        user_id: null,
      });
    }

    // Create audit log
    await supabase.from('audit_logs').insert({
      user_id: profile?.user_id,
      user_name: profile?.full_name || profile?.email,
      action: 'CREATE',
      entity_type: 'PurchaseOrder',
      entity_id: newPO.id,
      details: `Created PO for ${selectedVendor?.name}: ${productNames}`,
    });

    // Send email notification to vendor
    try {
      await notifyVendorOfPO(
        formData.vendorId,
        newPO.id,
        productNames,
        totalAmount,
        profile?.full_name || 'Warehouse Manager'
      );
    } catch (emailError) {
      console.error('Email notification failed (non-blocking):', emailError);
    }

    setIsCreateDialogOpen(false);
    setFormData({ vendorId: '', items: [] });
    toast.success('Purchase order created and vendor notified');
  };

  const handleStatusChange = async (poId: string, newStatus: 'approved' | 'rejected' | 'completed') => {
    const po = purchaseOrders.find(p => p.id === poId);
    
    const { error } = await supabase
      .from('purchase_orders')
      .update({ status: newStatus })
      .eq('id', poId);

    if (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
      return;
    }

    // Get vendor user_ids to notify
    if (po) {
      const { data: vendorProfiles } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('vendor_id', po.vendor_id)
        .eq('role', 'vendor');

      const statusLabel = newStatus === 'approved' ? 'Approved' : newStatus === 'rejected' ? 'Rejected' : 'Completed';
      const severity = newStatus === 'rejected' ? 'warning' : 'info';

      // Notify vendor users
      if (vendorProfiles && vendorProfiles.length > 0) {
        for (const vp of vendorProfiles) {
          await supabase.from('alerts').insert({
            type: 'order_update',
            title: `Purchase Order ${statusLabel}`,
            message: `PO #${poId.slice(0, 8)} has been ${newStatus}. Total: ₹${po.totalAmount.toLocaleString()}`,
            severity,
            user_id: vp.user_id,
          });
        }
      }

      // Create audit log
      await supabase.from('audit_logs').insert({
        user_id: profile?.user_id,
        user_name: profile?.full_name || profile?.email,
        action: 'UPDATE',
        entity_type: 'PurchaseOrder',
        entity_id: poId,
        details: `Changed PO status to ${newStatus}`,
      });
    }

    const action = newStatus === 'approved' ? 'approved' : newStatus === 'rejected' ? 'rejected' : 'marked as completed';
    toast.success(`Purchase order ${action}`);

    if (newStatus === 'approved') {
      toast.info('Vendor has been notified');
    }
  };

  const addItemToForm = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { productId: '', customName: '', quantity: 1, unitPrice: 0 }],
    }));
  };

  const removeItemFromForm = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return { label: 'Pending', class: 'bg-warning/10 text-warning', icon: Clock };
      case 'approved':
        return { label: 'Approved', class: 'bg-success/10 text-success', icon: CheckCircle };
      case 'rejected':
        return { label: 'Rejected', class: 'bg-destructive/10 text-destructive', icon: XCircle };
      case 'completed':
        return { label: 'Completed', class: 'bg-primary/10 text-primary', icon: CheckCircle };
      default:
        return { label: status, class: 'bg-muted text-muted-foreground', icon: Clock };
    }
  };

  // Filter products based on selected vendor
  const vendorProducts = useMemo(() => {
    if (!formData.vendorId) return products;
    return products.filter(p => p.vendor_id === formData.vendorId);
  }, [formData.vendorId, products]);

  if (vendorsLoading || productsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Purchase Orders</h2>
          <p className="text-muted-foreground">
            Manage vendor orders and restock requests
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create PO
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="stat-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold mt-1">{purchaseOrders.length}</p>
              </div>
              <ShoppingCart className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-warning mt-1">
                  {purchaseOrders.filter(po => po.status === 'pending').length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Approved</p>
                <p className="text-2xl font-bold text-success mt-1">
                  {purchaseOrders.filter(po => po.status === 'approved').length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold text-primary mt-1">
                  ₹{purchaseOrders.reduce((sum, po) => sum + po.totalAmount, 0).toLocaleString()}
                </p>
              </div>
              <FileSpreadsheet className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search orders..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 input-dark"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px] input-dark">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead className="text-muted-foreground">PO Number</TableHead>
                <TableHead className="text-muted-foreground">Vendor</TableHead>
                <TableHead className="text-muted-foreground text-center">Items</TableHead>
                <TableHead className="text-muted-foreground text-right">Total</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
                <TableHead className="text-muted-foreground">Date</TableHead>
                <TableHead className="text-muted-foreground w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((po) => {
                const badge = getStatusBadge(po.status);
                const IconComponent = badge.icon;
                return (
                  <TableRow key={po.id} className="table-row-hover border-border/30">
                    <TableCell className="font-mono font-medium">{po.id.slice(0, 8)}...</TableCell>
                    <TableCell>{po.vendorName}</TableCell>
                    <TableCell className="text-center">{po.items.length}</TableCell>
                    <TableCell className="text-right font-bold">
                      ₹{po.totalAmount.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <span className={cn('flex items-center gap-1.5 w-fit px-2 py-1 rounded-full text-xs font-medium', badge.class)}>
                        <IconComponent className="h-3 w-3" />
                        {badge.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {po.createdAt.toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-card border-border">
                          <DropdownMenuItem onClick={() => { setSelectedPO(po); setIsViewDialogOpen(true); }}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          {po.status === 'pending' && (
                            <>
                              <DropdownMenuItem onClick={() => handleStatusChange(po.id, 'approved')}>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Approve
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusChange(po.id, 'rejected')}>
                                <XCircle className="h-4 w-4 mr-2" />
                                Reject
                              </DropdownMenuItem>
                            </>
                          )}
                          {po.status === 'approved' && (
                            <DropdownMenuItem onClick={() => handleStatusChange(po.id, 'completed')}>
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Mark Completed
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem>
                            <Send className="h-4 w-4 mr-2" />
                            Send to Vendor
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredOrders.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center py-8">
                      <ShoppingCart className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-lg font-semibold">No purchase orders</p>
                      <p className="text-sm text-muted-foreground mb-4">
                        Create your first purchase order
                      </p>
                      <Button onClick={() => setIsCreateDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Create PO
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Create PO Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle>Create Purchase Order</DialogTitle>
            <DialogDescription>
              Create a new purchase order for vendor restocking.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label>Vendor *</Label>
              <Select
                value={formData.vendorId}
                onValueChange={(value) => setFormData(prev => ({ ...prev, vendorId: value }))}
              >
                <SelectTrigger className="input-dark">
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {vendors.length === 0 ? (
                    <SelectItem value="none" disabled>No vendors available</SelectItem>
                  ) : (
                    vendors.map(vendor => (
                      <SelectItem key={vendor.id} value={vendor.id}>{vendor.name}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Items</Label>
                <Button type="button" variant="outline" size="sm" onClick={addItemToForm}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </Button>
              </div>
              
              {formData.items.map((item, index) => (
                <div key={index} className="flex gap-3 items-end p-3 border border-border/50 rounded-lg">
                  <div className="flex-1 space-y-2">
                    <Label className="text-xs">Product</Label>
                    <Select
                      value={item.productId}
                      onValueChange={(value) => {
                        const newItems = [...formData.items];
                        if (value === 'other') {
                          newItems[index].productId = '';
                        } else {
                          newItems[index].productId = value;
                          const product = products.find(p => p.id === value);
                          if (product) {
                            newItems[index].unitPrice = product.price * 0.7;
                            newItems[index].customName = '';
                          }
                        }
                        setFormData(prev => ({ ...prev, items: newItems }));
                      }}
                    >
                      <SelectTrigger className="input-dark">
                        <SelectValue placeholder="Select or add custom" />
                      </SelectTrigger>
                      <SelectContent className="bg-card border-border">
                        {vendorProducts.map(product => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} ({product.sku})
                          </SelectItem>
                        ))}
                        <SelectItem value="other">
                          <span className="text-primary">+ Other (Custom Item)</span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {!item.productId && (
                      <Input
                        placeholder="Enter custom item name"
                        value={item.customName}
                        onChange={(e) => {
                          const newItems = [...formData.items];
                          newItems[index].customName = e.target.value;
                          setFormData(prev => ({ ...prev, items: newItems }));
                        }}
                        className="input-dark mt-2"
                      />
                    )}
                  </div>
                  <div className="w-24 space-y-2">
                    <Label className="text-xs">Quantity</Label>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => {
                        const newItems = [...formData.items];
                        newItems[index].quantity = parseInt(e.target.value) || 1;
                        setFormData(prev => ({ ...prev, items: newItems }));
                      }}
                      className="input-dark"
                    />
                  </div>
                  <div className="w-28 space-y-2">
                    <Label className="text-xs">Unit Price</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => {
                        const newItems = [...formData.items];
                        newItems[index].unitPrice = parseFloat(e.target.value) || 0;
                        setFormData(prev => ({ ...prev, items: newItems }));
                      }}
                      className="input-dark"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 text-destructive"
                    onClick={() => removeItemFromForm(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              {formData.items.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Click "Add Item" to add products to this order
                </p>
              )}
            </div>

            {formData.items.length > 0 && (
              <div className="border-t border-border/50 pt-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total Amount:</span>
                  <span className="text-xl font-bold text-primary">
                    ₹{formData.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreatePO}>
              Create Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View PO Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle>Purchase Order Details</DialogTitle>
            <DialogDescription>
              {selectedPO?.id}
            </DialogDescription>
          </DialogHeader>
          {selectedPO && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Vendor</Label>
                  <p className="font-medium">{selectedPO.vendorName}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <p className="font-medium capitalize">{selectedPO.status}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Created</Label>
                  <p className="font-medium">{selectedPO.createdAt.toLocaleDateString()}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Total</Label>
                  <p className="font-bold text-primary">₹{selectedPO.totalAmount.toLocaleString()}</p>
                </div>
              </div>
              <div className="border-t border-border/50 pt-4">
                <Label className="text-muted-foreground mb-2 block">Items</Label>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedPO.items.map((item, idx) => (
                      <TableRow key={idx}>
                        <TableCell>{item.productName}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">₹{item.unitPrice.toFixed(2)}</TableCell>
                        <TableCell className="text-right font-medium">
                          ₹{(item.quantity * item.unitPrice).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PurchaseOrdersPage;
