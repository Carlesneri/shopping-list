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
  /** Market catalog reference (e.g. a Mercadona product id), set when the
   * product was picked from a market suggestion. */
  marketProductId?: string
  /** Product image URL from the market catalog. */
  image?: string
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

export const STORAGE_PROVIDERS = ["cloudflare-r2", "google-drive"] as const
export type StorageProvider = (typeof STORAGE_PROVIDERS)[number]

export const PROVIDER_LABELS: Record<StorageProvider, string> = {
  "cloudflare-r2": "Cloudflare R2",
  "google-drive": "Google Drive",
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

/** Google Drive configuration as stored in Firestore. `refreshTokenEnc` holds
 * the OAuth refresh token ("iv:tag:ciphertext", base64); empty until the user
 * completes the Drive consent flow. */
export interface DriveConfig {
  refreshTokenEnc: string
  connectedEmail?: string
}

export type MediaStorageConfig = R2Config | DriveConfig

export interface MediaStorage {
  id: string
  title: string
  provider: StorageProvider
  allowedUsers: AllowedUser[]
  memberEmails: string[]
  config: MediaStorageConfig
  createdAt: { seconds: number; nanoseconds: number }
  updatedAt: { seconds: number; nanoseconds: number }
}

export type StorageEntryType = "file" | "folder"

export type MediaKind = "video" | "image" | "audio"

export type ShortcutType = "list" | "nota" | "storage"

export interface Shortcut {
  id: string
  type: ShortcutType
  title: string
  targetId: string
  color: string
  icon: string
  createdAt: { seconds: number; nanoseconds: number }
}

export interface StorageEntry {
  key: string
  name: string
  type: StorageEntryType
  mediaKind?: MediaKind
  size?: number
  lastModified?: Date
}
