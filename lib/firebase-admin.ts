import { initializeApp, getApps, cert, type App } from "firebase-admin/app"
import { getFirestore } from "firebase-admin/firestore"

export function getAdminApp(): App {
  if (getApps().length > 0) return getApps()[0]
  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  })
}

export function getDB() {
  const app = getAdminApp()

  return getFirestore(app, "compale")
}
