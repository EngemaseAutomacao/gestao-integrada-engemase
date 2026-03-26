
-- Reforçar a policy de update do próprio perfil para impedir mudança de campos sensíveis
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
    AND category = (SELECT category FROM public.profiles WHERE id = auth.uid())
    AND approved = (SELECT approved FROM public.profiles WHERE id = auth.uid())
    AND email = (SELECT email FROM public.profiles WHERE id = auth.uid())
  );
