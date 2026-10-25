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

/**
 * Friendly copy for the errors `createMediaFolder` can throw. Anything not in
 * this map (AWS SDK errors, server config failures, framework errors, …)
 * falls back to the generic message instead of leaking internals.
 */
const FOLDER_ERRORS: Record<string, string> = {
  "No autenticado": "Tu sesión ha caducado. Vuelve a iniciar sesión.",
  "Documento no encontrado": "Este storage ya no existe.",
  "Sin permisos para crear carpetas":
    "No tienes permisos para crear carpetas en este storage.",
  "Sin permisos para acceder a este documento":
    "No tienes acceso a este storage.",
  "Esta operación no está disponible para Google Drive todavía":
    "Todavía no se pueden crear carpetas en Google Drive.",
  "Falta el endpoint de Cloudflare R2":
    "El storage no está bien configurado. Revisa sus ajustes.",
  "Ruta de carpeta inválida": "La carpeta actual no es válida.",
  "El nombre no puede contener barras": "El nombre no puede contener barras",
}

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
      const message =
        error instanceof Error ? FOLDER_ERRORS[error.message] : undefined
      toast.error(message ?? "No se pudo crear la carpeta")
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
