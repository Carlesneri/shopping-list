import { describe, it, expect } from "vitest"
import robots from "../robots"
import sitemap from "../sitemap"
import manifest from "../manifest"

describe("robots", () => {
  it("allows the landing and disallows private routes", () => {
    const result = robots()
    const rules = Array.isArray(result.rules) ? result.rules[0] : result.rules
    expect(rules?.allow).toBe("/")
    expect(rules?.disallow).toEqual(
      expect.arrayContaining(["/compras/", "/api/"]),
    )
  })

  it("points to the sitemap", () => {
    const result = robots()
    expect(String(result.sitemap)).toMatch(/\/sitemap\.xml$/)
  })
})

describe("sitemap", () => {
  it("includes the public landing page", () => {
    const entries = sitemap()
    expect(entries.some((e) => /\/$/.test(e.url))).toBe(true)
  })
})

describe("manifest", () => {
  it("describes the COMPALE app", () => {
    const result = manifest()
    expect(result.short_name).toBe("COMPALE")
    expect(result.name).toMatch(/COMPALE/)
    expect(result.display).toBe("standalone")
    expect(result.theme_color).toBe("#58cc02")
    expect(result.background_color).toBe("#ffffff")
    expect(result.lang).toBe("es")
  })

  it("references square PWA icons named by size", () => {
    const sizes = (manifest().icons ?? []).map((i) => i.sizes)
    expect(sizes).toEqual(expect.arrayContaining(["192x192", "512x512"]))
  })
})
