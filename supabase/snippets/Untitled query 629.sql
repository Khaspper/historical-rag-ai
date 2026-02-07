DROP POLICY IF EXISTS "Allow users to delete own documents" ON storage.objects;

CREATE POLICY "Allow users to delete own documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'documents' and (storage.foldername(name))[1] = auth.uid()::text);