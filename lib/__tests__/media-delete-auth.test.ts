import { beforeEach, describe, expect, it, vi } from "vitest"

const sendMock = vi.fn()

const state = vi.hoisted(() => ({
  sessionEmail: "admin@example.com" as string | null,
  allowedUsers: [
    { email: "owner@example.com", role: "owner" },
    { email: "admin@example.com", role: "admin" },
    { email: "member@example.com", role: "member" },
  ],
}))

vi.mock("@/auth", () => ({
  auth: vi.fn(async () =>
    state.sessionEmail
      ? { user: { email: state.sessionEmail } }
      : null,
  ),
}))

vi.mock("@/lib/crypto", () => ({
  decryptSecret: vi.fn(() => "super-secret"),
}))

vi.mock("@/lib/firebase-admin", () => ({
  getDB: vi.fn(() => ({
    collection: () => ({
      doc: () => ({
        get: async () => ({
          exists: true,
          data: () => ({
            allowedUsers: state.allowedUsers,
            memberEmails: state.allowedUsers.map((u) => u.email),
            config: {
              accountId: "account-123",
              accessKeyId: "access-key",
              bucket: "mi-bucket",
              secretEnc: "iv:tag:secret",
              S3APIendpoint: "https://account-123.r2.cloudflarestorage.com",
            },
          }),
          ref: { update: vi.fn(), delete: vi.fn() },
        }),
      }),
    }),
  })),
}))

vi.mock("next/navigation", () => ({
  redirect: vi.fn(),
}))

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}))

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: vi.fn().mockImplementation(() => ({ send: sendMock })),
  ListObjectsV2Command: vi.fn().mockImplementation((input) => input),
  GetObjectCommand: vi.fn().mockImplementation((input) => input),
  DeleteObjectCommand: vi.fn().mockImplementation((input) => input),
}))

import { deleteMediaEntry, deleteMediaFolder } from "../actions/media"

const MEDIA_ID = "media-1"

describe("media storage delete authorization", () => {
  beforeEach(() => {
    sendMock.mockReset()
    sendMock.mockResolvedValue({})
    state.sessionEmail = "admin@example.com"
    state.allowedUsers = [
      { email: "owner@example.com", role: "owner" },
      { email: "admin@example.com", role: "admin" },
      { email: "member@example.com", role: "member" },
    ]
  })

  describe("deleteMediaEntry", () => {
    it("allows an admin to delete a file", async () => {
      state.sessionEmail = "admin@example.com"

      await deleteMediaEntry(MEDIA_ID, "videos/clip.mp4")

      expect(sendMock).toHaveBeenCalledWith(
        expect.objectContaining({ Key: "videos/clip.mp4" }),
      )
    })

    it("rejects a member with a permissions error", async () => {
      state.sessionEmail = "member@example.com"

      await expect(deleteMediaEntry(MEDIA_ID, "videos/clip.mp4")).rejects.toThrow(
        "Sin permisos",
      )
      expect(sendMock).not.toHaveBeenCalled()
    })

    it("rejects an unauthenticated caller", async () => {
      state.sessionEmail = null

      await expect(deleteMediaEntry(MEDIA_ID, "videos/clip.mp4")).rejects.toThrow(
        "No autenticado",
      )
      expect(sendMock).not.toHaveBeenCalled()
    })

    it("rejects a caller who is not in allowedUsers", async () => {
      state.sessionEmail = "intruder@example.com"

      await expect(deleteMediaEntry(MEDIA_ID, "videos/clip.mp4")).rejects.toThrow(
        "Sin permisos",
      )
      expect(sendMock).not.toHaveBeenCalled()
    })
  })

  describe("deleteMediaFolder", () => {
    it("allows an admin to delete a folder and its objects", async () => {
      state.sessionEmail = "admin@example.com"
      sendMock.mockResolvedValueOnce({
        Contents: [{ Key: "videos/clip.mp4" }, { Key: "videos/other.mp4" }],
      })

      await deleteMediaFolder(MEDIA_ID, "videos/")

      const deleteKeys = sendMock.mock.calls
        .map((call) => call[0])
        .filter((cmd) => cmd.Key !== undefined)
        .map((cmd) => cmd.Key)
      expect(deleteKeys).toEqual(["videos/clip.mp4", "videos/other.mp4"])
    })

    it("rejects a member with a permissions error", async () => {
      state.sessionEmail = "member@example.com"

      await expect(deleteMediaFolder(MEDIA_ID, "videos/")).rejects.toThrow(
        "Sin permisos",
      )
      expect(sendMock).not.toHaveBeenCalled()
    })

    it("rejects an unauthenticated caller", async () => {
      state.sessionEmail = null

      await expect(deleteMediaFolder(MEDIA_ID, "videos/")).rejects.toThrow(
        "No autenticado",
      )
      expect(sendMock).not.toHaveBeenCalled()
    })
  })
})
