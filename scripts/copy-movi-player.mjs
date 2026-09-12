import { copyFile, mkdir } from "node:fs/promises"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const outDir = join(root, "public", "movi-player")

const assets = [
  ["node_modules/movi-player/dist/element.slim.js", "movi-player.js"],
  ["node_modules/movi-player/dist/movi.wasm", "movi.wasm"],
]

await mkdir(outDir, { recursive: true })
for (const [src, dest] of assets) {
  await copyFile(join(root, src), join(outDir, dest))
  console.log(`[copy-movi-player] ${src} -> public/movi-player/${dest}`)
}
