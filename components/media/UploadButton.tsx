"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { IconLoader2, IconUpload } from "@tabler/icons-react"
import { getMediaUploadUrl, uploadMediaEntries } from "@/lib/actions/media"
import { detectMediaKind } from "@/lib/media-utils"

type Color = "green" | "blue" | "purple" | "orange" | "pink"

// Files at or below this size go through a Server Action; anything bigger
// uses a presigned PUT directly to R2. Keep in sync with MAX_ACTION_UPLOAD_SIZE
// in lib/actions/media.ts.
const SMALL_FILE_LIMIT = 1024 * 1024
const MAX_TOTAL_UPLOAD_SIZE = 10 * 1024 * 1024 * 1024

const iconClasses = {
  green: "text-primary",
  blue: "text-blue",
  purple: "text-purple",
  orange: "text-orange",
  pink: "text-pink",
} as const

// Shared card style for the media section header buttons (upload, new folder).
export const fileCardButtonClass =
  "shrink-0 cursor-pointer rounded-2xl border-2 border-black/10 bg-white px-3 py-2 flex items-center gap-1.5 text-sm font-semibold text-text/60 shadow-[0_4px_0_0_#0002] transition-all duration-200 hover:shadow-[0_3px_0_0_#0002] hover:border-opacity-100 hover:translate-y-px active:translate-y-1 active:shadow-none disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none"

export function UploadButton({
  mediaId,
  prefix = "",
  color = "blue",
}: {
  mediaId: string
  /** Folder prefix the files are uploaded into (e.g. "videos/"). */
  prefix?: string
  color?: Color
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [uploading, setUploading] = useState(false)

  const busy = uploading || isPending

  async function uploadFile(file: File) {
    const key = `${prefix}${file.name}`
    if (file.size <= SMALL_FILE_LIMIT) {
      const formData = new FormData()
      formData.append("files", file)
      formData.append("prefix", prefix)
      await uploadMediaEntries(mediaId, formData)
      return
    }

    const { url } = await getMediaUploadUrl(mediaId, key, file.size)
    const response = await fetch(url, {
      method: "PUT",
      body: file,
      headers: file.type ? { "Content-Type": file.type } : undefined,
    })
    if (!response.ok) {
      throw new Error(`Error al subir ${file.name} (${response.status})`)
    }
  }

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return

    const mediaFiles = Array.from(files).filter((f) => detectMediaKind(f.name))
    const rejected = files.length - mediaFiles.length
    if (rejected > 0) {
      toast.error(
        rejected === 1
          ? "Solo se permiten archivos de vídeo, imagen o audio"
          : `${rejected} archivos ignorados: solo se permiten archivos de vídeo, imagen o audio`,
      )
    }
    if (mediaFiles.length === 0) {
      if (inputRef.current) inputRef.current.value = ""
      return
    }

    const list = mediaFiles
    const totalSize = list.reduce((sum, f) => sum + f.size, 0)
    if (totalSize > MAX_TOTAL_UPLOAD_SIZE) {
      toast.error("El tamaño total supera el límite de 10 GB")
      if (inputRef.current) inputRef.current.value = ""
      return
    }

    setUploading(true)
    Promise.allSettled(list.map(uploadFile))
      .then((results) => {
        const failures = results.filter((r) => r.status === "rejected")
        if (failures.length === 0) {
          toast.success(
            list.length === 1
              ? "Archivo subido"
              : `${list.length} archivos subidos`,
          )
        } else {
          const reason = failures[0].reason
          console.error("[media:upload] failed", reason)
          toast.error(
            failures.length === list.length
              ? reason instanceof Error
                ? reason.message
                : "No se pudieron subir los archivos"
              : `No se pudieron subir ${failures.length} de ${list.length} archivos`,
          )
        }
        if (failures.length < list.length) {
          startTransition(() => router.refresh())
        }
      })
      .finally(() => {
        setUploading(false)
        if (inputRef.current) inputRef.current.value = ""
      })
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="video/*,image/*,audio/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        title="Subir archivos al storage"
        aria-label="Subir archivos al storage"
        className={`shrink-0 cursor-pointer rounded-2xl border-2 border-black/10 bg-white px-3 py-2 flex items-center gap-1.5 text-sm font-semibold text-text/60 shadow-[0_4px_0_0_#0002] transition-all duration-200 hover:shadow-[0_3px_0_0_#0002] hover:border-opacity-100 hover:translate-y-px active:translate-y-1 active:shadow-none disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none ${iconClasses[color]}`}
      >
        {busy ? (
          <IconLoader2 size={18} className="animate-spin" />
        ) : (
          <IconUpload size={18} strokeWidth={2.5} />
        )}
        Subir archivos
      </button>
    </>
  )
}
