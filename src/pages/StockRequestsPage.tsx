import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useStockRequests } from '@/hooks/useStockRequests';
import { useRealtimeProducts } from '@/hooks/useRealtimeProducts';
import { useVendors } from '@/hooks/useVendors';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Inbox,
  Package,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const StockRequestsPage: React.FC = () => {
  const { getUserRole, profile } = useAuth();
  const role = getUserRole();
  const { requests, isLoading, respondToRequest, createRequest, pendingCount } = useStockRequests();
  const { products } = useRealtimeProducts();
  const { vendors } = useVendors();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isRespondDialogOpen, setIsRespondDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);
  const [responseAction, setResponseAction] = useState<'approved' | 'rejected' | null>(null);
  const [responseNotes, setResponseNotes] = useState('');
  const [newRequestData, setNewRequestData] = useState({
    product_id: '',
    vendor_id: '',
    quantity: '',
    notes: '',
  });

  const canCreateRequest = role === 'admin' || role === 'warehouse_manager';
  const isVendor = role === 'vendor';

  const filteredRequests = requests.filter(req => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !(req.products?.name || '').toLowerCase().includes(query) &&
        !(req.requested_by_name || '').toLowerCase().includes(query) &&
        !(req.notes || '').toLowerCase().includes(query)
      ) {
        return false;
      }
    }
    if (statusFilter !== 'all' && req.status !== statusFilter) {
      return false;
    }
    return true;
  });

  const handleOpenResponse = (requestId: string, action: 'approved' | 'rejected') => {
    setSelectedRequest(requestId);
    setResponseAction(action);
    setResponseNotes('');
    setIsRespondDialogOpen(true);
  };

  const handleSubmitResponse = async () => {
    if (!selectedRequest || !responseAction) return;

    const success = await respondToRequest(selectedRequest, responseAction, responseNotes);
    
    if (success) {
      toast.success(`Request ${responseAction === 'approved' ? 'approved' : 'rejected'} successfully`);
      setIsRespondDialogOpen(false);
      setSelectedRequest(null);
      setResponseAction(null);
      setResponseNotes('');
    } else {
      toast.error('Failed to update request');
    }
  };

  const handleCreateRequest = async () => {
    if (!newRequestData.vendor_id || !newRequestData.quantity) {
      toast.error('Please fill in vendor and quantity');
      return;
    }

    const result = await createRequest({
      product_id: newRequestData.product_id || undefined,
      vendor_id: newRequestData.vendor_id,
      quantity: parseInt(newRequestData.quantity),
      notes: newRequestData.notes || undefined,
    });

    if (result) {
      toast.success('Stock request created and vendor notified');
      setIsCreateDialogOpen(false);
      setNewRequestData({ product_id: '', vendor_id: '', quantity: '', notes: '' });
    } else {
      toast.error('Failed to create request');
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

  if (isLoading) {
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
          <h2 className="text-2xl font-bold">Stock Requests</h2>
          <p className="text-muted-foreground">
            {role === 'vendor' 
              ? 'Review and respond to incoming stock requests' 
              : 'Create and manage stock requests to vendors'}
          </p>
        </div>
        {canCreateRequest && (
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Request
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="stat-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Requests</p>
                <p className="text-2xl font-bold mt-1">{requests.length}</p>
              </div>
              <Inbox className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold text-warning mt-1">{pendingCount}</p>
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
                  {requests.filter(r => r.status === 'approved').length}
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
                <p className="text-sm text-muted-foreground">Rejected</p>
                <p className="text-2xl font-bold text-destructive mt-1">
                  {requests.filter(r => r.status === 'rejected').length}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-destructive" />
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
                placeholder="Search requests..."
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
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Requests Table */}
      <Card className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead className="text-muted-foreground">Product</TableHead>
                <TableHead className="text-muted-foreground text-right">Quantity</TableHead>
                <TableHead className="text-muted-foreground">Requested By</TableHead>
                <TableHead className="text-muted-foreground">Role</TableHead>
                <TableHead className="text-muted-foreground">Notes</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
                <TableHead className="text-muted-foreground">Date</TableHead>
                {role === 'vendor' && (
                  <TableHead className="text-muted-foreground w-32">Actions</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRequests.map((request) => {
                const badge = getStatusBadge(request.status);
                const IconComponent = badge.icon;
                return (
                  <TableRow key={request.id} className="table-row-hover border-border/30">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {request.products?.name || 'Custom Request'}
                        </span>
                      </div>
                      {request.products?.sku && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {request.products.sku}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-bold">{request.quantity}</TableCell>
                    <TableCell>{request.requested_by_name || 'Unknown'}</TableCell>
                    <TableCell>
                      <span className="capitalize text-sm">{request.requested_by_role}</span>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {request.notes || '-'}
                    </TableCell>
                    <TableCell>
                      <span className={cn('flex items-center gap-1.5 w-fit px-2 py-1 rounded-full text-xs font-medium', badge.class)}>
                        <IconComponent className="h-3 w-3" />
                        {badge.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(request.created_at).toLocaleDateString()}
                    </TableCell>
                    {role === 'vendor' && (
                      <TableCell>
                        {request.status === 'pending' ? (
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 bg-success/10 border-success/30 text-success hover:bg-success/20"
                              onClick={() => handleOpenResponse(request.id, 'approved')}
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 bg-destructive/10 border-destructive/30 text-destructive hover:bg-destructive/20"
                              onClick={() => handleOpenResponse(request.id, 'rejected')}
                            >
                              <XCircle className="h-3 w-3 mr-1" />
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            {request.responded_at 
                              ? `Responded ${new Date(request.responded_at).toLocaleDateString()}`
                              : '-'}
                          </span>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
              {filteredRequests.length === 0 && (
                <TableRow>
                  <TableCell colSpan={role === 'vendor' ? 8 : 7} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center py-8">
                      <Inbox className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-lg font-semibold">No requests found</p>
                      <p className="text-sm text-muted-foreground">
                        {role === 'vendor' 
                          ? 'You have no incoming stock requests' 
                          : 'No stock requests have been made yet'}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Response Dialog */}
      <Dialog open={isRespondDialogOpen} onOpenChange={setIsRespondDialogOpen}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle>
              {responseAction === 'approved' ? 'Approve Request' : 'Reject Request'}
            </DialogTitle>
            <DialogDescription>
              {responseAction === 'approved' 
                ? 'Confirm approval of this stock request. The requester will be notified.'
                : 'Please provide a reason for rejecting this request.'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder={responseAction === 'approved' 
                ? 'Add any notes (optional)...' 
                : 'Reason for rejection...'}
              value={responseNotes}
              onChange={(e) => setResponseNotes(e.target.value)}
              className="input-dark resize-none"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRespondDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitResponse}
              className={responseAction === 'approved' 
                ? 'bg-success hover:bg-success/90' 
                : 'bg-destructive hover:bg-destructive/90'}
            >
              {responseAction === 'approved' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Request Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle>Create Stock Request</DialogTitle>
            <DialogDescription>
              Send a stock request to a vendor. They will be notified immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="vendor">Vendor *</Label>
              <Select
                value={newRequestData.vendor_id}
                onValueChange={(value) => setNewRequestData(prev => ({ ...prev, vendor_id: value }))}
              >
                <SelectTrigger className="input-dark">
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  {vendors.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="product">Product (Optional)</Label>
              <Select
                value={newRequestData.product_id}
                onValueChange={(value) => setNewRequestData(prev => ({ ...prev, product_id: value }))}
              >
                <SelectTrigger className="input-dark">
                  <SelectValue placeholder="Select product (optional)" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border max-h-[200px]">
                  <SelectItem value="">No specific product</SelectItem>
                  {products
                    .filter(p => !newRequestData.vendor_id || p.vendor_id === newRequestData.vendor_id)
                    .map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name} ({product.sku})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={newRequestData.quantity}
                onChange={(e) => setNewRequestData(prev => ({ ...prev, quantity: e.target.value }))}
                placeholder="Enter quantity"
                className="input-dark"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={newRequestData.notes}
                onChange={(e) => setNewRequestData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Add any notes for the vendor..."
                className="input-dark resize-none"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateRequest}>
              Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StockRequestsPage;
