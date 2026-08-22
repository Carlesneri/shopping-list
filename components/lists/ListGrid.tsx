"use client"

import Link from "next/link"
import { useFirestoreCollection } from "@/lib/hooks/useFirestoreCollection"
import type { ShoppingList } from "@/lib/types"
import { Loader } from "@/components/ui/Loader"
import { ListCard } from "./ListCard"

export function ListGrid({ userEmail }: { userEmail: string }) {
  const { items: lists, loading } = useFirestoreCollection<ShoppingList>(
    "lists",
    userEmail,
  )

  if (loading) {
    return <Loader className="py-8" />
  }

  if (lists.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <p className="text-text/60">Aún no tienes ninguna lista.</p>
        <Link
          href="/compras/nueva-lista"
          className="font-bold text-purple underline underline-offset-4 hover:text-purple/80"
        >
          Crea tu primera lista
        </Link>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-3">
      {lists.map((list) => (
        <ListCard key={list.id} list={list} />
      ))}
    </div>
  )
}
