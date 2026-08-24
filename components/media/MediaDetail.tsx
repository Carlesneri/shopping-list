"use client"
import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { IconSettings, IconArrowLeft, IconPin, IconPinFilled } from "@tabler/icons-react"
import { FabButton } from "@/components/ui/FabButton"
import { ShareButton } from "@/components/ui/ShareButton"
import type { MediaStorage } from "@/lib/types"
import { addShortcut, removeShortcut, isShortcut as checkIsShortcut } from "@/lib/actions/shortcuts"
import { toast } from "sonner"

interface Props {
  media: MediaStorage
  userEmail: string
}

export function MediaDetail({ media, userEmail }: Props) {
  const userEntry = media.allowedUsers.find((u) => u.email === userEmail)
  const canManage = userEntry?.role === "owner" || userEntry?.role === "admin"
  const [isShortcut, setIsShortcut] = useState(false)
  const [shortcutLoading, setShortcutLoading] = useState(false)

  const title = media.title?.trim() || "Storage sin título"

  const checkShortcut = useCallback(async () => {
    try {
      const result = await checkIsShortcut("storage", media.id)
      setIsShortcut(result)
    } catch (err) {
      console.error("Error checking shortcut:", err)
    }
  }, [media.id])

  useEffect(() => {
    checkShortcut()
  }, [checkShortcut])

  async function handleShortcutToggle() {
    setShortcutLoading(true)
    try {
      if (isShortcut) {
        await removeShortcut("storage", media.id)
        setIsShortcut(false)
        toast.success("Acceso directo eliminado")
      } else {
        await addShortcut("storage", media.id, title, "blue", "cloud")
        setIsShortcut(true)
        toast.success("Acceso directo añadido al inicio")
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al actualizar acceso directo")
    } finally {
      setShortcutLoading(false)
    }
  }

  return (
    <div className="py-6 max-w-lg mx-auto w-full">
      <Link
        href="/media"
        className="flex items-center gap-1 text-text/60 mb-5 hover:text-text transition-colors w-fit"
      >
        <IconArrowLeft size={18} />
        <span className="text-sm font-medium">Mi media</span>
      </Link>

      <div className="flex items-start justify-between mb-6">
        <h1 className="text-2xl font-bold leading-tight">{title}</h1>
        <div className="flex items-center gap-2">
          <FabButton
            type="button"
            color={isShortcut ? "blue" : "blue"}
            size="sm"
            onClick={handleShortcutToggle}
            disabled={shortcutLoading}
            aria-label={isShortcut ? "Eliminar acceso directo" : "Añadir acceso directo al inicio"}
          >
            {isShortcut ? <IconPinFilled size={18} /> : <IconPin size={18} />}
          </FabButton>
          <ShareButton path={`/media/${media.id}`} color="blue" />
          {canManage && (
            <Link href={`/media/${media.id}/ajustes`}>
              <FabButton type="button" color="blue" size="sm">
                <IconSettings size={18} />
              </FabButton>
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
