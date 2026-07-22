import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "COMPALE — Tu app colaborativa",
    short_name: "COMPALE",
    description:
      "Tu app colaborativa, en tiempo real y compartida.",
    start_url: "/",
    display: "standalone",
    lang: "es",
    background_color: "#ffffff",
    theme_color: "#58cc02",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  }
}
