import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = 'admin' | 'trader' | 'auditor' | 'compliance' | 'operator';

export const useUserRole = () => {
  return useQuery({
    queryKey: ['userRole'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (error) throw error;
      return data.map(r => r.role as AppRole);
    },
  });
};

export const useHasRole = (requiredRole: AppRole) => {
  const { data: roles, isLoading } = useUserRole();
  return {
    hasRole: roles?.includes(requiredRole) || false,
    isLoading,
  };
};

export const useHasAnyRole = (requiredRoles: AppRole[]) => {
  const { data: roles, isLoading } = useUserRole();
  return {
    hasRole: roles?.some(role => requiredRoles.includes(role)) || false,
    isLoading,
  };
};
