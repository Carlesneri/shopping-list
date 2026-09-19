"use client"

import Link from "next/link"
import { useTransition } from "react"
import { removeShortcut } from "@/lib/actions/shortcuts"
import {
  IconShoppingCart,
  IconFileText,
  IconCloud,
  IconX,
} from "@tabler/icons-react"
import { toast } from "sonner"

interface ShortcutCardProps {
  title: string
  iconName: string
  href: string
  shortcutId: string
  type: "list" | "nota" | "storage"
}

// Color per section (legacy shortcuts stored a purple color for lists; the
// section decides the brand color now, so the stored value is ignored).
const sectionColors: Record<
  ShortcutCardProps["type"],
  { border: string; icon: string }
> = {
  list: { border: "border-primary", icon: "text-primary" },
  nota: { border: "border-orange", icon: "text-orange" },
  storage: { border: "border-blue", icon: "text-blue" },
}

export function ShortcutCard({
  title,
  iconName,
  href,
  shortcutId,
  type,
}: ShortcutCardProps) {
  const colors = sectionColors[type]

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
      className={`relative group aspect-square w-full max-w-xs flex flex-col p-4 rounded-3xl squircle border-2 border-black/10 ${colors.border} bg-white shadow-[0_4px_0_0_#0002] transition-all duration-200 hover:shadow-[0_3px_0_0_#0002] hover:border-opacity-100 hover:translate-y-px active:translate-y-1 active:shadow-[0_2px_0_0_#0002]`}
    >
      <div className="flex items-center justify-between">
        <Icon size={24} className={colors.icon} strokeWidth={2.5} />
        <button
          type="button"
          onClick={handleRemove}
          className="w-7 h-7 rounded-full text-text/30 hover:text-danger hover:bg-danger/10 flex items-center justify-center transition-colors"
          aria-label="Eliminar acceso directo"
        >
          <IconX size={16} strokeWidth={2.5} />
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <span className="font-bold text-base text-center leading-tight text-text line-clamp-3">
          {title}
        </span>
      </div>
    </Link>
  )
}
