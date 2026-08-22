import { describe, it, expect } from "vitest"
import { validateMediaInput, validateMediaConfigUpdate } from "../validation"

describe("validateMediaInput", () => {
  const valid = {
    title: " Mi storage ",
    provider: "cloudflare-r2",
    accountId: " account123 ",
    accessKeyId: " key123 ",
    secretAccessKey: " secret123 ",
    bucket: " mi-bucket ",
  }

  it("returns trimmed values for valid input", () => {
    expect(
      validateMediaInput(
        valid.title,
        valid.provider,
        valid.accountId,
        valid.accessKeyId,
        valid.secretAccessKey,
        valid.bucket,
      ),
    ).toEqual({
      title: "Mi storage",
      provider: "cloudflare-r2",
      accountId: "account123",
      accessKeyId: "key123",
      secretAccessKey: "secret123",
      bucket: "mi-bucket",
    })
  })

  it("throws when title is empty", () => {
    expect(() =>
      validateMediaInput("", "cloudflare-r2", "a", "k", "s", "b"),
    ).toThrow("El título es requerido")
  })

  it("throws when provider is unsupported", () => {
    expect(() => validateMediaInput("T", "aws-s3", "a", "k", "s", "b")).toThrow(
      "Proveedor no soportado",
    )
  })

  it("throws when accountId is empty", () => {
    expect(() =>
      validateMediaInput("T", "cloudflare-r2", "  ", "k", "s", "b"),
    ).toThrow("El account ID es requerido")
  })

  it("throws when accessKeyId is empty", () => {
    expect(() =>
      validateMediaInput("T", "cloudflare-r2", "a", "", "s", "b"),
    ).toThrow("El access key ID es requerido")
  })

  it("throws when secretAccessKey is empty", () => {
    expect(() =>
      validateMediaInput("T", "cloudflare-r2", "a", "k", "   ", "b"),
    ).toThrow("El secret access key es requerido")
  })

  it("throws when bucket is empty", () => {
    expect(() =>
      validateMediaInput("T", "cloudflare-r2", "a", "k", "s", ""),
    ).toThrow("El bucket es requerido")
  })
})

describe("validateMediaConfigUpdate", () => {
  it("allows an empty secret (keep current)", () => {
    expect(validateMediaConfigUpdate("a", "k", "", "b")).toEqual({
      accountId: "a",
      accessKeyId: "k",
      secretAccessKey: "",
      bucket: "b",
    })
  })

  it("trims all fields", () => {
    expect(validateMediaConfigUpdate(" a ", " k ", " s ", " b ")).toEqual({
      accountId: "a",
      accessKeyId: "k",
      secretAccessKey: "s",
      bucket: "b",
    })
  })

  it("throws when accountId is empty", () => {
    expect(() => validateMediaConfigUpdate("", "k", "s", "b")).toThrow(
      "El account ID es requerido",
    )
  })

  it("throws when bucket is empty", () => {
    expect(() => validateMediaConfigUpdate("a", "k", "s", "  ")).toThrow(
      "El bucket es requerido",
    )
  })
})
