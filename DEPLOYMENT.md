# Deploying TrimBook to Vercel

The app reads all secrets from environment variables. Your local `.env` is
**gitignored** (secrets must never be committed), so Vercel does **not** get
these automatically — you must add them in the Vercel dashboard. A missing
`DATABASE_URL` is why a fresh deploy shows *"We can't reach the database"*.

## 1. Add environment variables in Vercel

Vercel → your project → **Settings → Environment Variables**. Add each of the
following for the **Production** (and Preview) environments.

Copy the values marked *(from your local `.env`)* straight out of your local
`trimbook/.env` file — they are identical.

| Key | Value |
| --- | --- |
| `DATABASE_URL` | *(from your local `.env`)* — the transaction pooler URL (`...pooler.supabase.com:6543/...?pgbouncer=true&connect_timeout=30&sslmode=require`). For serverless, append `&connection_limit=1`. |
| `DIRECT_URL` | *(from your local `.env`)* — the session pooler URL (`:5432`). |
| `AUTH_SECRET` | *(from your local `.env`)* |
| `CRON_SECRET` | *(from your local `.env`)* |
| `AUTH_TRUST_HOST` | `true` |
| `NEXT_PUBLIC_APP_URL` | Your production URL, e.g. `https://trimbook.yourdomain.com` |
| `AUTH_URL` | Same production URL, e.g. `https://trimbook.yourdomain.com` |

Optional (have sane defaults, override only if needed): `TRIAL_DAYS`,
`GRACE_PERIOD_DAYS`, `BILLING_CYCLE_DAYS`, `STARTER_PRICE_UGX`,
`CANCELLED_RETENTION_DAYS`.

> ⚠️ Do **not** set `NEXT_PUBLIC_APP_URL` / `AUTH_URL` to `localhost` in
> production — use your real domain, or auth callbacks and links break.

## 2. Redeploy

After adding the variables, trigger a redeploy (Vercel → Deployments → ⋯ →
**Redeploy**, or just push a commit). Env vars are only picked up on a new build.

## 3. Region

`vercel.json` pins serverless functions to `dub1` (Dublin / eu-west-1) to sit
next to the Supabase database (also `eu-west-1`), avoiding cross-region latency
that can exceed connection timeouts.

## 4. Database migrations

Migrations are already applied to Supabase. If you change the Prisma schema
later, run locally against the same database:

```bash
npm run db:migrate      # dev: create + apply a migration
# or, in CI/CD against production:
npm run db:deploy       # prisma migrate deploy
```

## 5. Cron

`vercel.json` schedules the subscription checker daily (`0 0 * * *`) — the
maximum frequency on Vercel's Hobby plan. On Pro you can change it to hourly
(`0 * * * *`). Vercel automatically sends `Authorization: Bearer $CRON_SECRET`,
which the route verifies.
