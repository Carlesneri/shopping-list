import { searchProductSuggestions } from "@/lib/actions/products"
import type { ProductSuggestion } from "./types"
import { providerFor, suggestionSignal } from "./index"

/** Client-side suggestion fetch. Routes each market to where its API is
 * reachable: bot-protected providers (Mercadona's mirror) are fetched
 * directly from the browser with the visitor's clearance cookies; the rest
 * go through the searchProductSuggestions server action. Best-effort — any
 * failure yields an empty list and is logged. */
export async function fetchProductSuggestions(
  searchText: string,
  market: string,
  signal?: AbortSignal,
): Promise<ProductSuggestion[]> {
  const provider = providerFor(market)
  if (!provider) return []

  const query = encodeURIComponent(searchText.trim())

  if (provider.side === "client") {
    try {
      // No credentials: the mirror answers with `Access-Control-Allow-Origin:
      // *`, which the browser rejects for credentialed requests ("wildcard
      // origin not allowed"). Without cookies the fetch still passes — the
      // browser's own fingerprint satisfies the bot check.
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
      // AbortError is the caller's own cancellation (debounce restart) — not
      // a failure; swallow it quietly.
      if (
        signal?.aborted ||
        (error instanceof Error && error.name === "AbortError")
      ) {
        return []
      }
      console.error(`[product-search:${market}] failed`, error)
      return []
    }
  }

  try {
    return await searchProductSuggestions(searchText, market)
  } catch (error) {
    console.error(`[product-search:${market}] failed`, error)
    return []
  }
}
