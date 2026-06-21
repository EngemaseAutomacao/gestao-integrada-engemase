
-- 1. Restringir upload no bucket 'imagens' para que o owner seja o próprio usuário
DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
CREATE POLICY "Authenticated users can upload images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'imagens' AND owner = auth.uid());

-- 2. Permitir inserts em system_logs por qualquer usuário autenticado (triggers rodam como o usuário)
DROP POLICY IF EXISTS "Triggers can insert logs" ON public.system_logs;
CREATE POLICY "Authenticated users can insert logs"
ON public.system_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 3. Restringir visualização de tool_checkouts: somente envolvidos ou admin
DROP POLICY IF EXISTS "Authenticated users can view all tool checkouts" ON public.tool_checkouts;
CREATE POLICY "Users can view their related tool checkouts"
ON public.tool_checkouts
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR checked_out_by = auth.uid()
  OR checked_in_by = auth.uid()
  OR has_role(auth.uid(), 'admin'::user_role)
);
