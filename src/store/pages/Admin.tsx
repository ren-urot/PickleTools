import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import publicKey from '../../config/license-public-key.json'
import { store, peso } from '../../config/store'
import { apps, getApp } from '../../shared/apps'
import { installUrl } from '../../shared/delivery'
import { copyText, downloadFile } from '../../shared/download'
import { isDeviceCode, normalizeDeviceCode, ORDER_ID_RE, signActivation, verifyActivation } from '../../shared/license'
import { readJSON, useLocalState, writeJSON, removeKey } from '../../shared/storage'
import { allChecked, decodeSubmission, duplicateReferences, isOverdue, needsReplacement, newDeskOrder, ordersCSV, parseSubmissionText, withStatus, type DeskOrder } from '../lib/desk'
import { activationEmail, installEmail, mailto, needsInfoEmail, notFoundEmail, refundEmail, type Email } from '../lib/emails'
import { statusLabel, type OrderStatus } from '../lib/order'
import { normalizeReference } from '../lib/paymentForm'
import { navigate } from '../router'

const KEY_STORE = 'pt:admin:private-key'
const SALT_STORE = 'pt:admin:salt'
const siteRoot = () => `${location.origin}${location.pathname.replace(/index\.html$/, '')}`

const statusChip: Record<OrderStatus, string> = {
  not_sent: 'bg-ink/10 text-ink/70',
  submitted: 'bg-amber-100 text-amber-900',
  verifying: 'bg-amber-100 text-amber-900',
  needs_info: 'bg-orange-100 text-orange-900',
  verified: 'bg-sky-100 text-sky-900',
  activated: 'bg-court-100 text-court-800',
  rejected: 'bg-red-100 text-red-800',
  refunded: 'bg-ink/10 text-ink/70',
}

export function Admin({ importPayload }: { importPayload?: string | null }) {
  const [orders, setOrders] = useLocalState<DeskOrder[]>('pt:admin:orders', [])
  const [selected, setSelected] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null)

  // "Open in Order desk" link from a submission email: log the order (once) and open it.
  useEffect(() => {
    if (!importPayload) return
    const sub = decodeSubmission(importPayload)
    const order = sub && newDeskOrder(sub, 'Imported from submission email')
    if (!order) setNotice({ ok: false, text: 'That Order desk link is incomplete. Use “Log new submission” and paste the email instead.' })
    else {
      setOrders((prev) => (prev.some((o) => o.orderId === order.orderId) ? prev : [order, ...prev]))
      setNotice({ ok: true, text: `${order.orderId} is in your queue. Check the payment in GoTyme, then tick the checks below.` })
      setSelected(order.orderId)
    }
    navigate('/admin') // drop the payload from the address bar
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [importPayload])
  const [adding, setAdding] = useState(false)
  const [filter, setFilter] = useState<'open' | 'all' | OrderStatus>('open')
  const [creds, setCreds] = useState(() => ({ salt: readJSON(SALT_STORE, ''), key: readJSON(KEY_STORE, '') }))
  const fileRef = useRef<HTMLInputElement>(null)

  const update = (o: DeskOrder) => setOrders((prev) => prev.map((x) => (x.orderId === o.orderId ? o : x)))
  const current = orders.find((o) => o.orderId === selected) ?? null
  const shown = useMemo(
    () =>
      [...orders]
        .filter((o) => (filter === 'all' ? true : filter === 'open' ? !['activated', 'rejected', 'refunded'].includes(o.status) : o.status === filter))
        .sort((a, b) => b.createdAt - a.createdAt),
    [orders, filter],
  )
  const overdue = orders.filter((o) => isOverdue(o, store.verificationHours)).length

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Order desk</h1>
          <p className="text-sm text-ink/60">For the store owner. Data stays in this browser - export a backup regularly.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary" onClick={() => { setAdding(true); setSelected(null) }}>
            + Log new submission
          </button>
          <button className="btn-ghost" disabled={!orders.length} onClick={() => downloadFile(`pickletools-orders-${new Date().toISOString().slice(0, 10)}.csv`, ordersCSV(orders), 'text/csv;charset=utf-8')}>
            Export CSV
          </button>
          <button className="btn-ghost" disabled={!orders.length} onClick={() => downloadFile(`pickletools-desk-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(orders, null, 2), 'application/json')}>
            Backup
          </button>
          <button className="btn-ghost" onClick={() => fileRef.current?.click()}>
            Restore
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            className="sr-only"
            aria-label="Restore desk backup"
            onChange={async (e) => {
              const f = e.target.files?.[0]
              e.target.value = ''
              if (!f) return
              try {
                const data = JSON.parse(await f.text()) as DeskOrder[]
                if (!Array.isArray(data) || data.some((o) => !ORDER_ID_RE.test(o.orderId))) throw new Error()
                const byId = new Map(orders.map((o) => [o.orderId, o]))
                for (const o of data) byId.set(o.orderId, o)
                setOrders([...byId.values()])
                alert(`Restored ${data.length} orders.`)
              } catch {
                alert('That file is not an order desk backup.')
              }
            }}
          />
        </div>
      </div>

      <Setup creds={creds} setCreds={setCreds} />

      {notice && (
        <p className={`mt-4 rounded-xl p-3 text-sm font-semibold ${notice.ok ? 'bg-court-50 text-court-800' : 'bg-red-50 text-red-800'}`} role="status">
          {notice.text}
        </p>
      )}

      {overdue > 0 && (
        <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-800" role="alert">
          {overdue} order{overdue > 1 ? 's are' : ' is'} past the {store.verificationHours}-hour verification promise.
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[22rem_1fr]">
        <section aria-label="Orders">
          <select className="input mb-3" value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} aria-label="Filter orders">
            <option value="open">Open orders</option>
            <option value="all">All orders</option>
            {(Object.keys(statusLabel) as OrderStatus[]).map((s) => (
              <option key={s} value={s}>
                {statusLabel[s]}
              </option>
            ))}
          </select>
          {shown.length === 0 ? (
            <p className="card p-6 text-center text-sm text-ink/60">No orders here.</p>
          ) : (
            <ul className="space-y-2">
              {shown.map((o) => (
                <li key={o.orderId}>
                  <button onClick={() => { setSelected(o.orderId); setAdding(false) }} className={`card w-full p-3 text-left ${selected === o.orderId ? 'ring-2 ring-court-600' : ''}`}>
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-mono text-sm font-semibold">{o.orderId}</span>
                      {isOverdue(o, store.verificationHours) && <span className="chip bg-red-100 text-red-800">Overdue</span>}
                    </span>
                    <span className="block truncate text-sm text-ink/70">{getApp(o.slug)?.name} · {o.email}</span>
                    <span className={`chip mt-1 ${statusChip[o.status]}`}>{statusLabel[o.status]}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-label="Order details">
          {adding ? (
            <NewOrder
              orders={orders}
              onCancel={() => setAdding(false)}
              onSave={(o) => {
                setOrders((prev) => [o, ...prev])
                setAdding(false)
                setSelected(o.orderId)
              }}
            />
          ) : current ? (
            <OrderDetail key={current.orderId} o={current} orders={orders} creds={creds} onChange={update} />
          ) : (
            <div className="card p-8 text-center text-ink/60">
              <p className="font-semibold text-ink">Workflow</p>
              <ol className="mx-auto mt-3 max-w-md list-decimal space-y-1 pl-5 text-left text-sm">
                <li>A submission email arrives. Log it here (status: Verifying).</li>
                <li>Find the payment in GoTyme. Tick the three checks.</li>
                <li>Send the install link email (status: Paid · install link sent).</li>
                <li>Customer replies with a device code. Issue the activation code (status: Activated).</li>
                <li>Use Needs info / Not found / Refund when something doesn’t match.</li>
              </ol>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function Setup({ creds, setCreds }: { creds: { salt: string; key: string }; setCreds: (c: { salt: string; key: string }) => void }) {
  const [salt, setSalt] = useState(creds.salt)
  const [key, setKey] = useState(creds.key)
  const [remember, setRemember] = useState(!!readJSON(KEY_STORE, ''))
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const ready = !!creds.key
  // Open by default only when keys are missing; never auto-collapse, so the save message stays visible.
  const [startOpen] = useState(!ready)

  const save = async () => {
    if (key.trim()) {
      try {
        const jwk = JSON.parse(key) as JsonWebKey
        const code = await signActivation(jwk, 'scorekeeper', 'TEST-TEST-TEST', 'PT-SK-000000-0000')
        const ok = publicKey ? await verifyActivation(code, publicKey as JsonWebKey, 'scorekeeper', 'TEST-TEST-TEST') : null
        if (!ok) return setMsg({ ok: false, text: 'This private key does not match the public key built into the apps.' })
      } catch {
        return setMsg({ ok: false, text: 'That is not a valid private key (paste the JSON printed by npm run keygen).' })
      }
    }
    if (remember) {
      writeJSON(KEY_STORE, key.trim())
      writeJSON(SALT_STORE, salt.trim())
    } else {
      removeKey(KEY_STORE)
      removeKey(SALT_STORE)
    }
    setCreds({ salt: salt.trim(), key: key.trim() })
    setMsg({ ok: true, text: remember ? 'Saved on this device.' : 'Loaded for this session only.' })
  }

  return (
    <details className="card mt-6 p-4" open={startOpen}>
      <summary className="cursor-pointer font-bold">
        Delivery & activation keys {ready ? <span className="chip ml-2 bg-court-100 text-court-800">Ready</span> : <span className="chip ml-2 bg-amber-100 text-amber-900">Not set</span>}
      </summary>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <label className="label" htmlFor="salt">
            Delivery salt
          </label>
          <input id="salt" type="password" className="input font-mono" value={salt} onChange={(e) => setSalt(e.target.value)} autoComplete="off" />
          <p className="mt-1 text-xs text-ink/60">Same value as the DELIVERY_SALT build secret. Used to compute the unlisted install links.</p>
        </div>
        <div>
          <label className="label" htmlFor="pk">
            Activation private key (JSON)
          </label>
          <textarea id="pk" className="input min-h-20 font-mono text-xs" value={key} onChange={(e) => setKey(e.target.value)} spellCheck={false} autoComplete="off" />
          <p className="mt-1 text-xs text-ink/60">From keys/license-private-key.json. Never share it - anyone with it can create activation codes.</p>
        </div>
      </div>
      <label className="mt-3 flex items-center gap-2 text-sm">
        <input type="checkbox" className="size-5 accent-court-600" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
        Remember on this device (only on a private, password-protected device)
      </label>
      <div className="mt-3 flex items-center gap-3">
        <button className="btn-primary" onClick={save}>
          Save keys
        </button>
        {msg && (
          <p className={`text-sm ${msg.ok ? 'text-court-700' : 'text-red-700'}`} role="status">
            {msg.text}
          </p>
        )}
      </div>
    </details>
  )
}

function NewOrder({ orders, onSave, onCancel }: { orders: DeskOrder[]; onSave: (o: DeskOrder) => void; onCancel: () => void }) {
  const [f, setF] = useState({ orderId: '', email: '', reference: '', amount: String(store.price), senderName: '', paidAt: '', notes: '' })
  const [error, setError] = useState('')
  const [pasted, setPasted] = useState('')
  const id = f.orderId.trim().toUpperCase()
  const fillFromEmail = (text: string) => {
    setPasted(text)
    const p = parseSubmissionText(text)
    if (!p.orderId) return
    setF({ orderId: p.orderId, email: p.email, reference: p.reference, amount: p.amount || String(store.price), senderName: p.senderName, paidAt: p.paidAt, notes: p.contact ? `Backup contact: ${p.contact}` : '' })
  }
  const app = apps.find((a) => id.startsWith(`PT-${a.code}-`))
  const dupes = f.reference ? duplicateReferences(orders, f.reference) : []
  const input = (k: keyof typeof f, label: string, props: Record<string, unknown> = {}) => (
    <div>
      <label className="label" htmlFor={`n-${k}`}>
        {label}
      </label>
      <input id={`n-${k}`} className="input" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} {...props} />
    </div>
  )

  return (
    <form
      className="card space-y-4 p-5"
      onSubmit={(e) => {
        e.preventDefault()
        if (!ORDER_ID_RE.test(id) || !app) return setError('Enter the order ID exactly as in the submission email (PT-XX-YYMMDD-XXXX).')
        if (orders.some((o) => o.orderId === id)) return setError('This order is already logged.')
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.trim())) return setError('Enter the customer email.')
        if (!normalizeReference(f.reference)) return setError('Enter the reference number.')
        const order = newDeskOrder({ ...f, contact: '' })
        if (order) onSave({ ...order, notes: f.notes.trim() })
      }}
    >
      <h2 className="text-xl font-bold">Log a submission</h2>
      <div>
        <label className="label" htmlFor="paste">
          Paste the submission email <span className="font-normal text-ink/50">(fills the fields below)</span>
        </label>
        <textarea id="paste" className="input min-h-24 text-sm" placeholder="Open the PickleTools email, select all (Ctrl+A), copy and paste it here" value={pasted} onChange={(e) => fillFromEmail(e.target.value)} />
        {pasted && !f.orderId && <p className="mt-1 text-sm text-amber-800">No order ID found in that text. Fill in the fields by hand.</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {input('orderId', 'Order ID', { className: 'input font-mono uppercase', autoFocus: true })}
        <div>
          <p className="label">App</p>
          <p className="input flex items-center bg-ink/5">{app ? app.name : <span className="text-ink/40">From the order ID</span>}</p>
        </div>
        {input('email', 'Customer email', { type: 'email' })}
        {input('reference', 'Reference number', { className: 'input font-mono' })}
        {input('amount', 'Amount stated (₱)', { inputMode: 'decimal' })}
        {input('senderName', 'Sender name (optional)')}
        {input('paidAt', 'Payment date/time (optional)')}
        {input('notes', 'Notes (optional)')}
      </div>
      {dupes.length > 0 && (
        <p className="rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert">
          ⚠ Reference already used by {dupes.map((d) => d.orderId).join(', ')}. One payment can only fulfil one order.
        </p>
      )}
      {error && (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button className="btn-primary">Log order</button>
        <button type="button" className="btn-ghost" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}

function OrderDetail({ o, orders, creds, onChange }: { o: DeskOrder; orders: DeskOrder[]; creds: { salt: string; key: string }; onChange: (o: DeskOrder) => void }) {
  const app = getApp(o.slug)!
  const [email, setEmail] = useState<Email | null>(null)
  const [device, setDevice] = useState('')
  const [replacement, setReplacement] = useState(false)
  const [err, setErr] = useState('')
  const dupes = duplicateReferences(orders, o.reference, o.orderId)
  const dev = normalizeDeviceCode(device)
  const mustReplace = isDeviceCode(dev) && needsReplacement(o, dev)
  const terminal = o.status === 'rejected' || o.status === 'refunded'

  const check = (k: keyof DeskOrder['checks'], v: boolean) => {
    const next = { ...o, checks: { ...o.checks, [k]: v } }
    onChange(o.status === 'submitted' && v ? withStatus(next, 'verifying', 'Started checking GoTyme') : next)
  }
  const link = () => installUrl(siteRoot(), creds.salt, o.slug)

  const sendInstall = async () => {
    if (!creds.salt && !confirm('No delivery salt is set, so the install link will be the plain /apps/ path. Continue?')) return
    setEmail(installEmail(o, app, await link()))
    if (o.status !== 'activated') onChange(withStatus(o, 'verified', 'Install link sent'))
  }

  const issue = async () => {
    setErr('')
    if (!isDeviceCode(dev)) return setErr('Device codes look like AB12-CD34-EF56.')
    if (!creds.key) return setErr('Load the activation private key first (Delivery & activation keys).')
    if (mustReplace && !replacement) return setErr('This order is already activated on another device. Tick “Replacement” only for a lost, reset or replaced device.')
    try {
      const code = await signActivation(JSON.parse(creds.key) as JsonWebKey, o.slug, dev, o.orderId)
      const existing = o.activations.find((a) => a.device === dev)
      const activations = existing ? o.activations : [...o.activations, { device: dev, code, issuedAt: Date.now(), replacement: mustReplace }]
      onChange(withStatus({ ...o, activations }, 'activated', `Activation for ${dev}${mustReplace ? ' (replacement)' : ''}`))
      setEmail(activationEmail(o, app, dev, code, await link()))
      setDevice('')
      setReplacement(false)
    } catch {
      setErr('Signing failed - check the private key.')
    }
  }

  return (
    <div className="space-y-4">
      <div className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-mono text-lg font-bold">{o.orderId}</p>
            <p className="text-ink/70">
              {app.name} · {peso(o.amount)} stated
            </p>
          </div>
          <span className={`chip ${statusChip[o.status]}`}>{statusLabel[o.status]}</span>
        </div>
        <dl className="mt-4 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
          <Row k="Email" v={o.email} />
          <Row k="Reference" v={<span className="font-mono">{o.reference}</span>} />
          <Row k="Sender" v={o.senderName || '-'} />
          <Row k="Paid at" v={o.paidAt || '-'} />
          <Row k="Logged" v={new Date(o.createdAt).toLocaleString('en-PH')} />
          <Row k="Devices" v={o.activations.length ? o.activations.map((a) => `${a.device}${a.replacement ? ' (repl.)' : ''}`).join(', ') : '-'} />
        </dl>
        {o.notes && <p className="mt-2 text-sm text-ink/70">Notes: {o.notes}</p>}
      </div>

      <div className="card p-5">
        <h3 className="font-bold">1 · Verify in GoTyme</h3>
        {dupes.length > 0 && (
          <p className="mt-2 rounded-xl bg-red-50 p-3 text-sm text-red-800" role="alert">
            ⚠ Reference also used by {dupes.map((d) => d.orderId).join(', ')}.
          </p>
        )}
        <div className="mt-3 space-y-2 text-sm">
          <Check checked={o.checks.amount} onChange={(v) => check('amount', v)} disabled={terminal}>
            Incoming payment of exactly <strong>{peso(store.price)}.00</strong> received in GoTyme
          </Check>
          <Check checked={o.checks.reference} onChange={(v) => check('reference', v)} disabled={terminal}>
            Reference <span className="font-mono">{o.reference}</span> matches (sender/time plausible)
          </Check>
          <Check checked={o.checks.unique} onChange={(v) => check('unique', v)} disabled={terminal || dupes.length > 0}>
            This payment hasn’t fulfilled any other order
          </Check>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="btn-primary" disabled={!allChecked(o) || terminal} onClick={sendInstall}>
            {o.status === 'verified' || o.status === 'activated' ? 'Resend install link' : 'Mark paid & send install link'}
          </button>
          <button className="btn-ghost" disabled={terminal} onClick={() => { setEmail(needsInfoEmail(o, app)); onChange(withStatus(o, 'needs_info')) }}>
            Needs info
          </button>
          <button className="btn-ghost" disabled={terminal || allChecked(o)} onClick={() => { setEmail(notFoundEmail(o, app)); onChange(withStatus(o, 'rejected', 'Payment not found')) }}>
            Payment not found
          </button>
          <button className="btn-danger" disabled={o.status === 'refunded'} onClick={() => { setEmail(refundEmail(o, app, o.amount)); onChange(withStatus(o, 'refunded')) }}>
            Refunded
          </button>
        </div>
      </div>

      <div className={`card p-5 ${o.status === 'verified' || o.status === 'activated' ? '' : 'opacity-60'}`}>
        <h3 className="font-bold">2 · Activate the customer’s device</h3>
        <p className="mt-1 text-sm text-ink/60">Paste the device code the customer sent from inside the installed app.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <label className="sr-only" htmlFor="device">
            Device code
          </label>
          <input id="device" className="input w-56 font-mono uppercase" placeholder="AB12-CD34-EF56" value={device} onChange={(e) => setDevice(e.target.value)} disabled={!(o.status === 'verified' || o.status === 'activated')} />
          <button className="btn-primary" onClick={issue} disabled={!(o.status === 'verified' || o.status === 'activated')}>
            Issue activation code
          </button>
        </div>
        {mustReplace && (
          <label className="mt-3 flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
            <input type="checkbox" className="size-5 accent-court-600" checked={replacement} onChange={(e) => setReplacement(e.target.checked)} />
            Replacement for a lost/reset device ({o.activations.filter((a) => a.replacement).length} used; policy allows 1 free)
          </label>
        )}
        {err && (
          <p className="mt-2 text-sm text-red-700" role="alert">
            {err}
          </p>
        )}
      </div>

      {email && <EmailPreview email={email} onClose={() => setEmail(null)} />}

      <details className="card p-5">
        <summary className="cursor-pointer font-bold">History</summary>
        <ul className="mt-3 space-y-1 text-sm">
          {o.history.map((h, i) => (
            <li key={i}>
              <span className="text-ink/50">{new Date(h.at).toLocaleString('en-PH')}</span> - {statusLabel[h.status]}
              {h.note ? ` · ${h.note}` : ''}
            </li>
          ))}
        </ul>
      </details>
    </div>
  )
}

function EmailPreview({ email, onClose }: { email: Email; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  return (
    <div className="card border-2 border-court-600 p-5" role="region" aria-label="Email to send">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-bold">Email to send</h3>
        <button className="text-sm text-ink/60 hover:underline" onClick={onClose}>
          Close
        </button>
      </div>
      <p className="mt-2 text-sm">
        <strong>To:</strong> {email.to}
        <br />
        <strong>Subject:</strong> {email.subject}
      </p>
      <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-xl bg-paper p-3 font-sans text-sm">{email.body}</pre>
      <div className="mt-3 flex flex-wrap gap-2">
        <a className="btn-primary" href={mailto(email)}>
          Open in email app
        </a>
        <button
          className="btn-ghost"
          onClick={async () => {
            setCopied(await copyText(`${email.subject}\n\n${email.body}`))
            setTimeout(() => setCopied(false), 2000)
          }}
        >
          {copied ? 'Copied ✓' : 'Copy subject + body'}
        </button>
      </div>
    </div>
  )
}

const Row = ({ k, v }: { k: string; v: ReactNode }) => (
  <div className="flex gap-2">
    <dt className="w-20 shrink-0 text-ink/50">{k}</dt>
    <dd className="min-w-0 break-words">{v}</dd>
  </div>
)

function Check({ checked, onChange, disabled, children }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; children: ReactNode }) {
  return (
    <label className={`flex min-h-10 items-center gap-3 rounded-xl border p-2.5 ${checked ? 'border-court-600 bg-court-50' : 'border-ink/10'} ${disabled ? 'opacity-60' : 'cursor-pointer'}`}>
      <input type="checkbox" className="size-5 accent-court-600" checked={checked} onChange={(e) => onChange(e.target.checked)} disabled={disabled} />
      <span>{children}</span>
    </label>
  )
}
