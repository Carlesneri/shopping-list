"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { IconChevronRight, IconSearch } from "@tabler/icons-react"
import type { StorageEntry } from "@/lib/types"
import {
  getMediaEntryUrl,
  listMediaStorageEntries,
  deleteMediaEntry,
  deleteMediaFolder,
} from "@/lib/actions/media"
import { MediaFileListItem } from "./MediaFileListItem"
import { useMediaPlayer } from "./MediaPlayerProvider"
import type { ActionKind } from "./ActionButtons"

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
}: {
  mediaId: string
  entries: StorageEntry[]
  isAdmin: boolean
  initialError?: string | null
  /** Folder currently being browsed (e.g. "videos/"); "" for the root. */
  currentPath: string
  onPathChange: (path: string) => void
}) {
  const router = useRouter()
  const { openPlayer } = useMediaPlayer()
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [loadingActions, setLoadingActions] = useState<
    Record<string, ActionKind>
  >({})
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

  // The server always sends the root listing in `initialEntries`. Whenever it
  // changes (after router.refresh() — uploads, folder creation, …) or the user
  // navigates, reload: root uses the fresh snapshot directly; any other folder
  // is re-fetched so the user stays inside it.
  useEffect(() => {
    if (!currentPath) {
      setEntries(initialEntries)
      return
    }
    let cancelled = false
    setLoadingEntries(true)
    listMediaStorageEntries(mediaId, currentPath)
      .then((freshEntries) => {
        if (!cancelled) setEntries(freshEntries)
      })
      .catch((error) => {
        console.error("[media:navigate] failed to load entries", error)
        if (!cancelled)
          toast.error(
            error instanceof Error
              ? error.message
              : "Error al cargar el contenido",
          )
      })
      .finally(() => {
        if (!cancelled) setLoadingEntries(false)
      })
    return () => {
      cancelled = true
    }
  }, [mediaId, currentPath, initialEntries])

  function navigateToFolder(path: string) {
    setSelectedKey(null)
    onPathChange(path)
  }

  const filteredEntries = search
    ? entries.filter((e) => e.name.toLowerCase().includes(search.toLowerCase()))
    : entries

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
    action: ActionKind,
    run: () => Promise<void>,
  ) {
    setLoadingActions((prev) => ({ ...prev, [entry.key]: action }))
    try {
      await run()
    } catch (error) {
      console.error(`[media:${action}] failed for ${entry.key}`, error)
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo completar la acción",
      )
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
          className="w-full rounded-md border border-black/10 bg-white py-1.5 pl-9 pr-3 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
        />
      </div>
      {loadingEntries ? (
        <p className="text-sm text-text/50 py-2">Cargando…</p>
      ) : null}
      <ul className="flex flex-col gap-2">
        {filteredEntries.map((entry) => (
          <MediaFileListItem
            key={entry.key}
            entry={entry}
            isSelected={entry.key === selectedKey}
            onToggleSelect={() =>
              setSelectedKey(entry.key === selectedKey ? null : entry.key)
            }
            loadingAction={
              loadingActions[entry.key]
                ? { key: entry.key, action: loadingActions[entry.key] }
                : null
            }
            isAdmin={isAdmin}
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
