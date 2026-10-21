import { useCallback, useEffect, useState, type ReactNode } from 'react'
import publicKey from '../config/license-public-key.json'
import { store } from '../config/store'
import { AppShell } from './AppShell'
import { getApp, type AppSlug } from './apps'
import { getDeviceCode } from './device'
import { copyText } from './download'
import { verifyActivation } from './license'
import { isIOS, isStandalone } from './pwa'
import { readJSON, writeJSON } from './storage'

// Activation is automatic: the install link carries a token (#t=...). The first time the app
// opens from it, the server records this phone and returns an activation code, which is then
// checked offline on every launch. A forwarded link is refused on any other phone.

type State =
  | { kind: 'checking' }
  | { kind: 'activating' }
  | { kind: 'ios-install'; link: string }
  | { kind: 'locked'; message?: string }
  | { kind: 'unlocked' }

const publicJwk = publicKey as JsonWebKey | null

const errorMessages: Record<string, string> = {
  other_device: 'This purchase is already activated on another phone. Each purchase works on one phone. If you changed phones, email us your order ID and we’ll move it.',
  invalid_link: 'That install link isn’t valid. Open the exact link from your PickleTools email.',
  bad_device: 'Something went wrong on this device. Please try again.',
  not_configured: 'Activation is temporarily unavailable. Please try again in a little while.',
  offline: 'You’re offline. Connect to the internet to activate. It’s only needed once.',
}

/** Pulls the activation token out of a pasted install link (or a bare token). */
export function tokenFrom(text: string): string | null {
  const t = text.trim()
  const fromHash = t.match(/#t=([^&\s]+)/)?.[1]
  if (fromHash) return decodeURIComponent(fromHash)
  return /^PT-[A-Z]{2}-\d{6}-[0-9A-Z]{4}\.[\w-]{10,}$/i.test(t) ? t : null
}

/** Shows the app only when a valid activation code for this phone is stored. */
export function LicenseGate({ slug, children }: { slug: AppSlug; children: ReactNode }) {
  const [state, setState] = useState<State>({ kind: 'checking' })
  const [device] = useState(getDeviceCode)
  const storageKey = `pt:${slug}:activation`

  const activateWith = useCallback(
    async (token: string) => {
      setState({ kind: 'activating' })
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}api/activate`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ token, device }),
        })
        const data = (await res.json().catch(() => ({ ok: false, error: 'not_configured' }))) as { ok: boolean; code?: string; error?: string }
        if (data.ok && data.code && publicJwk && (await verifyActivation(data.code, publicJwk, slug, device))) {
          writeJSON(storageKey, data.code)
          history.replaceState(null, '', location.pathname + location.search)
          setState({ kind: 'unlocked' })
        } else setState({ kind: 'locked', message: errorMessages[data.error ?? 'invalid_link'] ?? errorMessages.invalid_link })
      } catch {
        setState({ kind: 'locked', message: errorMessages.offline })
      }
    },
    [device, slug, storageKey],
  )

  useEffect(() => {
    ;(async () => {
      const saved = readJSON<string | null>(storageKey, null)
      if (saved && publicJwk && (await verifyActivation(saved, publicJwk, slug, device))) return setState({ kind: 'unlocked' })

      const token = tokenFrom(location.hash)
      if (!token) return setState({ kind: 'locked' })
      // iPhone: Safari and the Home Screen app keep separate storage, so activate inside the
      // installed app, not in Safari (otherwise Safari would use up the one-phone activation).
      if (isIOS() && !isStandalone()) return setState({ kind: 'ios-install', link: location.href })
      activateWith(token)
    })()
  }, [activateWith, device, slug, storageKey])

  if (state.kind === 'unlocked') return <>{children}</>
  if (state.kind === 'checking' || state.kind === 'activating')
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 text-ink/60" role="status">
        <span className="size-8 animate-spin rounded-full border-4 border-court-200 border-t-court-600" aria-hidden="true" />
        {state.kind === 'activating' ? 'Activating on this phone…' : 'Loading…'}
      </div>
    )

  return (
    <AppShell slug={slug}>
      {state.kind === 'ios-install' ? <IosInstall slug={slug} link={state.link} /> : <Locked slug={slug} message={state.message} onToken={activateWith} />}
    </AppShell>
  )
}

function IosInstall({ slug, link }: { slug: AppSlug; link: string }) {
  const app = getApp(slug)!
  const [copied, setCopied] = useState(false)
  return (
    <div className="mx-auto max-w-md space-y-5">
      <div className="text-center">
        <h2 className="text-2xl font-black">Install {app.shortName}</h2>
        <p className="mt-1 text-ink/70">Two quick steps on iPhone or iPad.</p>
      </div>
      <ol className="card space-y-4 p-5">
        <li className="flex gap-3">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-court-600 text-sm font-bold text-white">1</span>
          <div className="flex-1">
            <p className="font-semibold">Copy your install link</p>
            <button
              className="btn-primary mt-2 w-full"
              onClick={async () => {
                setCopied(await copyText(link))
              }}
            >
              {copied ? 'Copied ✓' : 'Copy install link'}
            </button>
          </div>
        </li>
        <li className="flex gap-3">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-court-600 text-sm font-bold text-white">2</span>
          <p>
            Tap <strong>Share</strong> <span aria-hidden="true">⎋</span> → <strong>Add to Home Screen</strong>, then open <strong>{app.shortName}</strong> from your Home Screen and tap <strong>Paste install link</strong>.
          </p>
        </li>
      </ol>
      <p className="text-center text-xs text-ink/50">Activation happens inside the installed app, so it’s locked to this phone.</p>
    </div>
  )
}

function Locked({ slug, message, onToken }: { slug: AppSlug; message?: string; onToken: (token: string) => void }) {
  const app = getApp(slug)!
  const [text, setText] = useState('')
  const [error, setError] = useState('')

  const submit = (value: string) => {
    const token = tokenFrom(value)
    if (!token) return setError('That doesn’t look like your install link. Copy the whole link from your PickleTools email.')
    setError('')
    onToken(token)
  }

  return (
    <div className="mx-auto max-w-md space-y-5">
      <div className="text-center">
        <h2 className="text-2xl font-black">Activate {app.shortName}</h2>
        <p className="mt-1 text-ink/70">Open the install link from your PickleTools email on this phone, and the app activates automatically.</p>
      </div>

      {message && (
        <p className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900" role="alert">
          {message}
        </p>
      )}

      <div className="card space-y-3 p-4">
        <p className="font-semibold">Already copied the link?</p>
        {'clipboard' in navigator && 'readText' in navigator.clipboard && (
          <button
            className="btn-primary w-full"
            onClick={async () => {
              try {
                submit(await navigator.clipboard.readText())
              } catch {
                setError('Paste the link into the box below instead.')
              }
            }}
          >
            Paste install link
          </button>
        )}
        <label className="sr-only" htmlFor="link">
          Install link
        </label>
        <input id="link" className="input font-mono text-sm" placeholder="https://pickletools.vercel.app/apps/…" value={text} onChange={(e) => setText(e.target.value)} autoComplete="off" spellCheck={false} />
        <button className="btn-ghost w-full" disabled={!text.trim()} onClick={() => submit(text)}>
          Activate
        </button>
        {error && (
          <p className="text-sm text-red-700" role="alert">
            {error}
          </p>
        )}
      </div>

      <p className="text-center text-xs text-ink/50">
        Each purchase activates on one phone. Need help? Email{' '}
        <a className="underline" href={`mailto:${store.supportEmail}`}>
          {store.supportEmail}
        </a>{' '}
        with your order ID.
      </p>
    </div>
  )
}
