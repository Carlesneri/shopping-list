"use server"
import crypto from "crypto"
import { auth } from "@/auth"
import { getAdminApp } from "@/lib/firebase-admin"
import { getAuth } from "firebase-admin/auth"

export async function getFirebaseToken(): Promise<string | null> {
  const session = await auth()
  if (!session?.user?.email) return null

  const uid = crypto.createHash("sha256").update(session.user.email).digest("hex")
  const token = await getAuth(getAdminApp()).createCustomToken(uid, {
    email: session.user.email,
  })
  return token
}
