import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto"

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 12

function getKey(): Buffer {
  const raw = process.env.MEDIA_ENCRYPTION_KEY
  if (!raw) throw new Error("MEDIA_ENCRYPTION_KEY no está configurada")
  const key = Buffer.from(raw, "base64")
  if (key.length !== 32) {
    throw new Error(
      "MEDIA_ENCRYPTION_KEY debe ser una clave de 32 bytes en base64",
    )
  }
  return key
}

/**
 * Encrypts a secret with AES-256-GCM. Returns "iv:tag:ciphertext", all
 * base64-encoded. `iv` is injected so tests can use deterministic vectors.
 */
export function encryptSecret(plaintext: string, iv = randomBytes(IV_LENGTH)) {
  const cipher = createCipheriv(ALGORITHM, getKey(), iv)
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()
  return [
    iv.toString("base64"),
    tag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(":")
}

/** Decrypts a value produced by `encryptSecret`. Throws if tampered or if the
 * key does not match the one used for encryption. */
export function decryptSecret(packed: string) {
  const [ivB64, tagB64, dataB64] = packed.split(":")
  if (!ivB64 || !tagB64 || !dataB64) {
    throw new Error("Secreto cifrado malformado")
  }

  const decipher = createDecipheriv(
    ALGORITHM,
    getKey(),
    Buffer.from(ivB64, "base64"),
  )
  decipher.setAuthTag(Buffer.from(tagB64, "base64"))
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]).toString("utf8")
}
