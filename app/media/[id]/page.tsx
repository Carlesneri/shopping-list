import type { Metadata } from "next"
import { cache } from "react"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getDB } from "@/lib/firebase-admin"
import { MediaDetail } from "@/components/media/MediaDetail"
import type { MediaStorage } from "@/lib/types"

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

export default async function MediaStoragePage({ params }: Props) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.email) redirect("/")

  const media = await getMediaStorage(id)
  if (!media || !media.memberEmails.includes(session.user.email)) redirect("/")

  return <MediaDetail media={media} userEmail={session.user.email} />
}
