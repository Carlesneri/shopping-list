import type { SearchProvider } from "./types"
import { carrefourProvider } from "./carrefour"
import { consumProvider } from "./consum"
import { decathlonProvider } from "./decathlon"
import { mercadonaProvider } from "./mercadona"

/** Suggestions are best-effort: a hanging endpoint must never stall the UI. */
const SUGGESTION_TIMEOUT_MS = 8_000

/** Combines the caller's signal with a hard timeout for the request. */
export function suggestionSignal(signal?: AbortSignal) {
  return AbortSignal.any([
    AbortSignal.timeout(SUGGESTION_TIMEOUT_MS),
    ...(signal ? [signal] : []),
  ])
}

/** Market implementations. Each provider resolves product name, id and
 * images for its market's search API. */
const PRODUCT_SEARCH: Record<string, SearchProvider> = {
  mercadona: mercadonaProvider,
  decathlon: decathlonProvider,
  carrefour: carrefourProvider,
  consum: consumProvider,
}

/** Returns the provider implementation for a market, or undefined when the
 * market has no known catalog. Match is case-insensitive. */
export function providerFor(market: string) {
  return PRODUCT_SEARCH[market.trim().toLowerCase()]
}

/** Returns the product search URL for a market, or undefined when the market
 * has no known catalog. Match is case-insensitive. */
export function productSearchUrl(searchText: string, market: string) {
  const provider = providerFor(market)
  if (!provider) return undefined
  return provider.url(encodeURIComponent(searchText.trim()))
}

/** Fetches product suggestions straight from the market's API. Server-side
 * only: market CDNs do not send CORS headers, so browsers can't call these.
 * The client goes through the searchProductSuggestions server action
 * instead. */
export async function fetchMarketSuggestions(
  searchText: string,
  market: string,
  signal?: AbortSignal,
) {
  const provider = PRODUCT_SEARCH[market.trim().toLowerCase()]
  if (!provider || provider.enabled === false) return []

  const query = encodeURIComponent(searchText.trim())
  try {
    const response = await fetch(provider.url(query), {
      signal: suggestionSignal(signal),
    })
    if (!response.ok) {
      console.error(
        `[product-search:${market}] ${response.status}`,
        (await response.text()).slice(0, 200),
      )
      return []
    }
    const data: unknown = await response.json()
    return provider.parse(data).slice(0, 10)
  } catch (error) {
    console.error(`[product-search:${market}] failed`, error)
    return []
  }
}

export type { ProductSuggestion } from "./types"
