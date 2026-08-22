import { STORAGE_PROVIDERS, type StorageProvider } from "@/lib/types"

const MAX_TITLE = 200
const MAX_MARKET = 100
const MAX_NOTA_TEXT = 10_000
const MAX_STRING = 500

export function validateListInput(title: string, market: string) {
  if (!title.trim()) throw new Error("El título es requerido")
  if (title.length > MAX_TITLE)
    throw new Error(`El título no puede superar ${MAX_TITLE} caracteres`)
  if (!market.trim()) throw new Error("El mercado es requerido")
  if (market.length > MAX_MARKET)
    throw new Error(`El mercado no puede superar ${MAX_MARKET} caracteres`)
  return { title: title.trim(), market: market.trim() }
}

export function validateNotaInput(title: string) {
  if (title.length > MAX_TITLE)
    throw new Error(`El título no puede superar ${MAX_TITLE} caracteres`)
  return { title: title.trim() }
}

export function validateNotaText(text: string) {
  if (text.length > MAX_NOTA_TEXT)
    throw new Error(`El texto no puede superar ${MAX_NOTA_TEXT} caracteres`)
  return text.trim()
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
  if (trimmedTitle.length > MAX_TITLE)
    throw new Error(`El título no puede superar ${MAX_TITLE} caracteres`)
  if (!STORAGE_PROVIDERS.includes(provider as StorageProvider)) {
    throw new Error("Proveedor no soportado")
  }
  const trimmedAccountId = accountId.trim()
  if (!trimmedAccountId) throw new Error("El account ID es requerido")
  if (trimmedAccountId.length > MAX_STRING)
    throw new Error(`El account ID no puede superar ${MAX_STRING} caracteres`)
  const trimmedAccessKeyId = accessKeyId.trim()
  if (!trimmedAccessKeyId) throw new Error("El access key ID es requerido")
  if (trimmedAccessKeyId.length > MAX_STRING)
    throw new Error(
      `El access key ID no puede superar ${MAX_STRING} caracteres`,
    )
  const trimmedSecret = secretAccessKey.trim()
  if (!trimmedSecret) throw new Error("El secret access key es requerido")
  if (trimmedSecret.length > MAX_STRING)
    throw new Error(
      `El secret access key no puede superar ${MAX_STRING} caracteres`,
    )
  const trimmedBucket = bucket.trim()
  if (!trimmedBucket) throw new Error("El bucket es requerido")
  if (trimmedBucket.length > MAX_STRING)
    throw new Error(`El bucket no puede superar ${MAX_STRING} caracteres`)
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
  if (trimmedAccountId.length > MAX_STRING)
    throw new Error(`El account ID no puede superar ${MAX_STRING} caracteres`)
  const trimmedAccessKeyId = accessKeyId.trim()
  if (!trimmedAccessKeyId) throw new Error("El access key ID es requerido")
  if (trimmedAccessKeyId.length > MAX_STRING)
    throw new Error(
      `El access key ID no puede superar ${MAX_STRING} caracteres`,
    )
  const trimmedBucket = bucket.trim()
  if (!trimmedBucket) throw new Error("El bucket es requerido")
  if (trimmedBucket.length > MAX_STRING)
    throw new Error(`El bucket no puede superar ${MAX_STRING} caracteres`)
  return {
    accountId: trimmedAccountId,
    accessKeyId: trimmedAccessKeyId,
    secretAccessKey: secretAccessKey.trim(),
    bucket: trimmedBucket,
  }
}
