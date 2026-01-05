import React, { useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
  Upload,
  MoreHorizontal,
  Pencil,
  Trash2,
  Package,
  FileSpreadsheet,
  FileText,
  ShoppingCart,
  Building2,
} from 'lucide-react';
import { useRealtimeProducts, Product } from '@/hooks/useRealtimeProducts';
import { useCategories } from '@/hooks/useCategories';
import { useVendors } from '@/hooks/useVendors';
import { supabase } from '@/integrations/supabase/client';
import { exportInventory, parseCSV } from '@/utils/exportUtils';
import { createAuditLog } from '@/hooks/useAuditLogs';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const ProductsPage: React.FC = () => {
  const { getUserRole, profile } = useAuth();
  const role = getUserRole();

  const { products, isLoading, refetch } = useRealtimeProducts();
  const { categories, addCategory } = useCategories();
  const { vendors, addVendor, refetch: refetchVendors } = useVendors();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [vendorFilter, setVendorFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isStockRequestDialogOpen, setIsStockRequestDialogOpen] = useState(false);
  const [isQuickVendorDialogOpen, setIsQuickVendorDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [stockRequestData, setStockRequestData] = useState({
    quantity: '',
    notes: '',
  });
  const [quickVendorData, setQuickVendorData] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    description: '',
    category_id: '',
    vendor_id: '',
    price: '',
    currentStock: '',
    reorderLevel: '',
  });

  const canEdit = role === 'admin' || role === 'warehouse_manager';
  const canDelete = role === 'admin';
  const canCreate = role === 'admin';
  const isVendor = role === 'vendor';
  const canRequestStock = role === 'warehouse_manager' || role === 'admin';

  // Filter products based on role and filters
  const filteredProducts = useMemo(() => {
    let filtered = [...products];

    // Vendor can only see their own products
    if (isVendor && profile?.vendor_id) {
      filtered = filtered.filter(p => p.vendor_id === profile.vendor_id);
    }

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        p =>
          p.name.toLowerCase().includes(query) ||
          p.sku.toLowerCase().includes(query) ||
          (p.categories?.name || '').toLowerCase().includes(query)
      );
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(p => p.category_id === categoryFilter);
    }

    // Apply vendor filter
    if (vendorFilter !== 'all') {
      filtered = filtered.filter(p => p.vendor_id === vendorFilter);
    }

    // Apply stock filter
    if (stockFilter !== 'all') {
      if (stockFilter === 'low') {
        filtered = filtered.filter(p => p.current_stock <= p.reorder_level && p.current_stock > 0);
      } else if (stockFilter === 'out') {
        filtered = filtered.filter(p => p.current_stock === 0);
      } else if (stockFilter === 'sufficient') {
        filtered = filtered.filter(p => p.current_stock > p.reorder_level);
      }
    }

    return filtered;
  }, [products, searchQuery, categoryFilter, vendorFilter, stockFilter, isVendor, profile?.vendor_id]);

  const resetForm = () => {
    setFormData({
      sku: '',
      name: '',
      description: '',
      category_id: '',
      vendor_id: '',
      price: '',
      currentStock: '',
      reorderLevel: '',
    });
    setNewCategoryName('');
    setShowNewCategoryInput(false);
  };

  const handleAddProduct = async () => {
    if (!formData.sku || !formData.name || !formData.vendor_id) {
      toast.error('Please fill in all required fields');
      return;
    }

    let categoryId = formData.category_id;

    // If creating a new category
    if (showNewCategoryInput && newCategoryName.trim()) {
      const newCategory = await addCategory(newCategoryName.trim());
      if (newCategory) {
        categoryId = newCategory.id;
      } else {
        toast.error('Failed to create category');
        return;
      }
    }

    const currentStock = parseInt(formData.currentStock) || 0;
    const reorderLevel = parseInt(formData.reorderLevel) || 10;

    const { data: newProduct, error } = await supabase.from('products').insert({
      sku: formData.sku,
      name: formData.name,
      description: formData.description || null,
      category_id: categoryId || null,
      vendor_id: formData.vendor_id,
      price: parseFloat(formData.price) || 0,
      current_stock: currentStock,
      reorder_level: reorderLevel,
    }).select().single();

    if (error) {
      console.error('Error adding product:', error);
      toast.error('Failed to add product');
      return;
    }

    // Create audit log
    await createAuditLog('CREATE', 'Product', newProduct?.id || null, `Created product: ${formData.name} (SKU: ${formData.sku})`);

    setIsAddDialogOpen(false);
    resetForm();
    toast.success('Product added successfully');
  };

  const handleEditProduct = async () => {
    if (!selectedProduct) return;

    let categoryId = formData.category_id;

    // If creating a new category
    if (showNewCategoryInput && newCategoryName.trim()) {
      const newCategory = await addCategory(newCategoryName.trim());
      if (newCategory) {
        categoryId = newCategory.id;
      }
    }

    const updateData: any = {
      name: formData.name,
      description: formData.description || null,
      price: parseFloat(formData.price) || 0,
    };

    // Only admin and warehouse manager can update these fields
    if (canEdit && !isVendor) {
      updateData.sku = formData.sku;
      updateData.category_id = categoryId || null;
      updateData.vendor_id = formData.vendor_id;
      updateData.current_stock = parseInt(formData.currentStock) || 0;
      updateData.reorder_level = parseInt(formData.reorderLevel) || 10;
    }

    const { error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', selectedProduct.id);

    if (error) {
      console.error('Error updating product:', error);
      toast.error('Failed to update product');
      return;
    }

    // Create audit log
    await createAuditLog('UPDATE', 'Product', selectedProduct.id, `Updated product: ${formData.name}`);

    setIsEditDialogOpen(false);
    setSelectedProduct(null);
    resetForm();
    toast.success('Product updated successfully');
  };

  const handleDeleteProduct = async () => {
    if (!selectedProduct) return;

    const productName = selectedProduct.name;
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', selectedProduct.id);

    if (error) {
      console.error('Error deleting product:', error);
      toast.error('Failed to delete product');
      return;
    }

    // Create audit log
    await createAuditLog('DELETE', 'Product', selectedProduct.id, `Deleted product: ${productName}`);

    setIsDeleteDialogOpen(false);
    setSelectedProduct(null);
    toast.success('Product deleted successfully');
  };

  const openEditDialog = (product: Product) => {
    setSelectedProduct(product);
    setFormData({
      sku: product.sku,
      name: product.name,
      description: product.description || '',
      category_id: product.category_id || '',
      vendor_id: product.vendor_id || '',
      price: product.price.toString(),
      currentStock: product.current_stock.toString(),
      reorderLevel: product.reorder_level.toString(),
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (product: Product) => {
    setSelectedProduct(product);
    setIsDeleteDialogOpen(true);
  };

  const openStockRequestDialog = (product: Product) => {
    setSelectedProduct(product);
    setStockRequestData({ quantity: '', notes: '' });
    setIsStockRequestDialogOpen(true);
  };

  const handleCreateStockRequest = async () => {
    if (!selectedProduct || !stockRequestData.quantity) {
      toast.error('Please enter a quantity');
      return;
    }

    if (!selectedProduct.vendor_id) {
      toast.error('This product has no vendor assigned');
      return;
    }

    const { data: newRequest, error } = await supabase.from('stock_requests').insert({
      product_id: selectedProduct.id,
      vendor_id: selectedProduct.vendor_id,
      quantity: parseInt(stockRequestData.quantity),
      notes: stockRequestData.notes || null,
      requested_by: profile?.user_id,
      requested_by_name: profile?.full_name || profile?.email,
      requested_by_role: role || 'warehouse_manager',
    }).select().single();

    if (error) {
      console.error('Error creating stock request:', error);
      toast.error('Failed to create stock request');
      return;
    }

    // Get vendor user_ids to send notification
    const { data: vendorProfiles } = await supabase
      .from('profiles')
      .select('user_id')
      .eq('vendor_id', selectedProduct.vendor_id)
      .eq('role', 'vendor');

    // Create notification for vendor users
    if (vendorProfiles && vendorProfiles.length > 0) {
      for (const vp of vendorProfiles) {
        await supabase.from('alerts').insert({
          type: 'stock_request',
          title: 'New Stock Request',
          message: `${profile?.full_name || 'Warehouse Manager'} requested ${stockRequestData.quantity} units of ${selectedProduct.name}. ${stockRequestData.notes ? `Notes: ${stockRequestData.notes}` : ''}`,
          severity: 'info',
          user_id: vp.user_id,
        });
      }
    }

    setIsStockRequestDialogOpen(false);
    setSelectedProduct(null);
    setStockRequestData({ quantity: '', notes: '' });
    toast.success('Stock request sent to vendor');
    await createAuditLog('CREATE', 'StockRequest', selectedProduct.id, `Stock request for ${selectedProduct.name} (qty: ${stockRequestData.quantity})`);
  };

  const handleQuickVendorCreate = async () => {
    if (!quickVendorData.name || !quickVendorData.email) {
      toast.error('Please fill in vendor name and email');
      return;
    }

    const result = await addVendor({
      name: quickVendorData.name,
      email: quickVendorData.email,
      phone: quickVendorData.phone || null,
      address: null,
      performance: 80,
    });

    if (result) {
      toast.success('Vendor created successfully');
      setIsQuickVendorDialogOpen(false);
      setQuickVendorData({ name: '', email: '', phone: '' });
      await createAuditLog('CREATE', 'Vendor', result.id, `Created vendor: ${quickVendorData.name}`);
      refetchVendors();
    } else {
      toast.error('Failed to create vendor');
    }
  };

  const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
    const exportData = filteredProducts.map(p => ({
      id: p.id,
      sku: p.sku,
      name: p.name,
      description: p.description || '',
      category: p.categories?.name || '',
      vendorId: p.vendor_id || '',
      vendorName: p.vendors?.name || '',
      price: p.price,
      currentStock: p.current_stock,
      reorderLevel: p.reorder_level,
      createdAt: new Date(p.created_at),
      updatedAt: new Date(p.updated_at),
    }));
    exportInventory(exportData as any, format);
    toast.success(`Inventory exported as ${format.toUpperCase()}`);
  };

  const handleImportCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const data = parseCSV(content);
        
        let imported = 0;
        for (const row of data) {
          if (!row.SKU && !row.sku) continue;
          if (!row.Name && !row.name) continue;

          const { error } = await supabase.from('products').insert({
            sku: row.SKU || row.sku,
            name: row.Name || row.name,
            description: row.Description || row.description || null,
            price: parseFloat(row.Price || row.price || '0'),
            current_stock: parseInt(row.CurrentStock || row.currentStock || row.Stock || '0'),
            reorder_level: parseInt(row.ReorderLevel || row.reorderLevel || '10'),
            vendor_id: vendors[0]?.id || null, // Default to first vendor
          });

          if (!error) imported++;
        }

        toast.success(`Imported ${imported} products`);
        refetch();
      } catch (error) {
        toast.error('Failed to parse CSV file');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const getStockStatus = (product: Product) => {
    if (product.current_stock === 0) return { label: 'Out of Stock', class: 'badge-danger' };
    if (product.current_stock <= product.reorder_level) return { label: 'Low Stock', class: 'badge-warning' };
    return { label: 'In Stock', class: 'badge-success' };
  };

  const uniqueCategories = categories;

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
          <h2 className="text-2xl font-bold">Products</h2>
          <p className="text-muted-foreground">
            Manage your inventory catalog ({filteredProducts.length} products)
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canCreate && (
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          )}
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
          {(canCreate || role === 'warehouse_manager') && (
            <div className="relative">
              <Input
                type="file"
                accept=".csv"
                onChange={handleImportCSV}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Import CSV
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 input-dark"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="input-dark">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="all">All Categories</SelectItem>
                {uniqueCategories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!isVendor && (
              <Select value={vendorFilter} onValueChange={setVendorFilter}>
                <SelectTrigger className="input-dark">
                  <SelectValue placeholder="Vendor" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border">
                  <SelectItem value="all">All Vendors</SelectItem>
                  {vendors.map(vendor => (
                    <SelectItem key={vendor.id} value={vendor.id}>{vendor.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Select value={stockFilter} onValueChange={setStockFilter}>
              <SelectTrigger className="input-dark">
                <SelectValue placeholder="Stock Status" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="sufficient">In Stock</SelectItem>
                <SelectItem value="low">Low Stock</SelectItem>
                <SelectItem value="out">Out of Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead className="text-muted-foreground">SKU</TableHead>
                <TableHead className="text-muted-foreground">Product</TableHead>
                <TableHead className="text-muted-foreground">Category</TableHead>
                {!isVendor && <TableHead className="text-muted-foreground">Vendor</TableHead>}
                <TableHead className="text-muted-foreground text-right">Price</TableHead>
                <TableHead className="text-muted-foreground text-right">Stock</TableHead>
                <TableHead className="text-muted-foreground">Status</TableHead>
                <TableHead className="text-muted-foreground w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => {
                const status = getStockStatus(product);
                return (
                  <TableRow key={product.id} className="table-row-hover border-border/30">
                    <TableCell className="font-mono text-sm">{product.sku}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                          <Package className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {product.description}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{product.categories?.name || '-'}</TableCell>
                    {!isVendor && <TableCell>{product.vendors?.name || '-'}</TableCell>}
                    <TableCell className="text-right font-medium">
                      ₹{product.price.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={cn(
                        'font-bold',
                        product.current_stock <= product.reorder_level && 'text-destructive'
                      )}>
                        {product.current_stock}
                      </span>
                      <span className="text-muted-foreground text-xs ml-1">
                        / {product.reorder_level}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={status.class}>{status.label}</span>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(product)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          {canRequestStock && product.vendor_id && (
                            <DropdownMenuItem onClick={() => openStockRequestDialog(product)}>
                              <ShoppingCart className="h-4 w-4 mr-2" />
                              Request Stock
                            </DropdownMenuItem>
                          )}
                          {canDelete && (
                            <DropdownMenuItem
                              onClick={() => openDeleteDialog(product)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredProducts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={isVendor ? 7 : 8} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center py-8">
                      <Package className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-lg font-semibold">No products yet</p>
                      <p className="text-sm text-muted-foreground mb-4">
                        Get started by adding your first product
                      </p>
                      {canCreate && (
                        <Button onClick={() => setIsAddDialogOpen(true)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Product
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Add Product Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-lg bg-card border-border">
          <DialogHeader>
            <DialogTitle>Add New Product</DialogTitle>
            <DialogDescription>
              Fill in the details to add a new product to your inventory.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="sku">SKU *</Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                  className="input-dark"
                  placeholder="e.g., ELEC-001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                {showNewCategoryInput ? (
                  <div className="flex gap-2">
                    <Input
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="input-dark"
                      placeholder="New category name"
                    />
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setShowNewCategoryInput(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Select
                    value={formData.category_id}
                    onValueChange={(value) => {
                      if (value === 'new') {
                        setShowNewCategoryInput(true);
                      } else {
                        setFormData(prev => ({ ...prev, category_id: value }));
                      }
                    }}
                  >
                    <SelectTrigger className="input-dark">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                      ))}
                      <SelectItem value="new">+ Add new category</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="input-dark"
                placeholder="Enter product name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="input-dark resize-none"
                placeholder="Enter product description"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="vendor">Vendor *</Label>
                {canCreate && vendors.length === 0 && (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-primary"
                    onClick={() => setIsQuickVendorDialogOpen(true)}
                  >
                    <Building2 className="h-3 w-3 mr-1" />
                    Add Vendor
                  </Button>
                )}
              </div>
              <Select
                value={formData.vendor_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, vendor_id: value }))}
              >
                <SelectTrigger className="input-dark">
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {vendors.length === 0 ? (
                    <SelectItem value="no-vendors" disabled>
                      No vendors available - add vendors first
                    </SelectItem>
                  ) : (
                    vendors.map(vendor => (
                      <SelectItem key={vendor.id} value={vendor.id}>{vendor.name}</SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {vendors.length === 0 && (
                <p className="text-xs text-destructive">
                  Please add vendors first. Click "Add Vendor" above.
                </p>
              )}
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price (₹)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                  className="input-dark"
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock">Initial Stock</Label>
                <Input
                  id="stock"
                  type="number"
                  value={formData.currentStock}
                  onChange={(e) => setFormData(prev => ({ ...prev, currentStock: e.target.value }))}
                  className="input-dark"
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reorder">Reorder Level</Label>
                <Input
                  id="reorder"
                  type="number"
                  value={formData.reorderLevel}
                  onChange={(e) => setFormData(prev => ({ ...prev, reorderLevel: e.target.value }))}
                  className="input-dark"
                  placeholder="10"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsAddDialogOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleAddProduct}>Add Product</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg bg-card border-border">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>
              {isVendor
                ? 'Update product details. Note: SKU and category cannot be modified.'
                : 'Update the product details below.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-sku">SKU</Label>
                <Input
                  id="edit-sku"
                  value={formData.sku}
                  onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                  className="input-dark"
                  disabled={isVendor}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-category">Category</Label>
                <Select
                  value={formData.category_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, category_id: value }))}
                  disabled={isVendor}
                >
                  <SelectTrigger className="input-dark">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-name">Product Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="input-dark"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="input-dark resize-none"
                rows={3}
              />
            </div>
            {!isVendor && (
              <div className="space-y-2">
                <Label htmlFor="edit-vendor">Vendor</Label>
                <Select
                  value={formData.vendor_id}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, vendor_id: value }))}
                >
                  <SelectTrigger className="input-dark">
                    <SelectValue placeholder="Select vendor" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border">
                    {vendors.length === 0 ? (
                      <SelectItem value="no-vendors" disabled>
                        No vendors available
                      </SelectItem>
                    ) : (
                      vendors.map(vendor => (
                        <SelectItem key={vendor.id} value={vendor.id}>{vendor.name}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-price">Price (₹)</Label>
                <Input
                  id="edit-price"
                  type="number"
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                  className="input-dark"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-stock">Current Stock</Label>
                <Input
                  id="edit-stock"
                  type="number"
                  value={formData.currentStock}
                  onChange={(e) => setFormData(prev => ({ ...prev, currentStock: e.target.value }))}
                  className="input-dark"
                  disabled={isVendor}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-reorder">Reorder Level</Label>
                <Input
                  id="edit-reorder"
                  type="number"
                  value={formData.reorderLevel}
                  onChange={(e) => setFormData(prev => ({ ...prev, reorderLevel: e.target.value }))}
                  className="input-dark"
                  disabled={isVendor}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEditDialogOpen(false); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleEditProduct}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedProduct?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteProduct}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Stock Request Dialog */}
      <Dialog open={isStockRequestDialogOpen} onOpenChange={setIsStockRequestDialogOpen}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle>Request Stock</DialogTitle>
            <DialogDescription>
              Send a stock request to the vendor for "{selectedProduct?.name}".
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Product</Label>
              <div className="flex items-center gap-2 p-3 bg-muted/30 rounded-lg">
                <Package className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">{selectedProduct?.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Current stock: {selectedProduct?.current_stock} | SKU: {selectedProduct?.sku}
                  </p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="request-quantity">Quantity *</Label>
              <Input
                id="request-quantity"
                type="number"
                min="1"
                value={stockRequestData.quantity}
                onChange={(e) => setStockRequestData(prev => ({ ...prev, quantity: e.target.value }))}
                className="input-dark"
                placeholder="Enter quantity needed"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="request-notes">Notes (Optional)</Label>
              <Textarea
                id="request-notes"
                value={stockRequestData.notes}
                onChange={(e) => setStockRequestData(prev => ({ ...prev, notes: e.target.value }))}
                className="input-dark resize-none"
                placeholder="Add any additional notes..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsStockRequestDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateStockRequest}>
              <ShoppingCart className="h-4 w-4 mr-2" />
              Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Vendor Creation Dialog */}
      <Dialog open={isQuickVendorDialogOpen} onOpenChange={setIsQuickVendorDialogOpen}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle>Add New Vendor</DialogTitle>
            <DialogDescription>
              Quickly add a vendor to assign products.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="vendor-name">Vendor Name *</Label>
              <Input
                id="vendor-name"
                value={quickVendorData.name}
                onChange={(e) => setQuickVendorData(prev => ({ ...prev, name: e.target.value }))}
                className="input-dark"
                placeholder="Enter vendor name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vendor-email">Email *</Label>
              <Input
                id="vendor-email"
                type="email"
                value={quickVendorData.email}
                onChange={(e) => setQuickVendorData(prev => ({ ...prev, email: e.target.value }))}
                className="input-dark"
                placeholder="vendor@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vendor-phone">Phone (Optional)</Label>
              <Input
                id="vendor-phone"
                value={quickVendorData.phone}
                onChange={(e) => setQuickVendorData(prev => ({ ...prev, phone: e.target.value }))}
                className="input-dark"
                placeholder="+91 xxxxxxxxxx"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsQuickVendorDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleQuickVendorCreate}
              disabled={!quickVendorData.name || !quickVendorData.email}
            >
              <Building2 className="h-4 w-4 mr-2" />
              Add Vendor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductsPage;
