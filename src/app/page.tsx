"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ensureSession } from "@/lib/solid/auth";

/**
 * Root route: signed in → the gallery, signed out → the connect page.
 * `ensureSession` is single-flight, so this coexists with the header chip.
 */
export default function Home() {
  const router = useRouter();

  useEffect(() => {
    ensureSession()
      .then((info) => {
        router.replace(info.isLoggedIn ? "/photos" : "/connect");
      })
      .catch(() => router.replace("/connect"));
  }, [router]);

  return (
    <section className="mx-auto max-w-md px-6 py-20 text-center">
      <p className="text-muted-foreground">Loading…</p>
    </section>
  );
}
