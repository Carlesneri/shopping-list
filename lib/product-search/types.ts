/** A product resolved by a market's search implementation. Every
 * implementation must fill all three fields: name, id and images. */
export interface ProductSuggestion {
  /** Stable product identifier in the market's catalog. */
  id: string
  /** Human product name. */
  name: string
  /** Absolute image URLs; may be empty. */
  images: string[]
}

/** One market implementation: how to build the search URL and how to parse
 * the provider-specific response into ProductSuggestion[]. */
export interface SearchProvider {
  url: (query: string) => string
  parse: (data: unknown) => ProductSuggestion[]
  /** Where the request must run. "server" (default): the action fetches
   * server-side. "client": the API is bot-protected against server traffic
   * (Cloudflare/DataDome) but reachable from a real browser — the fetch runs
   * client-side, without credentials (the mirror answers with a wildcard
   * `Access-Control-Allow-Origin`, incompatible with credentialed requests). */
  side?: "client" | "server"
}
