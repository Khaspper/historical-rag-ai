import "@supabase/functions-js/edge-runtime.d.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

  const allowedKeys = ["query", "context"]
  const keys = Object.keys(body)

  // Must contain ONLY these two keys
  if (
    keys.length !== 2 ||
    !allowedKeys.every((key) => key in body)
  ) {
    return new Response(
      JSON.stringify({ error: "Only query and context keys are accepted." }),
      { status: 400 }
    )
  }

  const systemRole = `
  You are a knowledgeable historical teacher and research assistant.

  Your job is to help users understand historical events, timelines, people, and causes using ONLY the historical documents provided in the context section.`

  const systemRules = `
    1. Answer questions strictly using the information in the provided context documents
    2. Do NOT use outside knowledge or assumptions
    3. If the context does not contain enough information:
      - Clearly state what can be answered
      - Clearly state what is missing
    4. Never invent dates, events, people, motivations, or outcomes
    5. Always cite where the information comes from (example: "According to the Roman Empire Overview document...")
    6. If multiple documents conflict, point out the differences
    7. Keep everything less than 300 words`

  const responseGuidelines = `    
  - Be clear and factual
    - Prefer timelines and cause -> effect explanations
    - Use bullet points for complex events
    - Include short quotes when helpful
    - End longer responses with a concise summary`

  const systemInstruction = `
    ${systemRole}
    
    IMPORTANT RULES:
    ${systemRules}

    RESPONSE GUIDELINES:
    ${responseGuidelines}

    CONTEXT BELOW:
    ---
  `;

  const contextBlocks = (Array.isArray(body.context) ? body.context : [])
    .map((c: { content?: string }, i: number) => `[${i + 1}]:\n${c?.content ?? ""}`)
    .join("\n\n");

  const userMessage = `
    Context:
    ----
    ${contextBlocks}
    ---

    Question:
    ${body.query}
  `;

  const stream = await streamAnswer(systemInstruction, userMessage);

  if (!stream) {
    return new Response(
      JSON.stringify({ error: "Failed to start answer stream" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
    status: 200,
  });
});

/**
 * Calls Gemini streamGenerateContent and returns a ReadableStream of text chunks.
 * Uses top-level systemInstruction and contents (user only) per Gemini API.
 */
async function streamAnswer(systemInstruction: string, userMessage: string): Promise<ReadableStream<Uint8Array> | null> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    console.error("GEMINI_API_KEY is not set");
    return null;
  }

  const response = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:streamGenerateContent?alt=sse",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": Deno.env.get('GEMINI_API_KEY')!
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemInstruction }],
        },
        contents: [{ role: "user", parts: [{ text: userMessage }] }],
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    console.error("Gemini stream request failed:", response.status, err);
    return null;
  }

  const reader = response.body?.getReader();
  if (!reader) return null;

  const decoder = new TextDecoder();
  let buffer = "";

  function processLine(line: string, controller: ReadableStreamDefaultController<Uint8Array>) {
    if (!line.startsWith("data:")) return;
    const raw = line.slice(5).trim();
    if (raw === "[DONE]" || raw === "") return;
    try {
      const data = JSON.parse(raw);
      const text = data.candidates?.[0]?.content?.parts
        ?.map((p: { text?: string }) => p.text)
        .filter(Boolean)
        .join("");
      if (text) controller.enqueue(new TextEncoder().encode(text));
    } catch {
      // ignore parse errors for non-JSON lines
    }
  }

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      const { done, value } = await reader.read();
      if (done) {
        // Drain remaining buffer (last line might be incomplete or complete)
        const lines = buffer.split("\n");
        for (const line of lines) {
          if (line.trim()) processLine(line, controller);
        }
        controller.close();
        return;
      }
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        processLine(line, controller);
      }
    },
  });
}