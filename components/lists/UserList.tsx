import { removeUserFromList } from "@/lib/actions/lists"
import type { ShoppingList } from "@/lib/types"
import { IconTrash } from "@tabler/icons-react"

const ROLE_LABELS: Record<string, string> = {
  owner: "Propietario",
  admin: "Admin",
  member: "Miembro",
}

const ROLE_COLORS: Record<string, string> = {
  owner: "bg-primary/20 text-primary",
  admin: "bg-secondary/20 text-secondary",
  member: "bg-black/10 text-text/60",
}

interface Props {
  list: ShoppingList
  currentUserEmail: string
  canManage: boolean
}

export function UserList({ list, currentUserEmail, canManage }: Props) {
  return (
    <ul className="flex flex-col gap-2 mb-6">
      {list.allowedUsers.map((user) => (
        <li
          key={user.email}
          className="flex items-center justify-between gap-2 p-3 rounded-md border-2 border-black/10"
        >
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-sm font-semibold truncate">{user.email}</span>
            <span
              className={`self-start text-xs font-mono px-1.5 py-0.5 rounded ${ROLE_COLORS[user.role]}`}
            >
              {ROLE_LABELS[user.role]}
            </span>
          </div>
          {canManage && user.role !== "owner" && user.email !== currentUserEmail && (
            <form action={removeUserFromList.bind(null, list.id, user.email)}>
              <button
                type="submit"
                className="text-danger hover:opacity-70 transition-opacity"
                aria-label="Eliminar usuario"
              >
                <IconTrash size={18} />
              </button>
            </form>
          )}
        </li>
      ))}
    </ul>
  )
}
