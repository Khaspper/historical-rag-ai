import "@supabase/functions-js/edge-runtime.d.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { delay } from "https://deno.land/std@0.168.0/async/delay.ts"

// Satisfy TypeScript when Deno types aren't loaded (e.g. in a Next.js workspace)
declare const Deno: { env: { get(key: string): string | undefined } }

type Chunk = {
  source: string,
  content: string,
  embedding?: number[],
  chunkIndex: number,
  tokenSize?: number,
  title?: string,
}

let chunkIndex = 1;

serve(async (req: Request) => {
  // Make sure it's a POST request
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify('Method must be POST'),
      {
        headers: { "Content-Type": "application/json" },
        status: 400
      }
    )
  }

  const body = await req.json()

  // Make sure that only filePath is accepted and is not empty
  if (
    typeof body !== "object" ||
    body === null ||
    Array.isArray(body)
  ) {
    return new Response(
      JSON.stringify({ error: "Request body must be an object" }),
      { status: 400 }
    )
  }

  const allowedKeys = ["filePath", "fileType"]
  const keys = Object.keys(body)

  // Must contain ONLY these two keys
  if (
    keys.length !== 2 ||
    !allowedKeys.every((key) => key in body)
  ) {
    return new Response(
      JSON.stringify({ error: "Only filePath and fileType are accepted." }),
      { status: 400 }
    )
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl!, supabaseKey!);

  const { filePath } = body as { filePath: string; fileType: string };

  const { data: file, error: fileDownloadError } = await supabase.storage
    .from("documents")
    .download(filePath)

  if (fileDownloadError) {
    console.log("fileDownloadError ERROR!!")
    return new Response(
      JSON.stringify({ error: fileDownloadError }),
      { status: 400 }
    )
  }

  const rawText = await file.text()

  if (file.type === 'text/markdown') {
    //* Step 1: Clean the Markdown
    const markdown = cleanMarkdown(rawText);
    console.log(`==================================== STEP 1: DONE CLEANING MARKDOWN FOR ${filePath} ====================================`);

    //* Step 2: Chunk it... each chunk should be 400~600 tokens important 1 token = 3~5 chars
    const chunks = markdownChunk(markdown, filePath.split('/')[1])
    console.log(`==================================== STEP 2: DONE MAKING CHUNKS FOR ${filePath} ====================================`);

    //* Step 3: Get vector embeddings for it each chunk
    const BATCH_SIZE = 100;

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      console.log('New batch')
      const batch = chunks.slice(i, i + BATCH_SIZE);

      // THIS PROCESSES THE BATCHES CONCURRENTLY
      console.log('==================================== Making Embeddings ==================================== ')
      const batchEmbeddings = await Promise.all(
        batch.map(chunk => generateEmbeddings(chunk.content))
      )
      console.log('==================================== Done Making Embeddings ==================================== ')

      batch.forEach((chunk, i) => {
        chunk.embedding = batchEmbeddings[i]
      })

      console.log(`Processed ${Math.min(i + BATCH_SIZE, chunks.length)}/${chunks.length} chunks`);

      // Rate limiting (if needed)
      if (i + BATCH_SIZE < chunks.length) {
        await delay(100);  // Small delay between batches
      }
    }

    console.log(`==================================== STEP 3: DONE MAKING EMBEDDINGS FOR ${filePath} ====================================`);

    //* Step 4: Save embeddings in a vector database
    //* First we have to get the user_id
    const userId = filePath.split('/')[0]

    const ROWS_PER_INSERT = 100;
    const insertRows = chunks.map((chunk) => ({
      user_id: userId,
      source: chunk.source,
      content: chunk.content,
      embedding: chunk.embedding,
      chunk_index: chunk.chunkIndex,
    }));

    for (let i = 0; i < insertRows.length; i += ROWS_PER_INSERT) {
      const batch = insertRows.slice(i, i + ROWS_PER_INSERT);
      const { error: insertChunksError } = await supabase
        .from("document_chunks")
        .insert(batch)

      if (insertChunksError) {
        return new Response(
          JSON.stringify({ insertChunksError })
        )
      }
    }


  }
  else {
    console.log(`${file.type} is not supported yet!`)
    return new Response(
      JSON.stringify({ error: `${file.type} is not supported yet!` }),
      { status: 400 }
    )
  }

  // 3. Return response
  return new Response(
    JSON.stringify('Success'),
    {
      headers: { "Content-Type": "application/json" },
      status: 200
    }
  )
})

//* HELPER FUNCTIONS vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv

function estimatingTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

async function generateEmbeddings(text: string) {
  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": Deno.env.get('GEMINI_API_KEY')!
      },
      body: JSON.stringify({
        taskType: "RETRIEVAL_DOCUMENT",
        content: {
          parts: [{ text }],
        },
        output_dimensionality: 768,
      })
    }
  )

  const data = await response.json();


  if (!data) {
    console.error('Failed to generate embedding.')
    return []
  }

  return data.embedding.values
}

//* HELPER FUNCTIONS ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

//? CLEANING STRATEGIES vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv

function cleanMarkdown(md: string): string {
  return md
    .replace(/\r\n/g, "\n")        // normalize line endings
    .replace(/[ \t]+/g, " ")       // collapse multiple spaces
    .replace(/\n{3,}/g, "\n\n")    // max 2 line breaks
    .replace(/\uFFFD/g, "")
    .replace(/^\s*\* \[.*?\]\(.*?\)$/gm, "")
    .replace(/(©.*$|All rights reserved.*$)/gmi, "")
    .replace(/back to top/gi, "")
    .replace(/[ \t]+#/g, "#")
    .replace(/\n\s*\n/g, "\n\n")
    .trim();
}

//? CLEANING STRATEGIES ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^





//! CHUNKING STRATEGIES vvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvvv

function markdownChunk(markdown: string, fileName: string): Chunk[] {
  const chunks: Chunk[] = [];

  const sections = markdown.split(/^#{1,3}\s+/m);

  for (const section of sections) {
    const lines = section.split('\n');
    const title = lines[0];
    const content = lines.slice(1).join('').trim()

    if (estimatingTokens(content) > 700) {
      const overlappedContent = fixedSizeWithOverlap(content, 2000, 300, title, fileName);
      chunks.push(...overlappedContent);
    }
    else if (content.length > 0) {
      chunks.push({
        title,
        content,
        source: fileName,
        chunkIndex,
        tokenSize: estimatingTokens(content)
      })
      chunkIndex += 1;
    }
  }

  return chunks
}

// This is used when the content in a MD section is too large so we have to cut it down
function fixedSizeWithOverlap(content: string, chunkSize: number, overlap: number, title: string, fileName: string): Chunk[] {
  const chunks: Chunk[] = [];
  const step = chunkSize - overlap;

  for (let i = 0; i < content.length; i += step) {
    chunks.push({
      title,
      content: content.slice(i, i + chunkSize),
      source: fileName,
      chunkIndex,
      tokenSize: estimatingTokens(content.slice(i, i + chunkSize))
    })
    chunkIndex += 1;
  }
  return chunks
}

//! CHUNKING STRATEGIES ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/ingest_document' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/