import type { Metadata } from "next"
import { cache } from "react"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getDB } from "@/lib/firebase-admin"
import { NotaDetail } from "@/components/notas/NotaDetail"
import { buildNotaMetadata } from "@/lib/list-metadata"
import type { Nota } from "@/lib/types"

interface Props {
  params: Promise<{ id: string }>
}

const getNota = cache(async (id: string): Promise<Nota | null> => {
  const snap = await getDB().collection("notas").doc(id).get()
  if (!snap.exists) return null

  const data = snap.data()
  if (!data) return null

  return {
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
})

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const nota = await getNota(id)
  if (!nota) return {}

  const { title, description } = buildNotaMetadata(nota)
  return {
    title,
    description,
    openGraph: { title, description },
    twitter: { title, description },
  }
}

export default async function NotaPage({ params }: Props) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.email) redirect("/")

  const nota = await getNota(id)
  if (!nota || !nota.memberEmails.includes(session.user.email)) redirect("/")

  return (
    <NotaDetail initialNota={nota} userEmail={session.user.email} notaId={id} />
  )
}
