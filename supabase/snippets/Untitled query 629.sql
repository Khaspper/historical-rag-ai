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