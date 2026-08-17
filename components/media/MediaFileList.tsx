"use client"

import { useState } from "react"
import { toast } from "sonner"
import {
  IconDownload,
  IconFile,
  IconFolder,
  IconHeadphones,
  IconLoader2,
  IconMaximize,
  IconMusic,
  IconPhoto,
  IconPlayerPlay,
  IconPlaylist,
  IconVideo,
} from "@tabler/icons-react"
import type { MediaKind, StorageEntry } from "@/lib/types"
import { getMediaEntryUrl, listMediaStorageEntries } from "@/lib/actions/media"
import { MediaPlayer, type SubtitleOption } from "./MediaPlayer"

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
    return <IconFolder size={15} className="shrink-0 text-blue-500" />
  }
  switch (entry.mediaKind) {
    case "video":
      return <IconVideo size={15} className="shrink-0 text-blue-600" />
    case "image":
      return <IconPhoto size={15} className="shrink-0 text-emerald-600" />
    case "audio":
      return <IconMusic size={15} className="shrink-0 text-amber-600" />
    default:
      return <IconFile size={15} className="shrink-0 text-text/70" />
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
  const [loadingKey, setLoadingKey] = useState<string | null>(null)
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

  function downloadM3u(entry: StorageEntry, url: string) {
    const blob = new Blob([`#EXTM3U\n#EXTINF:-1,${entry.name}\n${url}\n`], {
      type: "audio/x-mpegurl",
    })
    const blobUrl = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = blobUrl
    anchor.download = `${entry.name.replace(/\.[^.]+$/, "")}.m3u`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(blobUrl)
  }

  async function handleDownloadM3u(entry: StorageEntry) {
    setLoadingKey(entry.key)
    try {
      downloadM3u(entry, await getMediaEntryUrl(mediaId, entry.key))
    } catch (error) {
      console.error("[media:vlc] failed to resolve url", error)
      toast.error("No se pudo generar el playlist")
    } finally {
      setLoadingKey(null)
    }
  }

  async function handleDownloadFile(entry: StorageEntry) {
    setLoadingKey(entry.key)
    try {
      window.location.href = await getMediaEntryUrl(mediaId, entry.key, true)
    } catch (error) {
      console.error("[media:download] failed to resolve url", error)
      toast.error("No se pudo descargar el archivo")
    } finally {
      setLoadingKey(null)
    }
  }

  function isMkv(entry: StorageEntry) {
    return entry.key.toLowerCase().endsWith(".mkv")
  }

  async function handleOpen(entry: StorageEntry) {
    if (!entry.mediaKind) return
    setLoadingKey(entry.key)
    try {
      const [src, subtitles] = await Promise.all([
        getMediaEntryUrl(mediaId, entry.key),
        entry.mediaKind === "video"
          ? resolveSubtitles(entry)
          : Promise.resolve([]),
      ])
      setPlaying({
        src,
        title: entry.name,
        kind: entry.mediaKind,
        subtitles,
      })
    } catch (error) {
      console.error("[media:play] failed to resolve url", error)
      toast.error("No se pudo abrir el archivo")
    } finally {
      setLoadingKey(null)
    }
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
            <div className="flex items-center justify-between gap-3 px-3 py-2">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <EntryIcon entry={entry} />
                {isFile ? (
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedKey(isSelected ? null : entry.key)
                    }
                    className="min-w-0 flex-1 cursor-pointer truncate font-medium text-start"
                    aria-expanded={isSelected}
                  >
                    {entry.name}
                  </button>
                ) : (
                  <span className="min-w-0 flex-1 truncate font-medium">
                    {entry.name}
                  </span>
                )}
              </div>
              {isFile && entry.size !== undefined ? (
                <span className="shrink-0 text-xs text-text/50">
                  {formatSize(entry.size)}
                </span>
              ) : null}
              {entry.mediaKind &&
              !(entry.mediaKind === "video" && isMkv(entry)) ? (
                <button
                  type="button"
                  onClick={() => handleOpen(entry)}
                  disabled={loadingKey !== null}
                  className="shrink-0 cursor-pointer text-blue-600 transition-colors hover:text-blue-700 disabled:cursor-wait disabled:text-text/40"
                  aria-label={
                    entry.mediaKind === "image"
                      ? `Ver ${entry.name}`
                      : `Reproducir ${entry.name}`
                  }
                >
                  {loadingKey === entry.key ? (
                    <IconLoader2 size={16} className="animate-spin" />
                  ) : entry.mediaKind === "image" ? (
                    <IconMaximize size={16} />
                  ) : entry.mediaKind === "audio" ? (
                    <IconHeadphones size={16} />
                  ) : (
                    <IconPlayerPlay size={16} fill="currentColor" />
                  )}
                </button>
              ) : null}
              {entry.mediaKind === "video" ? (
                <button
                  type="button"
                  onClick={() => handleDownloadM3u(entry)}
                  disabled={loadingKey !== null}
                  className="shrink-0 cursor-pointer text-text/50 transition-colors hover:text-text disabled:cursor-wait disabled:text-text/30"
                  aria-label={`Descargar playlist de ${entry.name}`}
                >
                  {loadingKey === entry.key ? (
                    <IconLoader2 size={16} className="animate-spin" />
                  ) : (
                    <IconPlaylist size={16} />
                  )}
                </button>
              ) : null}
              {entry.mediaKind ? (
                <button
                  type="button"
                  onClick={() => handleDownloadFile(entry)}
                  disabled={loadingKey !== null}
                  className="shrink-0 cursor-pointer text-text/50 transition-colors hover:text-text disabled:cursor-wait disabled:text-text/30"
                  aria-label={`Descargar ${entry.name}`}
                >
                  {loadingKey === entry.key ? (
                    <IconLoader2 size={16} className="animate-spin" />
                  ) : (
                    <IconDownload size={16} />
                  )}
                </button>
              ) : null}
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
