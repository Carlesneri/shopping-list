import Link from "next/link"
import { IconUsers } from "@tabler/icons-react"
import { ShareButton } from "@/components/ui/ShareButton"
import type { Nota } from "@/lib/types"

export function NotaCard({ nota }: { nota: Nota }) {
  const preview = nota.text?.trim()
    ? nota.text.trim().slice(0, 80)
    : "Sin contenido"

  const title = nota.title?.trim() || "Nota sin título"

  return (
    <Link href={`/notas/${nota.id}`}>
      <div className="relative flex flex-col gap-1 p-4 bg-white rounded-md border-2 border-orange shadow-[0_4px_0_0_#c45c0a] hover:translate-y-px hover:shadow-[0_3px_0_0_#c45c0a] active:translate-y-1 active:shadow-none transition-transform">
        <div className="absolute top-3 right-3">
          <ShareButton path={`/notas/${nota.id}`} variant="plain" />
        </div>
        <h2 className="font-bold text-lg leading-tight pr-12">{title}</h2>
        <p className="text-text/60 text-sm leading-snug line-clamp-2 mt-0.5">
          {preview}
        </p>
        <div className="flex items-center gap-1 text-text/60 text-sm mt-1">
          <IconUsers size={14} />
          <span>
            {nota.allowedUsers.length}{" "}
            {nota.allowedUsers.length === 1 ? "persona" : "personas"}
          </span>
        </div>
      </div>
    </Link>
  )
}
