import { NextResponse } from "next/server";

/**
 * Stub: accept JSON { query } and return a mock answer.
 * Replace with real RAG query + streaming later.
 */
export async function POST(request: Request) {
  try {
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
    return NextResponse.json({ answer, citations });
  } catch {
    return NextResponse.json(
      { error: "Invalid request" },
      { status: 400 }
    );
  }
}
