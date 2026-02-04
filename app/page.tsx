import Link from "next/link";
import { AppNav } from "@/components/app-nav";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      <AppNav />
      <div className="flex-1 max-w-2xl mx-auto w-full p-6 flex flex-col items-center justify-center gap-8">
        <h1 className="text-3xl font-semibold">Historical RAG</h1>
        <p className="text-muted-foreground text-center">
          Upload PDF or Markdown documents, then ask questions against them. Log in or sign up to get started.
        </p>
        <div className="flex gap-4">
          <Link href="/auth/login">
            <span className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 py-2 bg-primary text-primary-foreground shadow hover:bg-primary/90">
              Log in
            </span>
          </Link>
          <Link href="/auth/sign-up">
            <span className="inline-flex items-center justify-center rounded-md text-sm font-medium h-9 px-4 py-2 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground">
              Sign up
            </span>
          </Link>
        </div>
      </div>
    </main>
  );
}
