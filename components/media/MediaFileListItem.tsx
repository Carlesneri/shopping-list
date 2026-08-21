"use client"

import {
  IconFile,
  IconFolder,
  IconMusic,
  IconPhoto,
  IconVideo,
} from "@tabler/icons-react"
import type { MediaKind, StorageEntry } from "@/lib/types"
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

interface MediaFileListItemProps {
  entry: StorageEntry
  isSelected: boolean
  onToggleSelect: () => void
  loadingAction: { key: string; action: ActionKind } | null
  isAdmin: boolean
  onPlay: () => void
  onVlc: () => void
  onPlaylist: () => void
  onDownload: () => void
  onCopyUrl: () => void
  onDelete: () => void
}

export function MediaFileListItem({
  entry,
  isSelected,
  onToggleSelect,
  loadingAction,
  isAdmin,
  onPlay,
  onVlc,
  onPlaylist,
  onDownload,
  onCopyUrl,
  onDelete,
}: MediaFileListItemProps) {
  const isFile = entry.type === "file"
  const isMkv = entry.key.toLowerCase().endsWith(".mkv")

  return (
    <li className="rounded-md border border-black/10 bg-white text-sm">
      <div className="flex flex-col gap-1 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <EntryIcon entry={entry} />
          {isFile ? (
            <button
              type="button"
              onClick={onToggleSelect}
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
            isMkv={isMkv}
            isFile={isFile}
            isAdmin={isAdmin}
            loading={loadingAction}
            onPlay={onPlay}
            onVlc={onVlc}
            onPlaylist={onPlaylist}
            onDownload={onDownload}
            onCopyUrl={onCopyUrl}
            onDelete={onDelete}
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
}
