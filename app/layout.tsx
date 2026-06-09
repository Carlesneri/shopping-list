import type { Metadata } from "next"
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

export const metadata: Metadata = {
  title: "COMPALE",
  description: "Tu lista de la compra colaborativa",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${nunito.variable} ${jetbrainsMono.variable} h-full`}>
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
