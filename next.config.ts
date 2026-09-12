import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
  async redirects() {
    return [
      {
        source: "/lists",
        destination: "/compras",
        permanent: true,
      },
      {
        source: "/lists/:path*",
        destination: "/compras/:path*",
        permanent: true,
      },
    ]
  },
}

export default nextConfig
