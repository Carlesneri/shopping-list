/** Product search URL builders per market. The query arrives already
 * URL-encoded. Markets without an entry have no online catalog. */
const PRODUCT_SEARCH_URLS: Record<string, (query: string) => string> = {
  mercadona: (query) => `https://tornillos.mercadona.es/search?q=${query}`,
  decathlon: (query) =>
    `https://www.decathlon.es/api/listing/es-ES/suggestions?query=${query}`,
}

/** Returns the product search URL for a market, or undefined when the market
 * has no known catalog. Match is case-insensitive. */
export function productSearchUrl(searchText: string, market: string) {
  const build = PRODUCT_SEARCH_URLS[market.trim().toLowerCase()]
  if (!build) return undefined
  return build(encodeURIComponent(searchText.trim()))
}
