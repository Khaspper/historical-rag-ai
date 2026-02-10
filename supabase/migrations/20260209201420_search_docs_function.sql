ALTER TABLE document_chunks
ADD COLUMN IF NOT EXISTS title TEXT;

DROP FUNCTION IF EXISTS public.search_docs(extensions.vector, UUID, INT);
CREATE FUNCTION public.search_docs(
  query_embedding extensions.vector(768),
  p_user_id UUID,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  source TEXT,
  title TEXT,
  similarity FLOAT
)
LANGUAGE sql
SET search_path = public, extensions
AS $$
  SELECT
    d.id,
    d.content,
    d.source,
    d.title,
    1 - (d.embedding <=> query_embedding) AS similarity
  FROM document_chunks d
  WHERE d.user_id = p_user_id
  AND 1 - (d.embedding <=> query_embedding) > 0.65
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
$$;