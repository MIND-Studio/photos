"use client";

import {
  handleIncomingRedirect,
  type ISessionInfo,
} from "@inrupt/solid-client-authn-browser";
import { session } from "./session";

const RETURN_TO_KEY = "mind-photos:return-to";

/**
 * The URL users should land on after the OIDC dance — set right before
 * triggering login(), read by /login/callback once the code is consumed.
 *
 * We deliberately do NOT use `restorePreviousSession: true` anywhere. In the
 * @inrupt browser SDK that flag is not a token-based silent restore — it is a
 * full-page redirect to the IdP. On CSS, calling it on every page load creates
 * an infinite /login/callback ↔ /photos loop (verified in drive), and even in
 * the happy path it round-trips through the IdP and discards the deep link.
 * The price is that a hard refresh lands on the signed-out prompt; we soften
 * that by remembering the attempted path so reconnecting returns there.
 */
export function rememberReturnTo(url: string) {
  if (typeof window === "undefined") return;
  if (url.startsWith("/login/callback") || url.startsWith("/connect")) return;
  try {
    sessionStorage.setItem(RETURN_TO_KEY, url);
  } catch {}
}

/**
 * Set the post-login destination ONLY if one isn't already remembered, so a
 * deep link recorded by a signed-out screen isn't clobbered by /connect.
 */
export function rememberReturnToDefault(url: string) {
  if (typeof window === "undefined") return;
  try {
    if (!sessionStorage.getItem(RETURN_TO_KEY)) rememberReturnTo(url);
  } catch {}
}

/**
 * Called by signed-out screens on mount to capture where the user was trying
 * to go, so a subsequent "Connect a pod" → login returns them there.
 */
export function rememberSignedOutPath() {
  if (typeof window === "undefined") return;
  rememberReturnTo(window.location.pathname + window.location.search);
}

export function consumeReturnTo(): string {
  if (typeof window === "undefined") return "/photos";
  try {
    const v = sessionStorage.getItem(RETURN_TO_KEY);
    sessionStorage.removeItem(RETURN_TO_KEY);
    if (v && v.startsWith("/") && !v.startsWith("//")) return v;
  } catch {}
  return "/photos";
}

/**
 * Single-flight wrapper around `handleIncomingRedirect`. The OIDC
 * authorization code is one-time-use: redeeming it twice makes the token
 * endpoint return `invalid_grant`, which resets the @inrupt session back to
 * signed-out. The app mounts several session-aware components at once (header
 * chip + page), so memoizing the call to a module-level promise guarantees
 * the redirect is handled exactly once per page load no matter how many
 * components ask for the session.
 *
 * HARD RULE: this is the ONLY call site of `handleIncomingRedirect` in the
 * codebase. Never add a second one.
 */
let redirectHandled: Promise<void> | null = null;

function handleRedirectOnce(): Promise<void> {
  if (!redirectHandled) {
    redirectHandled = handleIncomingRedirect({
      url: typeof window !== "undefined" ? window.location.href : undefined,
    })
      .then(() => undefined)
      // Swallow: a stale/replayed code rejects here, but the first (winning)
      // call already established the session. Callers re-read session().info.
      .catch(() => undefined);
  }
  return redirectHandled;
}

/**
 * Idempotent session check on page load. Consumes an OIDC code if the URL has
 * one (from a fresh redirect), but does NOT trigger silent re-auth. Returns
 * the current session info — caller is responsible for handling signed-out.
 */
export async function ensureSession(): Promise<ISessionInfo> {
  const s = session();
  if (s.info.isLoggedIn) return s.info;
  await handleRedirectOnce();
  return session().info;
}

/**
 * Completes the OIDC redirect on the /login/callback route. Shares the same
 * single-flight redemption as `ensureSession`, so the callback page and any
 * concurrently-mounted component (e.g. the header chip) never redeem the
 * code twice. Returns the session info so the caller can route accordingly.
 */
export async function completeLoginRedirect(): Promise<ISessionInfo> {
  await handleRedirectOnce();
  return session().info;
}
