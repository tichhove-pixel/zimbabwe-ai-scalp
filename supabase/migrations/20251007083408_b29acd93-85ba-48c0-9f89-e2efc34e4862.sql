-- Fix all RLS policy security issues

-- 1. Add DELETE policy for profiles (prevent deletion to protect financial data)
CREATE POLICY "Profiles cannot be deleted"
ON public.profiles
FOR DELETE
USING (false);

-- 2. Add UPDATE policy for profiles to restrict to own profile
-- (already exists, but let's ensure it's correct)

-- 3. Make transactions immutable - prevent UPDATE
CREATE POLICY "Transactions cannot be updated"
ON public.transactions
FOR UPDATE
USING (false);

-- 4. Prevent transaction deletion to maintain audit trail
CREATE POLICY "Transactions cannot be deleted"
ON public.transactions
FOR DELETE
USING (false);

-- 5. Prevent trade deletion to maintain trading history
CREATE POLICY "Trades cannot be deleted"
ON public.trades
FOR DELETE
USING (false);

-- 6. Add UPDATE policy for user_roles (admin only)
CREATE POLICY "Only admins can update roles"
ON public.user_roles
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- 7. Prevent model_registry deletion or restrict to admin
CREATE POLICY "Only admins can delete models"
ON public.model_registry
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- 8. Prevent KYC record deletion to maintain compliance
CREATE POLICY "KYC records cannot be deleted"
ON public.kyc_records
FOR DELETE
USING (false);

-- 9. Prevent AML alert deletion to maintain regulatory compliance
CREATE POLICY "AML alerts cannot be deleted"
ON public.aml_alerts
FOR DELETE
USING (false);