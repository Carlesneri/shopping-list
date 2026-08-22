import type { Metadata } from "next"
import { cache } from "react"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getDB } from "@/lib/firebase-admin"
import { ListDetail } from "@/components/lists/ListDetail"
import { ScrollToTop } from "@/components/ui/ScrollToTop"
import { buildListMetadata } from "@/lib/metadata"
import type { ShoppingList } from "@/lib/types"

interface Props {
  params: Promise<{ id: string }>
}

const getList = cache(async (id: string): Promise<ShoppingList | null> => {
  const snap = await getDB().collection("lists").doc(id).get()
  if (!snap.exists) return null

  const data = snap.data()
  if (!data) return null

  return {
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
})

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const session = await auth()
  if (!session?.user?.email) return {}

  const { id } = await params
  const list = await getList(id)
  if (!list || !list.memberEmails.includes(session.user.email)) return {}

  const { title, description } = buildListMetadata(list)
  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { title, description },
  }
}

export default async function ListPage({ params }: Props) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.email) redirect("/")

  const list = await getList(id)
  if (!list || !list.memberEmails.includes(session.user.email)) redirect("/")

  return (
    <>
      <ListDetail
        initialList={list}
        userEmail={session.user.email}
        listId={id}
      />
      <ScrollToTop color="purple" />
    </>
  )
}
