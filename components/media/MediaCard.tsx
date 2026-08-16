import Link from "next/link"
import { IconUsers, IconCloud } from "@tabler/icons-react"
import { ShareButton } from "@/components/ui/ShareButton"
import { PROVIDER_LABELS, type MediaStorage } from "@/lib/types"

export function MediaCard({ media }: { media: MediaStorage }) {
  const title = media.title?.trim() || "Storage sin título"

  return (
    <div className="relative flex flex-col gap-1 p-4 bg-white rounded-md border-2 border-purple shadow-[0_4px_0_0_#5b1fb5] hover:translate-y-px hover:shadow-[0_3px_0_0_#5b1fb5] active:translate-y-1 active:shadow-none transition-transform">
      <div className="absolute top-3 right-3 z-10">
        <ShareButton path={`/media/${media.id}`} variant="plain" />
      </div>

      <Link href={`/media/${media.id}`} className="block min-w-0 pr-12">
        <h2 className="font-bold text-lg leading-tight">{title}</h2>
        <div className="flex items-center gap-1.5 text-text/60 text-sm mt-0.5">
          <IconCloud size={14} />
          <span>{PROVIDER_LABELS[media.provider] ?? media.provider}</span>
          <span className="text-text/40">·</span>
          <span className="truncate">{media.config?.bucket ?? ""}</span>
        </div>
        <div className="flex items-center gap-1 text-text/60 text-sm mt-1">
          <IconUsers size={14} />
          <span>
            {media.allowedUsers.length}{" "}
            {media.allowedUsers.length === 1 ? "persona" : "personas"}
          </span>
        </div>
      </Link>
    </div>
  )
}
