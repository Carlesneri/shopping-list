import { describe, it, expect, vi, beforeEach, type Mock } from "vitest"

vi.mock("@/auth", () => ({ auth: vi.fn() }))
vi.mock("@/lib/firebase-admin", () => ({ getAdminApp: vi.fn(() => ({})) }))
vi.mock("firebase-admin/auth", () => ({
  getAuth: vi.fn(() => ({
    createCustomToken: vi.fn(() => Promise.resolve("mock-token")),
  })),
}))

import { auth } from "@/auth"
import { getFirebaseToken } from "../actions/auth"

// next-auth types `auth` as a Next middleware in recent versions, which is
// not assignable to mockResolvedValue; cast to a plain mock instead.
const authMock = auth as unknown as Mock

describe("getFirebaseToken", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns null when no session", async () => {
    authMock.mockResolvedValue(null)
    const result = await getFirebaseToken()
    expect(result).toBeNull()
  })

  it("returns token when session has email", async () => {
    authMock.mockResolvedValue({
      user: { email: "test@example.com", name: "Test", image: null },
      expires: "",
    })
    const result = await getFirebaseToken()
    expect(result).toBe("mock-token")
  })
})
