export const BROWSER_PLAYABLE_VIDEO_EXTS = ["mp4", "mov", "webm", "m4v"] as const

export const BROWSER_UNPLAYABLE_VIDEO_EXTS = [
  "avi",
  "mkv",
  "mpg",
  "mpeg",
] as const

export function getExtension(key: string): string {
  return key.split(".").at(-1)?.toLowerCase() ?? ""
}

export function isVideoPlayableInBrowser(key: string): boolean {
  const ext = getExtension(key)
  return (BROWSER_PLAYABLE_VIDEO_EXTS as readonly string[]).includes(ext)
}

export function isVideoNativelyUnsupported(key: string): boolean {
  const ext = getExtension(key)
  return (BROWSER_UNPLAYABLE_VIDEO_EXTS as readonly string[]).includes(ext)
}
