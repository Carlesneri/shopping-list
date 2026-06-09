"use client"
import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { signInWithCustomToken } from "firebase/auth"
import { clientAuth } from "@/lib/firebase-client"
import { getFirebaseToken } from "@/lib/actions/auth"

export function FirebaseAuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.email) return
    getFirebaseToken()
      .then((token) => {
        if (token) return signInWithCustomToken(clientAuth, token)
      })
      .catch(console.error)
  }, [session, status])

  return <>{children}</>
}
