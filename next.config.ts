import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  reactCompiler: true,
  serverExternalPackages: ["ffmpeg-static"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
  outputFileTracingIncludes: {
    "/api/hls": ["./node_modules/ffmpeg-static/ffmpeg"],
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
