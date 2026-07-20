CREATE POLICY "Users can insert wish_list_match notifications"
ON public.notifications
FOR INSERT
TO authenticated
WITH CHECK (
  type = 'wish_list_match'
  AND actor_id = auth.uid()
);
