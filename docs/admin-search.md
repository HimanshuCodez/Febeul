# Dashboard universal search

The dashboard's **Search the admin** bar searches existing records and links to existing admin pages. Click a result (or use arrow keys and Enter) to navigate. Ctrl/Cmd+K focuses the bar; Escape closes it. Normal visits to the destination pages keep their existing empty filters. Search links prefill the existing filter, which can still be edited or cleared normally.

## Coverage

- Users: name, email, phone or database ID; opens All Users filtered to the matched email.
- Orders: customer-facing order reference, full database ID, or a fragment of a legacy database ID (at least four hexadecimal characters). A leading `#` is accepted. Opens Orders filtered to the full database ID.
- Coupons: code, description or ID, including inactive/expired coupons; opens Coupons filtered to the code.
- Products: name, SKU, category, style code or ID, including inactive products; opens List Items filtered to the database ID.
- Pages/settings: existing admin destinations with keywords such as font, Instagram, shipping charge, COD, policies, analytics and membership price. These navigate to the relevant page, not an individual field. Staff Tracking remains the existing coming-soon page.

Settings values, ticket/review bodies and arbitrary database fields are not indexed. Add new destination labels/aliases to `admin/src/search/pages.js` when adding admin routes. Search never runs a save/delete/reset action.

## Access and bounds

The new read-only `GET /api/admin/search?q=...` endpoint uses the existing `adminAuth` middleware and Dashboard permission (`/`). Each record category separately requires its destination permission: `/allusers`, `/orders`, `/coupons`, or `/list`. Role and permissions come from the existing server authentication, not query parameters. Page suggestions also follow the existing route permissions.

Queries are 2–80 characters, escaped as literal text, and debounced 250 ms. Results show up to six records per category with a narrowing hint when more exist. The database queries select only result fields, use a 1.5-second Mongo query deadline, and do not populate private documents. Partial collection failures preserve other results. The browser cancels obsolete requests and times out at four seconds. Page shortcuts remain available when record search fails. Requests are limited to 90 per authenticated account per minute per backend process, with bounded in-memory buckets; responses use `Cache-Control: no-store`.

No collections, indexes, environment variables, runtime dependencies or existing API formats are changed. Substring matching is bounded but may require collection scans on large datasets; it is not a dedicated full-text search index. No production data was used for verification.

## Verification

- `cd backend; npm run test:admin-search`: isolated MongoDB tests for authorization, safe result shapes, literal queries, limits, order references, category failures and settings aliases.
- `cd frontend; npx playwright test --config playwright.admin-search.config.mjs`: local admin browser tests with mocked APIs for record navigation/filter clearing, permissions, keyboard/mobile interaction, cancellation and outage isolation. Uses the already installed Playwright dependency; launches only the local admin Vite server.
- Admin production build and focused lint for the new component/search helpers.

Implementation: `admin/src/components/UniversalSearch.jsx`, `admin/src/search/{pages.js,useSearchPrefill.js}`, minimal wiring in Dashboard/AllUsers/Coupons/Orders/List, `backend/services/adminSearchService.js`, `backend/routes/adminSearchRoute.js`, and registration in `adminRoute.js`/`adminAuth.js`.
