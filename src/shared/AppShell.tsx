import { useState, type ReactNode } from 'react'
import { AppIcon } from './AppIcon'
import { getApp, type AppSlug } from './apps'
import { DemoBanner, isDemo } from './demo'
import { useInstallPrompt, useOnline } from './pwa'

export function AppShell({ slug, children, actions }: { slug: AppSlug; children: ReactNode; actions?: ReactNode }) {
  const app = getApp(slug)!
  const { canPrompt, installed, install, ios } = useInstallPrompt()
  const online = useOnline()
  const [showIosHelp, setShowIosHelp] = useState(false)
  const demo = isDemo()

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col">
      {demo && <DemoBanner slug={slug} />}
      <header className="no-print sticky top-0 z-20 flex items-center gap-3 border-b border-ink/10 bg-paper/90 px-4 py-3 backdrop-blur">
        <AppIcon glyph={app.glyph} color={app.color} size={36} />
        <h1 className="min-w-0 flex-1 truncate text-lg font-bold">{app.name}</h1>
        {!online && (
          <span className="chip bg-ink/10 text-ink/70" title="Working offline">
            Offline
          </span>
        )}
        {actions}
        {!demo && !installed && canPrompt && (
          <button className="btn-ball min-h-9 px-3 py-1.5 text-sm" onClick={install}>
            Install
          </button>
        )}
        {!demo && !installed && !canPrompt && ios && (
          <button className="btn-ghost min-h-9 px-3 py-1.5 text-sm" onClick={() => setShowIosHelp((v) => !v)} aria-expanded={showIosHelp}>
            Install
          </button>
        )}
      </header>
      {showIosHelp && (
        <div className="no-print mx-4 mt-3 rounded-xl bg-court-50 p-3 text-sm text-court-900" role="note">
          In Safari, tap <strong>Share</strong> <span aria-hidden="true">⎋</span>, then <strong>Add to Home Screen</strong>. Open {app.shortName} from your home screen to use it offline.
        </div>
      )}
      <main className="flex-1 px-4 py-4">{children}</main>
      <footer className="no-print px-4 pb-6 pt-2 text-center text-xs text-ink/50">
        {demo ? 'Demo: nothing you enter is saved.' : 'Your data stays on this device. Clearing browser data or switching devices removes it.'}
      </footer>
    </div>
  )
}

/** Accessible confirm dialog replacement that works in installed PWAs (window.confirm is blocked in some). */
export function ConfirmButton({
  children,
  confirmLabel = 'Yes, continue',
  message,
  onConfirm,
  className = 'btn-danger',
}: {
  children: ReactNode
  confirmLabel?: string
  message: string
  onConfirm: () => void
  className?: string
}) {
  const [open, setOpen] = useState(false)
  if (!open)
    return (
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {children}
      </button>
    )
  return (
    <span role="alertdialog" aria-label={message} className="inline-flex flex-wrap items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-2 text-sm">
      <span className="px-1 font-medium text-red-800">{message}</span>
      <button
        type="button"
        className="btn min-h-9 bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700"
        onClick={() => {
          setOpen(false)
          onConfirm()
        }}
      >
        {confirmLabel}
      </button>
      <button type="button" className="btn-ghost min-h-9 px-3 py-1.5 text-sm" onClick={() => setOpen(false)} autoFocus>
        Cancel
      </button>
    </span>
  )
}

