# Mind Photos

**Your photos, in your pod.** A privacy-first photo gallery built on Solid
Pods — a sibling prototype in the mind workspace. Every image lives in
`{podRoot}apps/photos/` in *your* pod; no central server ever sees your
pictures.

## What it does

- Responsive thumbnail grid of every `image/*` file in your pod's
  `apps/photos/` container.
- Multi-file upload (per-file progress), fullscreen lightbox with prev/next,
  keyboard navigation (←/→/Esc), and confirmed delete.
- Images are fetched with the authenticated session and rendered via object
  URLs — pod resources 401 in a plain `<img>`.

## Run it

```bash
export NODE_AUTH_TOKEN=<read:packages PAT>   # @mind-studio packages (GitHub Packages)
npm install
npm run dev        # http://localhost:3150
```

| Port | What |
| ---- | ---- |
| 3150 | Next.js dev server |

## Configuration

| Env var | Default | Purpose |
| ------- | ------- | ------- |
| `NEXT_PUBLIC_SOLID_ISSUER` | `https://pods.mindpods.org/` | The Solid OIDC issuer the login card targets |

## Architecture notes

- **The pod is the only store.** No API routes persist anything; all reads
  and writes go through `@inrupt/solid-client` with the session's fetch.
- The `apps/photos/` container is created lazily on first upload; a 404 on
  first list is the empty state, not an error.
- OIDC redirect handling is single-flight (`src/lib/solid/auth.ts`) — the
  authorization code is one-time-use.
