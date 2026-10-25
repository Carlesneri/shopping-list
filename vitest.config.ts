import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import path from "node:path"

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    server: {
      deps: {
        // next-auth is ESM-only and imports "next/server" in a way Node's
        // strict ESM loader cannot resolve outside Next itself; inlining it
        // lets Vite resolve the package exports properly in tests.
        inline: ["next-auth"],
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
})
