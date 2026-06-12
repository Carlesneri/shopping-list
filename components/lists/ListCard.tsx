import Link from "next/link"
import { IconShoppingCart, IconUsers } from "@tabler/icons-react"
import type { ShoppingList } from "@/lib/types"

export function ListCard({ list }: { list: ShoppingList }) {
  return (
    <Link href={`/lists/${list.id}`}>
      <div className="flex flex-col gap-1 p-4 bg-white rounded-md border-2 border-purple shadow-[0_4px_0_0_#5b1fb5] hover:translate-y-px hover:shadow-[0_3px_0_0_#5b1fb5] active:translate-y-1 active:shadow-none transition-transform">
        <h2 className="font-bold text-lg leading-tight">{list.title}</h2>
        <div className="flex items-center gap-1 text-text/60 text-sm">
          <IconShoppingCart size={14} />
          <span>{list.market}</span>
        </div>
        <div className="flex items-center gap-1 text-text/60 text-sm mt-1">
          <IconUsers size={14} />
          <span>
            {list.allowedUsers.length}{" "}
            {list.allowedUsers.length === 1 ? "persona" : "personas"}
          </span>
        </div>
      </div>
    </Link>
  )
}
