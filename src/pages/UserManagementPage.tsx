import React, { useState, useEffect, useCallback } from 'react';
import { useAuth, UserRole } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Search, Shield, Briefcase, Warehouse, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  full_name: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

const roleConfig: Record<UserRole, { label: string; icon: React.ElementType; variant: 'default' | 'secondary' | 'outline' }> = {
  admin: { label: 'Admin', icon: Shield, variant: 'default' },
  warehouse_manager: { label: 'Warehouse Manager', icon: Warehouse, variant: 'secondary' },
  vendor: { label: 'Vendor', icon: Briefcase, variant: 'outline' },
};

const UserManagementPage: React.FC = () => {
  const { getUserRole, user } = useAuth();
  const currentRole = getUserRole();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  // Redirect non-admins
  if (currentRole !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching users:', error);
        toast.error('Failed to load users');
        return;
      }

      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleRoleChange = async (userId: string, userProfileId: string, newRole: UserRole) => {
    // Prevent changing own role
    if (userId === user?.id) {
      toast.error("You cannot change your own role");
      return;
    }

    setUpdatingUserId(userProfileId);

    try {
      // Update role in profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('user_id', userId);

      if (profileError) {
        console.error('Error updating profile role:', profileError);
        toast.error('Failed to update user role');
        return;
      }

      // Update role in user_roles table
      const { error: roleError } = await supabase
        .from('user_roles')
        .update({ role: newRole })
        .eq('user_id', userId);

      if (roleError) {
        console.error('Error updating user_roles:', roleError);
        toast.error('Failed to update user role');
        return;
      }

      // Update local state
      setUsers(prev => 
        prev.map(u => u.user_id === userId ? { ...u, role: newRole } : u)
      );

      toast.success('Role updated successfully', {
        description: `User role changed to ${roleConfig[newRole].label}`,
      });
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Failed to update user role');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const filteredUsers = users.filter(u => 
    u.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">User Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage user accounts and assign roles
          </p>
        </div>
        <Button onClick={fetchUsers} variant="outline" className="gap-2">
          <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {Object.entries(roleConfig).map(([role, config]) => {
          const count = users.filter(u => u.role === role).length;
          const Icon = config.icon;
          return (
            <Card key={role} className="card-gradient border-border/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{config.label}s</p>
                    <p className="text-2xl font-bold">{count}</p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Users Table */}
      <Card className="card-gradient border-border/50">
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                All Users
              </CardTitle>
              <CardDescription>
                {users.length} total users in the system
              </CardDescription>
            </div>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? 'No users match your search' : 'No users found'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((userProfile) => {
                    const RoleIcon = roleConfig[userProfile.role]?.icon || Briefcase;
                    const isCurrentUser = userProfile.user_id === user?.id;
                    const isUpdating = updatingUserId === userProfile.id;

                    return (
                      <TableRow key={userProfile.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-primary font-semibold">
                              {userProfile.full_name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium">{userProfile.full_name}</p>
                              {isCurrentUser && (
                                <Badge variant="outline" className="text-xs">You</Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {userProfile.email}
                        </TableCell>
                        <TableCell>
                          <Badge variant={roleConfig[userProfile.role]?.variant || 'outline'} className="gap-1">
                            <RoleIcon className="h-3 w-3" />
                            {roleConfig[userProfile.role]?.label || userProfile.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(userProfile.created_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Select
                            value={userProfile.role}
                            onValueChange={(value: UserRole) => 
                              handleRoleChange(userProfile.user_id, userProfile.id, value)
                            }
                            disabled={isCurrentUser || isUpdating}
                          >
                            <SelectTrigger className="w-[180px]" disabled={isCurrentUser || isUpdating}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">
                                <div className="flex items-center gap-2">
                                  <Shield className="h-4 w-4" />
                                  Admin
                                </div>
                              </SelectItem>
                              <SelectItem value="warehouse_manager">
                                <div className="flex items-center gap-2">
                                  <Warehouse className="h-4 w-4" />
                                  Warehouse Manager
                                </div>
                              </SelectItem>
                              <SelectItem value="vendor">
                                <div className="flex items-center gap-2">
                                  <Briefcase className="h-4 w-4" />
                                  Vendor
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default UserManagementPage;
