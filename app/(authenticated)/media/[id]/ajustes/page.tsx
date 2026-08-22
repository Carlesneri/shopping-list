import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getDB } from "@/lib/firebase-admin"
import { UserList } from "@/components/lists/UserList"
import { AddUserForm } from "@/components/lists/AddUserForm"
import { RenameListForm } from "@/components/lists/RenameListForm"
import { StorageConfigForm } from "@/components/media/StorageConfigForm"
import {
  deleteMediaStorage,
  renameMediaStorage,
  addUserToMedia,
  removeUserFromMedia,
} from "@/lib/actions/media"
import { Button } from "@/components/ui/Button"
import { ShareButton } from "@/components/ui/ShareButton"
import { IconArrowLeft } from "@tabler/icons-react"
import Link from "next/link"
import type { MediaStorage } from "@/lib/types"

interface Props {
  params: Promise<{ id: string }>
}

export default async function MediaSettingsPage({ params }: Props) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.email) redirect("/")

  const snap = await getDB().collection("media").doc(id).get()
  if (!snap.exists) redirect("/")

  const data = snap.data()
  if (!data) redirect("/")
  const userEntry = (
    data.allowedUsers as { email: string; role: string }[]
  ).find((u) => u.email === session.user?.email)
  if (!userEntry) redirect("/")

  const config = data.config ?? {}
  const media: MediaStorage = {
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
  const canManage = userEntry.role === "owner" || userEntry.role === "admin"
  const isOwner = userEntry.role === "owner"

  return (
    <div className="px-4 py-6 max-w-lg mx-auto w-full">
      <Link
        href={`/media/${id}`}
        className="flex items-center gap-1 text-text/60 mb-6 hover:text-text transition-colors"
      >
        <IconArrowLeft size={18} />
        <span className="text-sm">Volver al storage</span>
      </Link>
      <div className="flex items-start justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold">
          Ajustes &ldquo;{media.title || "Sin título"}&rdquo;
        </h1>
        <ShareButton path={`/media/${id}`} color="blue" />
      </div>
      {isOwner && (
        <div className="mb-8 pb-6 border-b border-black/10">
          <RenameListForm
            id={id}
            currentTitle={media.title}
            renameAction={renameMediaStorage}
            label="Nombre del storage"
          />
        </div>
      )}
      {canManage ? (
        <StorageConfigForm
          mediaId={id}
          config={{
            accountId: media.config.accountId,
            accessKeyId: media.config.accessKeyId,
            bucket: media.config.bucket,
            s3ApiEndpoint: config.S3APIendpoint ?? "",
          }}
        />
      ) : (
        <p className="mb-8 text-text/60 text-sm">
          Solo el admin puede ver y cambiar la configuración del storage.
        </p>
      )}
      <UserList
        doc={media}
        currentUserEmail={session.user.email}
        canManage={canManage}
        removeUserAction={removeUserFromMedia}
      />
      {canManage && <AddUserForm id={id} addUserAction={addUserToMedia} />}
      {isOwner && (
        <form
          action={deleteMediaStorage.bind(null, id)}
          className="mt-8 pt-6 border-t border-black/10"
        >
          <Button variant="danger" type="submit">
            Eliminar storage
          </Button>
        </form>
      )}
    </div>
  )
}
