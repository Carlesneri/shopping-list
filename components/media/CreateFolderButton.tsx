"use client"

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { IconFolderPlus, IconLoader2 } from "@tabler/icons-react"
import { createMediaFolder } from "@/lib/actions/media"
import { fileCardButtonClass } from "./UploadButton"

type Color = "green" | "blue" | "purple" | "orange" | "pink"

const iconClasses = {
  green: "text-primary",
  blue: "text-blue",
  purple: "text-purple",
  orange: "text-orange",
  pink: "text-pink",
} as const

export function CreateFolderButton({
  onClick,
  color = "blue",
}: {
  onClick: () => void
  color?: Color
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Crear una carpeta nueva en la carpeta actual"
      aria-label="Crear carpeta"
      className={`${fileCardButtonClass} !px-2.5 justify-center ${iconClasses[color]}`}
    >
      <IconFolderPlus size={18} strokeWidth={2.5} />
    </button>
  )
}

export function NewFolderForm({
  mediaId,
  prefix,
  onDone,
}: {
  mediaId: string
  /** Folder prefix where the new folder is created (e.g. "videos/"). */
  prefix: string
  onDone: () => void
}) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [isPending, startTransition] = useTransition()
  const [creating, setCreating] = useState(false)

  const busy = creating || isPending

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const name = (data.get("name") as string | null)?.trim() ?? ""
    if (!name) {
      toast.error("El nombre no puede estar vacío")
      return
    }

    setCreating(true)
    try {
      await createMediaFolder(mediaId, prefix, name)
      toast.success("Carpeta creada")
      onDone()
      startTransition(() => router.refresh())
    } catch (error) {
      console.error("[media:mkdir] failed", error)
      toast.error(
        error instanceof Error ? error.message : "No se pudo crear la carpeta",
      )
      setCreating(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="text"
        name="name"
        disabled={busy}
        placeholder="Nombre de la carpeta"
        className="flex-1 rounded-md border border-black/10 bg-white px-3 py-1.5 text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
      />
      <button
        type="submit"
        disabled={busy}
        className="shrink-0 cursor-pointer rounded-2xl border-2 border-black/10 bg-white px-3 py-2 flex items-center gap-1.5 text-sm font-semibold text-text/60 shadow-[0_4px_0_0_#0002] transition-all duration-200 hover:shadow-[0_3px_0_0_#0002] hover:translate-y-px active:translate-y-1 active:shadow-none disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none text-blue"
      >
        {busy ? (
          <IconLoader2 size={18} className="animate-spin" />
        ) : (
          <IconFolderPlus size={18} strokeWidth={2.5} />
        )}
        Crear
      </button>
    </form>
  )
}
