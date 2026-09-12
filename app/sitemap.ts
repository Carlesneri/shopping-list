import type { MetadataRoute } from "next"

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

/** Public (unauthenticated) landing pages, crawlable and indexable. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: `${baseUrl}/`,
      changeFrequency: "monthly",
      priority: 1,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/compras`,
      changeFrequency: "monthly",
      priority: 0.8,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/notas`,
      changeFrequency: "monthly",
      priority: 0.8,
      lastModified: new Date(),
    },
    {
      url: `${baseUrl}/media`,
      changeFrequency: "monthly",
      priority: 0.8,
      lastModified: new Date(),
    },
  ]
}
