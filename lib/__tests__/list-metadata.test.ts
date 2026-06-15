import { describe, it, expect } from "vitest"
import { buildListMetadata } from "../list-metadata"

describe("buildListMetadata", () => {
  it("uses the list title", () => {
    const meta = buildListMetadata({
      title: "Cena del viernes",
      market: "Mercadona",
      products: [],
    })
    expect(meta.title).toBe("Cena del viernes")
  })

  it("describes a collaborative list in the given market", () => {
    const meta = buildListMetadata({
      title: "Compra",
      market: "Carrefour",
      products: [],
    })
    expect(meta.description).toBe("Lista de la compra colaborativa en Carrefour")
  })
})
