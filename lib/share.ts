export interface ShareNav {
  share?: (data: { url: string }) => Promise<void>
  clipboard: { writeText: (text: string) => Promise<void> }
}

export type ShareResult = "shared" | "copied" | "cancelled"

/**
 * Shares a URL via the Web Share API when available, otherwise copies it to the
 * clipboard. `nav` is injected so the behavior is testable without globals.
 */
export async function shareUrl(
  url: string,
  nav: ShareNav,
): Promise<ShareResult> {
  if (nav.share) {
    try {
      await nav.share({ url })
      return "shared"
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return "cancelled"
      // Share failed for another reason — fall back to copying.
    }
  }

  await nav.clipboard.writeText(url)
  return "copied"
}
