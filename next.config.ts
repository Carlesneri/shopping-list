import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  reactCompiler: true,
  serverExternalPackages: ["ffmpeg-static", "get-video-duration", "@ffprobe-installer/ffprobe", "@ffprobe-installer/darwin-x64", "@ffprobe-installer/linux-x64", "@ffprobe-installer/win32-x64"],
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
