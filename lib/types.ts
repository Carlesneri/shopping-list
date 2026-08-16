export type Role = "owner" | "admin" | "member"

export interface AllowedUser {
  email: string
  role: Role
}

/** Minimal shared shape of a shareable document (list or nota). */
export interface ShareableDoc {
  id: string
  allowedUsers: AllowedUser[]
}

export interface Product {
  id: string
  name: string
  timesSelected: number
}

export interface ListProduct {
  productId: string
  name: string
  quantity: number
  checked?: boolean
}

export interface ShoppingList {
  id: string
  title: string
  market: string
  allowedUsers: AllowedUser[]
  memberEmails: string[]
  products: ListProduct[]
  createdAt: { seconds: number; nanoseconds: number }
  updatedAt: { seconds: number; nanoseconds: number }
}

export interface Nota {
  id: string
  title: string
  text: string
  allowedUsers: AllowedUser[]
  memberEmails: string[]
  createdAt: { seconds: number; nanoseconds: number }
  updatedAt: { seconds: number; nanoseconds: number }
}

export const STORAGE_PROVIDERS = ["cloudflare-r2"] as const
export type StorageProvider = (typeof STORAGE_PROVIDERS)[number]

export const PROVIDER_LABELS: Record<StorageProvider, string> = {
  "cloudflare-r2": "Cloudflare R2",
}

/** Cloudflare R2 configuration as stored in Firestore. `secretEnc` holds the
 * encrypted secret access key ("iv:tag:ciphertext", base64). */
export interface R2Config {
  accountId: string
  accessKeyId: string
  bucket: string
  secretEnc: string
  S3APIendpoint?: string
}

export interface MediaStorage {
  id: string
  title: string
  provider: StorageProvider
  allowedUsers: AllowedUser[]
  memberEmails: string[]
  config: R2Config
  createdAt: { seconds: number; nanoseconds: number }
  updatedAt: { seconds: number; nanoseconds: number }
}

export type StorageEntryType = "file" | "folder"

export type MediaKind = "video" | "image" | "audio"

export interface StorageEntry {
  key: string
  name: string
  type: StorageEntryType
  mediaKind?: MediaKind
  size?: number
  lastModified?: Date
}
