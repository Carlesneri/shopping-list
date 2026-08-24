"use server"

import { FieldValue } from "firebase-admin/firestore"
import { revalidatePath } from "next/cache"
import { getDB } from "@/lib/firebase-admin"
import { requireAuth, requireMember } from "@/lib/auth-helpers"
import type { Shortcut, ShortcutType } from "@/lib/types"

const SHORTCUTS_COLLECTION = "shortcuts"

function getShortcutRef(email: string) {
  const db = getDB()
  return db.collection(SHORTCUTS_COLLECTION).doc(email)
}

export async function addShortcut(
  type: ShortcutType,
  targetId: string,
  title: string,
  color: string,
  icon: string,
) {
  const { email } = await requireAuth()

  if (type === "list") {
    await requireMember("lists", targetId, email)
  } else if (type === "nota") {
    await requireMember("notas", targetId, email)
  } else if (type === "storage") {
    await requireMember("media", targetId, email)
  }

  const shortcutId = `${type}:${targetId}`
  const shortcut: Omit<Shortcut, "id"> = {
    type,
    targetId,
    title,
    color,
    icon,
    createdAt: { seconds: Math.floor(Date.now() / 1000), nanoseconds: 0 },
  }

  await getShortcutRef(email).set(
    {
      shortcuts: FieldValue.arrayUnion({ id: shortcutId, ...shortcut }),
    },
    { merge: true },
  )

  revalidatePath("/")
}

export async function removeShortcut(type: ShortcutType, targetId: string) {
  const { email } = await requireAuth()

  const shortcutId = `${type}:${targetId}`
  const db = getDB()
  const ref = getShortcutRef(email)

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists) return
    const data = snap.data()!
    const shortcuts = (data.shortcuts as Shortcut[]) ?? []
    const filtered = shortcuts.filter((s) => s.id !== shortcutId)
    tx.update(ref, { shortcuts: filtered })
  })

  revalidatePath("/")
}

export async function getShortcuts(): Promise<Shortcut[]> {
  const { email } = await requireAuth()

  const snap = await getShortcutRef(email).get()
  if (!snap.exists) return []

  const data = snap.data()
  return (data?.shortcuts as Shortcut[]) ?? []
}

export async function isShortcut(type: ShortcutType, targetId: string): Promise<boolean> {
  const { email } = await requireAuth()

  const shortcutId = `${type}:${targetId}`
  const snap = await getShortcutRef(email).get()
  if (!snap.exists) return false

  const data = snap.data()
  const shortcuts = (data?.shortcuts as Shortcut[]) ?? []
  return shortcuts.some((s) => s.id === shortcutId)
}