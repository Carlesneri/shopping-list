# COMPALE — Design Spec

> Collaborative shopping list web app in Spanish, mobile-first.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 App Router |
| Auth | next-auth v5 + Google provider |
| Database | Firestore (Firebase) |
| Server mutations | Server Actions + Firebase Admin SDK |
| Real-time reads | Firestore client SDK (`onSnapshot`) |
| Auth bridge | Server Action issues Firebase custom token → client `signInWithCustomToken()` |
| Notifications | Sonner |
| Icons | @tabler/icons-react |
| Styling | Tailwind v4 + Lingo CSS tokens |
| Linting | Biome |

---

## Data Model

```
lists/{listId}
  title: string
  market: string
  allowedUsers: { email: string, role: "owner" | "admin" | "member" }[]
  memberEmails: string[]   // denormalized for Firestore array-contains queries
  products: []             // empty — will hold DocumentReferences in future
  createdAt: Timestamp
  updatedAt: Timestamp

products/{productId}       // stub collection, empty for now
```

`memberEmails` must always be kept in sync with `allowedUsers` on every write.

---

## Roles

| Role | Permissions |
|---|---|
| owner | Full control, can delete the list, cannot be removed |
| admin | Add/remove members and admins, cannot delete |
| member | View and edit products (read-only on settings) |

---

## Pages & Routes

| Route | Description |
|---|---|
| `/` | Home — hero + login button (unauthenticated); list grid + FAB (authenticated) |
| `/lists/new` | Create list form (title + market) |
| `/lists/[id]` | List detail — real-time, products placeholder, Compartir FAB |
| `/lists/[id]/settings` | Manage sharing — user table, add user form |

All `/lists/*` routes protected via `app/lists/layout.tsx` auth check (Next.js proxy pattern).

---

## Auth Flow

1. Unauthenticated user → home shows hero + "Iniciar sesión con Google" button
2. next-auth Google OAuth → session with `{ name, email, image }`
3. Server Action `getFirebaseToken()` → Admin SDK `createCustomToken(sha256(email), { email })`
4. Client: `signInWithCustomToken(clientAuth, token)` → Firestore authenticated
5. All `onSnapshot` listeners run as authenticated user

---

## Real-time Data Flow

- **Home:** `onSnapshot` on `lists` where `memberEmails array-contains currentUser.email`
- **List detail:** `onSnapshot` on `lists/{id}` — redirects to `/` if user removed mid-session
- **Mutations:** Server Actions (Admin SDK bypass rules) → snapshot fires automatically

---

## Firestore Security Rules

- Read list → `request.auth.token.email in resource.data.memberEmails`
- Create list → authenticated
- Update/Delete → `false` (all mutations go through Admin SDK)

---

## UI — Lingo Design System

**CSS tokens:**

| Token | Value |
|---|---|
| `--color-primary` | `#58cc02` |
| `--color-secondary` | `#ce82ff` |
| `--color-danger` | `#ff4b4b` |
| `--color-warning` | `#ffc800` |
| `--color-text` | `#3c3c3c` |

**Fonts:** Nunito (sans) + JetBrains Mono (mono), loaded via `next/font/google`.

**Visual style:** Bold Nunito (700–900), tactile 3D box-shadow borders (`0 4px 0 0 <darker>`), rounded-sm (4px) / rounded-md (8px).

**Components:** Button (primary/ghost/danger), ListCard, UserBadge, TopBar, Footer.

**Assets:**
- `public/logo.png` → TopBar + `app/icon.png` (favicon)
- `public/compale.png` → hero on unauthenticated home

**Footer:** "Hecho con ♥ por Anna y Joan" — `<IconHeart>` filled red.
