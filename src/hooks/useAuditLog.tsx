import { supabase } from "@/integrations/supabase/client";

interface AuditLogParams {
  action: string;
  resource_type: string;
  resource_id?: string;
  details?: Record<string, any>;
}

export const useAuditLog = () => {
  const logAction = async (params: AuditLogParams) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action: params.action,
        resource_type: params.resource_type,
        resource_id: params.resource_id,
        details: params.details,
        ip_address: null, // Would need server-side detection
        user_agent: navigator.userAgent,
        session_id: null,
      });
    } catch (error) {
      console.error('Failed to log audit action:', error);
    }
  };

  return { logAction };
};
