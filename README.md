# PickleTools

Seven installable pickleball apps (PWAs) sold for ₱100 each through a static storefront with GoTyme QR checkout. No server and no database. Payments are checked by hand, and each purchase is **activated on one device**.

| App | Path (before salting) |
|---|---|
| Pickleball Scorekeeper | `apps/scorekeeper/` |
| Match Tracker | `apps/match-tracker/` |
| Drill Generator | `apps/drill-generator/` |
| Tournament Bracket Maker | `apps/tournament/` |
| Paddle Finder | `apps/paddle-finder/` |
| Rules & Quiz | `apps/rules-quiz/` |

The design and the PRD review are in [docs/superpowers/specs/2026-10-21-pickletools-design.md](docs/superpowers/specs/2026-10-21-pickletools-design.md).

## Develop

```bash
npm install
npm run dev        # storefront at http://localhost:5173, apps at /apps/<slug>/
npm test           # unit tests (scoring, brackets, licensing, form, desk…)
npm run build      # type-check, build, then generate icons/manifests/service workers
npm run preview    # serve the production build at http://localhost:4173
```

In development the apps show the activation screen too. Use the Order desk (`#/admin`) to issue yourself a code.

## Before launch (owner checklist)

1. **Activation keys:** `npm run keygen` (already run once for this repo).
   - The public key is `src/config/license-public-key.json`. Commit it.
   - The private key is `keys/license-private-key.json`. It is gitignored. **Back it up somewhere safe and never share it.** Anyone holding it can create activation codes. Losing it means you can't activate new customers until you rotate (`npm run keygen -- --force`), and rotating invalidates every code already issued.
2. **GoTyme QR:** done. `public/payment/gotyme-qr.png` is the live QR Ph code (GoTyme, with ₱100.00 embedded so payment apps fill in the amount). If you replace it and the new QR has no amount embedded, change the checkout wording back to "enter ₱100.00". Never use a sample QR.
3. **Form service:** create a free [Web3Forms](https://web3forms.com) access key (it is public by design). Formspree also works.
4. **GitHub:** push to a repo and enable *Pages → Source: GitHub Actions*. Then set:
   - **Secret** `DELIVERY_SALT`: any long random string. It hides the app paths. Keep a copy for the Order desk.
   - **Variables** `SUPPORT_EMAIL`, `FORM_PROVIDER` (= `web3forms`), `FORM_ACCESS_KEY`, and optionally `RECEIPT_UPLOADS` (`true` only on a paid form plan). `QR_IMAGE` overrides the built-in QR path.
5. **Test payments:** pay ₱100 from GCash and from one bank app. Confirm both show the right payee, then run that order through the whole Order desk flow.
6. **Re-review content:** check the rules text against the current USA Pickleball rulebook and the paddle specs and prices in `src/apps/paddle-finder/catalog.json`.

For local builds, copy `.env.example` to `.env.local`.

## Fulfilling an order (Order desk: `<site>/#/admin`)

1. Open the desk on your own device. Paste the delivery salt and the private key (JSON) into **Delivery & activation keys**.
2. When a submission email arrives (subject `[PickleTools] PT-SK-261021-7KQ4 · … · ref …`), click **Log new submission**.
3. Find the payment in the GoTyme app and tick the three checks: exact ₱100.00, matching reference, not used by another order.
4. Click **Mark paid & send install link**. The desk writes the email with the app's unlisted URL.
5. The customer installs the app, opens it and replies with the **device code** it shows.
6. Paste that code and click **Issue activation code**. The desk writes the activation email. That code only works on that device and that app.
7. If the order doesn't check out, use **Needs info**, **Payment not found** or **Refunded**. Click **Backup** or **Export CSV** weekly, since desk data lives only in that browser.

Order statuses: `submitted → verifying → (needs_info) → verified → activated`, or `rejected` / `refunded`.

`npm run delivery-links` with `SITE_URL` and `DELIVERY_SALT` set prints every install URL.

## How "one device, can't share" works, and its limits

- Each installed app creates a random device code. You sign `app | device | order` with your private key. The app checks that signature with the built-in public key, so a code only unlocks the device and app it was issued for. A shared link opens to the lock screen.
- **Limits** (also stated in the purchase policy):
  - A browser has no hardware ID, so clearing site data or reinstalling creates a new device code. Re-issue it with the "Replacement" tick (one free per order).
  - On iPhone, Safari and the Home-Screen app have different codes. Customers are told to activate from the installed app.
  - The app code is public JavaScript, so a determined developer could patch out the check. It stops casual sharing, not every possible attack. Stronger protection needs a server-side licence service.
- Unlisted paths: `robots.txt` and `noindex` keep the apps out of search. Note that a project site's `robots.txt` sits under `/<repo>/`, where crawlers don't read it; the `noindex` meta tag is what applies there.

## Free online demos

Each app has a public demo at `demo/<slug>/`, linked from every app card and detail page. A demo runs the real app code, but:

- it doesn't need activation, and can't be installed or used offline (no service worker, no manifest)
- data lives in memory only, so nothing is saved and paying customers' data on the same site is never touched
- it has limits, each ending in a "Buy for ₱100" prompt:

| App | Demo limit |
|---|---|
| Scorekeeper | one full game |
| Match Tracker | 3 matches, no CSV export |
| Drill Generator | timer runs the first 2 steps, no favourites |
| Tournament | up to 4 entries, no export, import or print |
| Paddle Finder | first 4 matching paddles, no saved list |
| Rules & Quiz | first 3 rule sections, 5-question quiz, no printable guide |

The limits are constants at the top of each app's `App.tsx` (`DEMO_*`).

## Project layout

```
index.html, src/store/      storefront (hash routes): home, catalog, details, checkout,
                            confirmation, install guide, FAQ, track order, policies, #/admin desk
apps/<slug>/index.html      PWA entry points → src/apps/<slug>/main.tsx
demo/<slug>/index.html      free online demos → src/apps/<slug>/demo.tsx
src/shared/                 app shell, licence gate & crypto, storage, PWA helpers
src/config/store.ts         business settings (price, payee, email, form provider)
scripts/postbuild.mjs       icons, manifests, service workers, unlisted folder names
scripts/keygen.mjs          activation key pair
```
