# PickleTools - Design Spec & PRD Review (v1.1)

Date: 2026-10-21 · Source: PRD v1.1 (six ₱100 PWAs, GoTyme QR, no backend)

This document records (1) a review of the PRD, (2) the decisions made to close
its gaps, (3) the order-tracking workflow and (4) the payment-form
implementation that the PRD asked to be defined. The build in this repository
implements this spec.

---

## 1. PRD review - findings and resolutions

| # | Finding | Severity | Resolution in this build |
|---|---------|----------|--------------------------|
| R1 | **Paid apps are publicly reachable.** "Deliver the installation URL" is meaningless if `/apps/scorekeeper/` is linked or guessable. | High | Apps are built under an **unlisted path** `apps/<slug>-<suffix>/` where `suffix = sha256(DELIVERY_SALT + ":" + slug)[0..10]`. The salt is a build-time secret (GitHub Actions secret), never shipped in the bundle. The storefront never links the apps; app pages are `noindex`; `robots.txt` disallows `/apps/`. This is *obscurity, not DRM* - stated honestly in the FAQ/policy, as the PRD requires. |
| R2 | "Screenshots or interactive preview" - an interactive preview that embeds the real app would leak it. | Medium | Detail pages show a **static, illustrated preview** rendered in the storefront (no app code). |
| R3 | **Static QR = customer types the amount.** (Resolved: the supplied GoTyme QR has ₱100.00 embedded, so apps pre-fill it.) Wrong amounts (₱10, ₱1,000) are the most likely failure. | High | Checkout states "enter exactly ₱100.00" in step 3 and 4; the form's amount field defaults to 100 and warns on any other value. Admin checklist verifies the exact amount. |
| R4 | **Transfer fees** (GCash → GoTyme via InstaPay may charge the sender). Who pays is undefined. | Medium | Policy: the store must *receive* ₱100; any fee the sender's app charges is separate. Stated at checkout and in FAQ. |
| R5 | **GCash compatibility** depends on the QR being a **QR Ph** code. | Medium | Launch checklist requires a live ₱1/₱100 test from GCash + one bank app. Checkout shows a "QR not configured - do not pay" block until a real QR image is configured. No sample QR ships. |
| R6 | **Email typos break fulfilment** (email is the only delivery channel). | High | "Confirm email" field must match. Optional backup contact (mobile/Messenger). |
| R7 | **Reference alone is weak for matching** in GoTyme's history. | Medium | Optional *sender name as shown in your app* and *payment date/time* fields; admin checklist uses them. Each reference can only fulfil one order (admin log flags duplicates). |
| R8 | **Order ID / tracking undefined** although confirmation page must show one. | High | See §3. |
| R9 | **Form implementation undefined.** Free form services restrict file uploads. | High | See §4. |
| R10 | **Refund policy referenced but not written.** | Medium | Default policy written in `#/policy` (editable): refund for duplicate/over-payment or if we cannot deliver within 3 days; no refunds after successful delivery except for defects we can't fix. |
| R11 | **Privacy:** receipts and emails are personal data (Philippine Data Privacy Act, RA 10173). | Medium | Privacy page; consent checkbox on form; retention statement (order records kept 1 year for support/refunds). |
| R12 | **Local data loss on iOS** (Safari may evict storage of non-installed sites after ~7 days unused). | Medium | Apps call `navigator.storage.persist()`; Match Tracker and Tournament offer export; FAQ explains installing to the home screen. |
| R13 | **Rules content correctness** is a launch risk. | Medium | Content written against the USA Pickleball rulebook fundamentals and dated in the app ("Content reviewed: Oct 2026"); launch checklist requires re-review. |
| R14 | **Paddle data goes stale**; real specs/prices vary by seller. | Low | Catalog lives in one JSON file with `lastReviewed`; specs labelled approximate; retailer links fall back to a web search when no affiliate URL is set. |
| R15 | Success metric "conversion rate" needs analytics, which the PRD doesn't mention. | Low | Out of scope for code; spec recommends a cookieless counter (e.g. GoatCounter) later. Admin order log gives verified sales per app. |
| R16 | Each app is a separate PWA → needs its own manifest `id`, `scope`, icons and service worker. | - | Generated per app at build (§5). |

| R17 | **Owner requirement (added during build): "unsharable, installable on one phone only."** This partly contradicts the PRD non-goals (no licences, no DRM, no backend). | High | Added **device-bound activation codes** (§3a). It is the strongest option that still needs no server. Limits are documented in the policy and README. |

Assumptions (override in `src/config/store.ts`): business name "PickleTools",
verification target **within 24 hours**, support email placeholder, form
provider **Web3Forms**.

---

## 2. Architecture

- **Vite multi-page build**, React + TypeScript + Tailwind v4.
  - `index.html` → storefront (hash routes, works on GitHub Pages without a 404 hack).
  - `apps/<slug>/index.html` → six independent PWAs sharing `src/shared/*`.
- **`scripts/postbuild.mjs`** per app: rasterises icons (sharp), writes
  `manifest.webmanifest` (unique `id`/`scope`/`start_url`), writes `sw.js` with
  a precache list parsed from the built HTML (entry JS, modulepreloads, CSS,
  icons), injects manifest/apple-touch-icon/`noindex` tags, then renames the
  folder to the unlisted path when `DELIVERY_SALT` is set.
- **Service worker**: precache on install; navigation = network-first with
  cache fallback (updates reach users), assets = cache-first (hashed names);
  old caches deleted on activate.
- **Storage**: `localStorage` via a small typed hook, namespaced per app
  (`pt:<slug>:<key>`).
- **No server, no database, no secrets in the bundle.** The form access key is
  a public-by-design key (Web3Forms) / form id (Formspree).

## 3. Order-tracking workflow

**Order ID**: `PT-<APP>-<YYMMDD>-<XXXX>` e.g. `PT-SK-261021-7KQ4`
(app codes SK, MT, DG, TB, PF, RQ; 4 Crockford-base32 random chars from
`crypto.getRandomValues`). Generated once per checkout attempt and reused on
retry, so double-clicks/resubmits don't create two orders.

**Statuses** (shared vocabulary between customer UI, admin desk and emails):

| Status | Meaning | Who sets it |
|---|---|---|
| `submitted` | Form received by the form service | Customer's browser on success |
| `not_sent` | Form couldn't be sent (offline/service down); customer told to retry or email | Customer's browser |
| `verifying` | Admin is matching it in GoTyme history | Admin |
| `needs_info` | Payment not matched yet; admin emailed a question | Admin |
| `verified` | Payment verified, install link emailed | Admin |
| `activated` | Activation code issued for the customer's device | Admin |
| `rejected` | No matching payment after follow-up | Admin |
| `refunded` | Money returned | Admin |

**Customer side** (no backend, so honest about it):
1. On submit, the order is saved on the customer's device ("My orders").
2. Confirmation page shows the Order ID (copy button), what happens next and the 24-hour target. It never says "paid".
3. `#/track` - enter an Order ID: shows the timeline. If the order is on this device, shows the submitted details; customer can mark "I received my install link". Otherwise explains that live status comes by email and offers a pre-filled support email quoting the Order ID.

**Admin side** - `#/admin` "Order desk" (no secrets, works on any device, data stays in the admin's browser with CSV export so it can be pasted into a Google Sheet):
1. New submission email arrives (subject `[PickleTools] PT-SK-261021-7KQ4 · Scorekeeper · ref 1234567890123`).
2. Admin enters/pastes the order into the desk → status `verifying`. Duplicate references are flagged.
3. Admin checks GoTyme: amount = ₱100.00, reference matches, payment not used by another order. All three checks must be ticked before "Mark paid & send install link" is enabled.
4. Desk generates the right email (install link / need info / not found / refund). The install link uses the correct unlisted URL, computed in the browser from the delivery salt the admin enters (kept only on that device). Status → `verified`.
5. Admin sends it (mailto or copy).
6. The customer replies with the device code from the installed app. The desk issues the activation code (§3a) and writes the activation email. Status → `activated`.
7. Desk data is backed up or exported to CSV weekly.

## 3a. One-device activation

- On first launch, each app creates a random 12-character device code (Crockford base32, e.g. `AB12-CD34-EF56`). It is stored in that browser or installed app.
- The admin signs `pickletools/v1|<slug>|<device>|<orderId>` with an **ECDSA P-256 private key** kept only on the admin's device (`npm run keygen`). The activation code is `<orderId>.<base64url signature>`.
- The apps ship only the public key and verify with WebCrypto, offline. A code works only for the device and app it was issued for. Forging a code requires the private key.
- Flow: install link → customer opens the installed app → sends the device code (pre-filled email button) → admin issues the code → customer pastes it, or opens `…/#activate=<code>` on Android or desktop.
- One device per order. The desk refuses a second device unless it is marked as a replacement (policy: one free replacement for a lost, reset or replaced device).
- iOS: the installed Home-Screen app has storage separate from Safari, so the lock screen tells iOS users to install first and activate from the installed app.
- Limits: there is no hardware ID, so clearing site data means a re-issue. The JavaScript is public and could be patched by a determined developer. This deters casual sharing and is not DRM.

## 4. Payment-form implementation

- **Provider adapter** (`src/store/lib/submitOrder.ts`): `web3forms` (default,
  free tier, JSON over HTTPS, honeypot `botcheck`), `formspree`, or `none`.
- **Fields**: app (fixed from route), order_id (hidden), email + confirm,
  amount (default 100), reference (6-30 letters/digits), sender name (optional),
  payment date/time (optional), backup contact (optional), receipt image
  (optional; only shown when `receiptUploads: true` because free tiers don't
  accept files - otherwise the customer is told they may be asked to reply with
  a screenshot), consent checkbox.
- **Validation** on blur + submit, inline messages, focus moves to first error.
- **Submission**: button disabled while sending; 15 s timeout; on failure
  status `not_sent` with "Try again" and "Send by email instead" (mailto with
  every field pre-filled).
- **Copy**: success message is exactly the PRD's pending-verification text.
- **Never** asks for PIN, password or OTP - stated next to the form.

## 5. Testing

Vitest unit tests for the pure logic: scoring engine, bracket/round-robin
generation, order ID, form validation, CSV export, drill generation, delivery
suffix. Build + browser smoke test of every page/app; offline check of an
installed app's service worker.

## 6. Launch checklist (owner)

1. Put the real GoTyme QR at `public/payment/gotyme-qr.png`, set payee name in config.
2. Create a Web3Forms key → `VITE_FORM_ACCESS_KEY`; set support email.
3. Set `DELIVERY_SALT` secret; run `npm run delivery-links` to get install URLs.
4. Test-pay from GCash and one bank app; run one order end-to-end through the desk.
5. Re-review rules content and paddle catalog.
