import React, { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Search,
  FileText,
  User,
  Package,
  ArrowRightLeft,
  Trash2,
  Plus,
  Edit,
  RefreshCw,
} from 'lucide-react';
import { useAuditLogs } from '@/hooks/useAuditLogs';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const AuditLogsPage: React.FC = () => {
  const { logs, isLoading, refetch } = useAuditLogs();
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [entityFilter, setEntityFilter] = useState('all');

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (
          !(log.user_name || '').toLowerCase().includes(query) &&
          !(log.details || '').toLowerCase().includes(query) &&
          !(log.entity_id || '').toLowerCase().includes(query)
        ) {
          return false;
        }
      }
      if (actionFilter !== 'all' && log.action !== actionFilter) return false;
      if (entityFilter !== 'all' && log.entity_type !== entityFilter) return false;
      return true;
    });
  }, [logs, searchQuery, actionFilter, entityFilter]);

  const uniqueActions = useMemo(() => [...new Set(logs.map(l => l.action))], [logs]);
  const uniqueEntities = useMemo(() => [...new Set(logs.map(l => l.entity_type))], [logs]);

  const getActionIcon = (action: string) => {
    switch (action.toUpperCase()) {
      case 'CREATE':
        return Plus;
      case 'UPDATE':
        return Edit;
      case 'DELETE':
        return Trash2;
      case 'STOCK_IN':
      case 'STOCK_OUT':
        return ArrowRightLeft;
      default:
        return FileText;
    }
  };

  const getActionColor = (action: string) => {
    switch (action.toUpperCase()) {
      case 'CREATE':
        return 'bg-success/10 text-success';
      case 'UPDATE':
        return 'bg-warning/10 text-warning';
      case 'DELETE':
        return 'bg-destructive/10 text-destructive';
      case 'STOCK_IN':
        return 'bg-primary/10 text-primary';
      case 'STOCK_OUT':
        return 'bg-accent/10 text-accent';
      default:
        return 'bg-muted text-muted-foreground';
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
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-7 w-7 text-primary" />
            Audit Logs
          </h2>
          <p className="text-muted-foreground">
            Track all system activities and changes ({logs.length} logs)
          </p>
        </div>
        <Button variant="outline" onClick={() => { refetch(); toast.info('Refreshing logs...'); }}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="stat-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Logs</p>
                <p className="text-2xl font-bold mt-1">{logs.length}</p>
              </div>
              <FileText className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Creates</p>
                <p className="text-2xl font-bold text-success mt-1">
                  {logs.filter(l => l.action.toUpperCase() === 'CREATE').length}
                </p>
              </div>
              <Plus className="h-8 w-8 text-success" />
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Updates</p>
                <p className="text-2xl font-bold text-warning mt-1">
                  {logs.filter(l => l.action.toUpperCase() === 'UPDATE').length}
                </p>
              </div>
              <Edit className="h-8 w-8 text-warning" />
            </div>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Deletes</p>
                <p className="text-2xl font-bold text-destructive mt-1">
                  {logs.filter(l => l.action.toUpperCase() === 'DELETE').length}
                </p>
              </div>
              <Trash2 className="h-8 w-8 text-destructive" />
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
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 input-dark"
              />
            </div>
            <Select value={actionFilter} onValueChange={setActionFilter}>
              <SelectTrigger className="w-[180px] input-dark">
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {uniqueActions.map(action => (
                  <SelectItem key={action} value={action}>{action}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger className="w-[180px] input-dark">
                <SelectValue placeholder="Entity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                {uniqueEntities.map(entity => (
                  <SelectItem key={entity} value={entity}>{entity}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead className="text-muted-foreground">Timestamp</TableHead>
                <TableHead className="text-muted-foreground">User</TableHead>
                <TableHead className="text-muted-foreground">Action</TableHead>
                <TableHead className="text-muted-foreground">Entity</TableHead>
                <TableHead className="text-muted-foreground">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => {
                const ActionIcon = getActionIcon(log.action);
                return (
                  <TableRow key={log.id} className="table-row-hover border-border/30">
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(log.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                          <User className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <span className="font-medium">{log.user_name || 'System'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className={cn(
                        'flex items-center gap-2 px-2.5 py-1 rounded-full w-fit text-xs font-medium',
                        getActionColor(log.action)
                      )}>
                        <ActionIcon className="h-3 w-3" />
                        {log.action}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span>{log.entity_type}</span>
                        {log.entity_id && (
                          <span className="text-xs text-muted-foreground font-mono">
                            ({log.entity_id.slice(0, 8)}...)
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-md truncate text-muted-foreground">
                      {log.details || '-'}
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredLogs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center py-8">
                      <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-lg font-semibold">No audit logs yet</p>
                      <p className="text-sm text-muted-foreground">
                        Activity will be logged as you use the system
                      </p>
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

export default AuditLogsPage;
