import { store, peso } from '../../config/store'
import { AppIcon } from '../../shared/AppIcon'
import { apps, type AppMeta } from '../../shared/apps'
import { faqs, howItWorks } from '../content'
import { AppCard, Page } from '../Layout'
import { demoHref, href } from '../router'
import { Preview } from './Preview'
import hero960 from '../../assets/hero-960.webp'
import hero1600 from '../../assets/hero-1600.webp'
import hero1916 from '../../assets/hero-1916.webp'

export function Home() {
  return (
    <>
      <section className="relative isolate overflow-hidden bg-court-900 text-white">
        <HeroImage />
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:py-28">
          <p className="chip bg-ball text-ink">{peso(store.price)} per app · no subscription</p>
          {/* Desktop: exactly two lines, one sentence each. Phones wrap naturally. */}
          <h1 className="mt-4 max-w-3xl text-4xl font-black leading-[1.05] tracking-tight drop-shadow-sm sm:text-6xl md:max-w-none">
            <span className="md:block md:whitespace-nowrap">Six pickleball tools.</span> <span className="md:block md:whitespace-nowrap">One simple toolkit.</span>
          </h1>
          <p className="mt-5 max-w-xl text-lg text-white/90">
            Keep score, track your matches, plan practice, run club brackets, find the right paddle and master the rules - with fast apps that install on your phone and work offline.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href={href('/apps')} className="btn-ball px-6 py-3 text-lg">
              Explore apps
            </a>
            <a href="#how" onClick={(e) => { e.preventDefault(); document.getElementById('how')?.scrollIntoView({ behavior: 'smooth' }) }} className="btn border border-white/30 px-6 py-3 text-lg text-white hover:bg-white/10">
              How buying works
            </a>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14" aria-labelledby="apps-h">
        <h2 id="apps-h" className="text-3xl font-black tracking-tight">The apps</h2>
        <p className="mt-1 text-ink/70">Buy only what you need. Each app is {peso(store.price)}, paid once.</p>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {apps.map((a) => (
            <AppCard key={a.slug} app={a} />
          ))}
        </div>
      </section>

      <section id="how" className="scroll-mt-20 bg-white py-14" aria-labelledby="how-h">
        <div className="mx-auto max-w-6xl px-4">
          <h2 id="how-h" className="text-3xl font-black tracking-tight">How purchasing works</h2>
          <ol className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {howItWorks.map((s, i) => (
              <li key={s.title} className="rounded-2xl bg-paper p-5">
                <span className="flex size-9 items-center justify-center rounded-full bg-court-600 font-black text-white">{i + 1}</span>
                <h3 className="mt-3 font-bold">{s.title}</h3>
                <p className="mt-1 text-sm text-ink/70">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-14 lg:grid-cols-2" aria-labelledby="price-h">
        <div>
          <h2 id="price-h" className="text-3xl font-black tracking-tight">Simple pricing</h2>
          <p className="mt-1 text-ink/70">One-time payment per app. Each purchase activates the app on one device.</p>
          <PriceTable />
        </div>
        <div className="card p-6" aria-labelledby="qr-h">
          <h2 id="qr-h" className="text-2xl font-black tracking-tight">Pay with GoTyme QR</h2>
          <p className="mt-2 text-ink/75">Our checkout shows a GoTyme QR Ph code you can scan with:</p>
          <ul className="mt-3 space-y-2">
            <li className="flex gap-2"><span aria-hidden="true">📱</span><span><strong>GCash</strong> - QR → scan, enter {peso(store.price)}, confirm.</span></li>
            <li className="flex gap-2"><span aria-hidden="true">🏦</span><span><strong>Your bank app</strong> - any app that supports QR Ph / InstaPay.</span></li>
          </ul>
          <p className="mt-4 rounded-xl bg-court-50 p-3 text-sm text-court-900">
            We verify every payment by hand, then email your install link. Submitting a reference number is not proof of payment until we confirm it. We will never ask for your PIN, OTP or password.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-6" aria-labelledby="faq-h">
        <h2 id="faq-h" className="text-3xl font-black tracking-tight">FAQ</h2>
        <FaqList items={faqs.slice(0, 6)} />
        <a className="mt-4 inline-block font-semibold text-court-700 underline" href={href('/faq')}>
          All questions →
        </a>
      </section>
    </>
  )
}

function HeroImage() {
  return (
    <>
      <img
        src={hero1600}
        srcSet={`${hero960} 960w, ${hero1600} 1600w, ${hero1916} 1916w`}
        sizes="100vw"
        alt=""
        fetchPriority="high"
        decoding="async"
        className="absolute inset-0 -z-10 h-full w-full object-cover object-[62%_center]"
      />
      {/* Keeps the white headline readable over the bright photo: solid on phones, fading to the right on wide screens. */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-court-900/85 via-court-900/70 to-court-900/85 md:bg-gradient-to-r md:from-court-900/90 md:via-court-900/60 md:to-court-900/10" aria-hidden="true" />
    </>
  )
}

function PriceTable() {
  return (
    <table className="mt-5 w-full overflow-hidden rounded-2xl bg-white text-left shadow-sm">
      <caption className="sr-only">Price per app</caption>
      <thead>
        <tr className="bg-ink/5 text-sm">
          <th scope="col" className="px-4 py-2">App</th>
          <th scope="col" className="px-4 py-2 text-right">Price</th>
        </tr>
      </thead>
      <tbody>
        {apps.map((a) => (
          <tr key={a.slug} className="border-t border-ink/10">
            <td className="px-4 py-2.5">
              <a className="font-medium hover:text-court-700" href={href(`/apps/${a.slug}`)}>{a.name}</a>
            </td>
            <td className="px-4 py-2.5 text-right tabular-nums">{peso(store.price)}</td>
          </tr>
        ))}
        <tr className="border-t-2 border-ink/20 font-bold">
          <td className="px-4 py-2.5">All six apps</td>
          <td className="px-4 py-2.5 text-right tabular-nums">{peso(store.price * apps.length)}</td>
        </tr>
      </tbody>
    </table>
  )
}

export function FaqList({ items }: { items: typeof faqs }) {
  return (
    <div className="mt-4 divide-y divide-ink/10 rounded-2xl bg-white shadow-sm">
      {items.map((f) => (
        <details key={f.id} id={`faq-${f.id}`} className="group px-5 py-1">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 py-3 font-semibold">
            {f.q}
            <span className="text-xl text-court-600 transition group-open:rotate-45" aria-hidden="true">+</span>
          </summary>
          <div className="pb-4 text-ink/75">{f.a}</div>
        </details>
      ))}
    </div>
  )
}

export function Catalog() {
  return (
    <Page title="All apps" intro={`Six focused tools for players, coaches and organisers. ${peso(store.price)} each, one-time.`}>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {apps.map((a) => (
          <AppCard key={a.slug} app={a} />
        ))}
      </div>
    </Page>
  )
}

export function AppDetail({ app }: { app: AppMeta }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
      <a className="text-sm font-semibold text-court-700 hover:underline" href={href('/apps')}>
        ‹ All apps
      </a>
      <div className="mt-4 grid gap-10 lg:grid-cols-[1fr_22rem]">
        <div>
          <div className="flex items-center gap-4">
            <AppIcon glyph={app.glyph} color={app.color} size={72} />
            <div>
              <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{app.name}</h1>
              <p className="text-lg text-ink/70">{app.tagline}</p>
            </div>
          </div>
          <p className="mt-6 text-lg text-ink/80">{app.description}</p>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold">Preview</h2>
            <a className="btn-ball" href={demoHref(app.slug)}>
              ▶ Try the free demo
            </a>
          </div>
          <div className="mt-3">
            <Preview slug={app.slug} />
          </div>
          <p className="mt-2 text-sm text-ink/60">The demo runs in your browser with no sign-up. It has a few limits and doesn’t save anything, and the full app installs on your phone and works offline.</p>

          <h2 className="mt-8 text-xl font-bold">Features</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {app.features.map((f) => (
              <li key={f} className="flex gap-2 rounded-xl bg-white p-3 shadow-sm">
                <span className="text-court-600" aria-hidden="true">✓</span>
                {f}
              </li>
            ))}
          </ul>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="card p-5">
              <h2 className="font-bold">Works on</h2>
              <ul className="mt-2 space-y-1 text-sm text-ink/75">
                <li>Android phones and tablets - Chrome, Edge, Samsung Internet</li>
                <li>iPhone and iPad - Safari (iOS 16.4 or later recommended)</li>
                <li>Windows, Mac and Chromebook - Chrome or Edge</li>
              </ul>
            </div>
            <div className="card p-5">
              <h2 className="font-bold">Offline</h2>
              <p className="mt-2 text-sm text-ink/75">{app.offline}</p>
            </div>
          </div>

          <h2 className="mt-8 text-xl font-bold">Installing after purchase</h2>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-ink/80">
            <li>We email your install link once your payment is verified.</li>
            <li>Open the link on the phone you’ll use and add the app to your home screen.</li>
            <li>The app activates automatically on that phone. No codes to type.</li>
          </ol>
          <a className="mt-2 inline-block font-semibold text-court-700 underline" href={href('/install')}>
            Full install guide →
          </a>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="card p-6">
            <p className="text-4xl font-black">{peso(store.price)}</p>
            <p className="text-sm text-ink/60">One-time payment · one device · no subscription</p>
            <a className="btn-primary mt-5 w-full py-3.5 text-lg" href={href(`/checkout/${app.slug}`)}>
              Buy for {peso(store.price)}
            </a>
            <a className="btn-ghost mt-2 w-full" href={demoHref(app.slug)}>
              Try the free demo first
            </a>
            <ul className="mt-5 space-y-2 text-sm text-ink/70">
              <li>✓ Pay with GCash or your bank app via GoTyme QR</li>
              <li>✓ Install link emailed after verification (within {store.verificationHours} h)</li>
              <li>✓ Your data stays on your device</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  )
}
