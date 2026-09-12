import type { NextConfig } from "next"

/**
 * CSP in Report-Only mode for now: watch the browser console for violation
 * reports, tighten ('unsafe-inline' removal, etc.) and switch to an enforced
 * `Content-Security-Policy` header once nothing legitimate is blocked.
 */
// Firebase Auth SDK contacts the project's authDomain (e.g. its auth iframe),
// so both Firebase Hosting domains must be allowed where relevant.
const firebaseAuthDomains = "https://*.firebaseapp.com https://*.web.app"

const isDev = process.env.NODE_ENV !== "production"

// Next.js dev mode (HMR, source maps) needs to evaluate strings — only allow
// 'unsafe-eval' in development, keep production strict.
const scriptSrc = [
  "'self'",
  "'unsafe-inline'",
  ...(isDev ? ["'unsafe-eval'"] : []),
  "https://analytics.ahrefs.com",
].join(" ")

const cspReportOnly = [
  "default-src 'self'",
  `script-src ${scriptSrc}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.googleusercontent.com https://analytics.ahrefs.com",
  "media-src 'self' blob: https://*.r2.cloudflarestorage.com https://*.cloudflarestorage.com",
  "font-src 'self'",
  `connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://securetoken.googleapis.com https://*.r2.cloudflarestorage.com https://*.cloudflarestorage.com wss://*.firebaseio.com https://analytics.ahrefs.com ${firebaseAuthDomains}`,
  `frame-src 'self' ${firebaseAuthDomains}`,
  `child-src 'self' ${firebaseAuthDomains}`,
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
].join("; ")

const securityHeaders = [
  { key: "Content-Security-Policy-Report-Only", value: cspReportOnly },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
]

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
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ]
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
