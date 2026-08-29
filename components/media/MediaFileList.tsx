"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { IconChevronRight, IconSearch } from "@tabler/icons-react"
import type { MediaKind, StorageEntry } from "@/lib/types"
import { isVideoNativelyUnsupported } from "@/lib/media-utils"
import {
  getMediaEntryUrl,
  listMediaStorageEntries,
  deleteMediaEntry,
  deleteMediaFolder,
} from "@/lib/actions/media"
import { MediaPlayer, type SubtitleOption } from "./MediaPlayer"
import { MediaFileListItem } from "./MediaFileListItem"
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
}: {
  mediaId: string
  entries: StorageEntry[]
  isAdmin: boolean
}) {
  const router = useRouter()
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [loadingAction, setLoadingAction] = useState<{
    key: string
    action: ActionKind
  } | null>(null)
  const hasNotified = useRef(false)
  const [currentPath, setCurrentPath] = useState("")
  const [entries, setEntries] = useState(initialEntries)
  const [loadingEntries, setLoadingEntries] = useState(false)
  const [search, setSearch] = useState("")
  const [playing, setPlaying] = useState<{
    src: string
    title: string
    kind: MediaKind
    subtitles: SubtitleOption[]
  } | null>(null)

  const breadcrumbs = parseBreadcrumbs(currentPath)

  const filteredEntries = search
    ? entries.filter((e) => e.name.toLowerCase().includes(search.toLowerCase()))
    : entries

  const loadEntries = useCallback(
    async (path: string) => {
      setLoadingEntries(true)
      try {
        const freshEntries = await listMediaStorageEntries(mediaId, path)
        setEntries(freshEntries)
      } catch (error) {
        console.error("[media:navigate] failed to load entries", error)
        toast.error("Error al cargar el contenido")
      } finally {
        setLoadingEntries(false)
      }
    },
    [mediaId],
  )

  function navigateToFolder(path: string) {
    setSelectedKey(null)
    setCurrentPath(path)
    loadEntries(path)
  }

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

  async function resolveSubtitles(
    entry: StorageEntry,
  ): Promise<SubtitleOption[]> {
    try {
      const lastSlash = entry.key.lastIndexOf("/")
      const dir = lastSlash >= 0 ? entry.key.slice(0, lastSlash + 1) : ""
      const fileName = entry.key.slice(dir.length)
      const base = fileName.replace(/\.[^.]+$/, "")
      const defaultName = `${base}.vtt`

      const siblings = await listMediaStorageEntries(mediaId, dir)
      const matches = siblings
        .filter(
          (s) =>
            s.type === "file" &&
            (s.name === defaultName ||
              (s.name.startsWith(`${base}.`) && s.name.endsWith(".vtt"))),
        )
        .sort(
          (a, b) =>
            Number(b.name === defaultName) - Number(a.name === defaultName) ||
            a.name.localeCompare(b.name),
        )

      return await Promise.all(
        matches.map(async (s) => ({
          label: s.name.slice(base.length + 1, -4) || "Subtítulos",
          src: await getMediaEntryUrl(mediaId, s.key),
        })),
      )
    } catch (error) {
      console.error("[media:play] failed to resolve subtitles", error)
      return []
    }
  }

  function openPlaylist(entry: StorageEntry) {
    window.location.href = `/media/${mediaId}/playlist?key=${encodeURIComponent(entry.key)}`
  }

  async function runEntryAction(
    entry: StorageEntry,
    action: ActionKind,
    run: () => Promise<void>,
  ) {
    setLoadingAction({ key: entry.key, action })
    try {
      await run()
    } catch (error) {
      console.error(`[media:${action}] failed for ${entry.key}`, error)
      toast.error("No se pudo completar la acción")
    } finally {
      setLoadingAction(null)
    }
  }

  function handleDownloadM3u(entry: StorageEntry) {
    openPlaylist(entry)
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

  function handleOpenInVlc(entry: StorageEntry) {
    return runEntryAction(entry, "vlc", async () => {
      const url = await getMediaEntryUrl(mediaId, entry.key)

      if (/android/i.test(navigator.userAgent)) {
        const parsed = new URL(url)
        window.location.href = `intent://${parsed.host}${parsed.pathname}${parsed.search}#Intent;scheme=https;package=org.videolan.vlc;S.url=${encodeURIComponent(url)};end`
        toast.info("Abriendo en VLC…", {
          description:
            "Si VLC no se abrió, usa el botón de playlist o descarga el archivo.",
          action: { label: "Playlist", onClick: () => openPlaylist(entry) },
        })
      } else if (/mac/i.test(navigator.platform)) {
        openPlaylist(entry)
        toast.info("Playlist descargada", {
          description: "Ábrela con VLC para reproducir el vídeo.",
        })
      } else {
        window.location.href = `vlc://${url}`
        toast.info("Abriendo en VLC…", {
          description:
            "Si VLC no se abrió, usa el botón de playlist o descarga el archivo.",
          action: { label: "Playlist", onClick: () => openPlaylist(entry) },
        })
      }
    })
  }

  function handleOpen(entry: StorageEntry) {
    const kind = entry.mediaKind
    if (!kind) return
    if (kind === "video" && isVideoNativelyUnsupported(entry.key)) {
      toast.error(
        `El formato ${entry.key.split(".").pop()?.toUpperCase()} no se puede reproducir en el navegador. Usa VLC, Playlist o Descargar.`,
      )
      return
    }
    return runEntryAction(entry, "play", async () => {
      const [src, subtitles] = await Promise.all([
        getMediaEntryUrl(mediaId, entry.key),
        kind === "video" ? resolveSubtitles(entry) : Promise.resolve([]),
      ])
      setPlaying({
        src,
        title: entry.name,
        kind,
        subtitles,
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
            loadingAction={loadingAction}
            isAdmin={isAdmin}
            onPlay={() => handleOpen(entry)}
            onVlc={() => handleOpenInVlc(entry)}
            onPlaylist={() => handleDownloadM3u(entry)}
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
        {playing ? (
          <MediaPlayer
            src={playing.src}
            title={playing.title}
            kind={playing.kind}
            subtitles={playing.subtitles}
            onClose={() => setPlaying(null)}
          />
        ) : null}
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
