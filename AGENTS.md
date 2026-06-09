# AGENTS.md — photos

Orientation rules for agents working in this prototype. **Read this before
editing any file here.** This is a sibling prototype in the mind workspace —
own app, own port (**:3150**), own data, own docs. Do not unify it with
sibling prototypes (drive, chat, shell, …).

## NOT the Next.js you know

This prototype uses **Next.js 16.2.6** with **React 19.2.4**. APIs have
shifted from training-cutoff knowledge. Before relying on what you "know"
about `app/`, server actions, Turbopack, `cookies()`, etc., read
`node_modules/next/dist/docs/` for the actual current API.

## Hard rules

1. **The pod is the ONLY store.** No DB, no server-side state, no API route
   that persists anything. All pod I/O goes through `@inrupt/solid-client`
   with the session fetch (`src/lib/solid/photos.ts`). Photos live in
   `{podRoot}apps/photos/`, created lazily on first upload.
2. **Single-flight OIDC.** `handleIncomingRedirect` is memoized in
   `src/lib/solid/auth.ts` and called exactly once per page load — never add
   a second call site. The OIDC code is one-time-use; redeeming it twice
   wipes the session.
3. **Never log secrets or tokens.** WebID, route, status are fine.
4. **Authed image fetches.** Pod image URLs 401 in a plain `<img>` — always
   go through `useAuthedImage` (session fetch → object URL, revoked on
   cleanup).

## Solid gotchas (inherited from drive)

- `saveFileInContainer`'s slug is **advisory** — always read the actual URL
  from the response via `getSourceUrl`.
- Always pass `contentType` explicitly — the default is
  `application/octet-stream` and previews break.
- No atomic rename / recursive delete in LDP. CSS v7 defaults to WAC.
- A 404 listing the app container = "not created yet" → empty state.

## Design system

Entirely `@mind-studio/ui` (shadcn-native), default **Mind** brand, **dark**
default. `globals.css` imports `@mind-studio/ui/dist/styles.css` +
`@source`s its dist. Semantic tokens only (`bg-background`,
`text-muted-foreground`, `border`, `bg-primary`, …) — no bespoke palette.
Login uses the shared `MindLoginCard` from `@mind-studio/core`. RSC gotcha:
never import `Card`/`Badge`/`cn` into server components — keep pages
`"use client"` or plain markup + `Button asChild`.

`@mind-studio/ui` + `@mind-studio/core` install from GitHub Packages —
`export NODE_AUTH_TOKEN=<read:packages PAT>` before `npm install`.

## Never commit

`node_modules/`, `.next/`, `.env*`, `.css-data/`, `tsconfig.tsbuildinfo`.
