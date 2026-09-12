const HTML_TAG_RE =
  /<\/?(p|ul|ol|li|br|h[1-6]|blockquote|strong|em|s|u|code|pre|a)\b/i

/** True when the string looks like editor-produced HTML. */
export function isHtml(text: string): boolean {
  return HTML_TAG_RE.test(text)
}

/** Strips tags and decodes basic entities to get plain text. */
export function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|blockquote|pre)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

/** Plain-text preview of stored content, tolerant of legacy plain text. */
export function toPlainText(text: string): string {
  if (!text) return ""
  return isHtml(text) ? stripHtml(text) : text
}

/** Converts legacy plain-text content into editor HTML paragraphs. */
export function toEditorHtml(text: string): string {
  if (!text) return ""
  if (isHtml(text)) return text

  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")

  return escaped
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${paragraph.replace(/\n/g, "<br>")}</p>`)
    .join("")
}
