import { describe, it, expect, vi } from "vitest"
import { shareUrl } from "../share"

const url = "https://compale.app/lists/abc"

describe("shareUrl", () => {
  it("uses the Web Share API when available", async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    const writeText = vi.fn()

    const result = await shareUrl(url, { share, clipboard: { writeText } })

    expect(result).toBe("shared")
    expect(share).toHaveBeenCalledWith({ url })
    expect(writeText).not.toHaveBeenCalled()
  })

  it("copies to clipboard when share is not available", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)

    const result = await shareUrl(url, { clipboard: { writeText } })

    expect(result).toBe("copied")
    expect(writeText).toHaveBeenCalledWith(url)
  })

  it("returns cancelled when the user dismisses the share sheet", async () => {
    const abort = Object.assign(new Error("dismissed"), { name: "AbortError" })
    const share = vi.fn().mockRejectedValue(abort)
    const writeText = vi.fn()

    const result = await shareUrl(url, { share, clipboard: { writeText } })

    expect(result).toBe("cancelled")
    expect(writeText).not.toHaveBeenCalled()
  })
})
