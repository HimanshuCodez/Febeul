# Febeul security audit and deployment guide

Audit date: 13 October 2026. Scope: the local Express API, customer storefront, admin dashboard, dependency lockfiles and Vercel configuration. The changes are local and require deployment. Production accounts, hosting controls, database contents and historical access logs were not inspected. This audit is not a guarantee against compromise.

## Critical findings addressed

| Finding | Change |
| --- | --- |
| Missing OTP values could compare equal to unset database fields, bypassing password reset or admin OTP authentication. | Require six-digit strings, an explicit purpose, a future expiry, five attempts per issued code and atomic single-use consumption. Codes use cryptographic randomness and keyed hashes in storage. |
| Registration could replace an existing account's password whenever an OTP was pending. | Registration requires a short-lived email verification token and an atomic, single-use signup nonce. Only an unprivileged temporary signup record can be finalized. |
| Admin tokens encoded passwords, had no expiry and staff login logged passwords. | Use expiring, audience-specific HS256 tokens without passwords. Reject legacy tokens. Password resets and role changes revoke database sessions. ENV account credential changes invalidate their tokens. |
| Stripe accepted a caller's success flag even without a confirmed gateway payment. | Verify the stored checkout session, owner, paid state, INR currency, amount and order reference before atomically accepting payment. Fail closed on gateway errors. |
| Razorpay callbacks were not bound to the authenticated customer and could repeat membership/fulfillment effects. | Persist the gateway order ID, verify the owner, captured payment, exact amount/currency and receipt, and atomically claim payment once. Use constant-time signature comparison. |
| Submitted discounts, quantities and gift-wrap prices could alter checkout totals. | Recalculate product and order coupons from database rules, reject invalid/duplicate quantities and variants, use database gift-wrap prices and force INR. Stripe charges the final server-calculated total. |
| Hardcoded admin/JWT credentials existed in the tracked migration script. | Remove literals and read deployment configuration. Rotation and historical cleanup remain operational tasks. |

## Additional changes

- Orders, invoices, addresses and reviews use the authenticated customer identity. Support tickets ignore caller-supplied admin flags.
- Database staff checks include current role, block status and permissions. Unknown protected routes and destructive reset operations are denied to staff. ENV staff require explicit permissions.
- Customer blocking is enforced by the API. An already-issued customer session retains access to the profile/support routes for account appeals; shopping operations are denied.
- Passwords require at least 10 characters and at most 72 UTF-8 bytes when created/reset. Existing compatible passwords can still sign in. Customer tokens expire after two hours; ENV admin tokens after one hour; database admin tokens after two hours.
- Auth routes have MongoDB-backed IP/account limits shared across instances. General API requests have a per-process limit. JSON payloads are limited to 100 KB; the separate analytics limit remains 32 KB. MongoDB operator/prototype keys and excessive input nesting are rejected.
- Multipart uploads use random filenames, byte-signature validation, 5 MB image/20 MB video limits and temporary-file cleanup. General uploads allow at most 12 files; authenticated product add/update routes allow up to 60 new images across variations per save, with a 5 MB limit per image. Add/Edit Product validate these shared limits before submission and display the backend's upload error. This is not an antivirus scanner.
- Product descriptions and admin HTML previews are sanitized. The editor sanitizes both incoming HTML and exported changes. Vercel storefront/admin configurations set CSP, anti-framing, MIME, referrer, permissions and HSTS headers; the API uses Helmet and an explicit CORS origin list.
- Passwords, OTP fields, signup secrets and session versions are omitted from serialized users. Public coupon/gift-wrap responses omit redemption/customer lists. Private email templates are blocked from the generic public CMS endpoint.
- Customer cancellation is claimed atomically. Unpaid gateway orders do not restore inventory, and cancellation replays cannot restore it repeatedly. Paid membership cancellations require support review, preventing automatic refunds while retaining digital benefits.
- Razorpay refunds validate the paid order, payment ID and amount. The original refund amount is persisted and retries send the same gateway idempotency key. Changing the amount after the first submission requires manual reconciliation; do not simply clear the field. Approved membership refunds revoke membership benefits.
- Production authentication requires a configured JWT secret of at least 32 bytes. Admin/customer clients clear rejected sessions so users can sign in again.

## Required rollout actions

1. Rotate `JWT_SECRET`, the primary admin password and every ENV staff password before deployment. Admin tokens previously contained these passwords in readable form. Review access to Git history and old logs, remove leaked log copies where possible, and rotate any other secret that was reused or exposed. Changing source alone does not invalidate copies of credentials.
2. Set the environment variables described in `backend/.env.example`. For the current storefront and Vercel admin, set `CORS_ORIGINS=https://febeul.com,https://www.febeul.com,https://febeul.vercel.app` on the **Render backend service**. This value replaces the code defaults; retain any other explicitly trusted browser origins already in use. Use exact origins without paths or trailing slashes. Choose **Save and deploy** after changing Render environment variables, wait for the deployment to become live, then reload the admin. Editing a local `.env` file or the Vercel frontend's environment does not change Render's allowlist. Set `STOREFRONT_URL` to the canonical HTTPS customer site. Verify the hosting provider's proxy behavior before setting `TRUST_PROXY_HOPS`; a wrong value can group all visitors together or allow forged client IPs.
3. Use a supported Node runtime, version 22.12 or newer. Run `npm ci` separately in all three apps. Deploy the backend and rebuilt storefront/admin together; the signup verification contract changed. Build from source rather than serving the old tracked `admin/dist` snapshot. Confirm your host actually applies the Vercel headers, or copy equivalent headers into its configuration.
4. Old tokens and pending OTPs are rejected after rollout. Users and staff must sign in again. ENV administrators now use password login; admin OTP login is available only for explicitly provisioned database staff/admin records. SMS endpoints return unavailable because no SMS sender was implemented; use email authentication.
5. Drain or reconcile checkouts created before deployment. Older Stripe sessions may lack the order reference and older Razorpay records may lack the persisted gateway order ID; the new verifier deliberately rejects those incomplete proofs. Check the gateway before manually settling any such paid order.
6. Verify signup, password reset, customer/admin login, staff restrictions, a test payment/refund, uploads and CSP on the actual deployment. Tests here used disposable local MongoDB, intercepted gateway/email calls and local browser fixtures; they did not send real money or customer emails.
7. Enable hosting/WAF rate limits and DDoS protection, MFA for hosting/database/payment/admin-email accounts, least-privilege database credentials, restricted database network access, encrypted backups and tested recovery. Check these in the respective provider consoles; they cannot be established by application source changes.

## Cloudflare Turnstile on customer authentication

`AuthPage.jsx` uses a Cloudflare Turnstile widget for password login, Google login, sending/resending email OTPs, and verifying signup/login OTPs. The backend calls Cloudflare Siteverify before authentication and requires a successful result for action `auth` and an explicitly allowed hostname. Final registration still requires the signed, single-use email verification proof; it does not reuse the CAPTCHA token consumed by OTP verification. This change does not add CAPTCHA to admin login or the separate password-reset page.

To activate it:

1. In the [Cloudflare dashboard, create a Turnstile widget](https://developers.cloudflare.com/turnstile/get-started/widget-management/dashboard/) in **Managed** mode. Add `febeul.com` and `www.febeul.com` as allowed hostnames (no scheme or path).
2. Deploy the updated backend **with both Turnstile keys unset**, then deploy the updated storefront. The new frontend requires the backend's `/api/user/auth-config` endpoint, and its Vercel CSP permits Cloudflare's script and challenge frame. Deploying the frontend first would temporarily block sign-in because that configuration endpoint would be missing.
3. Set these environment variables together on the **Render backend service**, then **Save and deploy**:

   ```dotenv
   TURNSTILE_SITE_KEY=<site key from Cloudflare>
   TURNSTILE_SECRET_KEY=<secret key from Cloudflare>
   TURNSTILE_ALLOWED_HOSTNAMES=febeul.com,www.febeul.com
   ```

   The site key is public and is fetched from the backend. The secret stays on Render; never put it in a `VITE_` variable, source code, browser storage, or a public response. No new frontend environment variable is needed. If customer authentication is also served from another hostname, add that exact hostname both to the Cloudflare widget and to `TURNSTILE_ALLOWED_HOSTNAMES`. For local development, use a separate test widget/configuration with the matching development hostname.
4. Reload `/auth` and check password login, Google login, signup and email OTP login on the deployed customer domain. Existing open tabs may need a reload after activation. Verify that direct requests to protected routes without a token are rejected. The local tests mock provider responses; they cannot confirm your production widget, keys, domain settings or hosting headers.

With both keys absent, CAPTCHA is **inactive** and current authentication remains available for rollout. A partial configuration blocks protected authentication. Once enabled, invalid/expired/reused tokens, an unexpected action/hostname, or a provider failure block the request. The page clears consumed tokens and offers retries for loading, expiry and network errors. Cloudflare tokens expire after five minutes and are single use. [Cloudflare server validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/).

Integration checks: from `backend`, run `node --test tests/turnstile.test.js tests/security.test.js tests/cors.test.js`; from `frontend`, run `npx playwright test --config playwright.auth.config.mjs`. The browser checks use local provider fixtures and send no customer emails.

## Cancellation refunds and admin history

Customer cancellation and the admin **Orders → Cancel** confirmation use the same pre-dispatch cancellation flow. The order is saved as cancelled before gateway work; the full stored order total (including the paid delivery charge) is requested from Razorpay or Stripe. Customers see the cancelled status and refund reference. Unpaid COD cancellations record a zero refund, with no payment API call. Dispatched/delivered orders remain in the return workflow.

**Refund Requests** now includes customer/admin cancellations and older cancellation records. Open a record to see who cancelled it, the reason, refund amount/reference, provider status, attempts and history. A pending gateway response remains **Processing** until the provider reports completion. Use **Retry full refund** for an older failed cancellation with no refund reference, or **Check refund status** when a reference exists. The latter only reads that gateway refund; it can also correct older records that were incorrectly marked completed while the gateway was still pending. Gateway failures and shipment/stock problems are visible to admins, with internal diagnostics removed from customer responses.

Deploy the **backend first**, then rebuild/deploy **admin and storefront**. No new environment variables are required: the backend uses the existing `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `STRIPE_SECRET_KEY` for the respective payment methods. The original payment and refund must belong to the same gateway account/mode. A missing key, insufficient gateway balance or a provider rejection still requires the account issue to be resolved; inspect the recorded error before retrying. No production payment or refund was made during implementation.

The backend checks its persisted cancellation refund queue every 30 seconds while the service runs. Failed attempts use backoff and stop after five errors; admins can retry explicitly. Accepted, processing refunds continue to be checked. Jobs survive restarts through MongoDB, but automatic checks pause when hosting suspends the backend. Existing cancellations are not bulk-refunded on deployment: review and retry/check them individually. Completed at the gateway does not guarantee the bank has already credited the customer. Stable idempotency keys, a stored amount lock and a MongoDB processing lease protect retries against duplicate refund creation. [Razorpay idempotent refunds](https://github.com/razorpay/markdown-docs/blob/master/api/refunds/normal-refunds-idempotent.md), [Stripe refunds](https://docs.stripe.com/api/refunds/create), [Stripe idempotency](https://docs.stripe.com/api/idempotent_requests).

Verification: from `backend`, run `node --test tests/cancellations.test.js tests/security.test.js tests/shiprocket.test.js`. From `frontend`, run `npx playwright test --config playwright.cancellations.config.mjs`. These tests use disposable data and mocked payment providers. Check a permitted test-mode cancellation after deployment to verify the deployed account configuration.

## Dependency status

The initial registry audit reported 23 backend, 28 storefront and 31 admin dependency findings, including two critical findings in the backend dependency tree. Safe updates and targeted migrations updated the lockfiles, removed backend nodemon in favor of Node's watch mode, upgraded bcrypt/Multer/Nodemailer, replaced the old rich-text wrapper, and upgraded the admin router/build tool. The selector-parser override addresses its published advisory without a Tailwind major migration.

At the final audit:

| App | Full dependency tree | Production dependencies |
| --- | --- | --- |
| Backend | 0 findings | 0 findings |
| Storefront | 5 high, all in the Tailwind build-tool dependency chain | 0 findings |
| Admin | 5 high in the same build-tool chain; 2 low editor-related findings | 2 low findings |

The five build findings arise from the unpatched `braces` dependency and affected consumers (`chokidar`, `micromatch`, `fast-glob`, `tailwindcss`). These run during builds, not in the deployed static JavaScript. Keep build inputs trusted and development servers private. A Tailwind 4 migration would need a separate visual compatibility pass; no forced major upgrade was applied merely to suppress the audit.

Quill 2.0.3 has an HTML-export advisory with no patched version listed; npm also reports its wrapper as affected. HTML sanitization at editor input/output and every direct HTML-rendering site reduces the identified risk. The upstream dependency finding remains open. [Quill advisory](https://github.com/advisories/GHSA-v3m3-f69x-jf25).

## Remaining engineering and operational risks

- Inventory, coupon redemption and free gift-wrap allowances are not reserved transactionally across separate simultaneous checkout attempts. Payment/cancellation replay is blocked, but distinct concurrent orders can still race these business limits. Add transactional reservations and concurrency tests before relying on strict stock or promotion limits against deliberate abuse.
- Payment acceptance and later stock/email/shipment work are not a durable transactional job. A crash after accepting payment can leave fulfillment incomplete; retries intentionally avoid repeating side effects. Add an outbox/reconciliation worker and gateway webhooks to recover safely when browser callbacks or external services fail. Stripe recommends webhook-driven fulfillment. [Stripe fulfillment guidance](https://docs.stripe.com/checkout/fulfillment).
- Browser tokens remain in local storage for compatibility with the current cross-origin API. They expire and are audience-bound, but a future same-origin script compromise could read them. A future HttpOnly-cookie session design needs coordinated CORS, CSRF and deployment changes.
- General API rate limiting is per process. The durable authentication limit does not replace edge limits or spending/abuse controls for uploads, checkout creation, email, analytics or tracking requests.
- CSP keeps HTTPS connections and media broad to support existing integrations. Review actual production endpoints before narrowing it further; test Google sign-in and Razorpay/Stripe flows on the deployed origins.
- HTTPS enforcement at the edge, DNS/domain ownership, provider MFA, secret rotation, database network rules, backups, customer bank-data retention/encryption and historical compromise assessment require provider/account review.

## Verification commands

Results: 71 backend tests passed (including 20 security regression tests), 8 storefront unit tests passed, and 8 browser tests passed (6 product/security checks and 2 email-editor checks). Both production builds passed. The storefront build reports its existing large-bundle warning. The admin verification build used `.security-build` to avoid modifying the tracked legacy build snapshot. `git diff --check` passed.

Run each command from the indicated app directory:

```text
backend:  npm test
backend:  npm run test:security
frontend: npm run test:analytics
frontend: npm run test:product-coupons
frontend: npx playwright test --config playwright.email-templates.config.mjs
frontend: npm run build
admin:    npm run build
all apps: npm audit
all apps: npm audit --omit=dev
```

The security suite exercises missing/expired/wrong-purpose OTPs, attempt budgets, concurrent code consumption, account takeover prevention, session revocation, role/identity isolation, ownership checks, gateway failures and payment replay, price/quantity tampering, privacy, injection, upload validation/cleanup, limits, cancellation concurrency and refund idempotency. Browser checks cover product coupon behavior, stored-HTML injection and email-editor operations.

The control choices follow [OWASP REST security guidance](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html), [Express production security guidance](https://expressjs.com/en/advanced/best-practice-security/) and the [Razorpay idempotent refund API](https://github.com/razorpay/markdown-docs/blob/master/api/refunds/normal-refunds-idempotent.md).
