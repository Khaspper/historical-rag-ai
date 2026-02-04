"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";

export function AppNav() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      setUser(u ?? null);
      setLoading(false);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <nav className="border-b px-4 py-3 flex items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <Link href="/" className="font-medium text-foreground hover:underline">
          RAG
        </Link>
        {user && (
          <>
            <Link href="/upload" className="text-muted-foreground hover:text-foreground">
              Upload
            </Link>
            <Link href="/query" className="text-muted-foreground hover:text-foreground">
              Query
            </Link>
          </>
        )}
      </div>
      <div className="flex items-center gap-2">
        {loading ? (
          <span className="text-sm text-muted-foreground">…</span>
        ) : user ? (
          <>
            <span className="text-sm text-muted-foreground truncate max-w-[160px]" title={user.email}>
              {user.email}
            </span>
            <Button type="button" variant="ghost" size="sm" onClick={handleSignOut}>
              Log out
            </Button>
          </>
        ) : (
          <>
            <Link href="/auth/login">
              <Button variant="ghost" size="sm">Log in</Button>
            </Link>
            <Link href="/auth/sign-up">
              <Button size="sm">Sign up</Button>
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
