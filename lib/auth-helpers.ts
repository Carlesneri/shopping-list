import { auth } from "@/auth"
import { getDB } from "@/lib/firebase-admin"
import type { AllowedUser, Role } from "@/lib/types"

export async function requireAuth() {
  const session = await auth()
  if (!session?.user?.email) throw new Error("No autenticado")
  return { session, email: session.user.email }
}

export async function requireDoc(collection: string, docId: string) {
  const db = getDB()
  const ref = db.collection(collection).doc(docId)
  const snap = await ref.get()
  if (!snap.exists) throw new Error("Documento no encontrado")
  const data = snap.data()!
  return { ref, data }
}

export async function requireCallerRole(
  collection: string,
  docId: string,
  email: string,
  allowedRoles: Role[] = ["owner", "admin"],
  action: string = "realizar esta acción",
) {
  const { ref, data } = await requireDoc(collection, docId)
  const caller = (data.allowedUsers as AllowedUser[]).find(
    (u) => u.email === email,
  )
  if (!caller || !allowedRoles.includes(caller.role)) {
    throw new Error(`Sin permisos para ${action}`)
  }
  return { ref, data, caller }
}

export async function requireMember(
  collection: string,
  docId: string,
  email: string,
) {
  const { ref, data } = await requireDoc(collection, docId)
  const memberEmails = (data.memberEmails as string[]) ?? []
  if (!memberEmails.includes(email)) {
    throw new Error("Sin permisos para acceder a este documento")
  }
  return { ref, data }
}
