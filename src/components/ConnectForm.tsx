"use client";

import { useEffect, useState } from "react";
import { login } from "@inrupt/solid-client-authn-browser";
import {
  MindLoginCard,
  writeLastIdentity,
  clearLastIdentity,
} from "@mind-studio/core";
import { Button } from "@mind-studio/ui";
import { DEFAULT_ISSUER, session, rememberIssuer } from "@/lib/solid/session";
import { ensureSession, rememberReturnToDefault } from "@/lib/solid/auth";

const APP_NAME = "Photos";
const CLIENT_NAME = "Mind Photos";
const TAGLINE = "Your photos, in your pod.";

/**
 * Start the OIDC redirect. Mirrors drive's ConnectForm: a stable Solid-OIDC
 * `clientId` (our `/api/client-id` document) in production so the IdP
 * recognises the same client across sessions and skips re-consent; dynamic
 * registration on localhost (a containerised dev IdP can't dereference a
 * localhost client id document).
 */
function startLogin({ issuer }: { issuer: string }) {
  const origin = window.location.origin;
  const isLocal = /localhost|127\.0\.0\.1/.test(origin);
  return login({
    oidcIssuer: issuer,
    redirectUrl: new URL("/login/callback", origin).toString(),
    clientName: CLIENT_NAME,
    ...(isLocal
      ? {}
      : { clientId: new URL("/api/client-id", origin).toString() }),
  });
}

export default function ConnectForm() {
  const [webId, setWebId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    ensureSession()
      .then((info) => {
        const id = info.webId ?? null;
        setWebId(id);
        if (id) {
          writeLastIdentity(APP_NAME, {
            webId: id,
            displayName: id.split("/").filter(Boolean).pop(),
          });
        }
      })
      .catch((e) => setError(String(e)));
  }, []);

  async function onLogout() {
    await session().logout();
    clearLastIdentity(APP_NAME);
    setWebId(null);
  }

  if (webId) {
    return (
      <div className="rounded-lg border border-primary/40 bg-primary/5 p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-primary">
          Connected
        </p>
        <p className="mt-2 break-all font-mono text-sm" data-testid="webid">
          {webId}
        </p>
        <div className="mt-4 flex gap-3">
          <Button asChild>
            <a href="/photos">Open My Photos →</a>
          </Button>
          <Button variant="outline" onClick={onLogout}>
            Disconnect
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <MindLoginCard
        appName={APP_NAME}
        tagline={TAGLINE}
        defaultIssuer={DEFAULT_ISSUER}
        onLogin={async ({ issuer }) => {
          rememberIssuer(issuer);
          // Fall back to /photos only if a deep link wasn't already
          // remembered by the signed-out screen the user came from.
          rememberReturnToDefault("/photos");
          await startLogin({ issuer });
        }}
      />
      {error && (
        <p className="mt-4 rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </>
  );
}
