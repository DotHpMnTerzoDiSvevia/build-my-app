-- Fix infinite recursion in RLS policies between orders and order_items
-- 
-- Root cause: 
--   "Sellers read orders for their items" on orders → queries order_items (RLS applies)
--   "Order items visible to buyer or seller" on order_items → queries orders (RLS applies)
--   → infinite loop
--
-- Solution: replace the cross-referencing policies with SECURITY DEFINER helper functions
-- that bypass RLS when doing the cross-table check.

-- Step 1: Drop the problematic cross-referencing policies
DROP POLICY IF EXISTS "Sellers read orders for their items" ON public.orders;
DROP POLICY IF EXISTS "Order items visible to buyer or seller" ON public.order_items;
DROP POLICY IF EXISTS "Buyer inserts order items" ON public.order_items;

-- Step 2: Create SECURITY DEFINER helper functions to do cross-table checks
-- without triggering RLS recursion

-- Check if current user is buyer of a given order (bypasses RLS on orders)
CREATE OR REPLACE FUNCTION public.is_order_buyer(p_order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.orders WHERE id = p_order_id AND buyer_id = auth.uid()
  );
$$;

-- Check if current user is a seller in a given order (bypasses RLS on order_items)
CREATE OR REPLACE FUNCTION public.is_order_seller(p_order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.order_items WHERE order_id = p_order_id AND seller_id = auth.uid()
  );
$$;

-- Step 3: Recreate orders SELECT policy - sellers can see orders with their items
-- Uses SECURITY DEFINER function to avoid recursion
CREATE POLICY "Sellers read orders for their items" ON public.orders
  FOR SELECT USING (
    public.is_order_seller(id)
  );

-- Step 4: Recreate order_items SELECT policy - buyers can see their order items
-- Uses SECURITY DEFINER function to avoid recursion
CREATE POLICY "Order items visible to buyer or seller" ON public.order_items
  FOR SELECT USING (
    public.is_order_buyer(order_id)
    OR seller_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

-- Step 5: Recreate order_items INSERT policy
-- Uses SECURITY DEFINER function to avoid recursion
CREATE POLICY "Buyer inserts order items" ON public.order_items
  FOR INSERT WITH CHECK (
    public.is_order_buyer(order_id)
  );

-- Revoke direct access from anon/public (functions are security definer, no need for public execute)
REVOKE EXECUTE ON FUNCTION public.is_order_buyer(uuid) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_order_seller(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_order_buyer(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_order_seller(uuid) TO authenticated;
