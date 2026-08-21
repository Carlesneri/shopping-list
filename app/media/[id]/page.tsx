import type { Metadata } from "next"
import { Suspense, cache } from "react"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getDB } from "@/lib/firebase-admin"
import { MediaDetail } from "@/components/media/MediaDetail"
import { MediaFileList } from "@/components/media/MediaFileList"
import { Loader } from "@/components/ui/Loader"
import { listMediaStorageEntries } from "@/lib/actions/media"
import type { MediaStorage } from "@/lib/types"

import type { AllowedUser } from "@/lib/types"

interface Props {
  params: Promise<{ id: string }>
}

/** Loads the doc but strips the encrypted secret — it never reaches the client. */
const getMediaStorage = cache(
  async (id: string): Promise<MediaStorage | null> => {
    const snap = await getDB().collection("media").doc(id).get()
    if (!snap.exists) return null

    const data = snap.data()
    if (!data) return null

    const config = data.config ?? {}
    return {
      id: snap.id,
      title: data.title ?? "",
      provider: data.provider ?? "cloudflare-r2",
      allowedUsers: data.allowedUsers,
      memberEmails: data.memberEmails,
      config: {
        accountId: config.accountId ?? "",
        accessKeyId: config.accessKeyId ?? "",
        bucket: config.bucket ?? "",
        secretEnc: "",
      },
      createdAt: {
        seconds: data.createdAt?.seconds ?? 0,
        nanoseconds: data.createdAt?.nanoseconds ?? 0,
      },
      updatedAt: {
        seconds: data.updatedAt?.seconds ?? 0,
        nanoseconds: data.updatedAt?.nanoseconds ?? 0,
      },
    }
  },
)

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const media = await getMediaStorage(id)
  if (!media) return {}

  return {
    title: media.title || "Storage",
    robots: { index: false, follow: false },
  }
}

async function MediaEntries({
  id,
  userEmail,
  allowedUsers,
}: {
  id: string
  userEmail: string
  allowedUsers: AllowedUser[]
}) {
  const entries = await listMediaStorageEntries(id).catch((error) => {
    console.error(`[media:page] failed to load entries for ${id}`, error)
    return []
  })

  const userEntry = allowedUsers.find((u) => u.email === userEmail)
  const isAdmin = userEntry?.role === "owner" || userEntry?.role === "admin"

  if (entries.length === 0) {
    return (
      <p className="text-sm text-text/60">
        Este bucket está vacío o no se pudo cargar su contenido.
      </p>
    )
  }

  return <MediaFileList mediaId={id} entries={entries} isAdmin={isAdmin} />
}

export default async function MediaStoragePage({ params }: Props) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.email) redirect("/")

  const media = await getMediaStorage(id)
  if (!media || !media.memberEmails.includes(session.user.email)) redirect("/")

  return (
    <div className="flex flex-col gap-6 px-4 py-6 max-w-lg mx-auto w-full">
      <MediaDetail media={media} userEmail={session.user.email} />

      <div className="rounded-xl border-2 border-black/10 bg-white/50 p-3">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text/60">
          Archivos y carpetas
        </h2>

        <Suspense
          fallback={
            <Loader size={48} label="Cargando archivos…" className="py-6" />
          }
        >
          <MediaEntries
            id={id}
            userEmail={session.user.email}
            allowedUsers={media.allowedUsers}
          />
        </Suspense>
      </div>
    </div>
  )
}
