import type { MediaKind } from "./types"

/**
 * Detects the media kind from a file name / object key extension. Returns
 * undefined for anything that is not a recognized video, image or audio file.
 */
export function detectMediaKind(key: string): MediaKind | undefined {
  const ext = key.split(".").at(-1)?.toLowerCase() ?? ""
  if (["mp4", "mov", "webm", "mkv", "avi", "m4v", "mpeg", "mpg"].includes(ext))
    return "video"
  if (
    [
      "jpg",
      "jpeg",
      "png",
      "gif",
      "webp",
      "heic",
      "heif",
      "avif",
      "svg",
      "bmp",
    ].includes(ext)
  )
    return "image"
  if (["mp3", "wav", "ogg", "aac", "flac", "m4a", "opus", "wma"].includes(ext))
    return "audio"
  return undefined
}
