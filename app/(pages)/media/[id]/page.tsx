import type { Metadata } from "next"
import { Suspense, cache } from "react"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getDB } from "@/lib/firebase-admin"
import { MediaDetail } from "@/components/media/MediaDetail"
import { MediaFilesSection } from "@/components/media/MediaFilesSection"
import { MediaPlayerProvider } from "@/components/media/MediaPlayerProvider"
import { Loader } from "@/components/ui/Loader"
import { ScrollToTop } from "@/components/ui/ScrollToTop"
import { DriveErrorToast } from "@/components/media/DriveErrorToast"
import { listMediaStorageEntries } from "@/lib/actions/media"
import type { MediaStorage } from "@/lib/types"

import type { AllowedUser, StorageEntry } from "@/lib/types"

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ drive_error?: string; p?: string | string[] }>
}

/** Loads the doc but strips the encrypted secret — it never reaches the client. */
const getMediaStorage = cache(
  async (id: string): Promise<MediaStorage | null> => {
    const snap = await getDB().collection("media").doc(id).get()
    if (!snap.exists) return null

    const data = snap.data()
    if (!data) return null

    const rawConfig = data.config ?? {}
    const provider = data.provider ?? "cloudflare-r2"
    // Drive configs only expose the connection status — the refresh token
    // never leaves the server.
    const config =
      provider === "google-drive"
        ? {
            refreshTokenEnc: "",
            connectedEmail: rawConfig.connectedEmail,
          }
        : {
            accountId: rawConfig.accountId ?? "",
            accessKeyId: rawConfig.accessKeyId ?? "",
            bucket: rawConfig.bucket ?? "",
            secretEnc: "",
          }

    return {
      id: snap.id,
      title: data.title ?? "",
      provider,
      allowedUsers: data.allowedUsers,
      memberEmails: data.memberEmails,
      config,
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
  provider,
  initialPath,
}: {
  id: string
  userEmail: string
  allowedUsers: AllowedUser[]
  provider: MediaStorage["provider"]
  initialPath?: string
}) {
  // Normalize "?p=" into the internal folder prefix ("videos/") so the server
  // fetches the entries of the folder in the URL, not the root — that way the
  // page renders straight into the folder with no root flash.
  const serverPath = initialPath ? `${initialPath.replace(/\/+$/, "")}/` : ""
  let entries: StorageEntry[] = []
  let loadError: string | null = null
  try {
    entries = await listMediaStorageEntries(id, serverPath)
  } catch (error) {
    console.error(`[media:page] failed to load entries for ${id}`, error)
    loadError =
      error instanceof Error
        ? error.message
        : "No se pudo cargar el contenido del bucket."
  }

  const userEntry = allowedUsers.find((u) => u.email === userEmail)
  const isAdmin = userEntry?.role === "owner" || userEntry?.role === "admin"
  const isOwner = userEntry?.role === "owner"

  return (
    <MediaFilesSection
      mediaId={id}
      provider={provider}
      isAdmin={isAdmin}
      isOwner={isOwner}
      entries={entries}
      initialError={loadError}
      initialPath={serverPath}
    />
  )
}

export default async function MediaStoragePage({
  params,
  searchParams,
}: Props) {
  const { id } = await params
  const { drive_error: driveError, p: rawPath } = await searchParams
  // Repeated query keys (?p=a&p=b) arrive as an array; use the first value.
  const p = Array.isArray(rawPath) ? rawPath[0] : rawPath
  const session = await auth()
  if (!session?.user?.email) redirect("/")

  const media = await getMediaStorage(id)
  if (!media || !media.memberEmails.includes(session.user.email)) redirect("/")

  return (
    <MediaPlayerProvider>
      <DriveErrorToast message={driveError} />
      <div className="flex flex-col px-4 py-6 max-w-lg mx-auto w-full">
        <MediaDetail media={media} userEmail={session.user.email} />

        <Suspense
          fallback={
            <Loader size={48} label="Cargando archivos…" className="py-6" />
          }
        >
          <div className="rounded-xl border-2 border-black/10 bg-white/50 p-3">
            <MediaEntries
              id={id}
              userEmail={session.user.email}
              allowedUsers={media.allowedUsers}
              provider={media.provider}
              initialPath={p}
            />
          </div>
        </Suspense>

        <ScrollToTop color="blue" />
      </div>
    </MediaPlayerProvider>
  )
}
