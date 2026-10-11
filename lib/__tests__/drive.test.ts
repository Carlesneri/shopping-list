import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

process.env.AUTH_SECRET ??= "test-secret"
process.env.AUTH_GOOGLE_ID ??= "test-client-id"
process.env.AUTH_GOOGLE_SECRET ??= "test-client-secret"

const fetchMock = vi.fn()

import {
  createDriveState,
  deleteDriveFile,
  deleteDriveFolder,
  listDriveEntries,
  refreshDriveAccessToken,
  startDriveResumableUpload,
  verifyDriveState,
} from "../drive"

const FOLDER_MIME = "application/vnd.google-apps.folder"

function driveResponse(files: unknown[]) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ files }),
  }
}

const REDIRECT = "http://localhost:3000/media/drive/callback"

describe("drive state", () => {
  it("round-trips a signed state", () => {
    const state = createDriveState("media-1", "user@example.com", REDIRECT)
    expect(verifyDriveState(state)).toEqual({
      mediaId: "media-1",
      email: "user@example.com",
      redirectUri: REDIRECT,
    })
  })

  it("rejects a redirect outside the callback path", () => {
    const state = createDriveState(
      "media-1",
      "user@example.com",
      "https://evil.example/steal",
    )
    expect(verifyDriveState(state)).toBeNull()
  })

  it("rejects tampered payloads", () => {
    const state = createDriveState("media-1", "user@example.com", REDIRECT)
    const [payload] = state.split(".")
    const forged = Buffer.from(
      JSON.stringify({
        mediaId: "media-2",
        email: "user@example.com",
        ts: Date.now(),
      }),
      "utf8",
    ).toString("base64url")
    expect(verifyDriveState(`${forged}.${state.split(".")[1]}`)).toBeNull()
    expect(verifyDriveState(`${payload}.nope`)).toBeNull()
  })
})

describe("listDriveEntries", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    fetchMock.mockReset()
  })

  it("maps Drive files and folders at the root", async () => {
    fetchMock.mockResolvedValue(
      driveResponse([
        { id: "f1", name: "Videos", mimeType: FOLDER_MIME },
        {
          id: "f2",
          name: "photo.jpg",
          mimeType: "image/jpeg",
          size: "120",
          modifiedTime: "2024-01-01T00:00:00Z",
        },
        { id: "f3", name: "song.mp3", mimeType: "audio/mpeg", size: "5" },
      ]),
    )

    const entries = await listDriveEntries("access-token")

    const listUrl = String(fetchMock.mock.calls[0]?.[0])
    expect(listUrl).toContain("corpora=allDrives")
    expect(listUrl).toContain("includeItemsFromAllDrives=true")
    expect(entries).toEqual([
      { key: "Videos/", name: "Videos", type: "folder" },
      {
        key: "photo.jpg",
        name: "photo.jpg",
        type: "file",
        mediaKind: "image",
        size: 120,
        lastModified: new Date("2024-01-01T00:00:00Z"),
      },
      {
        key: "song.mp3",
        name: "song.mp3",
        type: "file",
        mediaKind: "audio",
        size: 5,
        lastModified: undefined,
      },
    ])
  })

  it("resolves nested folder paths before listing", async () => {
    fetchMock
      .mockResolvedValueOnce(
        driveResponse([{ id: "folder-1", name: "a", mimeType: FOLDER_MIME }]),
      )
      .mockResolvedValueOnce(
        driveResponse([{ id: "folder-2", name: "b", mimeType: FOLDER_MIME }]),
      )
      .mockResolvedValueOnce(
        driveResponse([
          { id: "f1", name: "clip.mp4", mimeType: "video/mp4", size: "10" },
        ]),
      )

    const entries = await listDriveEntries("access-token", "a/b/")

    expect(entries).toEqual([
      {
        key: "a/b/clip.mp4",
        name: "clip.mp4",
        type: "file",
        mediaKind: "video",
        size: 10,
        lastModified: undefined,
      },
    ])
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it("returns an empty list when a path segment does not exist", async () => {
    fetchMock.mockResolvedValue(driveResponse([]))

    await expect(listDriveEntries("access-token", "missing/")).resolves.toEqual(
      [],
    )
  })

  it("skips native Google files that cannot be downloaded", async () => {
    fetchMock.mockResolvedValue(
      driveResponse([
        {
          id: "doc",
          name: "Notas",
          mimeType: "application/vnd.google-apps.document",
        },
        { id: "vid", name: "clip.mp4", mimeType: "video/mp4", size: "8" },
      ]),
    )

    await expect(listDriveEntries("access-token")).resolves.toEqual([
      {
        key: "clip.mp4",
        name: "clip.mp4",
        type: "file",
        mediaKind: "video",
        size: 8,
        lastModified: undefined,
      },
    ])
  })

  it("hides files that are not video, image or audio", async () => {
    fetchMock.mockResolvedValue(
      driveResponse([
        { id: "txt", name: "readme.txt", mimeType: "text/plain", size: "42" },
        { id: "vid", name: "clip.mp4", mimeType: "video/mp4", size: "8" },
      ]),
    )

    const entries = await listDriveEntries("access-token")
    expect(entries.some((e) => e.key === "readme.txt")).toBe(false)
    expect(entries).toHaveLength(1)
  })
})

describe("refreshDriveAccessToken", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    fetchMock.mockReset()
  })

  it("reuses a cached access token", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ access_token: "fresh", expires_in: 3600 }),
      text: async () => "",
    })

    await expect(refreshDriveAccessToken("refresh-cache")).resolves.toBe(
      "fresh",
    )
    await expect(refreshDriveAccessToken("refresh-cache")).resolves.toBe(
      "fresh",
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("rejects a token that can only see app-created files", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        access_token: "limited",
        expires_in: 3600,
        scope: "https://www.googleapis.com/auth/drive.file",
      }),
      text: async () => "",
    })

    await expect(refreshDriveAccessToken("refresh-limited")).rejects.toThrow(
      "Reconecta Google Drive",
    )
  })
})

describe("startDriveResumableUpload", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    fetchMock.mockReset()
  })

  it("returns the session URL from Location", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      headers: {
        get: (name: string) =>
          name === "location" ? "https://upload.example/session" : null,
      },
      text: async () => "",
    })

    await expect(
      startDriveResumableUpload("token", "root", "clip.mp4", "video/mp4", 12),
    ).resolves.toBe("https://upload.example/session")
  })
})

describe("drive deletes", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    fetchMock.mockReset()
  })

  function deleteResponse(status = 204) {
    return { ok: status >= 200 && status < 300, status, text: async () => "" }
  }

  it("deletes a file after resolving its id", async () => {
    fetchMock
      .mockResolvedValueOnce(
        driveResponse([
          { id: "file-1", name: "clip.mp4", mimeType: "video/mp4" },
        ]),
      )
      .mockResolvedValueOnce(deleteResponse())

    await expect(deleteDriveFile("token", "clip.mp4")).resolves.toBeUndefined()
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[1][0]).toContain("/files/file-1?")
    expect(fetchMock.mock.calls[1][1].method).toBe("DELETE")
  })

  it("treats an already-deleted file as success", async () => {
    fetchMock
      .mockResolvedValueOnce(
        driveResponse([
          { id: "file-1", name: "clip.mp4", mimeType: "video/mp4" },
        ]),
      )
      .mockResolvedValueOnce(deleteResponse(404))

    await expect(deleteDriveFile("token", "clip.mp4")).resolves.toBeUndefined()
  })

  it("rejects when the file does not exist", async () => {
    fetchMock.mockResolvedValue(driveResponse([]))

    await expect(deleteDriveFile("token", "clip.mp4")).rejects.toThrow(
      "no encontrado",
    )
  })

  it("deletes an empty folder", async () => {
    fetchMock
      .mockResolvedValueOnce(
        driveResponse([
          { id: "folder-1", name: "videos", mimeType: FOLDER_MIME },
        ]),
      )
      .mockResolvedValueOnce(driveResponse([]))
      .mockResolvedValueOnce(deleteResponse())

    await expect(deleteDriveFolder("token", "videos/")).resolves.toBeUndefined()
    expect(fetchMock.mock.calls[2][0]).toContain("/files/folder-1?")
  })

  it("refuses to delete a folder that still has children", async () => {
    fetchMock
      .mockResolvedValueOnce(
        driveResponse([
          { id: "folder-1", name: "videos", mimeType: FOLDER_MIME },
        ]),
      )
      .mockResolvedValueOnce(
        driveResponse([
          {
            id: "doc",
            name: "Notas",
            mimeType: "application/vnd.google-apps.document",
          },
        ]),
      )

    await expect(deleteDriveFolder("token", "videos/")).rejects.toThrow(
      "no está vacía",
    )
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("does nothing when the folder does not exist", async () => {
    fetchMock.mockResolvedValue(driveResponse([]))

    await expect(
      deleteDriveFolder("token", "missing/"),
    ).resolves.toBeUndefined()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("rejects when Drive refuses the delete", async () => {
    fetchMock
      .mockResolvedValueOnce(
        driveResponse([
          { id: "file-1", name: "clip.mp4", mimeType: "video/mp4" },
        ]),
      )
      .mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: async () => "forbidden",
      })

    await expect(deleteDriveFile("token", "clip.mp4")).rejects.toThrow(
      "No se pudo eliminar",
    )
  })
})
