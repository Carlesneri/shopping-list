import { render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { StorageEntry } from "@/lib/types"
import { MediaFileList } from "./MediaFileList"

const listMediaStorageEntries = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))

vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), {
    error: vi.fn(),
    success: vi.fn(),
  }),
}))

vi.mock("./MediaPlayerProvider", () => ({
  useMediaPlayer: () => ({ openPlayer: vi.fn() }),
}))

vi.mock("@/lib/actions/media", () => ({
  listMediaStorageEntries: (...args: unknown[]) =>
    listMediaStorageEntries(...args),
  listMediaFolders: vi.fn().mockResolvedValue([]),
  createMediaFolder: vi.fn(),
  deleteMediaEntry: vi.fn(),
  deleteMediaFolder: vi.fn(),
  getMediaEntryUrl: vi.fn(),
  moveMediaEntry: vi.fn(),
}))

const rootEntries: StorageEntry[] = [
  { key: "movie.mp4", name: "movie.mp4", type: "file", mediaKind: "video" },
]

const folderEntries: StorageEntry[] = [
  {
    key: "videos/clip.mp4",
    name: "clip.mp4",
    type: "file",
    mediaKind: "video",
  },
]

function renderList(overrides: {
  currentPath: string
  serverPath?: string
  entries: StorageEntry[]
}) {
  return render(
    <MediaFileList
      mediaId="storage-1"
      entries={overrides.entries}
      isAdmin={false}
      isOwner={false}
      provider="cloudflare-r2"
      currentPath={overrides.currentPath}
      serverPath={overrides.serverPath ?? ""}
      onPathChange={() => {}}
    />,
  )
}

describe("MediaFileList deep-linked folder", () => {
  beforeEach(() => {
    listMediaStorageEntries.mockReset()
    listMediaStorageEntries.mockImplementation(
      async (_mediaId: string, prefix = "") =>
        prefix === "" ? rootEntries : folderEntries,
    )
  })

  it("renders the server snapshot of the ?p folder without fetching it", async () => {
    renderList({
      currentPath: "videos/",
      serverPath: "videos/",
      entries: folderEntries,
    })

    expect(screen.getByText("clip.mp4")).toBeInTheDocument()
    expect(screen.queryByText("movie.mp4")).not.toBeInTheDocument()
    expect(listMediaStorageEntries).not.toHaveBeenCalledWith(
      "storage-1",
      "videos/",
    )
  })

  it("fetches the root when navigating back from the deep-linked folder", async () => {
    const { rerender } = renderList({
      currentPath: "videos/",
      serverPath: "videos/",
      entries: folderEntries,
    })

    rerender(
      <MediaFileList
        mediaId="storage-1"
        entries={folderEntries}
        isAdmin={false}
        isOwner={false}
        provider="cloudflare-r2"
        currentPath=""
        serverPath="videos/"
        onPathChange={() => {}}
      />,
    )

    await waitFor(() =>
      expect(listMediaStorageEntries).toHaveBeenCalledWith("storage-1", ""),
    )
    expect(await screen.findByText("movie.mp4")).toBeInTheDocument()
  })
})
