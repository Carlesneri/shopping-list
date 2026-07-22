# SEO & Open Graph for COMPALE — Design

**Date:** 2026-06-15
**Status:** Approved (design)

## Context

COMPALE is a Spanish-language collaborative shopping-list app built on Next.js 16
(App Router), React 19. Only the landing page (`/`) is public — every route under
`/lists/*` is behind a Google auth gate ([app/lists/layout.tsx](../../../app/lists/layout.tsx)
redirects to `/` when there is no session).

Current SEO surface is minimal: the root layout exports only `title` and
`description`. There is no `metadataBase`, no Open Graph, no Twitter card, no
robots/sitemap/manifest, and the private pages are not marked `noindex`.

## Goals

- Rich, correct metadata on the public landing page and app shell.
- Open Graph + Twitter card so shared links render a card with the COMPALE image.
- Keep auth-gated `/lists/*` content out of search engines.
- Provide robots.txt, sitemap, and a web manifest (PWA basics).

## Non-goals

- Generating new image assets (square PWA icons, dynamic OG image). See limitation.
- Per-list dynamic metadata — those pages are private and `noindex`.
- Any new dependencies. Uses Next.js native metadata APIs only.

## Decisions (from brainstorming)

- **metadataBase source:** `process.env.NEXT_PUBLIC_APP_URL` (falls back to
  `http://localhost:3000` in dev). No hardcoded production domain.
- **OG image:** reuse existing `public/compale.png` (677×369). Below the ideal
  1200×630 but acceptable; no new asset generated.
- **Scope:** full polish — metadata + OG/Twitter, title template, noindex on
  private pages, robots.txt, sitemap, web manifest.

## Design

### 1. Root layout metadata — `app/layout.tsx`

Expand the existing `metadata` export and add a `viewport` export:

- `metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000")`
- `title: { default: "COMPALE — Tu app colaborativa", template: "%s · COMPALE" }`
- `applicationName: "COMPALE"`, richer `description`, `keywords`.
- `openGraph`: `type: "website"`, `locale: "es_ES"`, `siteName: "COMPALE"`,
  `url: "/"`, title/description, `images: [{ url: "/compale.png", width: 677,
  height: 369, alt: "COMPALE — lista de la compra colaborativa" }]`.
- `twitter`: `card: "summary_large_image"`, title/description, same image.
- `robots: { index: true, follow: true }` (public default).
- `manifest: "/manifest.webmanifest"`.
- `viewport` export with `themeColor: "#58cc02"` (brand primary from
  `globals.css`). Next.js 16 requires `themeColor` in `viewport`, not `metadata`.
- `app/icon.png` stays as-is (auto-detected favicon).

### 2. Private pages → noindex — `app/lists/layout.tsx`

Add a `metadata` export: `robots: { index: false, follow: false }`. Nested-layout
metadata merge applies it to all `/lists/*` routes (`[id]`, `[id]/settings`,
`new`). The file keeps its existing auth-redirect behavior.

### 3. File-convention routes

- `app/robots.ts` — `rules: { userAgent: "*", allow: "/", disallow: ["/lists/", "/api/"] }`,
  `sitemap: "<base>/sitemap.xml"` using `NEXT_PUBLIC_APP_URL`.
- `app/sitemap.ts` — single entry for `/` (the public landing).
- `app/manifest.ts` — `name: "COMPALE — Tu app colaborativa"`,
  `short_name: "COMPALE"`, `description`, `start_url: "/"`, `display: "standalone"`,
  `lang: "es"`, `background_color: "#ffffff"`, `theme_color: "#58cc02"`,
  `icons` referencing square PWA icons named by size: `/icon-192.png` (192×192)
  and `/icon-512.png` (512×512). User will create these image assets.

### 4. Testing

`robots.ts`, `sitemap.ts`, and `manifest.ts` are pure functions. Add one vitest
spec (e.g. `app/__tests__/seo.test.ts` or alongside) asserting:

- robots disallows `/lists/` and `/api/`, allows `/`, and sets a sitemap URL.
- sitemap includes the `/` landing URL.
- manifest has `name`/`short_name` "COMPALE", `theme_color` `#58cc02`,
  `display: "standalone"`.

Static `metadata`/`viewport` objects in layouts are config, not logic, and are
not meaningfully unit-testable — no fabricated coverage there.

## Image assets

The manifest references square PWA icons `public/icon-192.png` (192×192) and
`public/icon-512.png` (512×512), named by size. The user will create these
assets; this change references them by path and does not generate them.

## Files touched

- `app/layout.tsx` (edit)
- `app/lists/layout.tsx` (edit)
- `app/robots.ts` (new)
- `app/sitemap.ts` (new)
- `app/manifest.ts` (new)
- SEO test spec (new)
