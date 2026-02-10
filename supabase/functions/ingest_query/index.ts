import "@supabase/functions-js/edge-runtime.d.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

declare const Deno: { env: { get(key: string): string | undefined } }

serve(async (req: Request) => {
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

  const allowedKeys = ["query", "userId"]
  const keys = Object.keys(body)

  // Must contain ONLY these two keys
  if (
    keys.length !== 2 ||
    !allowedKeys.every((key) => key in body)
  ) {
    return new Response(
      JSON.stringify({ error: "Only query and userId keys are accepted." }),
      { status: 400 }
    )
  }

  // TODO: Ok so basically what I have to do is
  // Step 1: Get the user query
  // Step 2: Vector embed it
  // Step 3: Make a SQL function (rpcs) that finds the most similar semantically thing that the user is asking
  // Step 4: Return the most relevant chunks maybe top 3? top 4? idk
  // Step 5: I think that's it

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl!, supabaseKey!);

  // Step 1
  const userQuery = body.query;
  const userId = body.userId;

  // Step 2
  console.log('userQuery: ', userQuery);
  const userQueryEmbedding = await generateEmbedding(userQuery)

  // Step 3 and 4 are done they were done in the same function, but I have to go to class
  // so when done test the SQL function? idk how we would test that but whatever... 
  // after that we need to just return it im pretty sure and then make a new edge function
  // that generates the answer... or we could probably do it here Im pretty sure...

  // Step 5
  const { data: matches, error: searchDocsError } = await supabase.rpc('search_docs', {
    query_embedding: userQueryEmbedding,
    // match_count is dynamic!!!!
    match_count: 3,
    // match_count is dynamic!!!!
    p_user_id: userId,
  });

  if (searchDocsError) {
    return new Response(JSON.stringify({ searchDocsError }))
  }

  // 3. Return response
  return new Response(
    JSON.stringify(matches),
    {
      headers: { "Content-Type": "application/json" },
      status: 200
    }
  )
})

async function generateEmbedding(query: string) {
  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": Deno.env.get('GEMINI_API_KEY')!
      },
      body: JSON.stringify({
        taskType: "RETRIEVAL_QUERY",
        content: {
          parts: [{ text: query }],
        },
        output_dimensionality: 768,
      })
    }
  )

  const data = await response.json();


  if (!data) {
    console.error('Failed to generate embedding for users query.')
    return []
  }

  return data.embedding.values
}