import { STORAGE_PROVIDERS, type StorageProvider } from "@/lib/types"

export function validateListInput(title: string, market: string) {
  if (!title.trim()) throw new Error("El título es requerido")
  if (!market.trim()) throw new Error("El mercado es requerido")
  return { title: title.trim(), market: market.trim() }
}

export function validateNotaInput(title: string) {
  return { title: title.trim() }
}

export function validateMediaInput(
  title: string,
  provider: string,
  accountId: string,
  accessKeyId: string,
  secretAccessKey: string,
  bucket: string,
) {
  const trimmedTitle = title.trim()
  if (!trimmedTitle) throw new Error("El título es requerido")
  if (!STORAGE_PROVIDERS.includes(provider as StorageProvider)) {
    throw new Error("Proveedor no soportado")
  }
  const trimmedAccountId = accountId.trim()
  if (!trimmedAccountId) throw new Error("El account ID es requerido")
  const trimmedAccessKeyId = accessKeyId.trim()
  if (!trimmedAccessKeyId) throw new Error("El access key ID es requerido")
  const trimmedSecret = secretAccessKey.trim()
  if (!trimmedSecret) throw new Error("El secret access key es requerido")
  const trimmedBucket = bucket.trim()
  if (!trimmedBucket) throw new Error("El bucket es requerido")
  return {
    title: trimmedTitle,
    provider: provider as StorageProvider,
    accountId: trimmedAccountId,
    accessKeyId: trimmedAccessKeyId,
    secretAccessKey: trimmedSecret,
    bucket: trimmedBucket,
  }
}

/** Validates a config update. An empty secret means "keep the current one". */
export function validateMediaConfigUpdate(
  accountId: string,
  accessKeyId: string,
  secretAccessKey: string,
  bucket: string,
) {
  const trimmedAccountId = accountId.trim()
  if (!trimmedAccountId) throw new Error("El account ID es requerido")
  const trimmedAccessKeyId = accessKeyId.trim()
  if (!trimmedAccessKeyId) throw new Error("El access key ID es requerido")
  const trimmedBucket = bucket.trim()
  if (!trimmedBucket) throw new Error("El bucket es requerido")
  return {
    accountId: trimmedAccountId,
    accessKeyId: trimmedAccessKeyId,
    secretAccessKey: secretAccessKey.trim(),
    bucket: trimmedBucket,
  }
}
