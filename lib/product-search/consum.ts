import type { ProductSuggestion, SearchProvider } from "./types"

/** Consum search: a Drupal views AJAX endpoint that returns JSON commands
 * whose `insert` payloads carry rendered HTML (`tol-product` blocks) with the
 * product image and a title link whose href ends with the product id.
 * Not bot-protected — fetched server-side. */
export const consumProvider: SearchProvider = {
  url: (query) =>
    `https://www.consum.es/views/ajax/?keys=${query}&_wrapper_format=drupal_ajax&view_name=solr_search&view_display_id=page_1&view_args=&view_path=%2Fsolr-search%2Fcontent&view_base_path=solr-search%2Fcontent&view_dom_id=f0e1d2d524a815e20ad7bfb4b800c7673f128eeb0e96cffd947a5eb34ac3fda9&pager_element=0&_drupal_ajax=1`,
  parse: (data) => {
    const commands = Array.isArray(data) ? data : []
    const out: ProductSuggestion[] = []
    for (const command of commands) {
      if (!command || typeof command !== "object") continue
      const { command: name, data: payload } = command as Record<string, unknown>
      if (name !== "insert" || typeof payload !== "string") continue
      if (!payload.includes('class="tol-product"')) continue
      parseHtml(payload, out)
    }
    return out
  },
}

function parseHtml(html: string, out: ProductSuggestion[]) {
  for (const block of html.split('class="tol-product"').slice(1)) {
    const img = block.match(/<img[^>]+src="([^"]+)"/)?.[1] ?? ""
    const anchor = block.match(/<a href="([^"]+)"[^>]*>([^<]+)<\/a>/)
    if (!anchor) continue
    const [, href, title] = anchor
    const id = href.match(/(\d+)\/?\s*$/)?.[1] ?? href
    const name = decodeEntities(title)
    if (!name) continue
    out.push({
      id,
      name,
      images: img.startsWith("http") ? [img] : [],
    })
  }
}

function decodeEntities(text: string) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}
