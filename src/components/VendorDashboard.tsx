import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Package,
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Inbox,
  Eye,
  ShoppingCart,
  Send,
} from 'lucide-react';
import { useRealtimeProducts } from '@/hooks/useRealtimeProducts';
import { useStockRequests } from '@/hooks/useStockRequests';
import { usePurchaseOrders } from '@/hooks/usePurchaseOrders';
import { useRealtimeAlerts } from '@/hooks/useRealtimeAlerts';
import { cn } from '@/lib/utils';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const VendorDashboard: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { products } = useRealtimeProducts();
  const { requests, pendingCount: stockRequestPendingCount, respondToRequest } = useStockRequests();
  const { purchaseOrders, pendingCount: poPendingCount, respondToPO } = usePurchaseOrders();
  const { alerts, unreadCount } = useRealtimeAlerts();

  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [selectedPO, setSelectedPO] = useState<any>(null);
  const [isResponseDialogOpen, setIsResponseDialogOpen] = useState(false);
  const [isPODialogOpen, setIsPODialogOpen] = useState(false);
  const [responseNotes, setResponseNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter products for this vendor
  const vendorProducts = products.filter(p => p.vendor_id === profile?.vendor_id);
  const lowStockProducts = vendorProducts.filter(p => p.current_stock <= p.reorder_level);
  const outOfStockProducts = vendorProducts.filter(p => p.current_stock === 0);

  // Recent pending stock requests
  const recentPendingRequests = requests.filter(r => r.status === 'pending').slice(0, 5);
  
  // Pending purchase orders for vendor
  const pendingPOs = purchaseOrders.filter(po => po.status === 'pending').slice(0, 5);

  // Calculate stats
  const totalStock = vendorProducts.reduce((sum, p) => sum + p.current_stock, 0);
  const totalValue = vendorProducts.reduce((sum, p) => sum + (p.current_stock * p.price), 0);
  const totalPendingCount = stockRequestPendingCount + poPendingCount;

  const statCards = [
    {
      title: 'My Products',
      value: vendorProducts.length.toString(),
      icon: Package,
      color: 'primary',
      link: '/products',
    },
    {
      title: 'Pending Actions',
      value: totalPendingCount.toString(),
      icon: Clock,
      color: 'warning',
      link: '/stock-requests',
    },
    {
      title: 'Low Stock Items',
      value: lowStockProducts.length.toString(),
      icon: AlertTriangle,
      color: 'destructive',
      link: '/products',
    },
    {
      title: 'Unread Alerts',
      value: unreadCount.toString(),
      icon: Inbox,
      color: 'info',
      link: '/alerts',
    },
  ];

  const handleOpenRequestDialog = (request: any) => {
    setSelectedRequest(request);
    setResponseNotes('');
    setIsResponseDialogOpen(true);
  };

  const handleOpenPODialog = (po: any) => {
    setSelectedPO(po);
    setResponseNotes('');
    setIsPODialogOpen(true);
  };

  const handleRespondToRequest = async (status: 'approved' | 'rejected') => {
    if (!selectedRequest) return;
    
    setIsSubmitting(true);
    const success = await respondToRequest(selectedRequest.id, status, responseNotes);
    setIsSubmitting(false);
    
    if (success) {
      setIsResponseDialogOpen(false);
      setSelectedRequest(null);
      setResponseNotes('');
    }
  };

  const handleRespondToPO = async (status: 'approved' | 'rejected') => {
    if (!selectedPO) return;
    
    setIsSubmitting(true);
    const success = await respondToPO(selectedPO.id, status, responseNotes);
    setIsSubmitting(false);
    
    if (success) {
      setIsPODialogOpen(false);
      setSelectedPO(null);
      setResponseNotes('');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return { label: 'Pending', class: 'bg-warning/10 text-warning', icon: Clock };
      case 'approved':
        return { label: 'Approved', class: 'bg-success/10 text-success', icon: CheckCircle };
      case 'rejected':
        return { label: 'Rejected', class: 'bg-destructive/10 text-destructive', icon: XCircle };
      default:
        return { label: status, class: 'bg-muted text-muted-foreground', icon: Clock };
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Banner */}
      <div className="glass-card p-6 glow-primary">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">Welcome back, {profile?.full_name || 'Vendor'}!</h2>
            <p className="text-muted-foreground mt-1">
              {totalPendingCount > 0 
                ? `You have ${totalPendingCount} pending action${totalPendingCount > 1 ? 's' : ''} to review.`
                : "Here's an overview of your products and requests."
              }
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 border border-primary/20">
              <TrendingUp className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Total Stock</p>
                <p className="text-lg font-bold text-primary">{totalStock.toLocaleString()} units</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <Link key={index} to={stat.link}>
            <Card className="stat-card overflow-hidden cursor-pointer hover:border-primary/50 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-3xl font-bold mt-1">{stat.value}</p>
                  </div>
                  <div className={cn(
                    'flex h-12 w-12 items-center justify-center rounded-xl',
                    stat.color === 'primary' && 'bg-primary/10 text-primary',
                    stat.color === 'warning' && 'bg-warning/10 text-warning',
                    stat.color === 'destructive' && 'bg-destructive/10 text-destructive',
                    stat.color === 'info' && 'bg-info/10 text-info'
                  )}>
                    <stat.icon className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Purchase Orders - Action Required */}
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              Purchase Orders
              {poPendingCount > 0 && (
                <span className="ml-2 px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-bold animate-pulse">
                  {poPendingCount} pending
                </span>
              )}
            </CardTitle>
            <Link to="/purchase-orders">
              <Button variant="ghost" size="sm" className="text-xs">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingPOs.length > 0 ? (
              pendingPOs.map((po) => (
                <div
                  key={po.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20 hover:bg-primary/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <ShoppingCart className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">PO #{po.id.slice(0, 8)}</p>
                      <p className="text-xs text-muted-foreground">
                        {po.items.length} items • ₹{po.totalAmount.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-success hover:text-success hover:bg-success/10"
                      onClick={() => handleOpenPODialog(po)}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Review
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle className="h-12 w-12 text-success mb-4" />
                <p className="text-lg font-semibold">All caught up!</p>
                <p className="text-sm text-muted-foreground">No pending purchase orders</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Stock Requests */}
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Clock className="h-5 w-5 text-warning" />
              Stock Requests
              {stockRequestPendingCount > 0 && (
                <span className="ml-2 px-2 py-0.5 rounded-full bg-warning/20 text-warning text-xs font-bold animate-pulse">
                  {stockRequestPendingCount} awaiting
                </span>
              )}
            </CardTitle>
            <Link to="/stock-requests">
              <Button variant="ghost" size="sm" className="text-xs">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentPendingRequests.length > 0 ? (
              recentPendingRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-warning/5 border border-warning/20 hover:bg-warning/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
                      <Package className="h-5 w-5 text-warning" />
                    </div>
                    <div>
                      <p className="font-medium">{request.products?.name || 'Stock Request'}</p>
                      <p className="text-xs text-muted-foreground">
                        Qty: {request.quantity} • By: {request.requested_by_name || 'Unknown'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-warning hover:text-warning hover:bg-warning/10"
                      onClick={() => handleOpenRequestDialog(request)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Review
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle className="h-12 w-12 text-success mb-4" />
                <p className="text-lg font-semibold">All caught up!</p>
                <p className="text-sm text-muted-foreground">No pending requests to review</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Products */}
      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Low Stock Products
          </CardTitle>
          <Link to="/products">
            <Button variant="ghost" size="sm" className="text-xs">
              View All
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {lowStockProducts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {lowStockProducts.slice(0, 6).map((product) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/20"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-lg',
                      product.current_stock === 0 ? 'bg-destructive/10' : 'bg-warning/10'
                    )}>
                      <Package className={cn(
                        'h-5 w-5',
                        product.current_stock === 0 ? 'text-destructive' : 'text-warning'
                      )} />
                    </div>
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-xs text-muted-foreground">
                        SKU: {product.sku}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      'font-bold',
                      product.current_stock === 0 ? 'text-destructive' : 'text-warning'
                    )}>
                      {product.current_stock} / {product.reorder_level}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {product.current_stock === 0 ? 'Out of Stock' : 'Low Stock'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle className="h-12 w-12 text-success mb-4" />
              <p className="text-lg font-semibold">Stock levels are healthy</p>
              <p className="text-sm text-muted-foreground">All products have sufficient stock</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stock Request Response Dialog */}
      <Dialog open={isResponseDialogOpen} onOpenChange={setIsResponseDialogOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Review Stock Request</DialogTitle>
            <DialogDescription>
              Approve or reject this stock request
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Product</Label>
                  <p className="font-medium">{selectedRequest.products?.name || 'General Request'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Quantity</Label>
                  <p className="font-medium">{selectedRequest.quantity} units</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Requested By</Label>
                  <p className="font-medium">{selectedRequest.requested_by_name || 'Unknown'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Date</Label>
                  <p className="font-medium">{new Date(selectedRequest.created_at).toLocaleDateString()}</p>
                </div>
              </div>
              {selectedRequest.notes && (
                <div>
                  <Label className="text-muted-foreground">Notes</Label>
                  <p className="font-medium">{selectedRequest.notes}</p>
                </div>
              )}
              <div>
                <Label>Response Notes (Optional)</Label>
                <Textarea
                  value={responseNotes}
                  onChange={(e) => setResponseNotes(e.target.value)}
                  placeholder="Add any notes about your decision..."
                  className="mt-1"
                />
              </div>
            </div>
          )}
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsResponseDialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleRespondToRequest('rejected')}
              disabled={isSubmitting}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject
            </Button>
            <Button
              onClick={() => handleRespondToRequest('approved')}
              disabled={isSubmitting}
              className="bg-success hover:bg-success/90"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Purchase Order Response Dialog */}
      <Dialog open={isPODialogOpen} onOpenChange={setIsPODialogOpen}>
        <DialogContent className="max-w-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle>Review Purchase Order</DialogTitle>
            <DialogDescription>
              {selectedPO && `PO #${selectedPO.id.slice(0, 8)}`}
            </DialogDescription>
          </DialogHeader>
          {selectedPO && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Total Amount</Label>
                  <p className="text-xl font-bold text-primary">₹{selectedPO.totalAmount.toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Date</Label>
                  <p className="font-medium">{selectedPO.createdAt.toLocaleDateString()}</p>
                </div>
              </div>
              
              <div>
                <Label className="text-muted-foreground mb-2 block">Items ({selectedPO.items.length})</Label>
                <div className="border border-border/50 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-3 text-sm font-medium">Product</th>
                        <th className="text-right p-3 text-sm font-medium">Qty</th>
                        <th className="text-right p-3 text-sm font-medium">Price</th>
                        <th className="text-right p-3 text-sm font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedPO.items.map((item: any, idx: number) => (
                        <tr key={idx} className="border-t border-border/30">
                          <td className="p-3">{item.productName}</td>
                          <td className="p-3 text-right">{item.quantity}</td>
                          <td className="p-3 text-right">₹{item.unitPrice.toFixed(2)}</td>
                          <td className="p-3 text-right font-medium">₹{(item.quantity * item.unitPrice).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <Label>Response Notes (Optional)</Label>
                <Textarea
                  value={responseNotes}
                  onChange={(e) => setResponseNotes(e.target.value)}
                  placeholder="Add any notes about your decision..."
                  className="mt-1"
                />
              </div>
            </div>
          )}
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setIsPODialogOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleRespondToPO('rejected')}
              disabled={isSubmitting}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject
            </Button>
            <Button
              onClick={() => handleRespondToPO('approved')}
              disabled={isSubmitting}
              className="bg-success hover:bg-success/90"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VendorDashboard;
