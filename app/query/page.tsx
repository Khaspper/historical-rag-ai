"use client";

import { useState, useCallback } from "react";
import { AppNav } from "@/components/app-nav";
import { query as queryApi, type Citation } from "@/lib/api";
import { useUploadedFiles } from "@/lib/uploaded-files-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function QueryPage() {
  const { hasSuccessfulUpload } = useUploadedFiles();
  const [question, setQuestion] = useState("");
  const [streamingText, setStreamingText] = useState("");
  const [citations, setCitations] = useState<Citation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!question.trim() || loading) return;
      setError(null);
      setStreamingText("");
      setCitations([]);
      setLoading(true);
      try {
        let streamedLength = 0;
        const result = await queryApi(
          question.trim(),
          (chunk) => {
            streamedLength += chunk.length;
            setStreamingText((prev) => prev + chunk);
          },
          (cits) => setCitations(cits ?? [])
        );
        if (result.answer !== undefined && streamedLength === 0) {
          setStreamingText(result.answer);
        }
        if (result.citations?.length) {
          setCitations(result.citations);
        }
        if (result.error) {
          setError(result.error);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Query failed");
      } finally {
        setLoading(false);
      }
    },
    [question, loading]
  );

  const canSubmit = Boolean(question.trim()) && hasSuccessfulUpload && !loading;


  return (
    <div className="min-h-screen flex flex-col">
      <AppNav />

      <main className="flex-1 max-w-2xl mx-auto w-full p-6 space-y-6">
        <h1 className="text-2xl font-semibold">Ask a question</h1>
        {!hasSuccessfulUpload && (
          <p className="text-sm text-amber-600 dark:text-amber-500">
            Upload at least one document on the Upload page to enable queries.
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            placeholder="Enter your question..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={!hasSuccessfulUpload || loading}
            className="min-h-10"
          />
          <Button type="submit" disabled={!canSubmit}>
            {loading ? "Submitting…" : "Submit"}
          </Button>
        </form>

        {error && (
          <div className="rounded-md bg-destructive/10 text-destructive text-sm p-3">
            {error}
          </div>
        )}

        {(streamingText || loading) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Answer</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="whitespace-pre-wrap text-sm">
                {streamingText}
                {loading && (
                  <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-0.5 align-middle" />
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {citations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Citations</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {citations.map((c) => (
                  <li key={c.id} className="border-l-2 border-muted pl-3 py-1">
                    <span className="font-medium">{c.source}</span>
                    {c.snippet && (
                      <p className="text-muted-foreground mt-1">{c.snippet}</p>
                    )}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
