import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getDB } from "@/lib/firebase-admin"
import { ListDetail } from "@/components/lists/ListDetail"
import type { ShoppingList } from "@/lib/types"

interface Props {
  params: Promise<{ id: string }>
}

export default async function ListPage({ params }: Props) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.email) redirect("/")

  const snap = await getDB().collection("lists").doc(id).get()

  if (!snap.exists) redirect("/")

  const data = snap.data()
  if (!data || !(data.memberEmails as string[]).includes(session.user.email))
    redirect("/")

  const list: ShoppingList = {
    id: snap.id,
    title: data.title,
    market: data.market,
    allowedUsers: data.allowedUsers,
    memberEmails: data.memberEmails,
    products: data.products ?? [],
    createdAt: {
      seconds: data.createdAt?.seconds ?? 0,
      nanoseconds: data.createdAt?.nanoseconds ?? 0,
    },
    updatedAt: {
      seconds: data.updatedAt?.seconds ?? 0,
      nanoseconds: data.updatedAt?.nanoseconds ?? 0,
    },
  }

  return (
    <ListDetail initialList={list} userEmail={session.user.email} listId={id} />
  )
}
