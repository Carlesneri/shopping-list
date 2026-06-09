"use client"

import { useState } from "react"
import { toast } from "sonner"
import { addUserToList } from "@/lib/actions/lists"
import { Button } from "@/components/ui/Button"
import type { Role } from "@/lib/types"

export function AddUserForm({ listId }: { listId: string }) {
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<Role>("member")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await addUserToList(listId, email, role)
      setEmail("")
      toast.success("Usuario añadido")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al añadir usuario")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <h2 className="font-bold text-lg">Añadir persona</h2>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="correo@ejemplo.com"
        required
        className="border-2 border-black rounded-md px-3 py-2 font-sans focus:outline-none focus:border-primary"
      />
      <select
        value={role}
        onChange={(e) => setRole(e.target.value as Role)}
        className="border-2 border-black rounded-md px-3 py-2 font-sans focus:outline-none focus:border-primary"
      >
        <option value="member">Miembro</option>
        <option value="admin">Admin</option>
      </select>
      <Button type="submit" disabled={loading}>
        {loading ? "Añadiendo…" : "Añadir"}
      </Button>
    </form>
  )
}
