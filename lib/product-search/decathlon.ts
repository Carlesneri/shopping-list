import type { ProductSuggestion, SearchProvider } from "./types"

/** Decathlon suggestions API: { products: [{ id, name, image: { src } }] }. */
export const decathlonProvider: SearchProvider = {
  url: (query) =>
    `https://www.decathlon.es/api/listing/es-ES/suggestions?query=${query}`,
  parse: (data) => {
    const products = (data as { products?: unknown[] } | null)?.products
    if (!Array.isArray(products)) return []
    const out: ProductSuggestion[] = []
    for (const product of products) {
      if (!product || typeof product !== "object") continue
      const { id, name, image, trackingData } = product as {
        id?: unknown
        name?: unknown
        image?: { src?: unknown }
        trackingData?: { product_url_picture?: unknown }
      }
      if ((typeof id !== "string" && typeof id !== "number") || !id) continue
      if (typeof name !== "string" || !name.trim()) continue
      const images: string[] = []
      if (typeof image?.src === "string" && image.src) images.push(image.src)
      else if (
        typeof trackingData?.product_url_picture === "string" &&
        trackingData.product_url_picture
      ) {
        images.push(trackingData.product_url_picture)
      }
      out.push({ id: String(id), name: name.trim(), images })
    }
    return out
  },
}
