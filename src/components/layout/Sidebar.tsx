import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { useStockRequests } from '@/hooks/useStockRequests';
import { usePurchaseOrders } from '@/hooks/usePurchaseOrders';
import { useRealtimeAlerts } from '@/hooks/useRealtimeAlerts';
import {
  LayoutDashboard,
  Package,
  ArrowLeftRight,
  TrendingUp,
  ShoppingCart,
  Bell,
  Building2,
  FileText,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Boxes,
  Users,
  Inbox,
  BarChart3,
  Bot,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onToggle }) => {
  const { profile, logout, getUserRole } = useAuth();
  const role = getUserRole();
  const { pendingCount: stockRequestPendingCount } = useStockRequests();
  const { pendingCount: poPendingCount } = usePurchaseOrders();
  const { unreadCount } = useRealtimeAlerts();

  // Show badge for vendors on stock requests and POs, for all on alerts
  const getNavBadge = (path: string): number | null => {
    if (path === '/stock-requests' && role === 'vendor' && stockRequestPendingCount > 0) {
      return stockRequestPendingCount;
    }
    if (path === '/purchase-orders' && role === 'vendor' && poPendingCount > 0) {
      return poPendingCount;
    }
    if (path === '/alerts' && unreadCount > 0) {
      return unreadCount;
    }
    return null;
  };

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard', roles: ['admin', 'warehouse_manager', 'vendor'] },
    { icon: Package, label: 'Products', path: '/products', roles: ['admin', 'warehouse_manager', 'vendor'] },
    { icon: ArrowLeftRight, label: 'Transactions', path: '/transactions', roles: ['admin', 'warehouse_manager'] },
    { icon: TrendingUp, label: 'Forecasting', path: '/forecasting', roles: ['admin', 'warehouse_manager', 'vendor'] },
    { icon: Bot, label: 'Auto-Restock', path: '/auto-restock', roles: ['admin', 'warehouse_manager'] },
    { icon: ShoppingCart, label: 'Purchase Orders', path: '/purchase-orders', roles: ['admin', 'warehouse_manager', 'vendor'] },
    { icon: Inbox, label: 'Stock Requests', path: '/stock-requests', roles: ['admin', 'warehouse_manager', 'vendor'] },
    { icon: BarChart3, label: 'Reports', path: '/reports', roles: ['admin', 'warehouse_manager', 'vendor'] },
    { icon: Bell, label: 'Alerts', path: '/alerts', roles: ['admin', 'warehouse_manager', 'vendor'] },
    { icon: Building2, label: 'Vendors', path: '/vendors', roles: ['admin'] },
    { icon: Users, label: 'User Management', path: '/users', roles: ['admin'] },
    { icon: FileText, label: 'Audit Logs', path: '/audit-logs', roles: ['admin'] },
    { icon: Settings, label: 'Settings', path: '/settings', roles: ['admin'] },
  ];

  const filteredNavItems = navItems.filter(item => role && item.roles.includes(role));

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen transition-all duration-300',
        'bg-sidebar border-r border-sidebar-border',
        isCollapsed ? 'w-20' : 'w-64'
      )}
      style={{ background: 'var(--gradient-sidebar)' }}
    >
      {/* Logo */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Boxes className="h-6 w-6 text-primary" />
          </div>
          {!isCollapsed && (
            <span className="font-bold text-lg gradient-text">SmartShelfX</span>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-sidebar-accent"
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex flex-col gap-1 p-3 overflow-y-auto h-[calc(100vh-8rem)]">
        {filteredNavItems.map((item) => {
          const badge = getNavBadge(item.path);
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                cn(
                  'sidebar-link relative',
                  isActive && 'active',
                  isCollapsed && 'justify-center px-3'
                )
              }
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {!isCollapsed && <span>{item.label}</span>}
              {badge !== null && (
                <span className={cn(
                  'absolute flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs text-destructive-foreground font-bold',
                  isCollapsed ? 'top-0 right-0' : 'right-2'
                )}>
                  {badge > 9 ? '9+' : badge}
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User Section */}
      <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-sidebar-border bg-sidebar">
        <div className={cn('flex items-center gap-3', isCollapsed && 'justify-center')}>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-primary font-semibold">
            {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
          </div>
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{profile?.full_name || 'User'}</p>
              <p className="text-xs text-muted-foreground capitalize">{role?.replace('_', ' ')}</p>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={logout}
            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
