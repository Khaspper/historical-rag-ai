create schema if not exists extensions;
alter extension vector set schema extensions;

ALTER TABLE public.document_chunks
ALTER COLUMN embedding TYPE extensions.vector(768);

DROP POLICY IF EXISTS "Users can read their own chunks" ON document_chunks;

CREATE POLICY "Users can read their own chunks" ON document_chunks
FOR select
USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own chunks" ON document_chunks;

CREATE POLICY "Users can delete their own chunks" ON document_chunks
FOR delete
USING (user_id = (select auth.uid()));

DROP POlICY IF EXISTS "Users can insert their own chunks" ON document_chunks;

CREATE POLICY "Users can insert their own chunks" ON document_chunks
FOR insert
WITH CHECK ( (user_id = (select auth.uid())));

DROP POLICY IF EXISTS "Allow users to read own documents" ON storage.objects;

CREATE POLICY "Allow users to read own documents"
ON storage.objects
FOR SELECT
TO authenticated 
USING (bucket_id = 'documents' and (storage.foldername(name))[1] =  (select auth.uid())::text);

DROP POLICY IF EXISTS "Allow users to insert own documents" ON storage.objects;

CREATE POLICY "Allow users to insert own documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);

DROP POLICY IF EXISTS "Allow users to delete own documents" ON storage.objects;

CREATE POLICY "Allow users to delete own documents"
ON storage.objects
FOR DELETE
USING (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);

DROP INDEX IF EXISTS vector_hnsw_idx;

SET search_path TO extensions, public;

CREATE INDEX vector_hnsw_idx ON document_chunks
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);