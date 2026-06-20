"use client";

import { Button } from "@mind-studio/ui";
import { LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";
import { ensureSession } from "@/lib/solid/auth";
import { session } from "@/lib/solid/session";

/**
 * App masthead: name + tagline, theme toggle, and (when signed in) an
 * account chip showing the WebID host plus a sign-out button.
 *
 * `ensureSession` is single-flight (see lib/solid/auth.ts), so this mounting
 * alongside session-aware pages never double-redeems the OIDC code.
 */

export default function Header() {
  const router = useRouter();
  const [webId, setWebId] = useState<string | null>(null);

  useEffect(() => {
    ensureSession()
      .then((info) => setWebId(info.webId ?? null))
      .catch(() => setWebId(null));
  }, []);

  const host = (() => {
    if (!webId) return null;
    try {
      return new URL(webId).host;
    } catch {
      return webId;
    }
  })();

  async function onSignOut() {
    try {
      await session().logout();
    } catch {}
    setWebId(null);
    router.replace("/connect");
  }

  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-10 sm:py-4">
        <Link href="/" className="flex items-baseline gap-3">
          <span className="text-xl font-semibold tracking-tight sm:text-2xl">Mind Photos</span>
          <span className="hidden text-[10px] uppercase tracking-[0.22em] text-muted-foreground sm:inline">
            <span className="text-primary">●</span> photos in your pod
          </span>
        </Link>
        <nav className="flex items-center gap-2" aria-label="Main">
          <ThemeToggle />
          {host && (
            <>
              <span
                className="hidden rounded-full border bg-muted/40 px-3 py-1 font-mono text-xs text-muted-foreground sm:inline"
                title={webId ?? undefined}
                data-testid="account-chip"
              >
                {host}
              </span>
              <Button variant="ghost" size="sm" onClick={onSignOut} aria-label="Sign out">
                <LogOut className="size-4" />
                <span className="hidden sm:inline">Sign out</span>
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
