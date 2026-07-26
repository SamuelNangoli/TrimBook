# TrimBook

Multi-tenant SaaS platform for barbershops. Each shop is an isolated tenant
(scoped by `shopId`) sharing one application. Built in phases.

## Stack

- **Next.js 16** (App Router, Turbopack) · **React 19.2** · **TypeScript**
- **Tailwind CSS v4** + shadcn-style UI · light/dark mode (`next-themes`)
- **Prisma 6** + **PostgreSQL**
- **Auth.js (NextAuth v5)** — Credentials provider, JWT sessions carrying
  `role` + `shopId`
- **Zod v4** validation · **bcryptjs** password hashing

> Note: Next.js 16 renames `middleware.ts` → **`proxy.ts`** (Node runtime) and
> makes `cookies()`, `headers()`, `params`, `searchParams` **async**. This
> project already follows those conventions.

## Architecture

```
src/
  app/                     # routes (App Router)
    (auth)/                # login, register, register/shop
    admin/ dashboard/ barber/ account/   # role homes (guarded)
    api/auth/[...nextauth]/ # Auth.js handlers
  components/
    ui/                    # Button, Input, Label, Card (shadcn-style)
    app/ auth/             # topbar, theme toggle, logout, field errors
  lib/
    auth/                  # NextAuth config, password hashing
    db/prisma.ts           # Prisma singleton
    subscription/policy.ts # PURE feature-gating from subscription state
    validations/           # Zod schemas
    dal.ts                 # Data Access Layer: requireUser/Role/ShopId
    constants.ts env.ts utils.ts
  server/
    tenant/context.ts      # tenant context + assertShopAccess / resolveScopeShopId
    repositories/          # tenant-scoped repository base + ServiceRepository
    services/              # auth.service, audit.service
    actions/               # server actions (auth)
  types/next-auth.d.ts     # session/JWT augmentation (role + shopId)
proxy.ts                   # optimistic route guard (Next 16 middleware)
prisma/schema.prisma       # full data model (13 tables, shopId everywhere)
prisma/seed.ts             # super admin + demo shop/barber/services/customer
```

### Tenant isolation (defense in depth)

1. **Session** carries `shopId`; staff are locked to their own shop.
2. **`proxy.ts`** does cheap optimistic redirects (no DB) for protected areas.
3. **DAL** (`requireRole`, `requireShopId`) enforces role + shop on every entry.
4. **Repositories** force `shopId` into every `where`/`create` via `scope()`.
5. **`assertShopAccess`** re-checks a loaded row's `shopId` before returning it.

Only `SUPER_ADMIN` may cross tenant boundaries, and only explicitly.

## Getting started

```bash
npm install
cp .env.example .env          # then set DATABASE_URL + AUTH_SECRET
npm run db:migrate            # create tables (needs a real Postgres)
npm run db:seed               # demo data
npm run dev
```

Demo logins (password `Password123`): `admin@`, `owner@`, `barber@`,
`customer@` `trimbook.app`.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js dev / prod build / serve |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:migrate` / `db:deploy` | Prisma migrations (dev / prod) |
| `npm run db:seed` / `db:studio` | Seed data / Prisma Studio |

## Roadmap

Phase 1 ✅ setup, schema, auth, multi-tenant · Phase 2 onboarding/subscription/
dashboard · 3 bookings · 4 barbers · 5 customer portal · 6 notifications ·
7 payments · 8 reports · 9 testing · 10 deployment.
