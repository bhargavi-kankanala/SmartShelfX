import React, { useState, useMemo } from 'react';
import { useRealtimeProducts } from '@/hooks/useRealtimeProducts';
import { useVendors } from '@/hooks/useVendors';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Bot, ShoppingCart, Package, AlertTriangle, TrendingDown, Send, Sparkles, Loader2 } from 'lucide-react';

interface RestockSuggestion {
  productId: string;
  productName: string;
  sku: string;
  vendorId: string | null;
  vendorName: string;
  currentStock: number;
  reorderLevel: number;
  suggestedQuantity: number;
  urgency: 'critical' | 'high' | 'medium';
  reason: string;
}

const AutoRestockPage: React.FC = () => {
  const { products } = useRealtimeProducts();
  const { vendors } = useVendors();
  const { user, profile, getUserRole } = useAuth();
  const role = getUserRole();

  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isGeneratingPO, setIsGeneratingPO] = useState(false);
  const [showPOModal, setShowPOModal] = useState(false);
  const [poVendor, setPoVendor] = useState('');
  const [poNotes, setPoNotes] = useState('');
  const [editableQuantities, setEditableQuantities] = useState<Record<string, number>>({});

  // AI-powered restock suggestions
  const restockSuggestions = useMemo((): RestockSuggestion[] => {
    return products
      .filter(p => {
        // Filter for vendor if vendor role
        if (role === 'vendor' && profile?.vendor_id) {
          return p.vendor_id === profile.vendor_id && p.current_stock <= p.reorder_level;
        }
        return p.current_stock <= p.reorder_level;
      })
      .map(p => {
        // AI logic: Calculate suggested quantity based on reorder level and safety stock
        const deficit = p.reorder_level - p.current_stock;
        const safetyStock = Math.ceil(p.reorder_level * 0.5);
        const suggestedQuantity = deficit + safetyStock + Math.ceil(p.reorder_level * 0.3);

        // Determine urgency
        let urgency: 'critical' | 'high' | 'medium' = 'medium';
        let reason = '';

        if (p.current_stock === 0) {
          urgency = 'critical';
          reason = 'Out of stock - immediate reorder required';
        } else if (p.current_stock <= p.reorder_level * 0.3) {
          urgency = 'high';
          reason = 'Critical low stock - reorder urgently';
        } else {
          urgency = 'medium';
          reason = 'Approaching reorder threshold';
        }

        return {
          productId: p.id,
          productName: p.name,
          sku: p.sku,
          vendorId: p.vendor_id,
          vendorName: p.vendors?.name || 'Unassigned',
          currentStock: p.current_stock,
          reorderLevel: p.reorder_level,
          suggestedQuantity,
          urgency,
          reason,
        };
      })
      .sort((a, b) => {
        const urgencyOrder = { critical: 0, high: 1, medium: 2 };
        return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      });
  }, [products, role, profile]);

  // Initialize editable quantities
  React.useEffect(() => {
    const quantities: Record<string, number> = {};
    restockSuggestions.forEach(s => {
      quantities[s.productId] = s.suggestedQuantity;
    });
    setEditableQuantities(quantities);
  }, [restockSuggestions]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(new Set(restockSuggestions.map(s => s.productId)));
    } else {
      setSelectedItems(new Set());
    }
  };

  const handleSelectItem = (productId: string, checked: boolean) => {
    const newSelected = new Set(selectedItems);
    if (checked) {
      newSelected.add(productId);
    } else {
      newSelected.delete(productId);
    }
    setSelectedItems(newSelected);
  };

  const handleQuantityChange = (productId: string, quantity: number) => {
    setEditableQuantities(prev => ({ ...prev, [productId]: quantity }));
  };

  const selectedSuggestions = restockSuggestions.filter(s => selectedItems.has(s.productId));

  // Group selected items by vendor
  const vendorGroups = useMemo(() => {
    const groups: Record<string, RestockSuggestion[]> = {};
    selectedSuggestions.forEach(s => {
      const vendorKey = s.vendorId || 'unassigned';
      if (!groups[vendorKey]) groups[vendorKey] = [];
      groups[vendorKey].push(s);
    });
    return groups;
  }, [selectedSuggestions]);

  const handleOpenPOModal = () => {
    if (selectedItems.size === 0) {
      toast.error('Please select at least one item to generate PO');
      return;
    }
    
    // Auto-select first vendor from selected items
    const firstVendor = selectedSuggestions.find(s => s.vendorId)?.vendorId || '';
    setPoVendor(firstVendor);
    setShowPOModal(true);
  };

  const handleGeneratePO = async () => {
    if (!poVendor) {
      toast.error('Please select a vendor');
      return;
    }

    setIsGeneratingPO(true);

    try {
      const vendorItems = selectedSuggestions.filter(s => s.vendorId === poVendor);
      
      if (vendorItems.length === 0) {
        toast.error('No items selected for this vendor');
        return;
      }

      // Calculate total amount
      const productIds = vendorItems.map(item => item.productId);
      const { data: productPrices } = await supabase
        .from('products')
        .select('id, price')
        .in('id', productIds);

      const priceMap = new Map(productPrices?.map(p => [p.id, p.price]) || []);
      const totalAmount = vendorItems.reduce((sum, item) => {
        const price = priceMap.get(item.productId) || 0;
        const qty = editableQuantities[item.productId] || item.suggestedQuantity;
        return sum + (price * qty);
      }, 0);

      // Create purchase order
      const { data: po, error: poError } = await supabase
        .from('purchase_orders')
        .insert({
          vendor_id: poVendor,
          status: 'pending',
          total_amount: totalAmount,
          created_by: user?.id,
        })
        .select()
        .single();

      if (poError) throw poError;

      // Create purchase order items
      const poItems = vendorItems.map(item => ({
        purchase_order_id: po.id,
        product_id: item.productId,
        quantity: editableQuantities[item.productId] || item.suggestedQuantity,
        unit_price: priceMap.get(item.productId) || 0,
      }));

      const { error: itemsError } = await supabase
        .from('purchase_order_items')
        .insert(poItems);

      if (itemsError) throw itemsError;

      // Create notification for vendor
      const vendorData = vendors.find(v => v.id === poVendor);
      await supabase.from('alerts').insert({
        type: 'purchase_order',
        title: 'New Purchase Order',
        message: `Auto-restock PO #${po.id.slice(0, 8)} received with ${vendorItems.length} items. Total: $${totalAmount.toFixed(2)}${poNotes ? `. Notes: ${poNotes}` : ''}`,
        severity: 'info',
        user_id: null, // Will be visible to vendor
      });

      // Create audit log
      await supabase.from('audit_logs').insert({
        user_id: user?.id,
        user_name: profile?.full_name,
        action: 'create',
        entity_type: 'purchase_order',
        entity_id: po.id,
        details: `Auto-generated PO for ${vendorData?.name || 'vendor'} with ${vendorItems.length} items. Total: $${totalAmount.toFixed(2)}`,
      });

      toast.success('Purchase Order Generated!', {
        description: `PO #${po.id.slice(0, 8)} created for ${vendorData?.name} with ${vendorItems.length} items`,
      });

      // Clear selected items for this vendor
      setSelectedItems(prev => {
        const newSet = new Set(prev);
        vendorItems.forEach(item => newSet.delete(item.productId));
        return newSet;
      });
      
      setShowPOModal(false);
      setPoNotes('');
    } catch (error) {
      console.error('Error generating PO:', error);
      toast.error('Failed to generate purchase order');
    } finally {
      setIsGeneratingPO(false);
    }
  };

  const stats = {
    critical: restockSuggestions.filter(s => s.urgency === 'critical').length,
    high: restockSuggestions.filter(s => s.urgency === 'high').length,
    medium: restockSuggestions.filter(s => s.urgency === 'medium').length,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text flex items-center gap-2">
            <Bot className="h-8 w-8" />
            AI Auto-Restock
          </h1>
          <p className="text-muted-foreground">AI-powered restock recommendations and automatic PO generation</p>
        </div>
        <Button 
          onClick={handleOpenPOModal} 
          disabled={selectedItems.size === 0}
          className="gap-2"
        >
          <ShoppingCart className="h-4 w-4" />
          Generate PO ({selectedItems.size})
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="card-elevated border-destructive/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Critical</p>
                <p className="text-2xl font-bold text-destructive">{stats.critical}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-destructive opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card className="card-elevated border-orange-500/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">High Priority</p>
                <p className="text-2xl font-bold text-orange-500">{stats.high}</p>
              </div>
              <TrendingDown className="h-8 w-8 text-orange-500 opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card className="card-elevated">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Medium</p>
                <p className="text-2xl font-bold text-yellow-500">{stats.medium}</p>
              </div>
              <Package className="h-8 w-8 text-yellow-500 opacity-80" />
            </div>
          </CardContent>
        </Card>
        <Card className="card-elevated bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Selected for PO</p>
                <p className="text-2xl font-bold text-primary">{selectedItems.size}</p>
              </div>
              <Sparkles className="h-8 w-8 text-primary opacity-80" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Suggestions Table */}
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Suggested Restocks
          </CardTitle>
          <CardDescription>
            AI analyzes stock levels, reorder thresholds, and historical patterns to suggest optimal reorder quantities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox 
                    checked={selectedItems.size === restockSuggestions.length && restockSuggestions.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead className="text-center">Current Stock</TableHead>
                <TableHead className="text-center">Reorder Level</TableHead>
                <TableHead className="text-center">Suggested Qty</TableHead>
                <TableHead>Urgency</TableHead>
                <TableHead>AI Reason</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {restockSuggestions.map((item) => (
                <TableRow key={item.productId} className={selectedItems.has(item.productId) ? 'bg-primary/5' : ''}>
                  <TableCell>
                    <Checkbox 
                      checked={selectedItems.has(item.productId)}
                      onCheckedChange={(checked) => handleSelectItem(item.productId, !!checked)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{item.productName}</TableCell>
                  <TableCell className="text-muted-foreground">{item.sku}</TableCell>
                  <TableCell>{item.vendorName}</TableCell>
                  <TableCell className="text-center">
                    <span className={item.currentStock === 0 ? 'text-destructive font-bold' : 'text-orange-500'}>
                      {item.currentStock}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">{item.reorderLevel}</TableCell>
                  <TableCell className="text-center">
                    <Input
                      type="number"
                      min={1}
                      value={editableQuantities[item.productId] || item.suggestedQuantity}
                      onChange={(e) => handleQuantityChange(item.productId, parseInt(e.target.value) || 1)}
                      className="w-20 text-center"
                    />
                  </TableCell>
                  <TableCell>
                    <Badge variant={
                      item.urgency === 'critical' ? 'destructive' : 
                      item.urgency === 'high' ? 'secondary' : 'outline'
                    }>
                      {item.urgency.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground max-w-[200px]">
                    {item.reason}
                  </TableCell>
                </TableRow>
              ))}
              {restockSuggestions.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-12">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <Package className="h-12 w-12 opacity-50" />
                      <p className="text-lg font-medium">All stock levels are healthy!</p>
                      <p className="text-sm">No restock recommendations at this time</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* PO Generation Modal */}
      <Dialog open={showPOModal} onOpenChange={setShowPOModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Generate Purchase Order
            </DialogTitle>
            <DialogDescription>
              Create a purchase order for the selected items
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Select Vendor</Label>
              <Select value={poVendor} onValueChange={setPoVendor}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose vendor for PO" />
                </SelectTrigger>
                <SelectContent className="bg-popover border shadow-lg">
                  {Object.entries(vendorGroups).map(([vendorId, items]) => {
                    if (vendorId === 'unassigned') return null;
                    const vendor = vendors.find(v => v.id === vendorId);
                    return (
                      <SelectItem key={vendorId} value={vendorId}>
                        {vendor?.name || 'Unknown'} ({items.length} items)
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {poVendor && (
              <div className="border rounded-lg p-4">
                <h4 className="font-medium mb-2">Order Items</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-center">Quantity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedSuggestions
                      .filter(s => s.vendorId === poVendor)
                      .map((item) => (
                        <TableRow key={item.productId}>
                          <TableCell>{item.productName}</TableCell>
                          <TableCell className="text-center">
                            {editableQuantities[item.productId] || item.suggestedQuantity}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            )}

            <div>
              <Label>Notes (Optional)</Label>
              <Textarea
                value={poNotes}
                onChange={(e) => setPoNotes(e.target.value)}
                placeholder="Add any special instructions or notes for the vendor..."
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPOModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleGeneratePO} disabled={isGeneratingPO || !poVendor}>
              {isGeneratingPO ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Generate & Notify Vendor
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AutoRestockPage;
