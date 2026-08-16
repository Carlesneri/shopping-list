import Link from "next/link"
import { IconSettings, IconArrowLeft } from "@tabler/icons-react"
import { FabButton } from "@/components/ui/FabButton"
import { ShareButton } from "@/components/ui/ShareButton"
import type { MediaStorage } from "@/lib/types"

interface Props {
  media: MediaStorage
  userEmail: string
}

export function MediaDetail({ media, userEmail }: Props) {
  const userEntry = media.allowedUsers.find((u) => u.email === userEmail)
  const canManage = userEntry?.role === "owner" || userEntry?.role === "admin"

  const title = media.title?.trim() || "Storage sin título"

  return (
    <div className="px-4 py-6 max-w-lg mx-auto w-full">
      <Link
        href="/media"
        className="flex items-center gap-1 text-text/60 mb-5 hover:text-text transition-colors w-fit"
      >
        <IconArrowLeft size={18} />
        <span className="text-sm font-medium">Mis storages</span>
      </Link>

      <div className="flex items-start justify-between mb-6">
        <h1 className="text-2xl font-bold leading-tight">{title}</h1>
        <div className="flex items-center gap-2">
          <ShareButton path={`/media/${media.id}`} color="purple" />
          {canManage && (
            <Link href={`/media/${media.id}/ajustes`}>
              <FabButton type="button" color="purple" size="sm">
                <IconSettings size={18} />
              </FabButton>
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
