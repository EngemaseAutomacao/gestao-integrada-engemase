
-- Clean up stale push subscriptions: keep only the most recent per user
-- This removes old endpoints that cause empty/duplicate notifications
DELETE FROM public.push_subscriptions 
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id) id 
  FROM public.push_subscriptions 
  ORDER BY user_id, updated_at DESC
);
