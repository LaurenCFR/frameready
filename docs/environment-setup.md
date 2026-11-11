# FrameReady development, Preview, and Production setup

This application deliberately fails closed when an environment is mixed. A Vercel Preview deployment cannot use a live Stripe key or send directly to a customer. Supabase connections must match their declared project reference, and Stripe API calls must match the declared FrameReady account ID.

## Git and Vercel workflow

1. Keep `main` as the Vercel Production Branch.
2. Develop on a feature branch such as `chore/preview-environment-isolation`.
3. Push that branch only when you are ready to create a Vercel Preview deployment.
4. Test the Preview deployment end to end against Preview-only services.
5. Merge to `main` only after the checklist below passes. A merge to `main` is the production release action.

In Vercel, open **Project → Settings → Environments** and make sure Preview variables are not inheriting Production secrets. Open **Project → Settings → Git** and confirm the Production Branch is `main`. Do not assign `www.framereadystudio.com` to a Preview deployment.

Before merging this branch, configure every new **Production-only** variable below and create the Production Stripe webhook. The code intentionally fails closed when a required value is absent; merging first would break checkout, Supabase access, and email on Production.

## Vercel Production variables

Set every variable below with **Production only** scope. Do not copy these values into Preview.

| Variable | Production value |
| --- | --- |
| `FRAMEREADY_ENVIRONMENT` | `production` |
| `NEXT_PUBLIC_FRAMEREADY_ENVIRONMENT` | `production` |
| `NEXT_PUBLIC_SITE_URL` | `https://www.framereadystudio.com` (no trailing slash) |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://udbnfwxmlhhsojotsjmz.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production `sb_publishable_` key from Supabase project `udbnfwxmlhhsojotsjmz` (legacy variable name) |
| `NEXT_PUBLIC_SUPABASE_PROJECT_REF` | Production project reference from the Supabase URL |
| `NEXT_PUBLIC_PRODUCTION_SUPABASE_PROJECT_REF` | The Production project reference |
| `SUPABASE_PROJECT_REF` | The same Production project reference |
| `SUPABASE_PRODUCTION_PROJECT_REF` | The same Production project reference |
| `SUPABASE_SERVICE_ROLE_KEY` | Production `sb_secret_` key from Supabase project `udbnfwxmlhhsojotsjmz`; server-only (legacy variable name) |
| `STRIPE_SECRET_KEY` | FrameReady account live key beginning `sk_live_` |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for the Production endpoint below |
| `STRIPE_EXPECTED_ACCOUNT_ID` | FrameReady Stripe account ID beginning `acct_` |
| `EMAIL_DELIVERY_MODE` | `live` |
| `RESEND_API_KEY` | Production Resend key |
| `DELIVERY_FROM_EMAIL` | Verified production sender, for example `FrameReady <deliveries@framereadystudio.com>` |
| `ADMIN_EMAIL` | Production admin login email |
| `ADMIN_PASSWORD` | Unique production admin password |
| `ADMIN_SESSION_SECRET` | Unique long random production secret |

Do not define `EMAIL_TEST_RECIPIENT` in Production. Remove the obsolete `SITE_URL` variable if it exists; the application no longer reads it.

The email mode variable is named **`EMAIL_DELIVERY_MODE`**. Do not set `EMAIL_MODE`: the application does not read it, and email sending will fail closed if `EMAIL_DELIVERY_MODE` is absent. `VERCEL_ENV`, `VERCEL_BRANCH_URL`, and `NODE_ENV` are platform-provided values rather than project secrets; enable Vercel's automatic system environment variables so the first two are available where required.

## Vercel Preview variables

Set every variable below with **Preview only** scope. These must belong to isolated non-production services.

| Variable | Preview value |
| --- | --- |
| `FRAMEREADY_ENVIRONMENT` | `preview` |
| `NEXT_PUBLIC_FRAMEREADY_ENVIRONMENT` | `preview` |
| `NEXT_PUBLIC_SUPABASE_URL` | Separate Preview Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Preview project's `sb_publishable_` key (legacy variable name) |
| `NEXT_PUBLIC_SUPABASE_PROJECT_REF` | Preview project reference from the Preview URL |
| `NEXT_PUBLIC_PRODUCTION_SUPABASE_PROJECT_REF` | Production project reference; used only to block accidental Production access |
| `SUPABASE_PROJECT_REF` | The same Preview project reference |
| `SUPABASE_PRODUCTION_PROJECT_REF` | Production project reference; used only to block accidental Production access |
| `SUPABASE_SERVICE_ROLE_KEY` | Preview project's `sb_secret_` key; server-only (legacy variable name) |
| `STRIPE_SECRET_KEY` | Correct FrameReady sandbox key beginning `sk_test_` |
| `STRIPE_WEBHOOK_SECRET` | Signing secret for the Preview endpoint below |
| `STRIPE_EXPECTED_ACCOUNT_ID` | Account ID shown while signed into the correct FrameReady Stripe sandbox account |
| `EMAIL_DELIVERY_MODE` | `redirect` |
| `EMAIL_TEST_RECIPIENT` | A developer-controlled inbox; all Preview mail is forced here |
| `RESEND_API_KEY` | Non-production Resend key; a separate account/key is preferred |
| `DELIVERY_FROM_EMAIL` | Non-production sender, for example `FrameReady Preview <onboarding@resend.dev>` |
| `ADMIN_EMAIL` | Preview-only admin login email |
| `ADMIN_PASSWORD` | Unique Preview-only password |
| `ADMIN_SESSION_SECRET` | Unique long random Preview-only secret |

Do **not** set `NEXT_PUBLIC_SITE_URL` or `SITE_URL` for Preview. In **Vercel → Project → Settings → Environment Variables**, enable **Automatically expose System Environment Variables**. Preview links use `VERCEL_BRANCH_URL`, not the immutable per-deployment `VERCEL_URL`. Vercel's branch URL always routes to the latest deployment on that branch, so it is the required stable Stripe webhook host. The URL helper removes a trailing slash before appending a path. Never attach the apex production domain to a Preview branch.

## Supabase Preview project

1. Create a new Supabase project for FrameReady Preview. Do not link it to the Production database.
2. Run `supabase/schema.sql` in the new Preview project's SQL Editor. It contains the current `orders`, `checker_submissions`, `checker_review_requests`, and `system_events` columns, indexes, foreign key, update triggers, RLS settings, and both Storage buckets.
3. Confirm both buckets exist and are **Private**:
   - `order-uploads` for source files, fonts, and deliveries.
   - `review-requests` for checker review uploads.
4. Keep RLS enabled on all four application tables. Create no anon/authenticated table policies: current table access is server-only through the secret key's elevated role.
5. Create no public `storage.objects` policies. Server operations use the secret key; browser order uploads use a token created by `createSignedUploadUrl` and consumed by `uploadToSignedUrl` with the publishable client.
6. Put the Preview project URL, `sb_publishable_` key, `sb_secret_` key, and project reference into Preview-scoped Vercel variables. Although the Vercel variable names retain `ANON` and `SERVICE_ROLE` for deployment compatibility, their values must be the new key types.
7. Create a disposable Preview order, checker report, order upload, and review-request upload. Verify all rows and both objects exist only in the Preview project.

Never import Production customer data, delivery tokens, or order files into Preview.

## Stripe sandbox and webhooks

First select the already-successful **FrameReady US sandbox** in Stripe. Do not use a different personal, AU, or newly created sandbox. From that same sandbox/account context:

1. Copy its `sk_test_...` secret into Preview `STRIPE_SECRET_KEY`.
2. Record the account ID returned for that key as Preview `STRIPE_EXPECTED_ACCOUNT_ID`.
3. Create the Preview webhook destination there and copy that destination's `whsec_...` into Preview `STRIPE_WEBHOOK_SECRET`.

The application checks the key mode and calls Stripe's current-account API before checkout or webhook work. A key from another Stripe account/sandbox fails the account-ID check. Webhook signatures additionally fail if the `whsec_...` value came from another destination or sandbox.

Create two separate webhook destinations:

- Preview: `https://<VERCEL_BRANCH_URL>/api/stripe/webhook`
- Production: `https://www.framereadystudio.com/api/stripe/webhook`

Subscribe each endpoint only to:

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.expired`

Copy each endpoint's own `whsec_...` signing secret into the matching Vercel scope. A signing secret is endpoint-specific; never reuse the Production secret in Preview. After changing a Preview endpoint or secret, redeploy the Preview branch before testing.

If Vercel Deployment Protection is enabled, create a **Protection Bypass for Automation** secret and append it only in Stripe's Preview destination configuration:

`https://<VERCEL_BRANCH_URL>/api/stripe/webhook?x-vercel-protection-bypass=<secret>`

Do not commit that bypass secret or put it in application-generated links. Stripe still must pass the independent `stripe-signature` verification.

## Email safety

Preview must use `EMAIL_DELIVERY_MODE=redirect`. The email wrapper replaces every recipient with `EMAIL_TEST_RECIPIENT`, prefixes the subject with `[FrameReady preview]`, and adds the intended recipient to a warning banner. Production mail is allowed only when both `FRAMEREADY_ENVIRONMENT=production` and `EMAIL_DELIVERY_MODE=live` are present.

Use obviously fake customer addresses in Preview even with redirection enabled. Do not copy real customer records into the Preview database.

## Local development

Copy `.env.example` to `.env.local` and use only Preview/Sandbox credentials. For local Stripe webhook testing:

1. Run the app locally.
2. Run Stripe CLI while logged into the correct FrameReady sandbox account.
3. Forward `checkout.session.completed` and `checkout.session.expired` to `http://localhost:3000/api/stripe/webhook`.
4. Put the temporary CLI `whsec_...` value in local `.env.local` only.

## End-to-end Preview checklist

- [ ] `VERCEL_BRANCH_URL` exists and is not `www.framereadystudio.com`.
- [ ] Stripe's Preview destination uses that branch URL and reaches the handler after a second deployment of the same branch.
- [ ] Deployment Protection either permits that endpoint or the Stripe URL includes the automation-bypass query parameter.
- [ ] Preview environment variables have Preview-only scope and Production variables have Production-only scope.
- [ ] A Preview page loads using the Preview Supabase project.
- [ ] A harmless upload appears only in the Preview `order-uploads` bucket.
- [ ] A harmless checker review upload appears only in the Preview `review-requests` bucket.
- [ ] A new order appears only in the Preview `orders` table.
- [ ] Checkout opens Stripe sandbox/test mode under the expected FrameReady account.
- [ ] Checkout success and cancel return to the same Preview deployment, with no doubled slash.
- [ ] The Preview Stripe endpoint receives `checkout.session.completed` and its signature verifies.
- [ ] Re-sending the same completed event does not duplicate the paid-revision state transition.
- [ ] The paid order is updated only in Preview Supabase.
- [ ] Payment receipt, checker report, revision, and delivery email flows all arrive only at `EMAIL_TEST_RECIPIENT`.
- [ ] Preview email subjects are prefixed and the body identifies the intended recipient.
- [ ] Delivery links in redirected emails point to the Preview deployment.
- [ ] Admin login uses Preview-only credentials.
- [ ] `npm run test:environment`, focused lint for the changed isolation modules, and `npm run build` pass.
- [ ] No `.env*`, API key, webhook secret, service-role key, or customer data is included in Git.

Stop and correct the configuration if any check touches a Production row, object, Stripe event, email recipient, domain, or current order.
