import type { MetadataRoute } from "next"

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Section roots (/compras, /notas, /media) are public landing pages;
      // everything under them is private app content.
      disallow: ["/compras/", "/notas/", "/media/", "/api/"],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
