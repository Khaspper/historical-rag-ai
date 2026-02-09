import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Stub: accept JSON { query } and return a mock answer.
 * Replace with real RAG query + streaming later.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json();
    const query = typeof body?.query === "string" ? body.query : "";
    if (!query.trim()) {
      return NextResponse.json(
        { error: "Missing query" },
        { status: 400 }
      );
    }
    const answer = `This is a stub response for: "${query}"\n\nImplement the RAG backend to return real answers and citations.`;
    const citations = [
      { id: "1", source: "Stub document", snippet: "Stub snippet." },
    ];

    const { data: { user }, error: getUserError } = await supabase.auth.getUser()

    if (getUserError) {
      console.log('getUserError: ', getUserError)
      return NextResponse.json(
        { error: "Only auth users allowed." },
        { status: 403 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: "User not found." },
        { status: 400 }
      );
    }

    const userId = user.id

    const { data: response, error: getAnswerError } = await supabase.functions.invoke('ingest_query', {
      method: 'POST',
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
      },
      body: { query, userId }
    })

    if (getAnswerError) {
      throw getAnswerError;
    }

    console.log('response: ', response)

    return NextResponse.json({ answer, citations });
  } catch {
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }
}
