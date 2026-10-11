import type { ProductSuggestion, SearchProvider } from "./types"

/** Collects image URLs from one Mercadona product: `photos[]` entries carry
 * `thumbnail`/`regular`/`zoom` variants, plus a flat `thumbnail` field. */
function collectImages(product: Record<string, unknown>): string[] {
  const images: string[] = []
  const photos = product.photos
  if (Array.isArray(photos)) {
    for (const photo of photos) {
      if (!photo || typeof photo !== "object") continue
      const { thumbnail, regular, zoom } = photo as {
        thumbnail?: unknown
        regular?: unknown
        zoom?: unknown
      }
      const url =
        (typeof thumbnail === "string" && thumbnail) ||
        (typeof regular === "string" && regular) ||
        (typeof zoom === "string" && zoom) ||
        ""
      if (url) images.push(url)
    }
  }
  if (typeof product.thumbnail === "string" && product.thumbnail) {
    images.push(product.thumbnail)
  }
  return [...new Set(images)]
}

function pushProduct(product: unknown, out: ProductSuggestion[]) {
  if (!product || typeof product !== "object") return
  const { id, objectID, display_name, name } = product as Record<string, unknown>
  const resolvedId = id ?? objectID
  if (
    (typeof resolvedId !== "string" && typeof resolvedId !== "number") ||
    !resolvedId
  ) {
    return
  }
  // display_name is the Spanish storefront name; fall back to name.
  const resolvedName =
    (typeof display_name === "string" && display_name) ||
    (typeof name === "string" && name) ||
    ""
  if (!resolvedName.trim()) return
  out.push({
    id: String(resolvedId),
    name: resolvedName.trim(),
    images: collectImages(product as Record<string, unknown>),
  })
}

/** Mercadona search (the tornillos mirror serves the tienda.mercadona.es
 * shape): { hits: [{ id, display_name, thumbnail, photos }] } — an older
 * flat/category-grouped product array is tolerated too.
 *
 * Cloudflare challenges every server-side request (403), so the fetch must
 * run in the visitor's browser. */
export const mercadonaProvider: SearchProvider = {
  url: (query) =>
    `https://tornillos.mercadona.es/search?q=${query}&lang=es&hitsPerPage=10`,
  side: "client",
  parse: (data) => {
    const items = Array.isArray(data)
      ? data
      : Array.isArray((data as { hits?: unknown[] } | null)?.hits)
        ? (data as { hits: unknown[] }).hits
        : []
    const out: ProductSuggestion[] = []
    for (const item of items) {
      if (!item || typeof item !== "object") continue
      const obj = item as Record<string, unknown>
      if (Array.isArray(obj.products)) {
        for (const product of obj.products) {
          pushProduct(product as Record<string, unknown>, out)
        }
      } else {
        pushProduct(obj, out)
      }
    }
    return out
  },
}
