import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const query = typeof body?.query === "string" ? body.query : "";
    if (!query.trim()) {
      return NextResponse.json({ error: "Missing query" }, { status: 400 });
    }

    const { data: { user }, error: getUserError } = await supabase.auth.getUser();
    if (getUserError) {
      return NextResponse.json(
        { error: "Only auth users allowed." },
        { status: 403 }
      );
    }
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 400 });
    }

    const { data: matches, error: ingestError } = await supabase.functions.invoke(
      "ingest_query",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: { query, userId: user.id },
      }
    );

    if (ingestError) {
      return NextResponse.json(
        { error: ingestError.message ?? "Search failed" },
        { status: 502 }
      );
    }

    const context = Array.isArray(matches) ? matches : [];
    if (context.length === 0) {
      return NextResponse.json({
        answer: "No relevant documents found for your query. Try rephrasing or upload more documents.",
        citations: [],
      });
    }

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const fnRes = await fetch(
      `${SUPABASE_URL}/functions/v1/generate_answer`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ query, context }),
      }
    );

    if (!fnRes.ok) {
      const err = await fnRes.text();
      return NextResponse.json(
        { error: err || "Answer generation failed" },
        { status: 502 }
      );
    }

    const stream = fnRes.body;
    if (!stream) {
      return NextResponse.json(
        { error: "No response stream" },
        { status: 502 }
      );
    }

    const citations = context.map(
      (m: { id?: string; source?: string; content?: string; title?: string }) => ({
        id: m.id ?? "",
        source: m.source ?? m.title ?? "Document",
        snippet: m.content?.slice(0, 200) ?? "",
      })
    );

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Citations": JSON.stringify(citations),
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Invalid request" },
      { status: 400 }
    );
  }
}
