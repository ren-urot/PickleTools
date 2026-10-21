import { useEffect, useState, type ReactNode } from 'react'
import publicKey from '../config/license-public-key.json'
import { store } from '../config/store'
import { AppShell } from './AppShell'
import { getApp, type AppSlug } from './apps'
import { copyText } from './download'
import { getDeviceCode, ORDER_ID_RE, verifyActivation } from './license'
import { isIOS, isStandalone } from './pwa'
import { readJSON, writeJSON } from './storage'

type State = { kind: 'checking' } | { kind: 'locked' } | { kind: 'unlocked'; orderId: string }

const publicJwk = publicKey as JsonWebKey | null

/** Shows the app only when a valid activation code for this device is stored. */
export function LicenseGate({ slug, children }: { slug: AppSlug; children: ReactNode }) {
  const [state, setState] = useState<State>({ kind: 'checking' })
  const [device] = useState(getDeviceCode)
  const storageKey = `pt:${slug}:activation`

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!publicJwk) return setState({ kind: 'locked' })
      // An activation link (#activate=...) works where the browser and installed app share storage (Android, desktop).
      const fromHash = new URLSearchParams(location.hash.slice(1)).get('activate')
      for (const code of [fromHash, readJSON<string | null>(storageKey, null)]) {
        if (!code) continue
        const orderId = await verifyActivation(code, publicJwk, slug, device)
        if (orderId) {
          writeJSON(storageKey, code)
          if (fromHash) history.replaceState(null, '', location.pathname + location.search)
          if (!cancelled) setState({ kind: 'unlocked', orderId })
          return
        }
      }
      if (!cancelled) setState({ kind: 'locked' })
    })()
    return () => {
      cancelled = true
    }
  }, [slug, device, storageKey])

  if (state.kind === 'unlocked') return <>{children}</>
  if (state.kind === 'checking')
    return (
      <div className="flex min-h-dvh items-center justify-center text-ink/50" role="status">
        Loading…
      </div>
    )
  return (
    <AppShell slug={slug}>
      <LockScreen
        slug={slug}
        device={device}
        onActivate={async (code) => {
          const orderId = publicJwk ? await verifyActivation(code, publicJwk, slug, device) : null
          if (!orderId) return false
          writeJSON(storageKey, code.replace(/\s+/g, ''))
          setState({ kind: 'unlocked', orderId })
          return true
        }}
      />
    </AppShell>
  )
}

function LockScreen({ slug, device, onActivate }: { slug: AppSlug; device: string; onActivate: (code: string) => Promise<boolean> }) {
  const app = getApp(slug)!
  const [orderId, setOrderId] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  const iosBrowser = isIOS() && !isStandalone()
  const cleanOrder = orderId.trim().toUpperCase()

  const subject = `Activation request ${cleanOrder || '(order ID)'} · ${app.name}`
  const body = [
    `Order ID: ${cleanOrder || ''}`,
    `App: ${app.name}`,
    `Device code: ${device}`,
    '',
    'Please send my activation code for this device.',
  ].join('\n')

  if (!publicJwk)
    return (
      <div className="card p-6 text-center" role="alert">
        <p className="font-bold">Activation isn’t set up yet.</p>
        <p className="mt-2 text-sm text-ink/70">The store owner needs to run the key setup before this app can be activated.</p>
      </div>
    )

  return (
    <div className="mx-auto max-w-md space-y-5">
      <div className="text-center">
        <h2 className="text-2xl font-black">Activate {app.shortName}</h2>
        <p className="mt-1 text-ink/70">Each purchase activates {app.name} on one device.</p>
      </div>

      {iosBrowser && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900" role="note">
          <strong>On iPhone or iPad, install first.</strong> Tap <strong>Share</strong> → <strong>Add to Home Screen</strong>, then open {app.shortName} from your Home Screen and request activation there. Safari and the installed app have separate device codes.
        </div>
      )}

      <section className="card space-y-3 p-4" aria-labelledby="step1">
        <h3 id="step1" className="font-bold">
          1 · Send us your device code
        </h3>
        <div className="flex items-center gap-2 rounded-xl bg-court-50 p-3">
          <code className="flex-1 text-center text-2xl font-black tracking-widest text-court-800" aria-label={`Device code ${device.split('').join(' ')}`}>
            {device}
          </code>
          <button
            className="btn-ghost min-h-9 px-3 text-sm"
            onClick={async () => {
              setCopied(await copyText(device))
              setTimeout(() => setCopied(false), 2000)
            }}
          >
            {copied ? 'Copied ✓' : 'Copy'}
          </button>
        </div>
        <div>
          <label className="label" htmlFor="order">
            Your order ID
          </label>
          <input id="order" className="input font-mono uppercase" placeholder="PT-XX-YYMMDD-XXXX" value={orderId} onChange={(e) => setOrderId(e.target.value)} autoComplete="off" />
          {cleanOrder && !ORDER_ID_RE.test(cleanOrder) && <p className="mt-1 text-sm text-amber-800">Check the order ID - it looks like PT-SK-261021-7KQ4.</p>}
        </div>
        <a className="btn-primary w-full" href={`mailto:${store.supportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`}>
          Email activation request
        </a>
        <p className="text-xs text-ink/60">Or reply to your installation email with the order ID and device code.</p>
      </section>

      <form
        className="card space-y-3 p-4"
        aria-labelledby="step2"
        onSubmit={async (e) => {
          e.preventDefault()
          setBusy(true)
          setError('')
          const ok = await onActivate(code)
          setBusy(false)
          if (!ok)
            setError(
              'That code doesn’t match this device and app. Make sure you paste the whole code from your email, on the same device and app whose device code you sent.',
            )
        }}
      >
        <h3 id="step2" className="font-bold">
          2 · Enter your activation code
        </h3>
        <label className="sr-only" htmlFor="code">
          Activation code
        </label>
        <textarea id="code" className="input min-h-24 font-mono text-sm" placeholder="PT-…  (paste the full code from our email)" value={code} onChange={(e) => setCode(e.target.value)} spellCheck={false} autoCapitalize="off" autoComplete="off" />
        {error && (
          <p className="text-sm text-red-700" role="alert">
            {error}
          </p>
        )}
        <button className="btn-primary w-full" disabled={busy || code.trim().length < 20}>
          {busy ? 'Checking…' : 'Activate'}
        </button>
      </form>

      <p className="text-center text-xs text-ink/50">
        Clearing this browser’s data or changing phones resets the device code. Contact {store.supportEmail} with your order ID for a replacement.
      </p>
    </div>
  )
}
