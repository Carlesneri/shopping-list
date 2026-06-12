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
import { normalizeProductName, addProductToList } from "../actions/products"

function makeDB({
  isMember = true,
  productExists = false,
}: { isMember?: boolean; productExists?: boolean } = {}) {
  const listUpdate = vi.fn().mockResolvedValue(undefined)
  const productUpdate = vi.fn().mockResolvedValue(undefined)
  const productAdd = vi.fn().mockResolvedValue({ id: "new-product-id" })

  const listGet = vi.fn().mockResolvedValue({
    exists: true,
    data: () => ({
      memberEmails: isMember ? ["user@test.com"] : ["other@test.com"],
    }),
  })

  const productQueryGet = vi.fn().mockResolvedValue(
    productExists
      ? { empty: false, docs: [{ id: "existing-id", ref: { update: productUpdate } }] }
      : { empty: true, docs: [] },
  )

  const db = {
    collection: vi.fn().mockImplementation((col: string) => {
      if (col === "lists") {
        return { doc: vi.fn().mockReturnValue({ get: listGet, update: listUpdate }) }
      }
      return {
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({ get: productQueryGet }),
        }),
        add: productAdd,
      }
    }),
  }

  return { db, listUpdate, productUpdate, productAdd }
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

  it("throws when caller is not a list member", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { email: "user@test.com" } } as any)
    const { db } = makeDB({ isMember: false })
    vi.mocked(getDB).mockReturnValue(db as any)
    await expect(addProductToList("list1", "leche", 1)).rejects.toThrow("Sin acceso")
  })

  it("creates a new product when name does not exist", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { email: "user@test.com" } } as any)
    const { db, productAdd, listUpdate } = makeDB({ productExists: false })
    vi.mocked(getDB).mockReturnValue(db as any)

    await addProductToList("list1", "  LECHE  ", 2)

    expect(productAdd).toHaveBeenCalledWith({ name: "leche", timesSelected: 1 })
    expect(listUpdate).toHaveBeenCalledWith({
      products: expect.objectContaining({ _arrayUnion: [expect.objectContaining({ name: "leche", quantity: 2 })] }),
      updatedAt: expect.objectContaining({ _serverTimestamp: true }),
    })
  })

  it("increments timesSelected when product already exists", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { email: "user@test.com" } } as any)
    const { db, productUpdate, productAdd, listUpdate } = makeDB({ productExists: true })
    vi.mocked(getDB).mockReturnValue(db as any)

    await addProductToList("list1", "leche", 1)

    expect(productAdd).not.toHaveBeenCalled()
    expect(productUpdate).toHaveBeenCalledWith({ timesSelected: expect.objectContaining({ _increment: 1 }) })
    expect(listUpdate).toHaveBeenCalledWith({
      products: expect.objectContaining({
        _arrayUnion: [expect.objectContaining({ productId: "existing-id", name: "leche", quantity: 1 })],
      }),
      updatedAt: expect.objectContaining({ _serverTimestamp: true }),
    })
  })
})
