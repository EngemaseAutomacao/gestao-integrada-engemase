CREATE OR REPLACE FUNCTION public.get_general_tool_history()
RETURNS TABLE(
  id uuid,
  checkout_date timestamptz,
  checkin_date timestamptz,
  status text,
  construction_site text,
  selected_tag text,
  estimated_return_date timestamptz,
  checkout_photo_url text,
  checkin_photo_url text,
  checkout_signature_url text,
  checkin_signature_url text,
  tool_name text,
  tool_tag text,
  user_full_name text,
  user_category text,
  checked_out_by_full_name text,
  checked_in_by_full_name text,
  notes text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    tc.id,
    tc.checkout_date,
    tc.checkin_date,
    tc.status::text,
    tc.construction_site,
    tc.selected_tag,
    tc.estimated_return_date,
    tc.checkout_photo_url,
    tc.checkin_photo_url,
    tc.checkout_signature_url,
    tc.checkin_signature_url,
    t.name AS tool_name,
    t.tag AS tool_tag,
    COALESCE(user_profile.full_name, 'Usuário não encontrado') AS user_full_name,
    CASE
      WHEN public.has_role(auth.uid(), 'admin'::public.user_role) OR tc.user_id = auth.uid()
      THEN user_profile.category::text
      ELSE NULL
    END AS user_category,
    checked_out_profile.full_name AS checked_out_by_full_name,
    checked_in_profile.full_name AS checked_in_by_full_name,
    tc.notes
  FROM public.tool_checkouts tc
  LEFT JOIN public.tools t ON t.id = tc.tool_id
  LEFT JOIN public.profiles user_profile ON user_profile.id = tc.user_id
  LEFT JOIN public.profiles checked_out_profile ON checked_out_profile.id = tc.checked_out_by
  LEFT JOIN public.profiles checked_in_profile ON checked_in_profile.id = tc.checked_in_by
  WHERE auth.uid() IS NOT NULL
  ORDER BY tc.checkout_date DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_general_vehicle_history()
RETURNS TABLE(
  id uuid,
  checkout_date timestamptz,
  checkin_date timestamptz,
  status text,
  destination text,
  km_checkout integer,
  km_checkin integer,
  km_checkin_automatic boolean,
  refueled boolean,
  notes text,
  photo_front_checkout text,
  photo_back_checkout text,
  photo_left_checkout text,
  photo_right_checkout text,
  photo_dashboard_checkout text,
  photo_front_checkin text,
  photo_back_checkin text,
  photo_left_checkin text,
  photo_right_checkin text,
  photo_dashboard_checkin text,
  vehicle_name text,
  vehicle_plate text,
  user_full_name text,
  user_category text,
  checked_out_by_full_name text,
  checked_in_by_full_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    vc.id,
    vc.checkout_date,
    vc.checkin_date,
    vc.status,
    vc.destination,
    vc.km_checkout,
    vc.km_checkin,
    vc.km_checkin_automatic,
    vc.refueled,
    vc.notes,
    vc.photo_front_checkout,
    vc.photo_back_checkout,
    vc.photo_left_checkout,
    vc.photo_right_checkout,
    vc.photo_dashboard_checkout,
    vc.photo_front_checkin,
    vc.photo_back_checkin,
    vc.photo_left_checkin,
    vc.photo_right_checkin,
    vc.photo_dashboard_checkin,
    v.name AS vehicle_name,
    v.plate AS vehicle_plate,
    COALESCE(user_profile.full_name, 'Usuário não encontrado') AS user_full_name,
    CASE
      WHEN public.has_role(auth.uid(), 'admin'::public.user_role) OR vc.user_id = auth.uid()
      THEN user_profile.category::text
      ELSE NULL
    END AS user_category,
    checked_out_profile.full_name AS checked_out_by_full_name,
    checked_in_profile.full_name AS checked_in_by_full_name
  FROM public.vehicle_checkouts vc
  LEFT JOIN public.vehicles v ON v.id = vc.vehicle_id
  LEFT JOIN public.profiles user_profile ON user_profile.id = vc.user_id
  LEFT JOIN public.profiles checked_out_profile ON checked_out_profile.id = vc.checked_out_by
  LEFT JOIN public.profiles checked_in_profile ON checked_in_profile.id = vc.checked_in_by
  WHERE auth.uid() IS NOT NULL
  ORDER BY vc.checkout_date DESC;
$$;

REVOKE EXECUTE ON FUNCTION public.get_general_tool_history() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_general_vehicle_history() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_general_tool_history() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_general_vehicle_history() TO authenticated;