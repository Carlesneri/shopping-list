import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getDB } from "@/lib/firebase-admin"
import { UserList } from "@/components/lists/UserList"
import { AddUserForm } from "@/components/lists/AddUserForm"
import { RenameListForm } from "@/components/lists/RenameListForm"
import {
  deleteNota,
  renameNota,
  addUserToNota,
  removeUserFromNota,
} from "@/lib/actions/notas"
import { Button } from "@/components/ui/Button"
import { ShareButton } from "@/components/ui/ShareButton"
import { IconArrowLeft } from "@tabler/icons-react"
import Link from "next/link"
import type { Nota } from "@/lib/types"

interface Props {
  params: Promise<{ id: string }>
}

export default async function NotaSettingsPage({ params }: Props) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.email) redirect("/")

  const snap = await getDB().collection("notas").doc(id).get()
  if (!snap.exists) redirect("/")

  const data = snap.data()
  if (!data) redirect("/")
  const userEntry = (
    data.allowedUsers as { email: string; role: string }[]
  ).find((u) => u.email === session.user?.email)
  if (!userEntry) redirect("/")

  const nota: Nota = {
    id: snap.id,
    title: data.title ?? "",
    text: data.text ?? "",
    allowedUsers: data.allowedUsers,
    memberEmails: data.memberEmails,
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
        href={`/notas/${id}`}
        className="flex items-center gap-1 text-text/60 mb-6 hover:text-text transition-colors"
      >
        <IconArrowLeft size={18} />
        <span className="text-sm">Volver a la nota</span>
      </Link>
      <div className="flex items-start justify-between gap-3 mb-6">
        <h1 className="text-2xl font-bold">
          Ajustes &ldquo;{nota.title || "Sin título"}&rdquo;
        </h1>
        <ShareButton path={`/notas/${id}`} color="blue" />
      </div>
      {isOwner && (
        <div className="mb-8 pb-6 border-b border-black/10">
          <RenameListForm
            id={id}
            currentTitle={nota.title}
            renameAction={renameNota}
            label="Nombre de la nota"
          />
        </div>
      )}
      <UserList
        doc={nota}
        currentUserEmail={session.user.email}
        canManage={canManage}
        removeUserAction={removeUserFromNota}
      />
      {canManage && <AddUserForm id={id} addUserAction={addUserToNota} />}
      {isOwner && (
        <form
          action={deleteNota.bind(null, id)}
          className="mt-8 pt-6 border-t border-black/10"
        >
          <Button variant="danger" type="submit">
            Eliminar nota
          </Button>
        </form>
      )}
    </div>
  )
}
