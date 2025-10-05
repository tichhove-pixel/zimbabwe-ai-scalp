import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useHasRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Shield, UserPlus, ArrowLeft } from "lucide-react";
import { useAuditLog } from "@/hooks/useAuditLog";

interface User {
  id: string;
  email: string;
  roles: string[];
}

export default function Admin() {
  const navigate = useNavigate();
  const { hasRole, isLoading } = useHasRole('admin');
  const { toast } = useToast();
  const { logAction } = useAuditLog();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !hasRole) {
      navigate('/dashboard');
      return;
    }

    if (hasRole) {
      loadUsers();
    }
  }, [hasRole, isLoading, navigate]);

  const loadUsers = async () => {
    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id');

      if (!profiles) return;

      const usersWithRoles = await Promise.all(
        profiles.map(async (profile) => {
          const { data: authUser } = await supabase.auth.admin.getUserById(profile.user_id);
          const { data: roles } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', profile.user_id);

          return {
            id: profile.user_id,
            email: authUser.user?.email || 'Unknown',
            roles: roles?.map(r => r.role) || [],
          };
        })
      );

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const assignRole = async (userId: string, role: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: role as any });

      if (error) throw error;

      await logAction({
        action: 'ASSIGN_ROLE',
        resource_type: 'user_role',
        resource_id: userId,
        details: { role },
      });

      toast({
        title: "Success",
        description: `Role ${role} assigned successfully`,
      });

      loadUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const removeRole = async (userId: string, role: string) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role as any);

      if (error) throw error;

      await logAction({
        action: 'REMOVE_ROLE',
        resource_type: 'user_role',
        resource_id: userId,
        details: { role },
      });

      toast({
        title: "Success",
        description: `Role ${role} removed successfully`,
      });

      loadUsers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (isLoading || loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!hasRole) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Shield className="h-8 w-8" />
          <div>
            <h1 className="text-3xl font-bold">Admin Panel</h1>
            <p className="text-muted-foreground">Manage user roles and permissions</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
            <CardDescription>Assign and manage user roles for RBAC</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {users.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">{user.email}</p>
                  <div className="flex gap-2 mt-2">
                    {user.roles.map((role) => (
                      <span key={role} className="px-2 py-1 bg-primary/10 text-primary rounded text-sm">
                        {role}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Select onValueChange={(role) => assignRole(user.id, role)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Add role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="trader">Trader</SelectItem>
                      <SelectItem value="auditor">Auditor</SelectItem>
                      <SelectItem value="compliance">Compliance</SelectItem>
                      <SelectItem value="operator">Operator</SelectItem>
                    </SelectContent>
                  </Select>
                  {user.roles.length > 0 && (
                    <Select onValueChange={(role) => removeRole(user.id, role)}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Remove role" />
                      </SelectTrigger>
                      <SelectContent>
                        {user.roles.map((role) => (
                          <SelectItem key={role} value={role}>{role}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
