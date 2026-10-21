import type { ReactNode } from 'react'
import { store, peso } from '../config/store'
import { getApp, type AppSlug } from './apps'

// Free online demo: the same app code, booted from demo/<slug>/ with no service worker,
// no manifest (so it can't be installed), in-memory storage and per-app limits.

let demo = false

export function enableDemo() {
  demo = true
}

export const isDemo = () => demo

/** Store checkout URL for an app (the demo pages live under the same site base). */
export const checkoutUrl = (slug: string) => `${import.meta.env.BASE_URL}#/checkout/${slug}`

export function DemoBanner({ slug }: { slug: AppSlug }) {
  return (
    <div className="no-print flex items-center gap-3 bg-ink px-4 py-2 text-sm text-white">
      <span className="chip shrink-0 bg-ball text-ink">Free demo</span>
      <span className="min-w-0 flex-1 truncate">
        Nothing is saved<span className="hidden sm:inline"> and it only works online</span>.
      </span>
      <a className="shrink-0 font-semibold text-ball underline" href={checkoutUrl(slug)}>
        Full app {peso(store.price)}
      </a>
    </div>
  )
}

/** Shown wherever the demo stops; explains what the paid version adds. */
export function DemoLimit({ slug, title, children }: { slug: AppSlug; title: string; children?: ReactNode }) {
  const app = getApp(slug)!
  return (
    <div className="card border-2 border-ball p-5 text-center" role="note">
      <p className="text-lg font-black">{title}</p>
      {children && <p className="mt-1 text-sm text-ink/70">{children}</p>}
      <p className="mt-2 text-sm text-ink/70">The full {app.shortName} app installs on your phone, saves your data and works offline.</p>
      <a className="btn-primary mt-4" href={checkoutUrl(slug)}>
        Buy for {peso(store.price)}
      </a>
    </div>
  )
}
