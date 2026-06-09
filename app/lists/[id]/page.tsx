import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getFirestore } from "firebase-admin/firestore"
import { getAdminApp } from "@/lib/firebase-admin"
import { ListDetail } from "@/components/lists/ListDetail"
import type { ShoppingList } from "@/lib/types"

interface Props {
  params: Promise<{ id: string }>
}

export default async function ListPage({ params }: Props) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.email) redirect("/")

  const db = getFirestore(getAdminApp())
  const snap = await db.collection("lists").doc(id).get()

  if (!snap.exists) redirect("/")

  const data = snap.data()!
  if (!(data.memberEmails as string[]).includes(session.user.email)) redirect("/")

  const list = { id: snap.id, ...data } as ShoppingList

  return (
    <ListDetail
      initialList={list}
      userEmail={session.user.email}
      listId={id}
    />
  )
}
