
-- Fix push_subscriptions: replace ALL policy with separate granular policies
DROP POLICY IF EXISTS "Users can manage their own subscriptions" ON public.push_subscriptions;

CREATE POLICY "Users can view own subscriptions"
ON public.push_subscriptions FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own subscriptions"
ON public.push_subscriptions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own subscriptions"
ON public.push_subscriptions FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own subscriptions"
ON public.push_subscriptions FOR DELETE
USING (auth.uid() = user_id);

-- Fix vehicle_checkouts: restrict SELECT to own checkouts + admins
DROP POLICY IF EXISTS "Authenticated users can view vehicle checkouts" ON public.vehicle_checkouts;

CREATE POLICY "Users can view own vehicle checkouts"
ON public.vehicle_checkouts FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all vehicle checkouts"
ON public.vehicle_checkouts FOR SELECT
USING (has_role(auth.uid(), 'admin'::user_role));
