"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import type { MediaKind, StorageEntry } from "@/lib/types"
import {
  getMediaEntryUrl,
  listMediaStorageEntries,
  deleteMediaEntry,
} from "@/lib/actions/media"
import { MediaPlayer, type SubtitleOption } from "./MediaPlayer"
import { MediaFileListItem } from "./MediaFileListItem"
import type { ActionKind } from "./ActionButtons"

export function MediaFileList({
  mediaId,
  entries,
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

  const [playing, setPlaying] = useState<{
    src: string
    title: string
    kind: MediaKind
    subtitles: SubtitleOption[]
  } | null>(null)

  const checkForNewItems = useCallback(async () => {
    if (hasNotified.current) return

    try {
      const freshEntries = await listMediaStorageEntries(mediaId)
      const currentKeys = new Set(entries.map((e) => e.key))
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
  }, [mediaId, entries, router])

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

  function handleDeleteFile(entry: StorageEntry) {
    return runEntryAction(entry, "delete", async () => {
      await deleteMediaEntry(mediaId, entry.key)
      toast.success("Archivo eliminado")
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
      <ul className="flex flex-col gap-2">
        {entries.map((entry) => (
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
            onDelete={() => handleDeleteFile(entry)}
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
    </div>
  )
}
