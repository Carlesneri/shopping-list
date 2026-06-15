import type { ShoppingList } from "./types"

type ListMetadataInput = Pick<ShoppingList, "title" | "market" | "products">

/**
 * Builds an accurate Open Graph title and description for a shopping list,
 * used by link-preview unfurls when a list URL is shared.
 */
export function buildListMetadata({ title, market }: ListMetadataInput): {
  title: string
  description: string
} {
  return {
    title,
    description: `Lista de la compra colaborativa en ${market}`,
  }
}
