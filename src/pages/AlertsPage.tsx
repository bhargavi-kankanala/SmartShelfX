import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  Bell,
  AlertTriangle,
  Clock,
  Package,
  CheckCircle,
  Trash2,
  RefreshCw,
  Filter,
} from 'lucide-react';
import { useRealtimeAlerts } from '@/hooks/useRealtimeAlerts';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const AlertsPage: React.FC = () => {
  const { alerts, isLoading, unreadCount, markAsRead, dismissAlert, refetch } = useRealtimeAlerts();
  const [typeFilter, setTypeFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');

  const filteredAlerts = alerts.filter(alert => {
    if (typeFilter !== 'all' && alert.type !== typeFilter) return false;
    if (severityFilter !== 'all' && alert.severity !== severityFilter) return false;
    return true;
  });

  const criticalCount = alerts.filter(a => a.severity === 'critical').length;
  const warningCount = alerts.filter(a => a.severity === 'warning').length;

  const markAllAsRead = async () => {
    for (const alert of alerts.filter(a => !a.is_read)) {
      await markAsRead(alert.id);
    }
    toast.success('All alerts marked as read');
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return AlertTriangle;
      case 'warning':
        return Clock;
      default:
        return Bell;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'low_stock':
        return 'Low Stock';
      case 'expiry':
        return 'Expiry Warning';
      case 'reorder':
        return 'Reorder Suggestion';
      case 'vendor_response':
        return 'Vendor Response';
      case 'order_update':
        return 'Order Update';
      case 'purchase_order':
        return 'Purchase Order';
      case 'stock_request':
        return 'Stock Request';
      default:
        return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-7 w-7 text-primary" />
            Alerts & Notifications
          </h2>
          <p className="text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread alerts` : 'All caught up!'} • Real-time updates enabled
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" onClick={markAllAsRead}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark All Read
            </Button>
          )}
          <Button variant="outline" onClick={() => { refetch(); toast.info('Refreshing alerts...'); }}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="stat-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Alerts</p>
                <p className="text-2xl font-bold mt-1">{alerts.length}</p>
              </div>
              <Bell className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Unread</p>
                <p className="text-2xl font-bold text-accent mt-1">{unreadCount}</p>
              </div>
              <Package className="h-8 w-8 text-accent" />
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Critical</p>
                <p className="text-2xl font-bold text-destructive mt-1">{criticalCount}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Warnings</p>
                <p className="text-2xl font-bold text-warning mt-1">{warningCount}</p>
              </div>
              <Clock className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Filter by:</span>
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px] input-dark">
                <SelectValue placeholder="Alert Type" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="low_stock">Low Stock</SelectItem>
                <SelectItem value="expiry">Expiry Warning</SelectItem>
                <SelectItem value="reorder">Reorder Suggestion</SelectItem>
                <SelectItem value="vendor_response">Vendor Response</SelectItem>
                <SelectItem value="order_update">Order Update</SelectItem>
                <SelectItem value="purchase_order">Purchase Order</SelectItem>
                <SelectItem value="stock_request">Stock Request</SelectItem>
              </SelectContent>
            </Select>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-[180px] input-dark">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border">
                <SelectItem value="all">All Severity</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="info">Info</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Alerts Table */}
      <Card className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead className="text-muted-foreground w-12"></TableHead>
                <TableHead className="text-muted-foreground">Alert</TableHead>
                <TableHead className="text-muted-foreground">Type</TableHead>
                <TableHead className="text-muted-foreground">Severity</TableHead>
                <TableHead className="text-muted-foreground">Time</TableHead>
                <TableHead className="text-muted-foreground w-24">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAlerts.map((alert) => {
                const SeverityIcon = getSeverityIcon(alert.severity);
                return (
                  <TableRow
                    key={alert.id}
                    className={cn(
                      'table-row-hover border-border/30',
                      !alert.is_read && 'bg-muted/30'
                    )}
                  >
                    <TableCell>
                      <div className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-lg',
                        alert.severity === 'critical' && 'bg-destructive/10',
                        alert.severity === 'warning' && 'bg-warning/10',
                        alert.severity === 'info' && 'bg-info/10'
                      )}>
                        <SeverityIcon className={cn(
                          'h-5 w-5',
                          alert.severity === 'critical' && 'text-destructive',
                          alert.severity === 'warning' && 'text-warning',
                          alert.severity === 'info' && 'text-info'
                        )} />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className={cn('font-medium', !alert.is_read && 'font-semibold')}>
                          {alert.title}
                        </p>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {alert.message}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="badge-info">{getTypeLabel(alert.type)}</span>
                    </TableCell>
                    <TableCell>
                      <span className={cn(
                        alert.severity === 'critical' && 'badge-danger',
                        alert.severity === 'warning' && 'badge-warning',
                        alert.severity === 'info' && 'badge-info'
                      )}>
                        {alert.severity.charAt(0).toUpperCase() + alert.severity.slice(1)}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(alert.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {!alert.is_read && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => markAsRead(alert.id)}
                            title="Mark as read"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => dismissAlert(alert.id)}
                          title="Dismiss"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredAlerts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    <div className="flex flex-col items-center gap-2">
                      <CheckCircle className="h-12 w-12 text-success/50" />
                      <p>No alerts to display</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
};

export default AlertsPage;
