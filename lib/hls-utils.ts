export function getHlsPrefix(originalKey: string): string {
  // Store HLS artifacts isolated from user files: `.hls-cache/<originalKey>/`
  // e.g. "movies/film.avi" -> ".hls-cache/movies/film.avi/seg000.ts"
  const normalized = originalKey.replace(/^\/+/, "")
  return `.hls-cache/${normalized}/`
}

export function getHlsObjectKey(originalKey: string, fileName: string): string {
  return `${getHlsPrefix(originalKey)}${fileName}`
}
