# COMPALE Shopping List — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a collaborative shopping list web app in Spanish with Google auth, real-time Firestore sync, and a Lingo design system.

**Architecture:** Next.js 16 App Router. All mutations go through Server Actions + Firebase Admin SDK. Real-time reads use the Firestore client SDK (`onSnapshot`). A custom token bridge (`getFirebaseToken` server action) authenticates the client SDK using the next-auth session. Route protection via `app/lists/layout.tsx` (no `middleware.ts`).

**Tech Stack:** Next.js 16, next-auth v5, Firebase Admin SDK, Firebase client SDK, Sonner, @tabler/icons-react, Tailwind v4, Biome.

---

## File Map

```
auth.ts                                    next-auth config + exported helpers
app/
  layout.tsx                               root layout — providers, TopBar, Footer, Toaster (modify)
  page.tsx                                 home page — unauthenticated/authenticated (modify)
  globals.css                              Lingo design tokens (modify)
  icon.png                                 favicon — copy of public/logo.png
  api/auth/[...nextauth]/route.ts          next-auth route handler
  lists/
    layout.tsx                             auth proxy — redirects unauthenticated users to /
    new/page.tsx                           create list form
    [id]/page.tsx                          list detail server shell
    [id]/settings/page.tsx                 settings server shell
lib/
  types.ts                                 shared TS types (ShoppingList, AllowedUser, Role)
  utils.ts                                 cn() helper
  firebase-admin.ts                        Admin SDK singleton
  firebase-client.ts                       client SDK — exports db, clientAuth
  actions/
    auth.ts                                getFirebaseToken() server action
    lists.ts                               createList, addUserToList, removeUserFromList, deleteList
components/
  providers/
    FirebaseAuthProvider.tsx               bridges next-auth → Firebase Auth (client)
  layout/
    TopBar.tsx                             logo + user avatar + sign-out
    Footer.tsx                             "Hecho con ♥ por Anna y Joan"
  ui/
    Button.tsx                             primary / ghost / danger variants
  lists/
    ListGrid.tsx                           real-time list grid (client)
    ListCard.tsx                           single list card
    ListDetail.tsx                         real-time list detail (client)
    UserList.tsx                           allowedUsers table with remove
    AddUserForm.tsx                        add user email + role form
firestore.rules                            Firestore security rules
.env.example                               env var template
```

---

## Task 1: Firebase project setup (manual)

**Files:** `.env.example` (create)

- [ ] **Step 1: Create Firebase project**

  Go to [console.firebase.google.com](https://console.firebase.google.com):
  1. Create project → name it "compale"
  2. Firestore Database → Create database → Native mode → choose region
  3. Authentication → Sign-in method → Google → Enable → add your email as support email
  4. Project Settings → Service Accounts → Generate new private key → download JSON
  5. Project Settings → General → Your apps → Add web app → copy config

- [ ] **Step 2: Create Google OAuth credentials**

  Go to [console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → Credentials:
  1. Create OAuth 2.0 Client ID → Web application
  2. Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
  3. Copy Client ID and Client Secret

- [ ] **Step 3: Create `.env.example`**

```
# Firebase client config (from Firebase console → Your apps → Web)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin SDK (from downloaded service account JSON)
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# next-auth (generate secret: openssl rand -base64 32)
AUTH_SECRET=
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

  Copy to `.env.local` and fill in values.

- [ ] **Step 4: Verify app starts**

```bash
pnpm dev
```

Expected: Next.js dev server starts at `http://localhost:3000`.

---

## Task 2: Install dependencies

**Files:** `package.json`

- [ ] **Step 1: Install runtime dependencies**

```bash
pnpm add firebase firebase-admin next-auth@beta sonner @tabler/icons-react
```

- [ ] **Step 2: Install dev dependencies**

```bash
pnpm add -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
```

- [ ] **Step 3: Create `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import path from "path"

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
})
```

- [ ] **Step 4: Create `vitest.setup.ts`**

```ts
import "@testing-library/jest-dom"
```

- [ ] **Step 5: Add test script to `package.json`**

Add `"test": "vitest"` to the `"scripts"` section.

- [ ] **Step 6: Verify build**

```bash
pnpm build
```

Expected: build succeeds (may have type errors until Task 4 — check for install errors only).

---

## Task 3: TypeScript types + utils

**Files:**
- Create: `lib/types.ts`
- Create: `lib/utils.ts`
- Test: `lib/__tests__/utils.test.ts`

- [ ] **Step 1: Write failing test for `cn`**

Create `lib/__tests__/utils.test.ts`:

```ts
import { describe, it, expect } from "vitest"
import { cn } from "../utils"

describe("cn", () => {
  it("joins class names", () => {
    expect(cn("a", "b")).toBe("a b")
  })
  it("filters falsy values", () => {
    expect(cn("a", false, undefined, null, "b")).toBe("a b")
  })
  it("returns empty string when no classes", () => {
    expect(cn()).toBe("")
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test lib/__tests__/utils.test.ts
```

Expected: FAIL — "cannot find module '../utils'"

- [ ] **Step 3: Create `lib/utils.ts`**

```ts
export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(" ")
}
```

- [ ] **Step 4: Create `lib/types.ts`**

```ts
export type Role = "owner" | "admin" | "member"

export interface AllowedUser {
  email: string
  role: Role
}

export interface ShoppingList {
  id: string
  title: string
  market: string
  allowedUsers: AllowedUser[]
  memberEmails: string[]
  products: never[]
  createdAt: { seconds: number; nanoseconds: number }
  updatedAt: { seconds: number; nanoseconds: number }
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
pnpm test lib/__tests__/utils.test.ts
```

Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add lib/types.ts lib/utils.ts lib/__tests__/utils.test.ts vitest.config.ts vitest.setup.ts
git commit -m "feat: add shared types, utils, and test setup"
```

---

## Task 4: Design tokens, fonts, favicon

**Files:**
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`
- Create: `app/icon.png` (copy from `public/logo.png`)

- [ ] **Step 1: Copy favicon**

```bash
cp public/logo.png app/icon.png
```

- [ ] **Step 2: Replace `app/globals.css`**

```css
@import "tailwindcss";

@theme inline {
  --color-primary: #58cc02;
  --color-secondary: #ce82ff;
  --color-danger: #ff4b4b;
  --color-warning: #ffc800;
  --color-text: #3c3c3c;
  --color-background: #ffffff;
  --font-sans: var(--font-nunito);
  --font-mono: var(--font-jetbrains);
  --radius-sm: 4px;
  --radius-md: 8px;
}

body {
  color: var(--color-text);
  background: var(--color-background);
}
```

- [ ] **Step 3: Replace `app/layout.tsx`**

```tsx
import type { Metadata } from "next"
import { Nunito, JetBrains_Mono } from "next/font/google"
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
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 4: Verify in browser**

```bash
pnpm dev
```

Open `http://localhost:3000` — page should render with Nunito font and use `logo.png` as browser tab favicon.

- [ ] **Step 5: Commit**

```bash
git add app/globals.css app/layout.tsx app/icon.png
git commit -m "feat: apply Lingo design tokens and Nunito/JetBrains Mono fonts"
```

---

## Task 5: next-auth configuration

**Files:**
- Create: `auth.ts`
- Create: `app/api/auth/[...nextauth]/route.ts`

- [ ] **Step 1: Create `auth.ts`**

```ts
import NextAuth from "next-auth"
import Google from "next-auth/providers/google"

export const { auth, handlers, signIn, signOut } = NextAuth({
  providers: [
    Google({
      authorization: {
        params: {
          prompt: "select_account",
        },
      },
    }),
  ],
  callbacks: {
    session({ session }) {
      return session
    },
  },
})
```

- [ ] **Step 2: Create `app/api/auth/[...nextauth]/route.ts`**

```ts
import { handlers } from "@/auth"
export const { GET, POST } = handlers
```

- [ ] **Step 3: Verify auth endpoint**

```bash
pnpm dev
```

Visit `http://localhost:3000/api/auth/providers` — should return JSON with `google` provider.

- [ ] **Step 4: Commit**

```bash
git add auth.ts app/api/auth/
git commit -m "feat: configure next-auth with Google provider"
```

---

## Task 6: Firebase Admin SDK + token action

**Files:**
- Create: `lib/firebase-admin.ts`
- Create: `lib/actions/auth.ts`
- Test: `lib/__tests__/actions-auth.test.ts`

- [ ] **Step 1: Write failing test for getFirebaseToken guard**

Create `lib/__tests__/actions-auth.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock next-auth
vi.mock("@/auth", () => ({
  auth: vi.fn(),
}))
// Mock Firebase Admin
vi.mock("@/lib/firebase-admin", () => ({
  getAdminApp: vi.fn(() => ({})),
}))
vi.mock("firebase-admin/auth", () => ({
  getAuth: vi.fn(() => ({
    createCustomToken: vi.fn(() => Promise.resolve("mock-token")),
  })),
}))

import { auth } from "@/auth"
import { getFirebaseToken } from "../actions/auth"

describe("getFirebaseToken", () => {
  beforeEach(() => vi.clearAllMocks())

  it("returns null when no session", async () => {
    vi.mocked(auth).mockResolvedValue(null)
    const result = await getFirebaseToken()
    expect(result).toBeNull()
  })

  it("returns token when session has email", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { email: "test@example.com", name: "Test", image: null },
      expires: "",
    })
    const result = await getFirebaseToken()
    expect(result).toBe("mock-token")
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test lib/__tests__/actions-auth.test.ts
```

Expected: FAIL — "cannot find module '../actions/auth'"

- [ ] **Step 3: Create `lib/firebase-admin.ts`**

```ts
import { initializeApp, getApps, cert, type App } from "firebase-admin/app"

export function getAdminApp(): App {
  if (getApps().length > 0) return getApps()[0]
  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  })
}
```

- [ ] **Step 4: Create `lib/actions/auth.ts`**

```ts
"use server"
import crypto from "crypto"
import { auth } from "@/auth"
import { getAdminApp } from "@/lib/firebase-admin"
import { getAuth } from "firebase-admin/auth"

export async function getFirebaseToken(): Promise<string | null> {
  const session = await auth()
  if (!session?.user?.email) return null

  const uid = crypto.createHash("sha256").update(session.user.email).digest("hex")
  const token = await getAuth(getAdminApp()).createCustomToken(uid, {
    email: session.user.email,
  })
  return token
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
pnpm test lib/__tests__/actions-auth.test.ts
```

Expected: PASS (2 tests)

- [ ] **Step 6: Commit**

```bash
git add lib/firebase-admin.ts lib/actions/auth.ts lib/__tests__/actions-auth.test.ts
git commit -m "feat: add Firebase Admin SDK and getFirebaseToken server action"
```

---

## Task 7: Firebase client SDK + auth bridge

**Files:**
- Create: `lib/firebase-client.ts`
- Create: `components/providers/FirebaseAuthProvider.tsx`

- [ ] **Step 1: Create `lib/firebase-client.ts`**

```ts
import { initializeApp, getApps, type FirebaseApp } from "firebase/app"
import { getFirestore } from "firebase/firestore"
import { getAuth } from "firebase/auth"

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

function getClientApp(): FirebaseApp {
  if (getApps().length > 0) return getApps()[0]
  return initializeApp(firebaseConfig)
}

export const db = getFirestore(getClientApp())
export const clientAuth = getAuth(getClientApp())
```

- [ ] **Step 2: Create `components/providers/FirebaseAuthProvider.tsx`**

```tsx
"use client"
import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { signInWithCustomToken } from "firebase/auth"
import { clientAuth } from "@/lib/firebase-client"
import { getFirebaseToken } from "@/lib/actions/auth"

export function FirebaseAuthProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.email) return
    getFirebaseToken()
      .then((token) => {
        if (token) return signInWithCustomToken(clientAuth, token)
      })
      .catch(console.error)
  }, [session, status])

  return <>{children}</>
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/firebase-client.ts components/providers/FirebaseAuthProvider.tsx
git commit -m "feat: add Firebase client SDK and auth bridge provider"
```

---

## Task 8: Root layout shell

**Files:**
- Create: `components/layout/TopBar.tsx`
- Create: `components/layout/Footer.tsx`
- Create: `components/ui/Button.tsx`
- Modify: `app/layout.tsx`

- [ ] **Step 1: Create `components/layout/Footer.tsx`**

```tsx
import { IconHeart } from "@tabler/icons-react"

export function Footer() {
  return (
    <footer className="mt-auto py-4 px-4 text-center text-sm text-text/60 font-mono">
      Hecho con{" "}
      <IconHeart
        size={14}
        className="inline text-danger fill-danger"
        aria-hidden
      />{" "}
      por Anna y Joan
    </footer>
  )
}
```

- [ ] **Step 2: Create `components/layout/TopBar.tsx`**

```tsx
import Image from "next/image"
import Link from "next/link"
import { auth, signOut } from "@/auth"
import { IconLogout } from "@tabler/icons-react"

export async function TopBar() {
  const session = await auth()

  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-black/10">
      <Link href="/" className="flex items-center">
        <Image src="/logo.png" alt="COMPALE" width={120} height={40} priority />
      </Link>
      {session?.user && (
        <div className="flex items-center gap-3">
          {session.user.image && (
            <img
              src={session.user.image}
              alt={session.user.name ?? ""}
              className="w-8 h-8 rounded-full border border-black/10"
            />
          )}
          <form
            action={async () => {
              "use server"
              await signOut({ redirectTo: "/" })
            }}
          >
            <button
              type="submit"
              className="text-text/60 hover:text-danger transition-colors"
              aria-label="Cerrar sesión"
            >
              <IconLogout size={20} />
            </button>
          </form>
        </div>
      )}
    </header>
  )
}
```

- [ ] **Step 3: Create `components/ui/Button.tsx`**

```tsx
import type { ButtonHTMLAttributes } from "react"
import { cn } from "@/lib/utils"

type Variant = "primary" | "ghost" | "danger"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
}

const variants: Record<Variant, string> = {
  primary:
    "bg-primary text-white font-bold rounded-md px-4 py-2 shadow-[0_4px_0_0_#3a8a00] hover:translate-y-px hover:shadow-[0_3px_0_0_#3a8a00] active:translate-y-1 active:shadow-none transition-transform",
  ghost:
    "bg-transparent border-2 border-primary text-primary font-bold rounded-md px-4 py-2 hover:bg-primary/10 transition-colors",
  danger:
    "bg-danger text-white font-bold rounded-md px-4 py-2 shadow-[0_4px_0_0_#b03030] hover:translate-y-px hover:shadow-[0_3px_0_0_#b03030] active:translate-y-1 active:shadow-none transition-transform",
}

export function Button({ variant = "primary", className, children, ...props }: ButtonProps) {
  return (
    <button className={cn(variants[variant], className)} {...props}>
      {children}
    </button>
  )
}
```

- [ ] **Step 4: Update `app/layout.tsx` with all providers**

```tsx
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
```

- [ ] **Step 5: Verify in browser**

```bash
pnpm dev
```

Open `http://localhost:3000` — TopBar with COMPALE logo visible, Footer with "Hecho con ♥ por Anna y Joan" at the bottom.

- [ ] **Step 6: Commit**

```bash
git add components/layout/ components/ui/Button.tsx app/layout.tsx
git commit -m "feat: add TopBar, Footer, Button, and root layout shell"
```

---

## Task 9: Home page — unauthenticated state

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Replace `app/page.tsx`**

```tsx
import Image from "next/image"
import { auth, signIn } from "@/auth"
import { Button } from "@/components/ui/Button"

export default async function HomePage() {
  const session = await auth()

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center gap-8 px-4 py-16 text-center">
        <Image
          src="/compale.png"
          alt="COMPALE — lista de la compra colaborativa"
          width={480}
          height={340}
          priority
          className="w-full max-w-sm"
        />
        <form
          action={async () => {
            "use server"
            await signIn("google", { redirectTo: "/" })
          }}
        >
          <Button type="submit" className="text-lg px-8 py-3">
            Iniciar sesión con Google
          </Button>
        </form>
      </div>
    )
  }

  // Authenticated state — implemented in Task 10
  return <div className="p-4">Cargando listas…</div>
}
```

- [ ] **Step 2: Verify in browser**

Open `http://localhost:3000` in a fresh incognito window. Should show the `compale.png` hero illustration and "Iniciar sesión con Google" button.

- [ ] **Step 3: Test Google sign-in flow**

Click the button — should redirect to Google OAuth. After signing in, should return to `/` and show "Cargando listas…" (authenticated placeholder).

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx
git commit -m "feat: add unauthenticated home page with Google sign-in"
```

---

## Task 10: Home page — authenticated state

**Files:**
- Create: `components/lists/ListCard.tsx`
- Create: `components/lists/ListGrid.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Create `components/lists/ListCard.tsx`**

```tsx
import Link from "next/link"
import { IconShoppingCart, IconUsers } from "@tabler/icons-react"
import type { ShoppingList } from "@/lib/types"

export function ListCard({ list }: { list: ShoppingList }) {
  return (
    <Link href={`/lists/${list.id}`}>
      <div className="flex flex-col gap-1 p-4 bg-white rounded-md border-2 border-black shadow-[0_4px_0_0_black] hover:translate-y-px hover:shadow-[0_3px_0_0_black] active:translate-y-1 active:shadow-none transition-transform">
        <h2 className="font-bold text-lg leading-tight">{list.title}</h2>
        <div className="flex items-center gap-1 text-text/60 text-sm">
          <IconShoppingCart size={14} />
          <span>{list.market}</span>
        </div>
        <div className="flex items-center gap-1 text-text/60 text-sm mt-1">
          <IconUsers size={14} />
          <span>{list.allowedUsers.length} {list.allowedUsers.length === 1 ? "persona" : "personas"}</span>
        </div>
      </div>
    </Link>
  )
}
```

- [ ] **Step 2: Create `components/lists/ListGrid.tsx`**

```tsx
"use client"
import { useEffect, useState } from "react"
import { collection, query, where, onSnapshot } from "firebase/firestore"
import { onAuthStateChanged } from "firebase/auth"
import { toast } from "sonner"
import { db, clientAuth } from "@/lib/firebase-client"
import type { ShoppingList } from "@/lib/types"
import { ListCard } from "./ListCard"

export function ListGrid({ userEmail }: { userEmail: string }) {
  const [lists, setLists] = useState<ShoppingList[]>([])

  useEffect(() => {
    let firestoreUnsub: (() => void) | undefined

    const authUnsub = onAuthStateChanged(clientAuth, (user) => {
      firestoreUnsub?.()
      if (!user) return

      const q = query(
        collection(db, "lists"),
        where("memberEmails", "array-contains", userEmail),
      )
      firestoreUnsub = onSnapshot(
        q,
        (snap) => {
          setLists(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as ShoppingList[])
        },
        () => toast.error("Error al cargar las listas"),
      )
    })

    return () => {
      authUnsub()
      firestoreUnsub?.()
    }
  }, [userEmail])

  if (lists.length === 0) {
    return (
      <p className="text-center text-text/60 py-12">
        Aún no tienes listas. ¡Crea una!
      </p>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-3">
      {lists.map((list) => (
        <ListCard key={list.id} list={list} />
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Update authenticated branch in `app/page.tsx`**

Replace the `// Authenticated state` block:

```tsx
import Link from "next/link"
import { IconPlus } from "@tabler/icons-react"
import { ListGrid } from "@/components/lists/ListGrid"

// Inside the authenticated branch:
  return (
    <div className="px-4 py-6 max-w-lg mx-auto w-full">
      <ListGrid userEmail={session.user.email!} />
      <Link href="/lists/new" className="fixed bottom-6 right-6">
        <Button className="rounded-full w-14 h-14 flex items-center justify-center text-2xl p-0">
          <IconPlus size={28} />
        </Button>
      </Link>
    </div>
  )
```

The full updated `app/page.tsx`:

```tsx
import Image from "next/image"
import Link from "next/link"
import { auth, signIn } from "@/auth"
import { Button } from "@/components/ui/Button"
import { ListGrid } from "@/components/lists/ListGrid"
import { IconPlus } from "@tabler/icons-react"

export default async function HomePage() {
  const session = await auth()

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center gap-8 px-4 py-16 text-center">
        <Image
          src="/compale.png"
          alt="COMPALE — lista de la compra colaborativa"
          width={480}
          height={340}
          priority
          className="w-full max-w-sm"
        />
        <form
          action={async () => {
            "use server"
            await signIn("google", { redirectTo: "/" })
          }}
        >
          <Button type="submit" className="text-lg px-8 py-3">
            Iniciar sesión con Google
          </Button>
        </form>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 max-w-lg mx-auto w-full">
      <ListGrid userEmail={session.user.email!} />
      <Link href="/lists/new" className="fixed bottom-6 right-6">
        <Button className="rounded-full w-14 h-14 flex items-center justify-center text-2xl p-0">
          <IconPlus size={28} />
        </Button>
      </Link>
    </div>
  )
}
```

- [ ] **Step 4: Verify in browser**

Sign in and visit `/`. Should show "Aún no tienes listas. ¡Crea una!" with a green FAB button in the bottom-right corner.

- [ ] **Step 5: Commit**

```bash
git add components/lists/ListCard.tsx components/lists/ListGrid.tsx app/page.tsx
git commit -m "feat: add authenticated home page with real-time list grid"
```

---

## Task 11: Auth-protected layout + create list page

**Files:**
- Create: `app/lists/layout.tsx`
- Create: `lib/actions/lists.ts`
- Create: `app/lists/new/page.tsx`
- Test: `lib/__tests__/actions-lists.test.ts`

- [ ] **Step 1: Create `app/lists/layout.tsx`**

```tsx
import { auth } from "@/auth"
import { redirect } from "next/navigation"

export default async function ListsLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect("/")
  return <>{children}</>
}
```

- [ ] **Step 2: Write failing test for createList validation**

Create `lib/__tests__/actions-lists.test.ts`:

```ts
import { describe, it, expect, vi } from "vitest"

// Must mock external deps before importing the module under test
vi.mock("@/auth", () => ({ auth: vi.fn() }))
vi.mock("next/navigation", () => ({ redirect: vi.fn() }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/firebase-admin", () => ({ getAdminApp: vi.fn() }))
vi.mock("firebase-admin/firestore", () => ({
  getFirestore: vi.fn(),
  FieldValue: { serverTimestamp: vi.fn(), arrayUnion: vi.fn(), arrayRemove: vi.fn() },
}))

import { validateListInput } from "../actions/lists"

describe("validateListInput", () => {
  it("returns trimmed values for valid input", () => {
    expect(validateListInput("  Pan  ", "  Mercadona  ")).toEqual({
      title: "Pan",
      market: "Mercadona",
    })
  })
  it("throws when title is empty", () => {
    expect(() => validateListInput("", "Mercadona")).toThrow("El título es requerido")
  })
  it("throws when market is empty", () => {
    expect(() => validateListInput("Pan", "   ")).toThrow("El mercado es requerido")
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

```bash
pnpm test lib/__tests__/actions-lists.test.ts
```

Expected: FAIL — "cannot find module '../actions/lists'"

- [ ] **Step 4: Create `lib/actions/lists.ts`**

```ts
"use server"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getFirestore, FieldValue } from "firebase-admin/firestore"
import { revalidatePath } from "next/cache"
import { getAdminApp } from "@/lib/firebase-admin"
import type { AllowedUser, Role } from "@/lib/types"

export function validateListInput(title: string, market: string) {
  if (!title.trim()) throw new Error("El título es requerido")
  if (!market.trim()) throw new Error("El mercado es requerido")
  return { title: title.trim(), market: market.trim() }
}

export async function createList(formData: FormData) {
  const session = await auth()
  if (!session?.user?.email) throw new Error("No autenticado")

  const { title, market } = validateListInput(
    formData.get("title") as string,
    formData.get("market") as string,
  )

  const db = getFirestore(getAdminApp())
  const docRef = db.collection("lists").doc()
  const email = session.user.email

  await docRef.set({
    title,
    market,
    allowedUsers: [{ email, role: "owner" }],
    memberEmails: [email],
    products: [],
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  })

  redirect(`/lists/${docRef.id}`)
}

export async function addUserToList(listId: string, email: string, role: Role) {
  const session = await auth()
  if (!session?.user?.email) throw new Error("No autenticado")

  const db = getFirestore(getAdminApp())
  const listRef = db.collection("lists").doc(listId)
  const snap = await listRef.get()

  if (!snap.exists) throw new Error("Lista no encontrada")

  const data = snap.data()!
  const caller = (data.allowedUsers as AllowedUser[]).find(
    (u) => u.email === session.user!.email,
  )
  if (!caller || !["owner", "admin"].includes(caller.role)) {
    throw new Error("Sin permisos para añadir usuarios")
  }
  if ((data.memberEmails as string[]).includes(email)) {
    throw new Error("Este usuario ya tiene acceso")
  }

  await listRef.update({
    allowedUsers: FieldValue.arrayUnion({ email, role }),
    memberEmails: FieldValue.arrayUnion(email),
    updatedAt: FieldValue.serverTimestamp(),
  })

  revalidatePath(`/lists/${listId}/settings`)
}

export async function removeUserFromList(listId: string, email: string) {
  const session = await auth()
  if (!session?.user?.email) throw new Error("No autenticado")

  const db = getFirestore(getAdminApp())
  const listRef = db.collection("lists").doc(listId)
  const snap = await listRef.get()

  if (!snap.exists) throw new Error("Lista no encontrada")

  const data = snap.data()!
  const caller = (data.allowedUsers as AllowedUser[]).find(
    (u) => u.email === session.user!.email,
  )
  if (!caller || !["owner", "admin"].includes(caller.role)) {
    throw new Error("Sin permisos para eliminar usuarios")
  }

  const target = (data.allowedUsers as AllowedUser[]).find((u) => u.email === email)
  if (target?.role === "owner") throw new Error("No se puede eliminar al propietario")

  const updatedAllowedUsers = (data.allowedUsers as AllowedUser[]).filter(
    (u) => u.email !== email,
  )
  const updatedMemberEmails = (data.memberEmails as string[]).filter((e) => e !== email)

  await listRef.update({
    allowedUsers: updatedAllowedUsers,
    memberEmails: updatedMemberEmails,
    updatedAt: FieldValue.serverTimestamp(),
  })

  revalidatePath(`/lists/${listId}/settings`)
}

export async function deleteList(listId: string) {
  const session = await auth()
  if (!session?.user?.email) throw new Error("No autenticado")

  const db = getFirestore(getAdminApp())
  const listRef = db.collection("lists").doc(listId)
  const snap = await listRef.get()

  if (!snap.exists) throw new Error("Lista no encontrada")

  const data = snap.data()!
  const caller = (data.allowedUsers as AllowedUser[]).find(
    (u) => u.email === session.user!.email,
  )
  if (caller?.role !== "owner") throw new Error("Solo el propietario puede eliminar la lista")

  await listRef.delete()
  redirect("/")
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
pnpm test lib/__tests__/actions-lists.test.ts
```

Expected: PASS (3 tests)

- [ ] **Step 6: Create `app/lists/new/page.tsx`**

```tsx
import { createList } from "@/lib/actions/lists"
import { Button } from "@/components/ui/Button"
import { IconArrowLeft } from "@tabler/icons-react"
import Link from "next/link"

export default function NewListPage() {
  return (
    <div className="px-4 py-6 max-w-lg mx-auto w-full">
      <Link href="/" className="flex items-center gap-1 text-text/60 mb-6 hover:text-text transition-colors">
        <IconArrowLeft size={18} />
        <span className="text-sm">Volver</span>
      </Link>
      <h1 className="text-2xl font-bold mb-6">Nueva lista</h1>
      <form action={createList} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label className="font-semibold text-sm" htmlFor="title">
            Título
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            placeholder="Lista del viernes"
            className="border-2 border-black rounded-md px-3 py-2 font-sans focus:outline-none focus:border-primary"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="font-semibold text-sm" htmlFor="market">
            Mercado
          </label>
          <input
            id="market"
            name="market"
            type="text"
            required
            placeholder="Mercadona"
            className="border-2 border-black rounded-md px-3 py-2 font-sans focus:outline-none focus:border-primary"
          />
        </div>
        <Button type="submit" className="mt-2">
          Crear lista
        </Button>
      </form>
    </div>
  )
}
```

- [ ] **Step 7: Verify in browser**

Visit `http://localhost:3000/lists/new`. Fill in title and market, submit — should redirect to `/lists/<new-id>` (404 for now, that's expected).

- [ ] **Step 8: Commit**

```bash
git add app/lists/ lib/actions/lists.ts lib/__tests__/actions-lists.test.ts
git commit -m "feat: add create list form, Server Actions, and auth-protected layout"
```

---

## Task 12: List detail page with real-time listener

**Files:**
- Create: `components/lists/ListDetail.tsx`
- Create: `app/lists/[id]/page.tsx`

- [ ] **Step 1: Create `components/lists/ListDetail.tsx`**

```tsx
"use client"
import { useEffect, useState } from "react"
import { doc, onSnapshot } from "firebase/firestore"
import { onAuthStateChanged } from "firebase/auth"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { db, clientAuth } from "@/lib/firebase-client"
import type { ShoppingList } from "@/lib/types"
import { Button } from "@/components/ui/Button"
import { IconShare, IconArrowLeft } from "@tabler/icons-react"

interface Props {
  initialList: ShoppingList
  userEmail: string
  listId: string
}

export function ListDetail({ initialList, userEmail, listId }: Props) {
  const [list, setList] = useState<ShoppingList>(initialList)
  const router = useRouter()

  useEffect(() => {
    let firestoreUnsub: (() => void) | undefined

    const authUnsub = onAuthStateChanged(clientAuth, (user) => {
      firestoreUnsub?.()
      if (!user) return

      firestoreUnsub = onSnapshot(
        doc(db, "lists", listId),
        (snap) => {
          if (!snap.exists()) { router.push("/"); return }
          const data = snap.data()
          if (!(data.memberEmails as string[]).includes(userEmail)) { router.push("/"); return }
          setList({ id: snap.id, ...data } as ShoppingList)
        },
        () => { toast.error("Error al cargar la lista"); router.push("/") },
      )
    })

    return () => { authUnsub(); firestoreUnsub?.() }
  }, [listId, userEmail, router])

  const userEntry = list.allowedUsers.find((u) => u.email === userEmail)
  const canShare = userEntry?.role === "owner" || userEntry?.role === "admin"

  return (
    <div className="px-4 py-6 max-w-lg mx-auto w-full">
      <Link href="/" className="flex items-center gap-1 text-text/60 mb-4 hover:text-text transition-colors">
        <IconArrowLeft size={18} />
        <span className="text-sm">Mis listas</span>
      </Link>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{list.title}</h1>
        <p className="text-text/60">{list.market}</p>
      </div>
      <div className="py-12 text-center text-text/40">
        <p>Aún no hay productos</p>
      </div>
      {canShare && (
        <Link href={`/lists/${listId}/settings`} className="fixed bottom-6 right-6">
          <Button className="flex items-center gap-2">
            <IconShare size={18} />
            Compartir
          </Button>
        </Link>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Create `app/lists/[id]/page.tsx`**

```tsx
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getFirestore } from "firebase-admin/firestore"
import { getAdminApp } from "@/lib/firebase-admin"
import { ListDetail } from "@/components/lists/ListDetail"
import type { ShoppingList } from "@/lib/types"

interface Props {
  params: Promise<{ id: string }>
}

export default async function ListPage({ params }: Props) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.email) redirect("/")

  const db = getFirestore(getAdminApp())
  const snap = await db.collection("lists").doc(id).get()

  if (!snap.exists) redirect("/")

  const data = snap.data()!
  if (!(data.memberEmails as string[]).includes(session.user.email)) redirect("/")

  const list = { id: snap.id, ...data } as ShoppingList

  return (
    <ListDetail
      initialList={list}
      userEmail={session.user.email}
      listId={id}
    />
  )
}
```

- [ ] **Step 3: Verify real-time in browser**

1. Create a list via `/lists/new`
2. Open the resulting `/lists/<id>` in two browser tabs
3. In the Firebase Console, manually edit `title` in Firestore
4. Both tabs should update the title within ~1 second

- [ ] **Step 4: Commit**

```bash
git add components/lists/ListDetail.tsx app/lists/[id]/page.tsx
git commit -m "feat: add real-time list detail page"
```

---

## Task 13: List settings page — manage users

**Files:**
- Create: `components/lists/UserList.tsx`
- Create: `components/lists/AddUserForm.tsx`
- Create: `app/lists/[id]/settings/page.tsx`

- [ ] **Step 1: Create `components/lists/UserList.tsx`**

```tsx
import { removeUserFromList } from "@/lib/actions/lists"
import type { ShoppingList } from "@/lib/types"
import { IconTrash } from "@tabler/icons-react"

const ROLE_LABELS: Record<string, string> = {
  owner: "Propietario",
  admin: "Admin",
  member: "Miembro",
}

const ROLE_COLORS: Record<string, string> = {
  owner: "bg-primary/20 text-primary",
  admin: "bg-secondary/20 text-secondary",
  member: "bg-black/10 text-text/60",
}

interface Props {
  list: ShoppingList
  currentUserEmail: string
  canManage: boolean
}

export function UserList({ list, currentUserEmail, canManage }: Props) {
  return (
    <ul className="flex flex-col gap-2 mb-6">
      {list.allowedUsers.map((user) => (
        <li
          key={user.email}
          className="flex items-center justify-between gap-2 p-3 rounded-md border-2 border-black/10"
        >
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-sm font-semibold truncate">{user.email}</span>
            <span
              className={`self-start text-xs font-mono px-1.5 py-0.5 rounded ${ROLE_COLORS[user.role]}`}
            >
              {ROLE_LABELS[user.role]}
            </span>
          </div>
          {canManage && user.role !== "owner" && user.email !== currentUserEmail && (
            <form action={removeUserFromList.bind(null, list.id, user.email)}>
              <button
                type="submit"
                className="text-danger hover:opacity-70 transition-opacity"
                aria-label="Eliminar usuario"
              >
                <IconTrash size={18} />
              </button>
            </form>
          )}
        </li>
      ))}
    </ul>
  )
}
```

- [ ] **Step 2: Create `components/lists/AddUserForm.tsx`**

```tsx
"use client"
import { useState } from "react"
import { toast } from "sonner"
import { addUserToList } from "@/lib/actions/lists"
import { Button } from "@/components/ui/Button"
import type { Role } from "@/lib/types"

export function AddUserForm({ listId }: { listId: string }) {
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<Role>("member")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      await addUserToList(listId, email, role)
      setEmail("")
      toast.success("Usuario añadido")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al añadir usuario")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <h2 className="font-bold text-lg">Añadir persona</h2>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="correo@ejemplo.com"
        required
        className="border-2 border-black rounded-md px-3 py-2 font-sans focus:outline-none focus:border-primary"
      />
      <select
        value={role}
        onChange={(e) => setRole(e.target.value as Role)}
        className="border-2 border-black rounded-md px-3 py-2 font-sans focus:outline-none focus:border-primary"
      >
        <option value="member">Miembro</option>
        <option value="admin">Admin</option>
      </select>
      <Button type="submit" disabled={loading}>
        {loading ? "Añadiendo…" : "Añadir"}
      </Button>
    </form>
  )
}
```

- [ ] **Step 3: Create `app/lists/[id]/settings/page.tsx`**

```tsx
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getFirestore } from "firebase-admin/firestore"
import { getAdminApp } from "@/lib/firebase-admin"
import { UserList } from "@/components/lists/UserList"
import { AddUserForm } from "@/components/lists/AddUserForm"
import { deleteList } from "@/lib/actions/lists"
import { Button } from "@/components/ui/Button"
import { IconArrowLeft } from "@tabler/icons-react"
import Link from "next/link"
import type { ShoppingList } from "@/lib/types"

interface Props {
  params: Promise<{ id: string }>
}

export default async function ListSettingsPage({ params }: Props) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.email) redirect("/")

  const db = getFirestore(getAdminApp())
  const snap = await db.collection("lists").doc(id).get()
  if (!snap.exists) redirect("/")

  const data = snap.data()!
  const userEntry = (data.allowedUsers as { email: string; role: string }[]).find(
    (u) => u.email === session.user!.email,
  )
  if (!userEntry) redirect("/")

  const list = { id: snap.id, ...data } as ShoppingList
  const canManage = userEntry.role === "owner" || userEntry.role === "admin"
  const isOwner = userEntry.role === "owner"

  return (
    <div className="px-4 py-6 max-w-lg mx-auto w-full">
      <Link
        href={`/lists/${id}`}
        className="flex items-center gap-1 text-text/60 mb-6 hover:text-text transition-colors"
      >
        <IconArrowLeft size={18} />
        <span className="text-sm">Volver a la lista</span>
      </Link>
      <h1 className="text-2xl font-bold mb-6">Compartir "{list.title}"</h1>
      <UserList list={list} currentUserEmail={session.user.email} canManage={canManage} />
      {canManage && <AddUserForm listId={id} />}
      {isOwner && (
        <form
          action={deleteList.bind(null, id)}
          className="mt-8 pt-6 border-t border-black/10"
        >
          <Button variant="danger" type="submit">
            Eliminar lista
          </Button>
        </form>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Verify in browser**

1. Open `/lists/<id>/settings` — should show your email as "Propietario"
2. Add another Google account email with "Miembro" role — should appear in the list
3. Sign in with that second account — the shared list should appear on their home page
4. Back on first account, remove the second user — they should lose access within 1 second (live listener)

- [ ] **Step 5: Commit**

```bash
git add components/lists/UserList.tsx components/lists/AddUserForm.tsx app/lists/[id]/settings/page.tsx
git commit -m "feat: add list settings page with user management"
```

---

## Task 14: Firestore security rules

**Files:** `firestore.rules` (create)

- [ ] **Step 1: Create `firestore.rules`**

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /lists/{listId} {
      // Reads: user's email (from custom token claim) must be in memberEmails
      allow read: if request.auth != null
        && request.auth.token.email in resource.data.memberEmails;

      // Creates: any authenticated user can create a list
      allow create: if request.auth != null;

      // All updates and deletes go through Server Actions (Admin SDK bypasses rules)
      allow update, delete: if false;
    }

    match /products/{productId} {
      allow read, write: if false;
    }
  }
}
```

- [ ] **Step 2: Deploy rules to Firebase**

Install Firebase CLI if not present:
```bash
pnpm add -g firebase-tools
firebase login
firebase init firestore  # Select existing project, use firestore.rules
firebase deploy --only firestore:rules
```

- [ ] **Step 3: Verify rules work**

1. Sign in and open `/lists/<id>` — should load list normally
2. Sign out and try to fetch a Firestore document directly from browser console:
   ```js
   import { doc, getDoc } from "firebase/firestore"
   // Should throw permission-denied if not authenticated
   ```
3. Sign in as a non-member and visit `/lists/<id>` — should redirect to `/`

- [ ] **Step 4: Commit**

```bash
git add firestore.rules
git commit -m "feat: add Firestore security rules"
```

---

## Task 15: Final smoke test + cleanup

- [ ] **Step 1: Run full test suite**

```bash
pnpm test
```

Expected: all tests pass.

- [ ] **Step 2: Run build**

```bash
pnpm build
```

Expected: build succeeds with no errors.

- [ ] **Step 3: End-to-end verification checklist**

Open `http://localhost:3000`:

- [ ] Unauthenticated: hero illustration + "Iniciar sesión con Google" button visible
- [ ] Sign in with Google → redirected to home, lists grid shown, FAB visible
- [ ] Click FAB → `/lists/new` with title + market form
- [ ] Submit form → redirected to `/lists/<id>`, shows title + market + "Aún no hay productos"
- [ ] "Compartir" FAB visible → navigates to `/lists/<id>/settings`
- [ ] Add second Google account email → appears in list, role shown correctly
- [ ] Sign in as second user in another browser → shared list appears on their home page
- [ ] Both tabs open on same list → edit in Firebase Console → both update in real-time
- [ ] Remove second user → disappears from their home page within ~1 second
- [ ] Delete list (owner) → redirected to home, list gone
- [ ] Sign out → hero page shown again
- [ ] logo.png visible in TopBar and as favicon
- [ ] Footer shows "Hecho con ♥ por Anna y Joan"
- [ ] App is in Spanish throughout

- [ ] **Step 4: Commit any final fixes**

```bash
git add -A
git commit -m "chore: final cleanup and smoke test"
```
