"use client"

import { useState } from "react"
import { toast } from "sonner"
import {
  IconFile,
  IconFolder,
  IconMusic,
  IconPhoto,
  IconVideo,
} from "@tabler/icons-react"
import type { MediaKind, StorageEntry } from "@/lib/types"
import { getMediaEntryUrl, listMediaStorageEntries } from "@/lib/actions/media"
import { MediaPlayer, type SubtitleOption } from "./MediaPlayer"
import { ActionButtons, type ActionKind } from "./ActionButtons"

const MEDIA_TYPE_LABELS: Record<MediaKind, string> = {
  video: "Video",
  image: "Imagen",
  audio: "Audio",
}

function formatSize(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${bytes} B`
}

function formatDate(date: Date) {
  return date.toLocaleString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function EntryIcon({ entry }: { entry: StorageEntry }) {
  if (entry.type === "folder") {
    return <IconFolder size={20} className="shrink-0 text-blue-500" />
  }
  switch (entry.mediaKind) {
    case "video":
      return <IconVideo size={20} className="shrink-0 text-blue-600" />
    case "image":
      return <IconPhoto size={20} className="shrink-0 text-emerald-600" />
    case "audio":
      return <IconMusic size={20} className="shrink-0 text-amber-600" />
    default:
      return <IconFile size={20} className="shrink-0 text-text/70" />
  }
}

export function MediaFileList({
  mediaId,
  entries,
}: {
  mediaId: string
  entries: StorageEntry[]
}) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [loadingAction, setLoadingAction] = useState<{
    key: string
    action: ActionKind
  } | null>(null)

  const [playing, setPlaying] = useState<{
    src: string
    title: string
    kind: MediaKind
    subtitles: SubtitleOption[]
  } | null>(null)

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

  function isMkv(entry: StorageEntry) {
    return entry.key.toLowerCase().endsWith(".mkv")
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
    <ul className="flex flex-col gap-2">
      {entries.map((entry) => {
        const isFile = entry.type === "file"
        const isSelected = entry.key === selectedKey
        return (
          <li
            key={entry.key}
            className="rounded-md border border-black/10 bg-white text-sm"
          >
            <div className="flex flex-col gap-1 px-3 py-2">
              <div className="flex min-w-0 items-center gap-2">
                <EntryIcon entry={entry} />
                {isFile ? (
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedKey(isSelected ? null : entry.key)
                    }
                    className="min-w-0 flex-1 cursor-pointer truncate text-base font-medium text-start"
                    aria-expanded={isSelected}
                  >
                    {entry.name}
                  </button>
                ) : (
                  <span className="min-w-0 flex-1 truncate text-base font-medium">
                    {entry.name}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between gap-3">
                {isFile && entry.size !== undefined ? (
                  <span className="shrink-0 text-xs text-text/50">
                    {formatSize(entry.size)}
                  </span>
                ) : null}
                <ActionButtons
                  entryKey={entry.key}
                  entryName={entry.name}
                  mediaKind={entry.mediaKind}
                  isMkv={isMkv(entry)}
                  isFile={isFile}
                  loading={loadingAction}
                  onPlay={() => handleOpen(entry)}
                  onVlc={() => handleOpenInVlc(entry)}
                  onPlaylist={() => handleDownloadM3u(entry)}
                  onDownload={() => handleDownloadFile(entry)}
                  onCopyUrl={() => handleCopyUrl(entry)}
                />
              </div>
            </div>
            {isFile && isSelected ? (
              <div className="border-t border-black/10 px-3 py-2">
                <dl className="flex flex-col gap-1">
                  <div className="flex justify-between gap-3">
                    <dt className="text-text/50">Tipo</dt>
                    <dd className="truncate font-medium">
                      {entry.mediaKind
                        ? MEDIA_TYPE_LABELS[entry.mediaKind]
                        : "Archivo"}
                    </dd>
                  </div>
                  {entry.size !== undefined ? (
                    <div className="flex justify-between gap-3">
                      <dt className="text-text/50">Tamaño</dt>
                      <dd className="font-medium">{formatSize(entry.size)}</dd>
                    </div>
                  ) : null}
                  {entry.lastModified ? (
                    <div className="flex justify-between gap-3">
                      <dt className="text-text/50">Modificado</dt>
                      <dd className="font-medium">
                        {formatDate(entry.lastModified)}
                      </dd>
                    </div>
                  ) : null}
                  <div className="flex justify-between gap-3">
                    <dt className="text-text/50">Ruta</dt>
                    <dd className="font-mono text-xs">{entry.key}</dd>
                  </div>
                </dl>
              </div>
            ) : null}
          </li>
        )
      })}
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
  )
}
