CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE if NOT EXISTS document_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),

  source TEXT NOT NULL,
  content TEXT,

  embedding VECTOR(768),

  chunk_index INTEGER DEFAULT 0, -- The index of where the chunk is at in the document

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS document_chunks_embedding_idx ON document_chunks (user_id) INCLUDE (embedding);

-- Vector Index
CREATE INDEX IF NOT EXISTS vector_hnsw_idx ON document_chunks
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read their own chunks" ON document_chunks;

CREATE POLICY "Users can read their own chunks" ON document_chunks
FOR select
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own chunks" ON document_chunks;

CREATE POLICY "Users can delete their own chunks" ON document_chunks
FOR delete
USING (auth.uid() = user_id);

DROP POlICY IF EXISTS "Users can insert their own chunks" ON document_chunks;

CREATE POLICY "Users can insert their own chunks" ON document_chunks
FOR insert
WITH CHECK (user_id = auth.uid());