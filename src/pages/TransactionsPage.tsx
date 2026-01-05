import React, { useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  Download,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  FileSpreadsheet,
  FileText,
} from 'lucide-react';
import { useRealtimeTransactions } from '@/hooks/useRealtimeTransactions';
import { useRealtimeProducts } from '@/hooks/useRealtimeProducts';
import { supabase } from '@/integrations/supabase/client';
import { exportTransactions } from '@/utils/exportUtils';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const TransactionsPage: React.FC = () => {
  const { profile } = useAuth();
  const { transactions, isLoading, refetch } = useRealtimeTransactions();
  const { products } = useRealtimeProducts();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isCustomProduct, setIsCustomProduct] = useState(false);
  const [customProductName, setCustomProductName] = useState('');
  const [formData, setFormData] = useState({
    type: 'stock_in' as 'stock_in' | 'stock_out',
    productId: '',
    quantity: '',
    reference: '',
    notes: '',
  });

  const filteredTransactions = useMemo(() => {
    let filtered = [...transactions];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        t =>
          (t.products?.name || '').toLowerCase().includes(query) ||
          (t.products?.sku || '').toLowerCase().includes(query) ||
          (t.reference || '').toLowerCase().includes(query)
      );
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(t => t.type === typeFilter);
    }

    return filtered;
  }, [transactions, searchQuery, typeFilter]);

  const handleAddTransaction = async () => {
    if (!formData.quantity) {
      toast.error('Please enter quantity');
      return;
    }

    if (!isCustomProduct && !formData.productId) {
      toast.error('Please select a product');
      return;
    }

    if (isCustomProduct && !customProductName.trim()) {
      toast.error('Please enter a custom product name');
      return;
    }

    const quantity = parseInt(formData.quantity);
    
    if (!isCustomProduct) {
      const product = products.find(p => p.id === formData.productId);
      if (!product) {
        toast.error('Selected product not found');
        return;
      }

      if (formData.type === 'stock_out' && quantity > product.current_stock) {
        toast.error(`Insufficient stock. Available: ${product.current_stock}`);
        return;
      }

      const { data: newTxn, error } = await supabase.from('transactions').insert({
        type: formData.type,
        product_id: formData.productId,
        quantity: quantity,
        handler_id: profile?.user_id || null,
        handler_name: profile?.full_name || 'Unknown',
        reference: formData.reference || null,
        notes: formData.notes || null,
      }).select().single();

      if (error) {
        console.error('Error adding transaction:', error);
        toast.error('Failed to record transaction');
        return;
      }

      // Create audit log
      await supabase.from('audit_logs').insert({
        user_id: profile?.user_id,
        user_name: profile?.full_name || profile?.email,
        action: formData.type === 'stock_in' ? 'STOCK_IN' : 'STOCK_OUT',
        entity_type: 'Transaction',
        entity_id: newTxn?.id || null,
        details: `${formData.type === 'stock_in' ? 'Added' : 'Removed'} ${quantity} units of ${product.name}`,
      });

      toast.success(
        `${formData.type === 'stock_in' ? 'Stock In' : 'Stock Out'} recorded: ${quantity} units of ${product.name}`
      );
    } else {
      // For custom product, add note with product name
      const { data: newTxn, error } = await supabase.from('transactions').insert({
        type: formData.type,
        product_id: products[0]?.id || null, // Fallback, ideally should create product first
        quantity: quantity,
        handler_id: profile?.user_id || null,
        handler_name: profile?.full_name || 'Unknown',
        reference: formData.reference || null,
        notes: `Custom Product: ${customProductName}. ${formData.notes || ''}`.trim(),
      }).select().single();

      if (error) {
        console.error('Error adding transaction:', error);
        toast.error('Failed to record transaction. Please add a product first.');
        return;
      }

      // Create audit log
      await supabase.from('audit_logs').insert({
        user_id: profile?.user_id,
        user_name: profile?.full_name || profile?.email,
        action: formData.type === 'stock_in' ? 'STOCK_IN' : 'STOCK_OUT',
        entity_type: 'Transaction',
        entity_id: newTxn?.id || null,
        details: `${formData.type === 'stock_in' ? 'Added' : 'Removed'} ${quantity} units of ${customProductName} (custom)`,
      });

      toast.success(
        `${formData.type === 'stock_in' ? 'Stock In' : 'Stock Out'} recorded: ${quantity} units of ${customProductName}`
      );
    }

    setIsAddDialogOpen(false);
    setIsCustomProduct(false);
    setCustomProductName('');
    setFormData({
      type: 'stock_in',
      productId: '',
      quantity: '',
      reference: '',
      notes: '',
    });
  };

  const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
    const exportData = filteredTransactions.map(t => ({
      id: t.id,
      type: t.type,
      productId: t.product_id,
      productName: t.products?.name || '',
      productSku: t.products?.sku || '',
      quantity: t.quantity,
      handler: t.handler_name || '',
      reference: t.reference,
      notes: t.notes,
      timestamp: new Date(t.created_at),
    }));
    exportTransactions(exportData as any, format);
    toast.success(`Transactions exported as ${format.toUpperCase()}`);
  };

  const totalStockIn = transactions
    .filter(t => t.type === 'stock_in')
    .reduce((sum, t) => sum + t.quantity, 0);

  const totalStockOut = transactions
    .filter(t => t.type === 'stock_out')
    .reduce((sum, t) => sum + t.quantity, 0);

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
          <h2 className="text-2xl font-bold">Transactions</h2>
          <p className="text-muted-foreground">
            Track stock movements ({filteredTransactions.length} records)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Transaction
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('excel')}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export as Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('pdf')}>
                <FileText className="h-4 w-4 mr-2" />
                Export as PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="stat-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Stock In</p>
                <p className="text-2xl font-bold text-success mt-1">+{totalStockIn}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-success/10">
                <TrendingUp className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Stock Out</p>
                <p className="text-2xl font-bold text-accent mt-1">-{totalStockOut}</p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
                <TrendingDown className="h-6 w-6 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Net Movement</p>
                <p className={cn(
                  'text-2xl font-bold mt-1',
                  totalStockIn - totalStockOut >= 0 ? 'text-success' : 'text-destructive'
                )}>
                  {totalStockIn - totalStockOut >= 0 ? '+' : ''}{totalStockIn - totalStockOut}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <ArrowRightLeft className="h-6 w-6 text-primary" />
              </div>
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
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 input-dark"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px] input-dark">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="stock_in">Stock In</SelectItem>
                <SelectItem value="stock_out">Stock Out</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead className="text-muted-foreground">Type</TableHead>
                <TableHead className="text-muted-foreground">Product</TableHead>
                <TableHead className="text-muted-foreground">SKU</TableHead>
                <TableHead className="text-muted-foreground text-right">Quantity</TableHead>
                <TableHead className="text-muted-foreground">Handler</TableHead>
                <TableHead className="text-muted-foreground">Reference</TableHead>
                <TableHead className="text-muted-foreground">Date & Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.map((txn) => (
                <TableRow key={txn.id} className="table-row-hover border-border/30">
                  <TableCell>
                    <div className={cn(
                      'flex items-center gap-2 px-2.5 py-1 rounded-full w-fit text-xs font-medium',
                      txn.type === 'stock_in'
                        ? 'bg-success/10 text-success'
                        : 'bg-accent/10 text-accent'
                    )}>
                      {txn.type === 'stock_in' ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {txn.type === 'stock_in' ? 'Stock In' : 'Stock Out'}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{txn.products?.name || 'Unknown'}</TableCell>
                  <TableCell className="font-mono text-sm">{txn.products?.sku || '-'}</TableCell>
                  <TableCell className="text-right">
                    <span className={cn(
                      'font-bold',
                      txn.type === 'stock_in' ? 'text-success' : 'text-accent'
                    )}>
                      {txn.type === 'stock_in' ? '+' : '-'}{txn.quantity}
                    </span>
                  </TableCell>
                  <TableCell>{txn.handler_name || '-'}</TableCell>
                  <TableCell className="font-mono text-sm">{txn.reference || '-'}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(txn.created_at).toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
              {filteredTransactions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center py-8">
                      <ArrowRightLeft className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-lg font-semibold">No transactions yet</p>
                      <p className="text-sm text-muted-foreground mb-4">
                        Record your first stock movement
                      </p>
                      <Button onClick={() => setIsAddDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        New Transaction
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Add Transaction Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle>Record Transaction</DialogTitle>
            <DialogDescription>
              Record a stock-in or stock-out transaction.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Transaction Type</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={formData.type === 'stock_in' ? 'default' : 'outline'}
                  className={cn(
                    formData.type === 'stock_in' && 'bg-success hover:bg-success/90'
                  )}
                  onClick={() => setFormData(prev => ({ ...prev, type: 'stock_in' }))}
                >
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Stock In
                </Button>
                <Button
                  type="button"
                  variant={formData.type === 'stock_out' ? 'default' : 'outline'}
                  className={cn(
                    formData.type === 'stock_out' && 'bg-accent hover:bg-accent/90'
                  )}
                  onClick={() => setFormData(prev => ({ ...prev, type: 'stock_out' }))}
                >
                  <TrendingDown className="h-4 w-4 mr-2" />
                  Stock Out
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="product">Product *</Label>
              {!isCustomProduct ? (
                <Select
                  value={formData.productId}
                  onValueChange={(value) => {
                    if (value === 'other') {
                      setIsCustomProduct(true);
                      setFormData(prev => ({ ...prev, productId: '' }));
                    } else {
                      setFormData(prev => ({ ...prev, productId: value }));
                    }
                  }}
                >
                  <SelectTrigger className="input-dark">
                    <SelectValue placeholder="Select product" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border">
                    {products.length === 0 ? (
                      <SelectItem value="no-products" disabled>
                        No products available - Add products first
                      </SelectItem>
                    ) : (
                      products.map(product => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} ({product.sku}) - Stock: {product.current_stock}
                        </SelectItem>
                      ))
                    )}
                    <SelectItem value="other" className="border-t border-border mt-1 pt-1">
                      + Other (Custom Product)
                    </SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="space-y-2">
                  <Input
                    placeholder="Enter custom product name"
                    value={customProductName}
                    onChange={(e) => setCustomProductName(e.target.value)}
                    className="input-dark"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setIsCustomProduct(false);
                      setCustomProductName('');
                    }}
                    className="text-xs text-muted-foreground"
                  >
                    ← Select from existing products
                  </Button>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                className="input-dark"
                placeholder="Enter quantity"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reference">Reference (PO/Order #)</Label>
              <Input
                id="reference"
                value={formData.reference}
                onChange={(e) => setFormData(prev => ({ ...prev, reference: e.target.value }))}
                className="input-dark"
                placeholder="e.g., PO-2024-001"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                className="input-dark resize-none"
                placeholder="Additional notes..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddTransaction}
              disabled={
                !formData.quantity || 
                (!isCustomProduct && !formData.productId) ||
                (isCustomProduct && !customProductName.trim())
              }
            >
              Record Transaction
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TransactionsPage;
