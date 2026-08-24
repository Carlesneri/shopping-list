"use client"

import Link from "next/link"
import { useTransition } from "react"
import { removeShortcut } from "@/lib/actions/shortcuts"
import { IconShoppingCart, IconFileText, IconCloud, IconX } from "@tabler/icons-react"
import { toast } from "sonner"

interface ShortcutCardProps {
  title: string
  color: string
  iconName: string
  href: string
  shortcutId: string
  type: "list" | "nota" | "storage"
}

export function ShortcutCard({
  title,
  color,
  iconName,
  href,
  shortcutId,
  type,
}: ShortcutCardProps) {
  const borderColors: Record<string, string> = {
    purple: "border-purple",
    orange: "border-orange",
    blue: "border-blue",
  }
  const iconColors: Record<string, string> = {
    purple: "text-purple",
    orange: "text-orange",
    blue: "text-blue",
  }

  const IconMap = {
    "shopping-cart": IconShoppingCart,
    "file-text": IconFileText,
    cloud: IconCloud,
  }
  const Icon = IconMap[iconName as keyof typeof IconMap] || IconShoppingCart

  const [, startTransition] = useTransition()

  async function handleRemove(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    startTransition(async () => {
      try {
        await removeShortcut(type, shortcutId.split(":")[1])
        toast.success("Acceso directo eliminado")
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Error al eliminar")
      }
    })
  }

  return (
    <Link
      href={href}
      className={`relative group aspect-square w-full max-w-xs flex flex-col items-center justify-center gap-3 p-5 rounded-2xl border-2 border-black/10 ${borderColors[color] || borderColors.purple} bg-white shadow-[0_4px_0_0_#0002] transition-all duration-200 hover:shadow-[0_8px_0_0_#0003] hover:border-opacity-100 hover:-translate-y-1 active:translate-y-[2px] active:shadow-[0_2px_0_0_#0002]`}
    >
      <button
        type="button"
        onClick={handleRemove}
        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/80 backdrop-blur-sm text-text/40 hover:text-danger hover:bg-danger/10 flex items-center justify-center transition-colors"
        aria-label="Eliminar acceso directo"
      >
        <IconX size={15} strokeWidth={2.5} />
      </button>
      <div className="w-16 h-16 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105">
        <Icon size={32} className={`${iconColors[color] || iconColors.purple}`} strokeWidth={2.5} />
      </div>
      <span className="font-semibold text-base text-center leading-tight text-text line-clamp-2 px-2">{title}</span>
    </Link>
  )
}