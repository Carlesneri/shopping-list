import "server-only"
import sanitizeHtml from "sanitize-html"

/**
 * Sanitizes editor HTML before persisting it. Only formatting tags produced
 * by the editor survive; scripts, handlers and unknown markup are removed.
 *
 * Server-only: uses sanitize-html (pure CJS, no jsdom), so it is safe to
 * bundle for serverless runtimes — unlike isomorphic DOMPurify.
 */
export function sanitizeNotaHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      "p",
      "br",
      "strong",
      "em",
      "s",
      "u",
      "code",
      "pre",
      "blockquote",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "ul",
      "ol",
      "li",
      "hr",
      "a",
    ],
    allowedAttributes: {
      a: ["href", "rel", "target"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    // Links must not pass referrer/PageRank to external sites.
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", {
        rel: "noopener noreferrer nofollow",
        target: "_blank",
      }),
    },
  })
}
