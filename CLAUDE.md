# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

This is Febeul, an e-commerce platform made of three **independent** apps with no shared root package.json or workspace tooling. Always `cd` into the relevant app directory before running any command.

- `backend/` — Express + Mongoose REST API (Node, ESM, port 4000 by default)
- `admin/` — React 18 + Vite admin dashboard (staff/admin only)
- `frontend/` — React 19 + Vite customer-facing storefront

There is no test suite in any of the three apps. There is no root-level lint/build — run these per-app.

## Commands

Run from inside the respective directory (`backend/`, `admin/`, or `frontend/`).

**backend**
```
npm run server   # nodemon server.js — dev with auto-reload
npm start        # node server.js — plain start
```

**admin** and **frontend** (same scripts in both)
```
npm run dev       # vite dev server
npm run build     # vite build
npm run lint      # eslint
npm run preview   # preview production build
```

There is no single-test-file command anywhere in this repo — no test runner is configured.

## Environment variables (backend/.env)

The backend reads these via `process.env`; there is no `.env.example`, so cross-check `backend/.env` when adding new integrations:

- `MONGODB_URI` — Mongo connection string; code appends `/e-commerce` as the DB name (`backend/config/mongodb.js`)
- `JWT_SECRET` — signs/verifies all auth tokens (both customer and admin/staff)
- `CLOUDINARY_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_SECRET_KEY` — image uploads
- `ADMIN_EMAIL`, `ADMIN_PASSWORD` — primary admin credentials (not a DB user, see Auth below)
- `STAFF_EMAILS`, `STAFF_PASSWORDS` — comma-separated parallel lists for ENV-based staff logins; `STAFF_EMAIL`/`STAFF_PASSWORD` (singular) is a legacy single-staff fallback
- `RESEND_API_KEY` — transactional email (OTP, welcome, password reset)
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` — Razorpay payments/refunds
- `STRIPE_SECRET_KEY` — Stripe payments
- `SHIPROCKET_EMAIL`, `SHIPROCKET_PASSWORD` — Shiprocket courier API login
- `SHIPROCKET_WEBHOOK_SECRET` — validates inbound Shiprocket tracking webhooks
- `GOOGLE_CLIENT_ID` — Google OAuth login verification
- `PORT` — defaults to 4000

`admin/` and `frontend/` each read `VITE_BACKEND_URL` from their own `.env` to know where the API lives.

## Backend architecture

Standard route → controller → model layering, all ESM (`type: module`). `server.js` wires routers under `/api/<resource>` (user, product, cart, order, review, otp, giftwrap, tracking, refund, policy, admin, ticket, coupon, cms) and mounts a shared `errorHandler` middleware last (handles Multer errors and thrown errors uniformly).

**Auth — two separate middlewares, both read a raw `token` header (not `Authorization: Bearer`):**
- `middleware/auth.js` (`authUser`) — customer JWT, sets `req.userId`.
- `middleware/adminAuth.js` (`adminAuth`) — layered checks, in order:
  1. Primary admin: JWT payload equals `ADMIN_EMAIL + ADMIN_PASSWORD` (not a real DB user).
  2. ENV staff: JWT payload equals `staffEmails[i] + staffPasswords[i]` (or legacy single `STAFF_EMAIL+STAFF_PASSWORD`). These are blocked from `/api/admin/*`.
  3. DB staff/admin: JWT payload is a user `_id`; looks up `userModel`, checks `role` (`'staff'`/`'admin'`) and enforces `user.permissions[]` against a route allowlist.
  - `getRequiredPermission(fullPath)` inside `adminAuth.js` maps API paths to permission strings (e.g. `/api/order` → `orders`, `/api/product/add` → `add`). **These permission strings must stay in sync with the route-gating in `admin/src/App.jsx`** (`isAllowed(path)` checks the same strings against the admin frontend route paths) — when adding a new protected admin route/permission, update both places.

**Order/payment flow** (`controllers/orderController.js`, the largest controller at ~1265 lines):
- `calculateOrderPricing()` centralizes pricing: pulls dynamic settings (membership price, shipping threshold/charge, COD charge) from the `cms` collection (`name: 'siteSettings'`) rather than hardcoded constants, applies coupon discounts, Luxe membership pricing, and gift wrap.
- Invoice numbers come from `counterModel` (atomic `findOneAndUpdate` with `$inc`) to guarantee sequential invoice IDs across concurrent orders.
- Supports COD, Stripe, and Razorpay (`paymentMethod` enum on `orderModel`); Razorpay refunds go through `controllers/refundController.js`.
- Shipping integration lives in `utils/shiprocket.js` (login/create order/track/assign AWB) and `controllers/shiprocketWebhookController.js` handles inbound tracking webhooks, updating `order.shiprocketStatus`/`orderStatus`.
- Stock is decremented per `variations[color].sizes[size].stock` on `productModel`, not a flat quantity field — products are structured as color variations, each with its own SKU, images, and per-size price/MRP/stock.
- Refunds/returns are tracked inline on the order document (`orderModel.refundDetails`), not a separate collection — status enum (`pending` → `initiated`/`processing` → `completed`/`failed`/`rejected`), with `customerPayoutDetails` (UPI or bank) for COD refunds.

**CMS-driven config**: the `cms` collection is a generic `{name (unique), content (Mixed)}` store used for multiple unrelated settings docs (`siteSettings`, `typographySettings`, maintenance mode flag, etc.), read by both frontend apps at load time via `/api/cms/*`. When adding a new site-wide setting, prefer adding a key to an existing CMS `content` doc over a new Mongoose model.

## Frontend apps

Both `admin/` and `frontend/` are plain Vite + React SPAs with no server-side rendering, using Tailwind for styling and calling the backend directly with `axios` (no generated API client/interceptor layer — each call sets `headers: { token }` manually).

**admin/** (React 18, Redux `react-redux`/`redux-thunk` deps present but the primary auth/role state is plain `useState` + `localStorage` in `App.jsx`, not Redux):
- Routes are individually gated by `isAllowed(path)` in `App.jsx`, driven by `role` (`admin` bypasses all checks) and a `permissions` string array persisted to `localStorage`. Mirrors the backend's `getRequiredPermission` map — see Auth section above.
- Page directory is `admin/src/pages` (lowercase).

**frontend/** (React 19, Zustand for global state):
- `src/store/authStore.js` is the single global store: auth/token/user, cart count+items, wishlist count, and `siteSettings` (fetched once from CMS on module load, independent of auth).
- Page directory is `src/Pages` (capitalized) — note the casing differs from `admin/src/pages`; don't assume the same convention across apps.
- `App.jsx` gates the entire app behind a maintenance-mode check (`cms/settings` content) unless `user.role` is `admin`/`staff`, and blocks rendering until CMS settings + (if a token exists) the user profile have both loaded.

## Deployment

All three apps deploy independently to Vercel (separate `vercel.json` per app — not a monorepo Vercel project):
- `backend/vercel.json` builds `server.js` as a `@vercel/node` serverless function and routes everything to it.
- `admin/vercel.json` and `frontend/vercel.json` both just SPA-rewrite all paths to `/` for client-side routing.
