-- Create app_role enum for RBAC
CREATE TYPE public.app_role AS ENUM ('admin', 'trader', 'auditor', 'compliance', 'operator');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can assign roles"
  ON public.user_roles FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can remove roles"
  ON public.user_roles FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- Immutable audit log table (WORM - Write Once Read Many)
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  details JSONB,
  ip_address TEXT,
  user_agent TEXT,
  session_id TEXT
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Prevent updates/deletes on audit logs (immutable)
CREATE POLICY "Audit logs are immutable"
  ON public.audit_logs FOR UPDATE
  USING (false);

CREATE POLICY "Audit logs cannot be deleted"
  ON public.audit_logs FOR DELETE
  USING (false);

-- Only authenticated users can insert audit logs
CREATE POLICY "Users can create audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Admins and auditors can view all logs
CREATE POLICY "Admins and auditors can view audit logs"
  ON public.audit_logs FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'auditor')
  );

-- Model registry for AI model governance
CREATE TABLE public.model_registry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_name TEXT NOT NULL,
  version TEXT NOT NULL,
  deployed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deployed_by UUID NOT NULL REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'shadow', 'deprecated', 'rolled_back')),
  training_data_id TEXT,
  hyperparameters JSONB,
  validation_results JSONB,
  performance_metrics JSONB,
  approval_status TEXT NOT NULL DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  UNIQUE(model_name, version)
);

ALTER TABLE public.model_registry ENABLE ROW LEVEL SECURITY;

-- Traders and admins can view models
CREATE POLICY "Traders and admins can view models"
  ON public.model_registry FOR SELECT
  USING (
    public.has_role(auth.uid(), 'admin') OR 
    public.has_role(auth.uid(), 'trader') OR
    public.has_role(auth.uid(), 'operator')
  );

-- Only admins can deploy models
CREATE POLICY "Admins can deploy models"
  ON public.model_registry FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can update model status
CREATE POLICY "Admins can update models"
  ON public.model_registry FOR UPDATE
  USING (public.has_role(auth.uid(), 'admin'));

-- KYC records table
CREATE TABLE public.kyc_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'under_review')),
  full_name TEXT NOT NULL,
  id_number TEXT NOT NULL,
  id_type TEXT NOT NULL CHECK (id_type IN ('passport', 'national_id', 'drivers_license')),
  date_of_birth DATE NOT NULL,
  address TEXT NOT NULL,
  phone TEXT NOT NULL,
  verification_documents JSONB,
  sanctions_check_result TEXT,
  pep_check_result TEXT,
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.kyc_records ENABLE ROW LEVEL SECURITY;

-- Users can view their own KYC
CREATE POLICY "Users can view own KYC"
  ON public.kyc_records FOR SELECT
  USING (auth.uid() = user_id);

-- Users can submit KYC
CREATE POLICY "Users can submit KYC"
  ON public.kyc_records FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Compliance officers can view all KYC
CREATE POLICY "Compliance can view all KYC"
  ON public.kyc_records FOR SELECT
  USING (public.has_role(auth.uid(), 'compliance') OR public.has_role(auth.uid(), 'admin'));

-- Compliance officers can update KYC status
CREATE POLICY "Compliance can update KYC"
  ON public.kyc_records FOR UPDATE
  USING (public.has_role(auth.uid(), 'compliance') OR public.has_role(auth.uid(), 'admin'));

-- AML alerts table
CREATE TABLE public.aml_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  alert_type TEXT NOT NULL CHECK (alert_type IN ('large_transaction', 'unusual_pattern', 'sanctions_match', 'pep_match', 'rapid_movement')),
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'escalated', 'false_positive')),
  transaction_id UUID REFERENCES public.transactions(id),
  details JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  assigned_to UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT
);

ALTER TABLE public.aml_alerts ENABLE ROW LEVEL SECURITY;

-- Compliance officers can view and manage alerts
CREATE POLICY "Compliance can view AML alerts"
  ON public.aml_alerts FOR SELECT
  USING (public.has_role(auth.uid(), 'compliance') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Compliance can create AML alerts"
  ON public.aml_alerts FOR INSERT
  WITH CHECK (public.has_role(auth.uid(), 'compliance') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Compliance can update AML alerts"
  ON public.aml_alerts FOR UPDATE
  USING (public.has_role(auth.uid(), 'compliance') OR public.has_role(auth.uid(), 'admin'));

-- Add trigger for KYC updated_at
CREATE TRIGGER update_kyc_updated_at
  BEFORE UPDATE ON public.kyc_records
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Update existing profiles RLS to use roles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Update trades RLS to use roles
CREATE POLICY "Auditors can view all trades"
  ON public.trades FOR SELECT
  USING (public.has_role(auth.uid(), 'auditor') OR public.has_role(auth.uid(), 'admin'));

-- Update transactions RLS to use roles
CREATE POLICY "Compliance can view all transactions"
  ON public.transactions FOR SELECT
  USING (public.has_role(auth.uid(), 'compliance') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Auditors can view all transactions"
  ON public.transactions FOR SELECT
  USING (public.has_role(auth.uid(), 'auditor'));