import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/auth", () => ({ auth: vi.fn() }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/firebase-admin", () => ({ getDB: vi.fn() }))
vi.mock("firebase-admin/firestore", () => ({
  FieldValue: {
    increment: vi.fn((n: number) => ({ _increment: n })),
    arrayUnion: vi.fn((...args: unknown[]) => ({ _arrayUnion: args })),
    serverTimestamp: vi.fn(() => ({ _serverTimestamp: true })),
  },
}))

import { auth } from "@/auth"
import { getDB } from "@/lib/firebase-admin"
import { normalizeProductName } from "@/lib"
import { addProductToList } from "../actions/products"

function makeDB({ isMember = true }: { isMember?: boolean } = {}) {
  const listUpdate = vi.fn().mockResolvedValue(undefined)
  const productSet = vi.fn().mockResolvedValue(undefined)

  const listGet = vi.fn().mockResolvedValue({
    exists: true,
    data: () => ({
      memberEmails: isMember ? ["user@test.com"] : ["other@test.com"],
    }),
  })

  const db = {
    collection: vi.fn().mockImplementation((col: string) => {
      if (col === "lists") {
        return { doc: vi.fn().mockReturnValue({ get: listGet, update: listUpdate }) }
      }
      return {
        doc: vi.fn().mockReturnValue({ id: "leche", set: productSet }),
      }
    }),
  }

  return { db, listUpdate, productSet }
}

describe("normalizeProductName", () => {
  it("trims whitespace and lowercases", () => {
    expect(normalizeProductName("  LECHE  ")).toBe("leche")
  })
  it("returns empty string for blank input", () => {
    expect(normalizeProductName("   ")).toBe("")
  })
})

describe("addProductToList", () => {
  beforeEach(() => { vi.clearAllMocks() })

  it("throws when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any)
    await expect(addProductToList("list1", "leche", 1)).rejects.toThrow("No autenticado")
  })

  it("throws when name is blank", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { email: "user@test.com" } } as any)
    await expect(addProductToList("list1", "   ", 1)).rejects.toThrow("El nombre no puede estar vacío")
  })

  it("throws when quantity is invalid", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { email: "user@test.com" } } as any)
    await expect(addProductToList("list1", "leche", 0)).rejects.toThrow("Cantidad inválida")
  })

  it("throws when caller is not a list member", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { email: "user@test.com" } } as any)
    const { db } = makeDB({ isMember: false })
    vi.mocked(getDB).mockReturnValue(db as any)
    await expect(addProductToList("list1", "leche", 1)).rejects.toThrow("Sin acceso")
  })

  it("uses set+merge on products doc with normalized name as id", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { email: "user@test.com" } } as any)
    const { db, productSet } = makeDB()
    vi.mocked(getDB).mockReturnValue(db as any)

    await addProductToList("list1", "  LECHE  ", 2)

    expect(productSet).toHaveBeenCalledWith(
      { name: "leche", timesSelected: expect.objectContaining({ _increment: 1 }) },
      { merge: true },
    )
  })

  it("appends list product with normalized name as productId", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { email: "user@test.com" } } as any)
    const { db, listUpdate } = makeDB()
    vi.mocked(getDB).mockReturnValue(db as any)

    await addProductToList("list1", "leche", 3)

    expect(listUpdate).toHaveBeenCalledWith({
      products: expect.objectContaining({
        _arrayUnion: [expect.objectContaining({ productId: "leche", name: "leche", quantity: 3 })],
      }),
      updatedAt: expect.objectContaining({ _serverTimestamp: true }),
    })
  })
})
