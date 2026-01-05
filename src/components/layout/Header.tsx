import React, { useState } from 'react';
import { Bell, Search, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useRealtimeAlerts } from '@/hooks/useRealtimeAlerts';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  onMenuClick: () => void;
  pageTitle: string;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick, pageTitle }) => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const { alerts, unreadCount, markAsRead } = useRealtimeAlerts();

  const recentAlerts = alerts.slice(0, 5);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 backdrop-blur-xl px-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-semibold">{pageTitle}</h1>
      </div>

      <div className="flex items-center gap-4">
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search products, orders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-64 pl-10 input-dark"
          />
        </div>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs text-destructive-foreground animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 bg-popover border-border">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>Notifications</span>
              {unreadCount > 0 && (
                <span className="text-xs text-muted-foreground">
                  {unreadCount} unread
                </span>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="max-h-80 overflow-y-auto">
              {recentAlerts.length > 0 ? (
                recentAlerts.map((alert) => {
                  // Determine navigation based on alert type
                  const getAlertLink = (type: string) => {
                    switch (type) {
                      case 'stock_request':
                      case 'vendor_response':
                        return '/stock-requests';
                      case 'purchase_order':
                      case 'order_update':
                        return '/purchase-orders';
                      case 'low_stock':
                        return '/products';
                      default:
                        return '/alerts';
                    }
                  };

                  return (
                    <DropdownMenuItem
                      key={alert.id}
                      className={cn(
                        'flex flex-col items-start gap-1 p-3 cursor-pointer',
                        !alert.is_read && 'bg-muted/50'
                      )}
                      onClick={() => {
                        if (!alert.is_read) {
                          markAsRead(alert.id);
                        }
                        navigate(getAlertLink(alert.type));
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'h-2 w-2 rounded-full',
                            alert.severity === 'critical' && 'bg-destructive',
                            alert.severity === 'warning' && 'bg-warning',
                            alert.severity === 'info' && 'bg-info'
                          )}
                        />
                        <span className="font-medium text-sm">{alert.title}</span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {alert.message}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {new Date(alert.created_at).toLocaleString()}
                      </span>
                    </DropdownMenuItem>
                  );
                })
              ) : (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  No notifications yet
                </div>
              )}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-center text-primary cursor-pointer justify-center"
              onClick={() => navigate('/alerts')}
            >
              View all notifications
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Avatar */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:block text-right">
            <p className="text-sm font-medium">{profile?.full_name || 'User'}</p>
            <p className="text-xs text-muted-foreground capitalize">
              {profile?.role?.replace('_', ' ')}
            </p>
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold">
            {profile?.full_name?.charAt(0).toUpperCase() || 'U'}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
