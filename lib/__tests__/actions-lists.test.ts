import { describe, it, expect, vi } from "vitest"

vi.mock("@/auth", () => ({ auth: vi.fn() }))
vi.mock("next/navigation", () => ({ redirect: vi.fn() }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/firebase-admin", () => ({ getAdminApp: vi.fn() }))
vi.mock("firebase-admin/firestore", () => ({
  getFirestore: vi.fn(),
  FieldValue: {
    serverTimestamp: vi.fn(),
    arrayUnion: vi.fn(),
    arrayRemove: vi.fn(),
  },
}))

import { validateListInput } from "../actions/lists"

describe("validateListInput", () => {
  it("returns trimmed values for valid input", () => {
    expect(validateListInput("  Pan  ", "  Mercadona  ")).toEqual({
      title: "Pan",
      market: "Mercadona",
    })
  })
  it("throws when title is empty", () => {
    expect(() => validateListInput("", "Mercadona")).toThrow("El título es requerido")
  })
  it("throws when market is empty", () => {
    expect(() => validateListInput("Pan", "   ")).toThrow("El mercado es requerido")
  })
})
