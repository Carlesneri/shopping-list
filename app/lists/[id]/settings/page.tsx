import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getFirestore } from "firebase-admin/firestore"
import { getAdminApp } from "@/lib/firebase-admin"
import { UserList } from "@/components/lists/UserList"
import { AddUserForm } from "@/components/lists/AddUserForm"
import { deleteList } from "@/lib/actions/lists"
import { Button } from "@/components/ui/Button"
import { IconArrowLeft } from "@tabler/icons-react"
import Link from "next/link"
import type { ShoppingList } from "@/lib/types"

interface Props {
  params: Promise<{ id: string }>
}

export default async function ListSettingsPage({ params }: Props) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.email) redirect("/")

  const db = getFirestore(getAdminApp())
  const snap = await db.collection("lists").doc(id).get()
  if (!snap.exists) redirect("/")

  const data = snap.data()!
  const userEntry = (data.allowedUsers as { email: string; role: string }[]).find(
    (u) => u.email === session.user!.email,
  )
  if (!userEntry) redirect("/")

  const list = { id: snap.id, ...data } as ShoppingList
  const canManage = userEntry.role === "owner" || userEntry.role === "admin"
  const isOwner = userEntry.role === "owner"

  return (
    <div className="px-4 py-6 max-w-lg mx-auto w-full">
      <Link
        href={`/lists/${id}`}
        className="flex items-center gap-1 text-text/60 mb-6 hover:text-text transition-colors"
      >
        <IconArrowLeft size={18} />
        <span className="text-sm">Volver a la lista</span>
      </Link>
      <h1 className="text-2xl font-bold mb-6">Compartir &ldquo;{list.title}&rdquo;</h1>
      <UserList list={list} currentUserEmail={session.user.email} canManage={canManage} />
      {canManage && <AddUserForm listId={id} />}
      {isOwner && (
        <form
          action={deleteList.bind(null, id)}
          className="mt-8 pt-6 border-t border-black/10"
        >
          <Button variant="danger" type="submit">
            Eliminar lista
          </Button>
        </form>
      )}
    </div>
  )
}
