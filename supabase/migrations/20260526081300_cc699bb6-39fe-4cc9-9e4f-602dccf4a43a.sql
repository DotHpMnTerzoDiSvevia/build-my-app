
-- Helpers that bypass RLS to break the orders <-> order_items recursion
CREATE OR REPLACE FUNCTION public.is_order_buyer(_order_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.orders WHERE id = _order_id AND buyer_id = _user_id)
$$;

CREATE OR REPLACE FUNCTION public.order_has_seller(_order_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.order_items WHERE order_id = _order_id AND seller_id = _user_id)
$$;

-- Replace recursive policies on orders
DROP POLICY IF EXISTS "Sellers read orders for their items" ON public.orders;
CREATE POLICY "Sellers read orders for their items"
ON public.orders
FOR SELECT
USING (public.order_has_seller(id, auth.uid()));

-- Replace recursive policies on order_items
DROP POLICY IF EXISTS "Buyer inserts order items" ON public.order_items;
CREATE POLICY "Buyer inserts order items"
ON public.order_items
FOR INSERT
WITH CHECK (public.is_order_buyer(order_id, auth.uid()));

DROP POLICY IF EXISTS "Order items visible to buyer or seller" ON public.order_items;
CREATE POLICY "Order items visible to buyer or seller"
ON public.order_items
FOR SELECT
USING (
  public.is_order_buyer(order_id, auth.uid())
  OR seller_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::app_role)
);
