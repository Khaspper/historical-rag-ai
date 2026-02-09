/**
 * Stub API client for RAG. Replace with real implementations when backend is ready.
 */

export type UploadedFile = {
  id: string;
  name: string;
  type: string;
  size: number;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
};

export type Citation = {
  id: string;
  source: string;
  snippet?: string;
};

export type QueryResponse = {
  answer?: string;
  citations?: Citation[];
  error?: string;
};

export const ALLOWED_TYPES = [
  "application/pdf",
  "text/markdown",
  "text/x-markdown",
] as const;

export const ALLOWED_EXTENSIONS = [".pdf", ".md", ".markdown"] as const;

export function isAllowedFile(file: File): boolean {
  const ext = "." + file.name.split(".").pop()?.toLowerCase();
  return (
    ALLOWED_TYPES.includes(file.type as (typeof ALLOWED_TYPES)[number]) ||
    ALLOWED_EXTENSIONS.includes(ext as (typeof ALLOWED_EXTENSIONS)[number])
  );
}

export function getRejectMessage(): string {
  return "Only PDF (.pdf) and Markdown (.md, .markdown) files are allowed.";
}

/** POST /api/upload - multipart form-data. Stub returns mock id. */
export async function uploadFile(file: File): Promise<{ id: string }> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/upload", {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    console.log('failed');
    const text = await res.text();
    throw new Error(text || `Upload failed: ${res.status}`);
  }
  return res.json();
}

/** POST /api/query - JSON { query }. Stub returns mock streaming or static response. */
export async function query(
  queryText: string,
  onChunk?: (text: string) => void
): Promise<QueryResponse> {
  const res = await fetch("/api/query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query: queryText }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Query failed: ${res.status}`);
  }
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("text/event-stream") || contentType.includes("stream")) {
    const reader = res.body?.getReader();
    if (!reader) throw new Error("No response body");
    const decoder = new TextDecoder();
    let full = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      full += chunk;
      onChunk?.(chunk);
    }
    return { answer: full, citations: [] };
  }
  return res.json();
}

/** DELETE /api/file/:id. Stub. */
export async function deleteFile(id: string): Promise<void> {
  await fetch(`/api/file/${id}`, { method: "DELETE" });
}
