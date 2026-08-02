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
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google OAuth client (see below). Omit to hide the Google button. |
| `AUTH_RESEND_KEY` | Resend API key for magic-link emails (see below). |
| `EMAIL_FROM` | e.g. `TrimBook <no-reply@yourdomain.com>` (a Resend-verified sender). |
| `NEXT_PUBLIC_APP_URL` | Your production URL, e.g. `https://trimbook.yourdomain.com` |

Optional (have sane defaults, override only if needed): `TRIAL_DAYS`,
`GRACE_PERIOD_DAYS`, `BILLING_CYCLE_DAYS`, `STARTER_PRICE_UGX`,
`CANCELLED_RETENTION_DAYS`.

> ⚠️ **Do NOT set `AUTH_URL` or `NEXTAUTH_URL` on Vercel** (and never to
> `localhost`). With `AUTH_TRUST_HOST=true` the app detects the real request
> host automatically, so login/logout redirect to the correct domain. A stale
> `localhost` value here is the usual cause of *"page cannot be reached"* after
> logout. `NEXT_PUBLIC_APP_URL` should be your real domain (used only for links).

## 1b. Passwordless sign-in setup

**Google OAuth** (console.cloud.google.com → APIs & Services → Credentials →
Create OAuth client ID → Web application):
- Authorized JavaScript origin: `https://your-domain`
- Authorized redirect URI: `https://your-domain/api/auth/callback/google`
- Copy the Client ID/Secret into `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`.

**Magic-link email** (resend.com): create an API key → set `AUTH_RESEND_KEY`.
Verify a sending domain and set `EMAIL_FROM` to an address on it. Without a key,
sign-in links are logged to the server console (fine for local dev, not prod).

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
