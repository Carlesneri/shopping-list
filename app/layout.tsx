import type { Metadata, Viewport } from "next"
import { Nunito, JetBrains_Mono } from "next/font/google"
import { SessionProvider } from "next-auth/react"
import { Toaster } from "sonner"
import { TopBar } from "@/components/layout/TopBar"
import { Footer } from "@/components/layout/Footer"
import { FirebaseAuthProvider } from "@/components/providers/FirebaseAuthProvider"
import "./globals.css"

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
})

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
})

const title = "COMPALE — Tu app colaborativa"
const description =
  "Crea y comparte listas de la compra en tiempo real con quien quieras. Colaborativo, sencillo y siempre sincronizado."

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  ),
  title: {
    default: title,
    template: "%s · COMPALE",
  },
  description,
  applicationName: "COMPALE",
  keywords: [
    "lista de la compra",
    "compra colaborativa",
    "lista compartida",
    "COMPALE",
  ],
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
  },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "es_ES",
    siteName: "COMPALE",
    url: "/",
    title,
    description,
    images: [
      {
        url: "/compale.png",
        width: 677,
        height: 369,
        alt: "COMPALE — lista de la compra colaborativa",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/compale.png"],
  },
}

export const viewport: Viewport = {
  themeColor: "#58cc02",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="es"
      className={`${nunito.variable} ${jetbrainsMono.variable} h-full`}
    >
      <head>
        <script
          src="https://analytics.ahrefs.com/analytics.js"
          data-key="s1D9H51WmjuN6VSMCmHPEQ"
          async
        />
      </head>
      <body className="min-h-full flex flex-col font-sans antialiased">
        <SessionProvider>
          <FirebaseAuthProvider>
            <TopBar />
            <main className="flex-1">{children}</main>
            <Footer />
          </FirebaseAuthProvider>
        </SessionProvider>
        <Toaster richColors position="bottom-center" />
      </body>
    </html>
  )
}
