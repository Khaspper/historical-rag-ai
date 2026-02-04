import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      <nav className="border-b px-4 py-3 flex items-center gap-4">
        <span className="font-medium text-foreground">RAG</span>
        <Link href="/upload" className="text-muted-foreground hover:text-foreground">
          Upload
        </Link>
        <Link href="/query" className="text-muted-foreground hover:text-foreground">
          Query
        </Link>
      </nav>
      <div className="flex-1 max-w-2xl mx-auto w-full p-6 flex flex-col items-center justify-center gap-8">
        <h1 className="text-3xl font-semibold">Historical RAG</h1>
        <p className="text-muted-foreground text-center">
          Upload PDF or Markdown documents, then ask questions against them.
        </p>
        <div className="flex gap-4">
          <Link href="/upload">
            <span className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 py-2 bg-primary text-primary-foreground shadow hover:bg-primary/90">
              Upload documents
            </span>
          </Link>
          <Link href="/query">
            <span className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 py-2 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground">
              Query
            </span>
          </Link>
        </div>
      </div>
    </main>
  );
}
