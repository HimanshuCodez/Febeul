# Consented ecommerce analytics

The existing admin **Tracking → User Tracking** link (`/user-tracking`) now opens the analytics dashboard. Staff Tracking and all existing shopping routes remain unchanged. This feature adds first-party analytics; it installs no advertising, Google Analytics, Meta, fingerprinting or third-party tracking service. This is a description of the implementation, not a claim of legal compliance.

## Configuration

Collection is **disabled by default**. No existing `.env` file was changed. When ready, set these variables on the backend and restart it:

| Variable | Default | Meaning |
| --- | --- | --- |
| `ANALYTICS_ENABLED` | `false` | Only the exact string `true` enables event ingestion and new verified-payment facts. Reports and withdrawal remain available when disabled. |
| `ANALYTICS_CONSENT_VERSION` | `2026-10-v1` | Changing this invalidates previous consent on the next configuration load. Use a new version when the stated purposes change. |
| `ANALYTICS_RETENTION_DAYS` | `90` | TTL for newly written visitor events and revocation records; constrained to 1–730 days. Existing expiry dates are not rewritten. |
| `ANALYTICS_ABANDONMENT_MINUTES` | `30` | Inactivity threshold, constrained to 10–1440 minutes. |
| `VITE_ANALYTICS_ENABLED` (frontend, optional) | unset | The exact string `false` also disables analytics in the built storefront. Requires a frontend rebuild when changed. |
| `VITE_BACKEND_URL` | existing configuration | Reuses the existing API origin on frontend and admin. |

See `backend/.env.analytics.example`. Existing MongoDB and authentication configuration is reused. The shared `shared/` directory must be included with frontend/backend sources when building or packaging this monorepo. Reports require MongoDB 5.0+ aggregation support. Mongoose creates the new unique, query and TTL indexes through its existing index initialization behavior; if automatic index creation is disabled in your deployment, create the indexes declared in `backend/analytics/models.js` before enabling collection. No migration of existing order documents is required.

No production deployment, production database connection, production environment edit or real payment was performed for this implementation.

## Consent and privacy

- The responsive banner offers **Accept all**, **Reject optional** and **Manage preferences**. Analytics is off by default. Advertising remains false and has no preference toggle because the repository has no advertising integration.
- Essential sign-in, cart, checkout and operational order/payment records remain available with every choice. The footer's **Cookie settings** button reopens preferences, including when analytics is disabled.
- `febeul.cookie-consent` in localStorage stores the consent version, ISO timestamp, analytics boolean and advertising=false. The identifier-free `/api/analytics/config` request does not create a visitor record. Configuration failure disables tracking for that page lifetime.
- Only after valid consent and enabled configuration can the client generate cryptographically random UUIDs. `febeul.analytics-visitor` stores a browser ID and expiry in localStorage. `febeul.analytics-session` stores a tab session, last-activity time and sanitized attribution in sessionStorage. There are no analytics cookies or external tracker scripts.
- Acceptance starts future collection. It does not replay the current page, searches, cart changes or other activity previously observed without consent. Previously consented visitors may have their initial navigation counted after configuration loads; shopping requests that finish before analytics configuration is ready can be missed rather than held up.
- Withdrawal aborts in-flight event delivery, clears the queue and pending preparations, removes optional browser identifiers and stops future collection. Storage events propagate rejection to other tabs. Reacceptance creates a new browser ID. A short, identifier-only `/withdraw` control request creates a revocation tombstone and deletes stored events for the current browser ID, including visitor-linked purchases. Delayed batches/callbacks are checked against that tombstone. Operational orders and payment facts remain intact.
- Network failure/offline withdrawal cannot guarantee server deletion of events already received; local collection still stops immediately. Requests already delivered cannot be unsent. Identifiers are not retained in the browser for retrying server deletion. The tombstone contains only the old random ID and expiry and is retained for the configured period to reject late traffic.
- Page paths come from a route allowlist. Query strings and fragments are never saved; private order IDs in paths are replaced with `/order-detail`. Referral data is reduced to a domain, without paths, credentials, ports or subdomains. Only `utm_source`, `utm_medium`, and `utm_campaign` are allowed, with restricted characters and lengths; click IDs and other parameters are discarded.
- Search terms are normalized, stripped of unsupported characters and limited to 60 characters. Email-like, URL-like, long numeric and credential-related searches are omitted. This filter reduces accidental disclosure but cannot determine the meaning of every free-text phrase. Only the public product-search action is observed; private forms are not tracked.
- Passwords, authentication tokens, payment details, addresses, gift messages and arbitrary request bodies are never analytics fields. Existing authentication tokens travel only in the existing `token` authentication header. Signed-in identity is derived by the server's existing `authUser` middleware; client-provided user IDs and timestamps are discarded.

## Event sources and deduplication

| Event | Actual source |
| --- | --- |
| `page_view` | React Router navigation, once per navigation entry while consented. Refresh creates a new page lifetime; React rerenders/Strict Mode do not create duplicates. |
| `product_view` | Successful existing `/api/product/single` response on that product's page, once per navigation entry. |
| `search` | Submitted `/products?search=...` navigation, after sanitization. Autocomplete keystrokes and private form text are excluded. |
| `add_to_cart` | Successful existing cart-add API calls, including product page, Buy Now, wishlist and quick-add; also successful positive quantity changes in Cart. |
| `remove_from_cart` | Successful negative quantity changes or item removal in Cart, with the quantity actually requested. Gift wrapping is an order extra and is not treated as a catalog product event. |
| `checkout_started` | Successful nonempty cart fetch on the checkout route, once per navigation entry; also a successfully created Luxe membership payment order. |
| `purchase` | Backend only: gateway-confirmed paid Razorpay orders or Stripe sessions. COD placement is not payment verification and does not create this event. |

Client events are estimates, including any client-supplied amounts. Cart quantity-change/removal amounts are merchandise values in INR, not revenue; checkout starts do not claim an order amount before pricing is finalized. Purchase amount and currency come from the verified gateway response, linked to the existing backend order. No client can submit `purchase` to the ingestion endpoint.

The shared Axios observer is synchronous and failure-isolated; it does not add an analytics await, change shopping request bodies, or change existing responses. It captures consent when the action starts, so accepting consent during an earlier in-flight shopping action does not backfill it. Verification requests recheck current consent, including after a long payment dialog.

Client queues hold at most 100 events, send at most 20 per batch every five seconds, use a three-second request timeout, and attempt each event at most three times. Retries reuse UUID event IDs. Queues are memory-only and can be lost on navigation away/close. Background-tab delivery is attempted but never blocks unload. MongoDB's unique event ID index prevents duplicate writes.

Purchases have a unique order index and deterministic `purchase:<orderId>` event key. A separate `AnalyticsPayment` row is inserted once per verified order, for all consent choices, with only order ID, verified amount/currency and server timestamp. It contains no visitor/session/user identifier, address or gateway credentials. This operational payment fact is retained independently of optional event TTL so deleting/expiring visitor events cannot allow a replayed purchase. Callbacks for an already-paid order cannot newly attribute that purchase. Accepting consent after an untracked callback cannot backfill it.

Optional payment writes run after the HTTP response finishes/closes, are bounded to 50 pending jobs, and swallow analytics failures. There is no durable queue: process termination or a database outage can lose analytics/payment facts. Missing facts are not reconstructed from raw client data. Existing order records remain the operational source of truth.

## Backend endpoints and limits

- `GET /api/analytics/config`: identifier-free feature/purpose configuration; no-store.
- `POST /api/analytics/events`: optional user auth, validated 1–20-event batches, allowlisted server-owned schema. Unknown properties are not persisted. Disabled ingestion returns 204.
- `POST /api/analytics/withdraw`: revokes the unguessable browser ID and removes its event records. This is a privacy control, not an activity event.
- `GET /api/analytics/reports/summary?from=YYYY-MM-DD&to=YYYY-MM-DD`.
- `GET /api/analytics/reports/journeys?from=...&to=...&page=1`.

Both report endpoints use the existing admin middleware and existing `/user-tracking` permission. Primary/database admins are permitted; database staff need that explicit permission. Legacy ENV staff without an explicit permission list are denied. Ordinary storefront tokens and unauthenticated requests cannot read reports.

The isolated analytics JSON parser limits payloads to 32 KiB without changing limits for any existing API. In-memory rate limiting allows up to 120 requests per minute per source and 5,000 total per process, with at most 5,000 buckets. Security rate keys are transient salted hashes of the connection IP; no IP or user agent is stored in analytics records. Forwarded headers are not trusted independently of existing Express configuration. For a multi-instance/reverse-proxy deployment, enforce suitable shared ingress limits; these per-process limits are not a distributed rate limiter. Reporting aggregation has a ten-second execution limit. Date ranges are UTC, inclusive on the selected ending day, and limited to 366 days. Journey pages have 10 sessions and at most the first 100 events per session.

Event indexes cover event ID, unique purchase order, server timestamp, browser/session timestamp and product timestamp. Events have an `expiresAt` TTL index. Reports exclude expired visitor events immediately, even while MongoDB's asynchronous TTL cleanup is pending.

## Metric definitions

| Metric | Definition / denominator |
| --- | --- |
| Consented visitors | Distinct random browser IDs with at least one retained event received in the range; not identified people. |
| Sessions | Distinct tab-session IDs with an event in the range. Renewed after 30 minutes without tracked activity. |
| New / returning | New: no earlier event for that browser in retained history before the range. Returning: at least one such earlier event. Clearing storage, expiry or withdrawal changes this classification. |
| Popular products | Product IDs ranked by product views, then add events; current catalog names are displayed. Counts are events, not quantities sold. |
| Popular searches | Counts of sanitized submitted-search events. Sensitive-looking terms are excluded. |
| Cart and checkout activity | Event counts for additions, removals and checkout starts, after success responses. |
| Product → cart → checkout → purchase | Same-session stage coverage in the range. Each stage requires all preceding event types, but does not enforce their time order. It is explicitly labeled, not presented as an ordered path reconstruction. |
| Conversion | Sessions with any verified purchase in the range ÷ consented sessions with any event in the range × 100. This denominator is separate from product-stage coverage. |
| Referral/campaign | Session counts grouped by the first recorded attribution in the range. Attribution starts after consent and does not reconstruct a pre-consent landing source. |
| Journeys | Session-grouped retained events in the selected range, ordered by server receipt time. UUIDs are pseudonymous browser/session references; no names/emails/account IDs are exposed in the report. |
| Abandonment | Sessions with a checkout start in the selected range, no verified purchase at/after their latest checkout, and no event for the configured inactivity period. Assessment uses all retained activity through now, including purchases after the selected end date. |
| Verified payments, all consent choices | Retained operational payment facts captured since enablement, grouped by verification date and currency. These do not require browser attribution. Not a reconstruction of all historical gateway transactions. |
| Verified purchases, consented journeys | The consented event subset of verified payments, by server verification date and currency. |
| Operational orders | Existing COD or marked-paid order records, by order creation date, regardless of consent. Includes later-cancelled orders; order value is not collected revenue. COD currency is INR as used by this store. Prepaid orders lacking a verified currency are grouped as UNKNOWN. |
| Refunds / net | Current `refundDetails.status === 'completed'` amounts reduce the original payment cohort's gross amount, capped at the amount paid. Pending/initiated/processing refunds are shown separately and not deducted. Net = verified gross − completed refunds. Refunds can revise earlier reports; they are not reported by refund date. |

Amounts include tax/shipping charged by the existing flow; gateway fees are not deducted. Currency totals are never added together. The existing order schema has one refund summary, so analytics reflects that summary rather than inventing a complete refund transaction ledger.

## Existing behavior and limits

- Existing Stripe verification marks operational orders paid from the success return flag even if lookup fails or says unpaid. That pre-existing payment behavior was not changed by this additive feature. Analytics independently requires a paid Stripe session before recording any payment fact/purchase. A separate payment-hardening change is still advisable.
- Existing repeated payment callbacks may repeat operational side effects such as email/stock/membership updates; this feature prevents duplicate analytics, not a redesign of order processing.
- Revenue facts require a successful verified backend callback while the feature is enabled. There is no new gateway webhook, COD cash-settlement verification, historical migration or durable replay worker. Closed tabs, missing callbacks, failed optional writes and missing metadata reduce coverage.
- Rejection/withdrawal, blocked network calls, page startup timing and TTL expiry all reduce coverage. Abandonment is an estimate: COD, long gateway waits crossing the session boundary, returning in a different tab/session, failed callbacks and withdrawal can appear abandoned.
- Cart edits, payment selections, authentication and existing response formats were preserved. The payment-controller changes only copy already-fetched verification data to the failure-isolated post-response hook.
- No claims of automatic legal compliance are made. Consent wording should continue to match any future integrations; adding advertising requires a separate optional category and consent gate.

## Verification

Run with Node 20.19+ (verified here on Node 24) and installed dev dependencies:

```sh
cd backend
npm run test:analytics
cd ../frontend
npm run test:analytics
npx playwright install chromium
npm run test:analytics:browser
```

The backend suite creates a disposable local MongoDB with `mongodb-memory-server`, never loads `.env`, uses fake credentials, and blocks external gateway/email traffic with test mocks. Its first run may download a MongoDB binary. Browser tests launch isolated dev servers on 5177/5178, override their backend origin to a local test address, and mock APIs. They do not use production data.

Verification includes acceptance/rejection/withdrawal, no pre-consent IDs/events, no backfill, version validation, cross-tab withdrawal, aborting in-flight delivery, bounded retries/queues, duplicate events/purchases, gateway payment verification, operational data separation, authorization, payload/rate limits, real Mongo aggregation/indexes, currency/refund arithmetic, abandonment across date boundaries, pagination, existing cart/order creation, Stripe/Razorpay callbacks and checkout during analytics failure. New analytics/admin code passes focused ESLint; both apps build successfully. The repositories still emit existing Browserslist/chunk warnings, and npm reports existing dependency vulnerabilities; no broad dependency/security upgrade was attempted.

Final results: **10 backend tests, 8 client tests, and 5 browser tests passed**. Both production builds, focused lint for the new frontend/admin code, and `git diff --check` passed. Mobile banner and desktop dashboard screenshots were inspected. Build/test artifacts stay outside tracked application assets.

New development dependencies only: backend `mongodb-memory-server` and `nock`; frontend `@playwright/test`. No runtime dependency was added. The lockfiles include npm's compatible transitive resolution changes for these test dependencies.

## Files added or changed for this feature

Existing Social Links/Luxe CMS changes were preserved and are not part of this feature's change list.

- Shared: `shared/analyticsPrivacy.js`, `shared/package.json`.
- Backend new: `backend/analytics/config.js`, `models.js`, `validation.js`, `service.js`, `reports.js`, `routes.js`; `backend/tests/analytics.test.js`; `backend/.env.analytics.example`.
- Backend integration: `backend/server.js`, `backend/middleware/adminAuth.js`, `backend/controllers/orderController.js`, `backend/package.json`, `backend/package-lock.json`.
- Frontend new: `frontend/src/analytics/client.js`, `runtime.js`, `shoppingBridge.js`, `AnalyticsConsent.jsx`; `frontend/tests/analytics-client.test.mjs`; `frontend/tests/browser/analytics.spec.mjs`; `frontend/playwright.analytics.config.mjs`.
- Frontend integration: `frontend/src/App.jsx`, `frontend/src/components/Footer.jsx`, `frontend/src/Pages/Cart.jsx`, `frontend/package.json`, `frontend/package-lock.json`, `frontend/.gitignore`.
- Admin: `admin/src/pages/UserTracking.jsx`, `admin/src/App.jsx`. The existing Sidebar User Tracking link and staff permission entry already point at `/user-tracking` and did not need modification for analytics.
- Documentation: `docs/analytics.md`.
