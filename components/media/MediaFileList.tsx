"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { IconChevronRight, IconSearch, IconX } from "@tabler/icons-react"
import type { StorageEntry } from "@/lib/types"
import { MOVE_MAX_SIZE } from "@/lib/media-utils"
import {
  createMediaFolder,
  deleteMediaEntry,
  deleteMediaFolder,
  getMediaEntryUrl,
  listMediaStorageEntries,
  moveMediaEntry,
} from "@/lib/actions/media"
import { MediaFileListItem } from "./MediaFileListItem"
import { useMediaPlayer } from "./MediaPlayerProvider"
import { Loader } from "@/components/ui/Loader"

function parseBreadcrumbs(path: string) {
  if (!path) return []
  return path
    .replace(/\/$/, "")
    .split("/")
    .filter(Boolean)
    .map((segment, index, arr) => ({
      label: segment,
      path: `${arr.slice(0, index + 1).join("/")}/`,
    }))
}

export function MediaFileList({
  mediaId,
  entries: initialEntries,
  isAdmin,
  initialError,
  currentPath,
  onPathChange,
  uploadingEntries = [],
}: {
  mediaId: string
  entries: StorageEntry[]
  isAdmin: boolean
  initialError?: string | null
  /** Folder currently being browsed (e.g. "videos/"); "" for the root. */
  currentPath: string
  onPathChange: (path: string) => void
  /** Placeholder rows for files currently being uploaded. */
  uploadingEntries?: StorageEntry[]
}) {
  const router = useRouter()
  const { openPlayer } = useMediaPlayer()
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [moveKey, setMoveKey] = useState<string | null>(null)
  const [loadingActions, setLoadingActions] = useState<Record<string, boolean>>(
    {},
  )
  const hasNotified = useRef(false)
  const [entries, setEntries] = useState(initialEntries)
  const [loadingEntries, setLoadingEntries] = useState(false)
  const [search, setSearch] = useState("")

  const breadcrumbs = parseBreadcrumbs(currentPath)

  useEffect(() => {
    if (initialError) {
      toast.error(initialError)
    }
  }, [initialError])

  // One source of truth per situation:
  // - Root: mirror the server snapshot. Server actions revalidate the page,
  //   so their responses deliver fresh data — swap it in, no request needed.
  // - Folder: always fetch when the folder changes, and show the loader
  //   until it arrives. The reset is unconditional so nothing can get stuck.
  useEffect(() => {
    if (!currentPath) {
      setLoadingEntries(false)
      setEntries(initialEntries)
    }
  }, [currentPath, initialEntries])

  useEffect(() => {
    if (!currentPath) return
    let cancelled = false
    setLoadingEntries(true)
    listMediaStorageEntries(mediaId, currentPath)
      .then((freshEntries) => {
        if (!cancelled) setEntries(freshEntries)
      })
      .catch((error) => {
        console.error("[media:navigate] failed to load entries", error)
        if (!cancelled) toast.error("Error al cargar el contenido")
      })
      .finally(() => {
        setLoadingEntries(false)
      })
    return () => {
      cancelled = true
    }
  }, [mediaId, currentPath])

  function navigateToFolder(path: string) {
    setSelectedKey(null)
    // A move panel for another folder is meaningless after navigating.
    setMoveKey(null)
    onPathChange(path)
  }

  const filteredEntries = search
    ? entries.filter((e) => e.name.toLowerCase().includes(search.toLowerCase()))
    : entries

  // Destinations for the move panel, derived from data already in memory:
  // root, breadcrumb ancestors, and the folders in the current listing.
  const moveDestinations = [
    "",
    ...parseBreadcrumbs(currentPath).map((b) => b.path),
    ...entries.filter((e) => e.type === "folder").map((e) => e.key),
  ].filter((path, index, all) => all.indexOf(path) === index)

  const checkForNewItems = useCallback(async () => {
    if (hasNotified.current) return

    try {
      const freshEntries = await listMediaStorageEntries(mediaId)
      const currentKeys = new Set(initialEntries.map((e) => e.key))
      const newItems = freshEntries.filter((e) => !currentKeys.has(e.key))
      if (newItems.length > 0 && !hasNotified.current) {
        hasNotified.current = true
        toast("Nuevos archivos detectados", {
          description: `Se encontraron archivos nuevos en el storage.`,
          duration: Infinity,
          action: {
            label: "Actualizar",
            onClick: () => router.refresh(),
          },
        })
      }
    } catch (error) {
      console.error("[media:sync] failed to check for new items", error)
    }
  }, [mediaId, initialEntries, router])

  useEffect(() => {
    checkForNewItems()
    const interval = setInterval(checkForNewItems, 60_000)
    return () => clearInterval(interval)
  }, [checkForNewItems])

  async function runEntryAction(
    entry: StorageEntry,
    action: string,
    run: () => Promise<void>,
  ) {
    setLoadingActions((prev) => ({ ...prev, [entry.key]: true }))
    try {
      await run()
    } catch (error) {
      console.error(`[media:${action}] failed for ${entry.key}`, error)
      toast.error("No se pudo completar la acción")
    } finally {
      setLoadingActions((prev) => {
        const next = { ...prev }
        delete next[entry.key]
        return next
      })
    }
  }

  function handleCopyUrl(entry: StorageEntry) {
    return runEntryAction(entry, "copy", async () => {
      const url = await getMediaEntryUrl(mediaId, entry.key)
      await navigator.clipboard.writeText(url)
      toast.success("URL copiada al portapapeles")
    })
  }

  function handleDownloadFile(entry: StorageEntry) {
    return runEntryAction(entry, "download", async () => {
      window.location.href = await getMediaEntryUrl(mediaId, entry.key, true)
    })
  }

  function handleDeleteEntry(entry: StorageEntry) {
    return runEntryAction(entry, "delete", async () => {
      if (entry.type === "folder") {
        await deleteMediaFolder(mediaId, entry.key)
      } else {
        await deleteMediaEntry(mediaId, entry.key)
      }
      setEntries((prev) => prev.filter((e) => e.key !== entry.key))
      toast.success(
        entry.type === "folder" ? "Carpeta eliminada" : "Archivo eliminado",
      )
    })
  }

  function handleOpen(entry: StorageEntry) {
    const kind = entry.mediaKind
    if (!kind) return

    return runEntryAction(entry, "play", async () => {
      // Direct presigned R2 URL; requires GET CORS rule on the bucket.
      const src = await getMediaEntryUrl(mediaId, entry.key)
      openPlayer({
        src,
        title: entry.name,
        kind,
        // Stable id (the presigned URL changes every time) so the player
        // can remember/restore the playback position.
        storageKey: `${mediaId}:${entry.key}`,
      })
    })
  }

  // The move lives here — the list never unmounts, so navigation while a
  // move runs can't interrupt it or leave dangling callbacks behind.
  // Moves of different entries run in parallel; each key is only locked
  // against itself.
  const [movingKeys, setMovingKeys] = useState<Set<string>>(() => new Set())

  // Materialize locally-staged folders along the destination chain, shortest
  async function createStagedFolders(
    toPrefix: string,
    stagedFolders: string[],
  ) {
    const toCreate = stagedFolders
      .filter((p) => toPrefix === p || toPrefix.startsWith(p))
      .sort((a, b) => a.length - b.length)
    for (const folder of toCreate) {
      const withoutSlash = folder.replace(/\/+$/, "")
      const segments = withoutSlash.split("/")
      const name = segments.at(-1) ?? ""
      if (!name) continue
      const parent = withoutSlash.slice(0, withoutSlash.length - name.length)
      await createMediaFolder(mediaId, parent, name)
    }
  }

  async function handleMove(
    entry: StorageEntry,
    toPrefix: string,
    stagedFolders: string[],
  ) {
    if (movingKeys.has(entry.key)) return
    if (entry.type === "file" && (entry.size ?? 0) > MOVE_MAX_SIZE) {
      toast.error("El archivo supera el límite de tamaño por archivo")
      return
    }
    setMovingKeys((prev) => new Set(prev).add(entry.key))
    try {
      await createStagedFolders(toPrefix, stagedFolders)

      await moveMediaEntry(mediaId, entry.key, toPrefix)
      toast.success("Elemento movido")
      setEntries((prev) => prev.filter((e) => e.key !== entry.key))
      setMoveKey(null)
      // No router.refresh() here: moveMediaEntry already calls
      // revalidatePath, so the action response carries the fresh server
      // snapshot (same as the delete handlers above). A refresh inside a
      // transition after a server action could hang the UI (vercel/next.js#86055).
    } catch (error) {
      console.error("[media:move] failed", error)
      toast.error("No se pudo mover el elemento")
    } finally {
      setMovingKeys((prev) => {
        const next = new Set(prev)
        next.delete(entry.key)
        return next
      })
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {breadcrumbs.length > 0 ? (
        <nav className="flex items-center gap-1 text-sm text-text/60 overflow-x-auto">
          <button
            type="button"
            onClick={() => navigateToFolder("")}
            className="shrink-0 font-medium text-blue-600 hover:text-blue-800 hover:underline"
          >
            Raíz
          </button>
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb.path} className="flex items-center gap-1">
              <IconChevronRight size={14} className="shrink-0 text-text/40" />
              {i === breadcrumbs.length - 1 ? (
                <span className="shrink-0 font-medium text-text">
                  {crumb.label}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => navigateToFolder(crumb.path)}
                  className="shrink-0 font-medium text-blue-600 hover:text-blue-800 hover:underline"
                >
                  {crumb.label}
                </button>
              )}
            </span>
          ))}
        </nav>
      ) : null}
      <div className="relative">
        <IconSearch
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-text/40"
        />
        <input
          type="text"
          placeholder="Buscar archivos…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-md border border-black/10 bg-white py-1.5 pl-9 pr-10 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
        />
        {search ? (
          <button
            type="button"
            onClick={() => setSearch("")}
            title="Limpiar búsqueda"
            aria-label="Limpiar búsqueda"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 cursor-pointer rounded p-1 text-text/40 transition-colors hover:text-text"
          >
            <IconX size={16} strokeWidth={2.5} />
          </button>
        ) : null}
      </div>
      <ul className="flex flex-col gap-2">
        {uploadingEntries.map((entry) => (
          <MediaFileListItem
            key={entry.key}
            mediaId={mediaId}
            entry={entry}
            isSelected={false}
            onToggleSelect={() => {}}
            isAdmin={false}
            uploading
            onPlay={() => {}}
            onDownload={() => {}}
            onCopyUrl={() => {}}
            onDelete={() => {}}
          />
        ))}
      </ul>
      {loadingEntries ? (
        <Loader size={48} label="Cargando…" className="py-6" />
      ) : (
        <ul className="flex flex-col gap-2">
          {filteredEntries.map((entry) => (
            <MediaFileListItem
              key={entry.key}
              mediaId={mediaId}
              entry={entry}
              isSelected={entry.key === selectedKey}
              onToggleSelect={() =>
                setSelectedKey(entry.key === selectedKey ? null : entry.key)
              }
              loading={Boolean(loadingActions[entry.key])}
              isAdmin={isAdmin}
              moveOpen={moveKey === entry.key}
              onMoveToggle={() =>
                setMoveKey(moveKey === entry.key ? null : entry.key)
              }
              moveDestinations={moveDestinations}
              moving={movingKeys.has(entry.key)}
              onMoveSelect={(toPrefix, stagedFolders) =>
                handleMove(entry, toPrefix, stagedFolders)
              }
              onPlay={() => handleOpen(entry)}
              onDownload={() => handleDownloadFile(entry)}
              onCopyUrl={() => handleCopyUrl(entry)}
              onDelete={() => handleDeleteEntry(entry)}
              onFolderClick={
                entry.type === "folder"
                  ? () => navigateToFolder(entry.key)
                  : undefined
              }
            />
          ))}
        </ul>
      )}
      {search && filteredEntries.length === 0 && !loadingEntries ? (
        <p className="text-sm text-text/50 py-2 text-center">
          Ningún elemento coincide con la búsqueda
        </p>
      ) : null}
      {!search && entries.length === 0 && !loadingEntries ? (
        <p className="text-sm text-text/50 py-2 text-center">
          No hay ningún elemento disponible
        </p>
      ) : null}
    </div>
  )
}
