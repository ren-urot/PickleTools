import { useState, type ReactNode } from 'react'
import { store, peso } from '../config/store'
import { AppIcon } from '../shared/AppIcon'
import type { AppMeta } from '../shared/apps'
import { demoHref, href } from './router'

const nav: [string, string][] = [
  ['/apps', 'Apps'],
  ['/install', 'Install guide'],
  ['/faq', 'FAQ'],
  ['/track', 'Track order'],
]

export function Layout({ path, children }: { path: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="flex min-h-dvh flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:p-2" onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus() }}>
        Skip to content
      </a>
      <header className="sticky top-0 z-30 border-b border-ink/10 bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <a href={href('/')} className="flex items-center gap-2 text-lg font-black tracking-tight" aria-label={`${store.businessName} home`}>
            <Logo />
            {store.businessName}
          </a>
          <nav className="ml-auto hidden gap-1 md:flex" aria-label="Main">
            {nav.map(([to, label]) => (
              <a key={to} href={href(to)} aria-current={path.startsWith(to) ? 'page' : undefined} className={`rounded-lg px-3 py-2 text-sm font-semibold hover:bg-ink/5 ${path.startsWith(to) ? 'text-court-700' : 'text-ink/80'}`}>
                {label}
              </a>
            ))}
          </nav>
          <button className="btn-ghost ml-auto min-h-10 px-3 md:hidden" aria-expanded={open} aria-controls="mobile-nav" onClick={() => setOpen((o) => !o)}>
            <span aria-hidden="true">{open ? '✕' : '☰'}</span>
            <span className="sr-only">Menu</span>
          </button>
        </div>
        {open && (
          <nav id="mobile-nav" className="border-t border-ink/10 px-4 pb-3 md:hidden" aria-label="Main">
            {nav.map(([to, label]) => (
              <a key={to} href={href(to)} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-3 font-semibold hover:bg-ink/5">
                {label}
              </a>
            ))}
          </nav>
        )}
      </header>
      <main id="main" tabIndex={-1} className="flex-1 outline-none">
        {children}
      </main>
      <footer className="mt-16 bg-court-900 text-white/80">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
          <div>
            <p className="flex items-center gap-2 text-lg font-black text-white">
              <Logo /> {store.businessName}
            </p>
            <p className="mt-2 text-sm">Seven pickleball tools · {peso(store.price)} each · one-time payment.</p>
          </div>
          <div>
            <p className="font-bold text-white">Help</p>
            <ul className="mt-2 space-y-1 text-sm">
              <li><a className="hover:text-ball" href={href('/install')}>Install guide</a></li>
              <li><a className="hover:text-ball" href={href('/faq')}>FAQ</a></li>
              <li><a className="hover:text-ball" href={href('/track')}>Track your order</a></li>
            </ul>
          </div>
          <div>
            <p className="font-bold text-white">Contact & policies</p>
            <ul className="mt-2 space-y-1 text-sm">
              <li><a className="hover:text-ball" href={`mailto:${store.supportEmail}`}>{store.supportEmail}</a></li>
              <li><a className="hover:text-ball" href={href('/privacy')}>Privacy policy</a></li>
              <li><a className="hover:text-ball" href={href('/policy')}>Purchase & refund policy</a></li>
            </ul>
          </div>
        </div>
        <p className="border-t border-white/10 px-4 py-4 text-center text-xs text-white/50">© {new Date().getFullYear()} {store.businessName}. Not affiliated with GoTyme Bank, GCash or USA Pickleball.</p>
      </footer>
    </div>
  )
}

export function Logo() {
  return (
    <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="15" fill="#d9f02b" stroke="#b8cc12" strokeWidth="2" />
      {[
        [11, 10], [20, 9], [16, 16], [9, 19], [22, 20], [15, 24],
      ].map(([x, y]) => (
        <circle key={`${x}${y}`} cx={x} cy={y} r="1.8" fill="#8fa30a" />
      ))}
    </svg>
  )
}

export function Page({ title, intro, children, narrow }: { title: string; intro?: ReactNode; children: ReactNode; narrow?: boolean }) {
  return (
    <div className={`mx-auto px-4 py-8 sm:py-12 ${narrow ? 'max-w-2xl' : 'max-w-6xl'}`}>
      <h1 className="text-3xl font-black tracking-tight sm:text-4xl">{title}</h1>
      {intro && <p className="mt-2 max-w-2xl text-lg text-ink/70">{intro}</p>}
      <div className="mt-8">{children}</div>
    </div>
  )
}

export function AppCard({ app }: { app: AppMeta }) {
  return (
    <article className="card flex flex-col p-5 transition hover:shadow-md">
      <div className="flex items-start gap-3">
        <AppIcon glyph={app.glyph} color={app.color} size={52} />
        <div className="min-w-0">
          <h3 className="text-lg font-bold leading-tight">{app.name}</h3>
          <p className="text-sm text-ink/60">{app.tagline}</p>
        </div>
      </div>
      <p className="mt-3 text-sm text-ink/80">{app.description}</p>
      <ul className="mt-3 flex-1 space-y-1 text-sm text-ink/80">
        {app.features.slice(0, 4).map((f) => (
          <li key={f} className="flex gap-2">
            <span className="text-court-600" aria-hidden="true">✓</span>
            {f}
          </li>
        ))}
      </ul>
      <p className="mt-4 text-2xl font-black">{peso(store.price)} <span className="text-sm font-medium text-ink/50">one-time</span></p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <a className="btn-ghost text-sm" href={href(`/apps/${app.slug}`)} aria-label={`View details for ${app.name}`}>
          View details
        </a>
        <a className="btn-primary text-sm" href={href(`/checkout/${app.slug}`)} aria-label={`Buy ${app.name} for ${peso(store.price)}`}>
          Buy for {peso(store.price)}
        </a>
      </div>
      <a className="mt-3 text-center text-sm font-semibold text-court-700 hover:underline" href={demoHref(app.slug)} aria-label={`Try the free ${app.name} demo`}>
        ▶ Try the free demo
      </a>
    </article>
  )
}

export function Steps({ items }: { items: ReactNode[] }) {
  return (
    <ol className="space-y-3">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-court-600 text-sm font-bold text-white">{i + 1}</span>
          <span className="pt-0.5">{item}</span>
        </li>
      ))}
    </ol>
  )
}
