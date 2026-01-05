import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search,
  Download,
  Building2,
  Mail,
  Phone,
  MapPin,
  Package,
  TrendingUp,
  MoreHorizontal,
  Eye,
  FileSpreadsheet,
  FileText,
  Star,
  Plus,
} from 'lucide-react';
import { useVendors } from '@/hooks/useVendors';
import { useRealtimeProducts } from '@/hooks/useRealtimeProducts';
import { supabase } from '@/integrations/supabase/client';
import { exportVendorReport } from '@/utils/exportUtils';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const VendorsPage: React.FC = () => {
  const { getUserRole } = useAuth();
  const role = getUserRole();
  const { vendors, isLoading, refetch } = useVendors();
  const { products } = useRealtimeProducts();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
  });

  const canCreate = role === 'admin';

  const filteredVendors = vendors.filter(vendor => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        vendor.name.toLowerCase().includes(query) ||
        vendor.email.toLowerCase().includes(query)
      );
    }
    return true;
  });

  // Calculate vendor stats dynamically
  const vendorStats = filteredVendors.map(vendor => ({
    ...vendor,
    productsCount: products.filter(p => p.vendor_id === vendor.id).length,
  }));

  const handleAddVendor = async () => {
    if (!formData.name || !formData.email) {
      toast.error('Please fill in all required fields');
      return;
    }

    const { data: newVendor, error } = await supabase.from('vendors').insert({
      name: formData.name,
      email: formData.email,
      phone: formData.phone || null,
      address: formData.address || null,
    }).select().single();

    if (error) {
      console.error('Error adding vendor:', error);
      toast.error('Failed to add vendor');
      return;
    }

    // Auto-link profile with matching email to this vendor
    if (newVendor) {
      const { error: linkError } = await supabase
        .from('profiles')
        .update({ vendor_id: newVendor.id })
        .eq('email', formData.email)
        .eq('role', 'vendor');
      
      if (linkError) {
        console.warn('Could not auto-link vendor profile:', linkError);
      }
    }

    setIsAddDialogOpen(false);
    setFormData({ name: '', email: '', phone: '', address: '' });
    toast.success('Vendor added successfully');
    refetch();
  };

  const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
    const exportData = vendorStats.map(v => ({
      id: v.id,
      name: v.name,
      email: v.email,
      phone: v.phone || '',
      address: v.address || '',
      productsCount: v.productsCount,
      performance: v.performance || 0,
      createdAt: new Date(v.created_at),
    }));
    exportVendorReport(exportData as any, format);
    toast.success(`Vendor report exported as ${format.toUpperCase()}`);
  };

  const avgPerformance = vendors.length > 0
    ? Math.round(vendors.reduce((sum, v) => sum + (v.performance || 0), 0) / vendors.length)
    : 0;

  const totalProducts = products.length;

  const getPerformanceColor = (performance: number) => {
    if (performance >= 90) return 'text-success';
    if (performance >= 80) return 'text-warning';
    return 'text-destructive';
  };

  const topPerformer = vendors.length > 0
    ? vendors.reduce((best, v) => (v.performance || 0) > (best.performance || 0) ? v : best)
    : null;

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
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Building2 className="h-7 w-7 text-primary" />
            Vendor Management
          </h2>
          <p className="text-muted-foreground">
            Manage supplier relationships and performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canCreate && (
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Vendor
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export Report
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
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="stat-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Vendors</p>
                <p className="text-2xl font-bold mt-1">{vendors.length}</p>
              </div>
              <Building2 className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Performance</p>
                <p className={cn('text-2xl font-bold mt-1', getPerformanceColor(avgPerformance))}>
                  {avgPerformance}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Products</p>
                <p className="text-2xl font-bold mt-1">{totalProducts}</p>
              </div>
              <Package className="h-8 w-8 text-accent" />
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Top Performer</p>
                <p className="text-lg font-bold mt-1 truncate">
                  {topPerformer?.name || 'N/A'}
                </p>
              </div>
              <Star className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search vendors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 input-dark"
            />
          </div>
        </CardContent>
      </Card>

      {/* Vendors Grid */}
      {vendorStats.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {vendorStats.map((vendor) => (
            <Card key={vendor.id} className="glass-card hover:border-primary/30 transition-all">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary font-bold text-lg">
                      {vendor.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-semibold">{vendor.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Member since {new Date(vendor.created_at).getFullYear()}
                      </p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Mail className="h-4 w-4 mr-2" />
                        Send Email
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{vendor.email}</span>
                  </div>
                  {vendor.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{vendor.phone}</span>
                    </div>
                  )}
                  {vendor.address && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{vendor.address}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{vendor.productsCount} products</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Performance:</span>
                    <span className={cn('font-bold', getPerformanceColor(vendor.performance || 0))}>
                      {vendor.performance || 0}%
                    </span>
                  </div>
                </div>

                {/* Performance Bar */}
                <div className="mt-3">
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all',
                        (vendor.performance || 0) >= 90 && 'bg-success',
                        (vendor.performance || 0) >= 80 && (vendor.performance || 0) < 90 && 'bg-warning',
                        (vendor.performance || 0) < 80 && 'bg-destructive'
                      )}
                      style={{ width: `${vendor.performance || 0}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="glass-card">
          <CardContent className="p-12 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-semibold mb-2">No vendors yet</p>
            <p className="text-sm text-muted-foreground mb-4">
              Add your first vendor to get started
            </p>
            {canCreate && (
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Vendor
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add Vendor Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle>Add New Vendor</DialogTitle>
            <DialogDescription>
              Add a new vendor to your supplier network.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Vendor Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="input-dark"
                placeholder="Enter vendor name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                className="input-dark"
                placeholder="vendor@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                className="input-dark"
                placeholder="+91 xxxxxxxxxx"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                className="input-dark resize-none"
                placeholder="Enter vendor address"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddVendor}
              disabled={!formData.name.trim() || !formData.email.trim()}
            >
              Add Vendor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VendorsPage;
