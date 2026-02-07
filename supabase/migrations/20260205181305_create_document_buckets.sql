INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
on conflict(id) do nothing;

DROP POLICY IF EXISTS "Allow users to read own documents" ON storage.objects;

CREATE POLICY "Allow users to read own documents"
ON storage.objects
FOR SELECT
TO authenticated 
USING (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Allow users to insert own documents" ON storage.objects;

CREATE POLICY "Allow users to insert own documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Allow users to delete own documents" ON storage.objects;

CREATE POLICY "Allow users to delete own documents"
ON storage.objects
FOR DELETE
USING (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);