import type { ProductSuggestion, SearchProvider } from "./types"

/** Carrefour search (Empathy-backed `search-api`): products live in
 * `content.docs[]` with `product_id`, `display_name` and `image_path`. */
export const carrefourProvider: SearchProvider = {
  url: (query) =>
    `https://www.carrefour.es/search-api/query/v1/search?internal=true&query=${query}&instance=x-carrefour&env=https%3A%2F%2Fwww.carrefour.es&scope=desktop&lang=es&session=empathy&citrusCatalog=home&baseUrlCitrus=https%3A%2F%2Fwww.carrefour.es&enabled=true&siteKey=wFOzqveg&empathypoc=false&start=0&rows=10&agroup=true`,
  side: "client",
  // The clearance cookie (obtained by having browsed carrefour.es) is needed
  // for the request to pass; the API must echo the request origin for a
  // credentialed cross-origin call to work.
  credentials: true,
  parse: (data) => {
    if (!data || typeof data !== "object") return []
    const obj = data as Record<string, unknown>
    // content.docs is the real shape; other arrays are tolerated as fallbacks.
    const content =
      obj.content && typeof obj.content === "object"
        ? (obj.content as Record<string, unknown>)
        : null
    const results =
      [content?.docs, obj.content, obj.documents, obj.products, obj.hits].find(
        (candidate) => Array.isArray(candidate),
      ) ?? []
    const out: ProductSuggestion[] = []
    for (const item of results as unknown[]) {
      if (!item || typeof item !== "object") continue
      const doc = item as Record<string, unknown>
      const rawId = doc.product_id ?? doc.id ?? doc.catalog_ref_id
      if ((typeof rawId !== "string" && typeof rawId !== "number") || !rawId) {
        continue
      }
      const rawName =
        (typeof doc.display_name === "string" && doc.display_name) ||
        (typeof doc.name === "string" && doc.name) ||
        ""
      if (!rawName.trim()) continue
      const images: string[] = []
      if (typeof doc.image_path === "string" && doc.image_path) {
        images.push(doc.image_path)
      }
      out.push({
        id: String(rawId),
        name: rawName.trim(),
        images: [...new Set(images)],
      })
    }
    return out
  },
}
