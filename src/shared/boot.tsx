import { StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import '../styles.css'
import type { AppSlug } from './apps'
import { LicenseGate } from './LicenseGate'
import { registerAppServiceWorker } from './pwa'
import { enableDemo } from './demo'
import { keepStorageInMemory } from './storage'

/** Mounts a paid app behind its device activation check and registers its service worker. */
export function bootApp(slug: AppSlug, app: ReactNode) {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <LicenseGate slug={slug}>{app}</LicenseGate>
    </StrictMode>,
  )
  registerAppServiceWorker()
}

/** Mounts the free online demo: no activation, no service worker, nothing persisted. */
export function bootDemo(app: ReactNode) {
  enableDemo()
  keepStorageInMemory()
  createRoot(document.getElementById('root')!).render(<StrictMode>{app}</StrictMode>)
}
