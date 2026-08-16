import { describe, it, expect, beforeAll } from "vitest"
import { randomBytes } from "node:crypto"
import { encryptSecret, decryptSecret } from "../crypto"

const KEY = randomBytes(32).toString("base64")

beforeAll(() => {
  process.env.MEDIA_ENCRYPTION_KEY = KEY
})

describe("crypto", () => {
  it("roundtrips a secret", () => {
    const enc = encryptSecret("my-super-secret")
    expect(enc).not.toContain("my-super-secret")
    expect(decryptSecret(enc)).toBe("my-super-secret")
  })

  it("produces a different ciphertext each time (random IV)", () => {
    expect(encryptSecret("same")).not.toBe(encryptSecret("same"))
  })

  it("supports unicode secrets", () => {
    const enc = encryptSecret("clave-ñandú-🔒")
    expect(decryptSecret(enc)).toBe("clave-ñandú-🔒")
  })

  it("fails to decrypt with a different key", () => {
    const enc = encryptSecret("secret", randomBytes(12))
    process.env.MEDIA_ENCRYPTION_KEY = randomBytes(32).toString("base64")
    expect(() => decryptSecret(enc)).toThrow()
    process.env.MEDIA_ENCRYPTION_KEY = KEY
  })

  it("fails when the ciphertext is tampered", () => {
    const enc = encryptSecret("secret", randomBytes(12))
    const [iv, tag, data] = enc.split(":")
    const tamperedData = Buffer.from(data, "base64")
    tamperedData[0] ^= 0xff
    const tampered = [iv, tag, tamperedData.toString("base64")].join(":")
    expect(() => decryptSecret(tampered)).toThrow()
  })

  it("fails when the auth tag is tampered", () => {
    const enc = encryptSecret("secret", randomBytes(12))
    const [iv, tag, data] = enc.split(":")
    const tamperedTag = Buffer.from(tag, "base64")
    tamperedTag[0] ^= 0xff
    const tampered = [iv, tamperedTag.toString("base64"), data].join(":")
    expect(() => decryptSecret(tampered)).toThrow()
  })

  it("throws on malformed input", () => {
    expect(() => decryptSecret("not-valid")).toThrow("malformado")
    expect(() => decryptSecret("a:b")).toThrow("malformado")
  })

  it("throws when MEDIA_ENCRYPTION_KEY is missing", () => {
    const previous = process.env.MEDIA_ENCRYPTION_KEY
    delete process.env.MEDIA_ENCRYPTION_KEY
    expect(() => encryptSecret("secret")).toThrow("MEDIA_ENCRYPTION_KEY")
    process.env.MEDIA_ENCRYPTION_KEY = previous
  })

  it("throws when MEDIA_ENCRYPTION_KEY has the wrong length", () => {
    const previous = process.env.MEDIA_ENCRYPTION_KEY
    process.env.MEDIA_ENCRYPTION_KEY = randomBytes(16).toString("base64")
    expect(() => encryptSecret("secret")).toThrow("32 bytes")
    process.env.MEDIA_ENCRYPTION_KEY = previous
  })
})
