# ClipForge AI

AI video-generation SaaS built from the ClipForge AI PRD v1.0.
Next.js 15 (App Router) · TypeScript · Tailwind CSS v4 · Supabase (Auth, Postgres, Storage) · Claude · fal.ai (video + voice) · Inngest · Paystack · Vercel.

## What's included

| Area | Status |
|---|---|
| Public site: home, pricing (from DB), FAQ, about, contact (saved to DB), privacy, terms, content policy | Built |
| Auth: email/password, Google, email verification, password reset, protected routes (middleware + server checks) | Built |
| Dashboard: overview, sidebar and mobile nav, notifications, credit balance | Built |
| Creation studio: modes, prompt, Claude prompt enhancement (original kept), settings, server-side credit estimate | Built |
| Pipeline (Inngest): Claude script → fal.ai scene clips → fal.ai Kokoro voiceover → fal.ai Whisper word timings for subtitles → fal FFmpeg compose → private storage | Built (needs keys) |
| Real stage tracking, cancel, retry (reuses completed scenes), partial-failure handling | Built |
| Project library (filters, pagination), project page (player, rename, subtitle editor, SRT/VTT/MP4 download, delete) | Built |
| Credits: atomic reserve → settle/refund, append-only ledger, idempotent per reference | Built and DB-tested |
| Paystack: server init, server verify, HMAC webhook, idempotent fulfilment, plan activation | Built (needs keys) |
| Admin: stats, integration status, users (search, suspend/restore, audited credit adjustments), jobs (errors, retry), plan and credit-rate editing, audit log | Built |
| Brand assets: upload (type, size and magic-byte checks), list, delete | Built |
| Image-to-video, product ads, licensed music, logo/watermark overlay, burned-in captions | Shown as "coming soon" (PRD Phase 6) |

Nothing in the app fakes a result. If keys are missing, the API returns `503 NOT_CONFIGURED`, and the admin page shows which integrations are missing.

## 1. Local setup

```bash
npm install
cp .env.example .env.local      # fill in the values
```

### Supabase
1. Create a project at supabase.com.
2. Run `supabase/migrations/20261113000001_init.sql`, either in the SQL editor or with `supabase db push`. It creates the tables, RLS policies, credit functions, the private `media` bucket and the seed plans.
3. Go to Auth → URL configuration. Set the Site URL to your app URL and add `http://localhost:3000/auth/callback` and `https://YOUR-DOMAIN/auth/callback` to the redirect URLs.
4. Optional: enable the Google provider under Auth → Providers.
5. To make yourself an admin, sign up and then run:
   `update public.profiles set role = 'admin' where email = 'you@example.com';`

### Inngest (background jobs)
Run the dev server in a second terminal:
```bash
npx inngest-cli@latest dev -u http://localhost:3000/api/inngest
```
In production, install the Inngest Vercel integration (or set `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY`).

### AI providers
- `ANTHROPIC_API_KEY`: used for scripts, scene plans and prompt enhancement. The model defaults to `claude-sonnet-5-5`; override it with `ANTHROPIC_MODEL`.
- `FAL_KEY`: used for scene clips (default `fal-ai/kling-video/v2.5-turbo/pro/text-to-video`: 5s/10s clips, 16:9, 9:16 and 1:1) and final assembly (`fal-ai/ffmpeg-api/compose`). Both are overridable in env. Verify pricing and limits on fal.ai before launch.
- Voiceover also runs on `FAL_KEY`: Kokoro TTS (`fal-ai/kokoro/*`) for narration in English (US and UK voices), Spanish, French and Hindi, then `fal-ai/whisper` for word timings that drive the subtitles. No separate voice account is needed. To use a different voice vendor, implement `VoiceGenerationProvider` and swap it in `src/lib/providers/index.ts`.

### Paystack
Set `PAYSTACK_SECRET_KEY` and `PAYSTACK_PUBLIC_KEY` (start with test keys). Set the webhook URL to `https://YOUR-DOMAIN/api/payments/webhook`.

```bash
npm run dev
```

## 2. Checks

```bash
npm run lint        # ESLint
npm run typecheck   # tsc
npm test            # unit tests: pricing, validation, subtitles, webhook signature, script schema
npm run test:db     # Postgres tests: RLS isolation, privilege escalation, reserve/settle/refund, idempotent purchases, immutable ledger
npm run build
```
`test:db` needs a local Postgres (`PGHOST`, `PGPORT`, `PGUSER`). It creates a throwaway database and drops it when finished.

## 3. Deploy (GitHub → Vercel)
1. `git init && git add . && git commit -m "ClipForge AI MVP"`, then push to a new GitHub repo. `.env*` is git-ignored.
2. Import the repo in Vercel and add every variable from `.env.example`. Never put a secret behind a `NEXT_PUBLIC_` prefix.
3. Add the Inngest integration, the Supabase redirect URLs and the Paystack webhook URL.
4. Deploy, then run the smoke test: sign up → create a 15s faceless video → watch the stages → download → buy a test top-up.

## Architecture notes
- **Credits:** The server computes the estimate, using rates stored in `app_settings`. Admins can edit them, and no prices live in frontend code. On submit, credits are reserved atomically with `SELECT … FOR UPDATE` plus a CHECK constraint that blocks negative balances. When the job succeeds, the full estimate is settled as the charge. Failed and cancelled jobs are refunded in full. Every movement is written to `credit_transactions`, which is append-only and enforced by a trigger.
- **Idempotency:** Each submit carries an `Idempotency-Key` header, which is unique per user. Inngest events reuse the generation id as the event id. Credit operations are unique on `(reference, type)`. Payments are credited under the reference `payment:<ref>`, so duplicate webhooks never add credits twice.
- **Durability:** Every provider call and DB write is its own Inngest step. Provider jobs are polled with `step.sleep`, so no request runs longer than one short step. Retries reuse completed scenes and the voiceover.
- **Security:** RLS is on for every table, and users can only `SELECT` their own rows. All writes go through server routes that check ownership before using the service role. Clients can update only `profiles.full_name/avatar_url` and `notifications.is_read`, enforced with column grants. Media lives in a private bucket and is served through short-lived signed URLs.
- **Provider abstraction:** Product logic uses the interfaces in `src/lib/providers/types.ts`. To change vendors, swap the implementations in `src/lib/providers/index.ts`.

## Before launch
- Plan prices and allowances in the migration are **placeholders** (PRD §9.3). Measure real costs first, then update them in Admin → Plans.
- Have a lawyer review the privacy policy and terms (NDPA 2023 / GDPR).
- Monthly plans are charged as one 30-day payment. Auto-renewal with Paystack Subscriptions is a follow-up.
- Free-plan watermarking and burned-in captions need a render step that supports overlays, for example Remotion Lambda behind `VideoRenderingProvider`.
- Rate limiting for enhance and contact is per instance. Back it with Redis or Upstash when you scale.
- Add Sentry, PostHog and Resend email notifications (PRD §15) once you have keys.
