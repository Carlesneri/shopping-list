# Share buttons for lists — Design

**Date:** 2026-06-15
**Status:** Approved (design)

## Context

COMPALE lists live at `/lists/{id}` and are gated by membership (`memberEmails`).
A list URL only *opens* for an existing member; non-members are redirected to `/`.
The earlier SEO work added an accurate Open Graph unfurl for `/lists/{id}`.

The user wants a share button in three places: the list list (home grid), the
list detail page, and the list settings page.

## Decisions (from brainstorming)

- **Mechanism:** Web Share API (`navigator.share`) with clipboard-copy fallback.
- **Access:** share the existing URL only — no invite tokens, no backend changes.
  Recipient must already be a member to open it.
- **Payload:** the URL only (the OG unfurl supplies the title/description preview).
- **UI:** icon-only buttons in all three locations, reusing the existing
  `FabButton` style.

## Design

### 1. Share logic — `lib/share.ts` (pure, testable)

```ts
shareUrl(url: string, nav: ShareNav): Promise<"shared" | "copied" | "cancelled">
```

- `ShareNav` injects the navigator capabilities (`share?`, `clipboard`) so the
  function is unit-testable without touching globals.
- If `nav.share` exists: `await nav.share({ url })` → `"shared"`. If it throws an
  `AbortError` (user dismissed the sheet) → `"cancelled"`.
- Otherwise: `await nav.clipboard.writeText(url)` → `"copied"`.

### 2. Component — `components/ui/ShareButton.tsx` (client)

- Props: `path: string` (e.g. `/lists/abc`), optional `color` and `size`
  (defaults chosen per context).
- Builds the absolute URL as `window.location.origin + path`.
- `onClick`: `e.preventDefault()` + `e.stopPropagation()` (so it works inside
  `ListCard`'s `<Link>`), then `shareUrl(url, navigator)`. Toasts:
  `"copied"` → "Enlace copiado"; thrown error → "No se pudo compartir";
  `"shared"`/`"cancelled"` → silent.
- Renders `FabButton` with `IconShare`, `aria-label="Compartir lista"`.

### 3. Placements

- **List list** — `components/lists/ListCard.tsx`: small share button in the
  card's top-right corner. preventDefault/stopPropagation preserves card nav.
- **List detail** — `components/lists/ListDetail.tsx` header row, beside the
  settings button. Visible to all members (not gated by the owner/admin
  `canShare` check used for settings).
- **Settings** — `app/lists/[id]/settings/page.tsx` title row, beside the
  "Ajustes …" heading.

### 4. Testing

TDD `lib/share.ts` with injected fakes: shares when `share` is available, copies
when it is not, returns `"cancelled"` on `AbortError`. The `ShareButton`
component is thin glue (toast + FabButton) and is not separately unit-tested,
consistent with the SEO config work.

## Files touched

- `lib/share.ts` (new)
- `lib/__tests__/share.test.ts` (new)
- `components/ui/ShareButton.tsx` (new)
- `components/lists/ListCard.tsx` (edit)
- `components/lists/ListDetail.tsx` (edit)
- `app/lists/[id]/settings/page.tsx` (edit)
