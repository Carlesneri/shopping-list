// Deploys firestore.rules to the named "compale" database using the service
// account from .env.local. Usage: node scripts/deploy-rules.mjs [databaseId]
import { readFileSync } from "node:fs"
import { createSign } from "node:crypto"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const root = join(dirname(fileURLToPath(import.meta.url)), "..")
const database = process.argv[2] ?? "compale"
const releaseName = `cloud.firestore/${database}`

function loadEnv(path) {
  const env = {}
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "")
  }
  return env
}

const env = loadEnv(join(root, ".env.local"))
const project = env.FIREBASE_PROJECT_ID
const clientEmail = env.FIREBASE_CLIENT_EMAIL
const privateKey = env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n")

if (!project || !clientEmail || !privateKey) {
  throw new Error(
    "Falta FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL o FIREBASE_PRIVATE_KEY en .env.local",
  )
}

function base64url(input) {
  return Buffer.from(input).toString("base64url")
}

async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000)
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }))
  const claims = base64url(
    JSON.stringify({
      iss: clientEmail,
      scope: "https://www.googleapis.com/auth/firebase",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  )
  const signer = createSign("RSA-SHA256")
  signer.update(`${header}.${claims}`)
  const signature = base64url(signer.sign(privateKey))
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${header}.${claims}.${signature}`,
    }),
  })
  if (!res.ok) throw new Error(`Token: ${res.status} ${await res.text()}`)
  return (await res.json()).access_token
}

const token = await getAccessToken()

async function api(path, init) {
  const res = await fetch(
    `https://firebaserules.googleapis.com/v1/projects/${project}/${path}`,
    {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    },
  )
  const body = await res.json()
  if (!res.ok) {
    throw new Error(`${path}: ${res.status} ${JSON.stringify(body)}`)
  }
  return body
}

const content = readFileSync(join(root, "firestore.rules"), "utf8")

const ruleset = await api("rulesets", {
  method: "POST",
  body: JSON.stringify({
    source: { files: [{ name: "firestore.rules", content }] },
  }),
})

// This API rejects %2F in release IDs but accepts the raw slash.
const releasePath = `releases/${releaseName}`
const existing = await fetch(
  `https://firebaserules.googleapis.com/v1/projects/${project}/${releasePath}`,
  { headers: { Authorization: `Bearer ${token}` } },
)

if (existing.ok) {
  await api(releasePath, {
    method: "PATCH",
    body: JSON.stringify({
      release: {
        name: `projects/${project}/releases/${releaseName}`,
        rulesetName: ruleset.name,
      },
    }),
  })
} else {
  await api("releases", {
    method: "POST",
    body: JSON.stringify({
      name: `projects/${project}/releases/${releaseName}`,
      rulesetName: ruleset.name,
    }),
  })
}

console.log(`Desplegado ${ruleset.name} en ${releaseName}`)
