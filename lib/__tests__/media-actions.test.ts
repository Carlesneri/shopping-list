import { beforeEach, describe, expect, it, vi } from "vitest"

const sendMock = vi.fn()

vi.mock("@/auth", () => ({
  auth: vi.fn(async () => ({
    user: { email: "user@example.com" },
  })),
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
            allowedUsers: [{ email: "user@example.com", role: "owner" }],
            memberEmails: ["user@example.com"],
            config: {
              accountId: "account-123",
              accessKeyId: "access-key",
              bucket: "mi-bucket",
              secretEnc: "iv:tag:secret",
              S3APIendpoint: "https://example.r2.cloudflarestorage.com",
            },
          }),
          ref: { update: vi.fn() },
        }),
      }),
    }),
  })),
}))

vi.mock("@aws-sdk/client-s3", () => ({
  S3Client: vi.fn().mockImplementation(() => ({ send: sendMock })),
  ListObjectsV2Command: vi.fn().mockImplementation((input) => input),
}))

import { listMediaStorageEntries } from "../actions/media"

describe("listMediaStorageEntries", () => {
  beforeEach(() => {
    sendMock.mockReset()
    sendMock.mockResolvedValue({
      CommonPrefixes: [{ Prefix: "images/" }, { Prefix: "docs/" }],
      Contents: [
        { Key: "images/photo.jpg", Size: 120, LastModified: new Date("2024-01-01") },
        { Key: "readme.txt", Size: 42, LastModified: new Date("2024-01-02") },
      ],
    })
  })

  it("lists folders and files from the configured bucket", async () => {
    const entries = await listMediaStorageEntries("media-1")

    expect(entries).toEqual([
      expect.objectContaining({ key: "docs/", name: "docs", type: "folder" }),
      expect.objectContaining({ key: "images/", name: "images", type: "folder" }),
      expect.objectContaining({
        key: "images/photo.jpg",
        name: "photo.jpg",
        type: "file",
        size: 120,
      }),
      expect.objectContaining({
        key: "readme.txt",
        name: "readme.txt",
        type: "file",
        size: 42,
      }),
    ])
  })

  it("returns an empty list if the bucket request fails", async () => {
    sendMock.mockRejectedValueOnce(new Error("timeout"))

    await expect(listMediaStorageEntries("media-1")).resolves.toEqual([])
  })
})
