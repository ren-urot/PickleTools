import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { store, peso } from '../../config/store'
import { apps, getApp } from '../../shared/apps'
import { copyText, downloadFile } from '../../shared/download'
import { ORDER_ID_RE } from '../../shared/license'
import { readJSON, useLocalState, writeJSON, removeKey } from '../../shared/storage'
import { adminCall, type Activation } from '../lib/adminApi'
import { allChecked, decodeSubmission, duplicateReferences, isOverdue, newDeskOrder, ordersCSV, parseSubmissionText, withStatus, type DeskOrder } from '../lib/desk'
import { gmailCompose, installEmail, mailto, needsInfoEmail, notFoundEmail, refundEmail, type Email } from '../lib/emails'
import { statusLabel, type OrderStatus } from '../lib/order'
import { normalizeReference } from '../lib/paymentForm'
import { navigate } from '../router'

const PASSWORD_STORE = 'pt:admin:password'

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
  const [password, setPassword] = useState(() => readJSON(PASSWORD_STORE, ''))
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

      <SignIn password={password} setPassword={setPassword} />

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
            <OrderDetail key={current.orderId} o={current} orders={orders} password={password} onChange={update} />
          ) : (
            <div className="card p-8 text-center text-ink/60">
              <p className="font-semibold text-ink">Workflow</p>
              <ol className="mx-auto mt-3 max-w-md list-decimal space-y-1 pl-5 text-left text-sm">
                <li>A submission email arrives. Log it here (status: Verifying).</li>
                <li>Find the payment in GoTyme. Tick the three checks.</li>
                <li>Send the install link email (status: Paid · install link sent).</li>
                <li>The buyer opens the link on their phone and the app activates automatically (status: Activated).</li>
                <li>Use Needs info / Not found / Refund when something doesn’t match.</li>
              </ol>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function SignIn({ password, setPassword }: { password: string; setPassword: (p: string) => void }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  if (password)
    return (
      <p className="mt-4 flex flex-wrap items-center gap-2 text-sm text-ink/60">
        <span className="chip bg-court-100 text-court-800">Signed in</span>
        <button
          className="underline"
          onClick={() => {
            removeKey(PASSWORD_STORE)
            setPassword('')
          }}
        >
          Sign out
        </button>
      </p>
    )

  return (
    <form
      className="card mt-6 flex flex-wrap items-end gap-3 border-2 border-ball p-5"
      onSubmit={async (e) => {
        e.preventDefault()
        setBusy(true)
        const r = await adminCall(value.trim(), { action: 'ping' })
        setBusy(false)
        if (!r.ok) return setError(r.message)
        writeJSON(PASSWORD_STORE, value.trim())
        setPassword(value.trim())
      }}
    >
      <div className="min-w-60 flex-1">
        <label className="label" htmlFor="admin-pw">
          Admin password
        </label>
        <input id="admin-pw" type="password" className="input font-mono" value={value} onChange={(e) => setValue(e.target.value)} autoComplete="current-password" />
        <p className="mt-1 text-xs text-ink/60">Enter it once. This device remembers it until you sign out.</p>
      </div>
      <button className="btn-primary" disabled={busy || !value.trim()}>
        {busy ? 'Checking…' : 'Sign in'}
      </button>
      {error && (
        <p className="w-full text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
    </form>
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

/** An email waiting to be sent; the order only changes once the admin confirms it went out. */
interface Outgoing {
  email: Email
  step: 1
  onSent: (current: DeskOrder) => DeskOrder
}

function OrderDetail({ o, orders, password, onChange }: { o: DeskOrder; orders: DeskOrder[]; password: string; onChange: (o: DeskOrder) => void }) {
  const app = getApp(o.slug)!
  const [outgoing, setOutgoing] = useState<Outgoing | null>(null)
  const [sentNote, setSentNote] = useState('')
  const [installErr, setInstallErr] = useState('')
  const prepare = (next: Outgoing) => {
    setSentNote('')
    setOutgoing(next)
  }
  const [busy, setBusy] = useState(false)
  const dupes = duplicateReferences(orders, o.reference, o.orderId)
  const terminal = o.status === 'rejected' || o.status === 'refunded'

  const check = (k: keyof DeskOrder['checks'], v: boolean) => {
    const next = { ...o, checks: { ...o.checks, [k]: v } }
    onChange(o.status === 'submitted' && v ? withStatus(next, 'verifying', 'Started checking GoTyme') : next)
  }
  const sendInstall = async () => {
    if (!password) return setInstallErr('Sign in with the admin password at the top of the page first.')
    setInstallErr('')
    setBusy(true)
    const r = await adminCall<{ installUrl: string }>(password, { action: 'approve', orderId: o.orderId })
    setBusy(false)
    if (!r.ok) return setInstallErr(r.message)
    prepare({
      email: installEmail(o, app, r.installUrl),
      step: 1,
      onSent: (cur) => withStatus(cur, cur.status === 'activated' ? 'activated' : 'verified', cur.status === 'verified' || cur.status === 'activated' ? 'Install link resent' : 'Approved · install link sent'),
    })
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
          <button className="btn-primary" disabled={!allChecked(o) || terminal || busy} onClick={sendInstall}>
            {busy ? 'Approving…' : o.status === 'verified' || o.status === 'activated' ? 'Resend install link' : 'Approve & send install link'}
          </button>
          <button className="btn-ghost" disabled={terminal} onClick={() => prepare({ email: needsInfoEmail(o, app), step: 1, onSent: (cur) => withStatus(cur, 'needs_info', 'Asked customer for receipt details') })}>
            Needs info
          </button>
          <button className="btn-ghost" disabled={terminal || allChecked(o)} onClick={() => prepare({ email: notFoundEmail(o, app), step: 1, onSent: (cur) => withStatus(cur, 'rejected', 'Payment not found') })}>
            Payment not found
          </button>
          <button className="btn-danger" disabled={o.status === 'refunded'} onClick={() => prepare({ email: refundEmail(o, app, o.amount), step: 1, onSent: (cur) => withStatus(cur, 'refunded', 'Refund email sent') })}>
            Refunded
          </button>
        </div>
        {!allChecked(o) && !terminal && <p className="mt-2 text-xs text-ink/60">Tick all three checks to unlock “Approve & send install link”.</p>}
        {installErr && (
          <p className="mt-2 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-800" role="alert">
            {installErr}
          </p>
        )}
      </div>

      {outgoing?.step === 1 && <EmailPreview email={outgoing.email} onCancel={() => setOutgoing(null)} onSent={() => { onChange(outgoing.onSent(o)); setOutgoing(null); setSentNote(`Marked as sent: “${outgoing.email.subject}”.`) }} />}
      {sentNote && (
        <p className="rounded-xl bg-court-50 p-3 text-sm font-semibold text-court-800" role="status">
          ✓ {sentNote}
        </p>
      )}

      {(o.status === 'verified' || o.status === 'activated') && <ActivationPanel o={o} password={password} onChange={onChange} />}

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

/** Activation happens on the buyer's phone; this shows which phone and lets you move it. */
function ActivationPanel({ o, password, onChange }: { o: DeskOrder; password: string; onChange: (o: DeskOrder) => void }) {
  const [activation, setActivation] = useState<Activation | null | undefined>(undefined)
  const [error, setError] = useState('')
  const [confirmReset, setConfirmReset] = useState(false)
  const [releasing, setReleasing] = useState(false)

  const refresh = async () => {
    setError('')
    const r = await adminCall<{ activation: Activation | null }>(password, { action: 'status', orderId: o.orderId })
    if (!r.ok) return setError(r.message)
    setActivation(r.activation)
    if (r.activation && o.status !== 'activated') onChange(withStatus(o, 'activated', `Activated on phone ${r.activation.device}`))
  }

  useEffect(() => {
    if (password) refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [o.orderId, password])

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-bold">2 · Activation</h3>
        <button className="text-sm font-semibold text-court-700 hover:underline" onClick={refresh}>
          ↻ Refresh
        </button>
      </div>
      {activation === undefined && !error && <p className="mt-2 text-sm text-ink/60">Checking…</p>}
      {activation === null && (
        <p className="mt-2 text-sm text-ink/70">
          <strong>Waiting for the buyer.</strong> The app activates automatically on the first phone that opens the install link. Nothing to do here.
        </p>
      )}
      {activation && (
        <div className="mt-2 space-y-3 text-sm">
          <p className="rounded-xl bg-court-50 p-3 text-court-900">
            ✓ <strong>Activated</strong> on phone <span className="font-mono">{activation.device}</span> · {new Date(activation.at).toLocaleString('en-PH')}
          </p>
          {confirmReset ? (
            <div className="flex flex-wrap items-center gap-2 rounded-xl bg-amber-50 p-3">
              <span className="flex-1 text-amber-900">Free this purchase so the buyer can activate on a new phone?</span>
              <button
                className="btn-primary min-h-10"
                disabled={releasing}
                onClick={async () => {
                  setReleasing(true)
                  const r = await adminCall(password, { action: 'reset', orderId: o.orderId })
                  setReleasing(false)
                  if (!r.ok) return setError(r.message)
                  setConfirmReset(false)
                  setActivation(null)
                  onChange(withStatus(o, 'verified', `Phone ${activation.device} released for a new phone`))
                }}
              >
                {releasing ? 'Releasing…' : 'Yes, allow a new phone'}
              </button>
              <button className="btn-ghost min-h-10" onClick={() => setConfirmReset(false)}>
                Cancel
              </button>
            </div>
          ) : (
            <button className="btn-ghost" onClick={() => setConfirmReset(true)}>
              Buyer changed phones
            </button>
          )}
        </div>
      )}
      {error && (
        <p className="mt-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}

function EmailPreview({ email, onSent, onCancel }: { email: Email; onSent: () => void; onCancel: () => void }) {
  const [copied, setCopied] = useState(false)
  const [opened, setOpened] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [])

  return (
    <div ref={ref} className="card border-2 border-court-600 p-5" role="region" aria-label="Email to send">
      <h3 className="text-lg font-bold">Send this email</h3>
      <ol className="mt-1 list-decimal pl-5 text-sm text-ink/70">
        <li>Click <strong>Send with Gmail</strong>. Gmail opens in a new tab with everything filled in.</li>
        <li>Press <strong>Send</strong> in Gmail.</li>
        <li>Come back here and click <strong>Yes, I sent it</strong>.</li>
      </ol>
      <p className="mt-3 text-sm">
        <strong>To:</strong> {email.to}
        <br />
        <strong>Subject:</strong> {email.subject}
      </p>
      <details className="mt-2 text-sm">
        <summary className="cursor-pointer text-ink/60">Show message</summary>
        <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-xl bg-paper p-3 font-sans">{email.body}</pre>
      </details>
      <div className="mt-4 flex flex-wrap gap-2">
        <a className="btn-primary" href={gmailCompose(email)} target="_blank" rel="noopener" onClick={() => setOpened(true)}>
          Send with Gmail ↗
        </a>
        <a className="btn-ghost" href={mailto(email)} onClick={() => setOpened(true)}>
          Use my email app
        </a>
        <button
          className="btn-ghost"
          onClick={async () => {
            setCopied(await copyText(`To: ${email.to}\nSubject: ${email.subject}\n\n${email.body}`))
            setOpened(true)
            setTimeout(() => setCopied(false), 2000)
          }}
        >
          {copied ? 'Copied ✓' : 'Copy'}
        </button>
      </div>
      <div className={`mt-4 flex flex-wrap items-center gap-2 rounded-xl p-3 ${opened ? 'bg-amber-50' : 'bg-ink/5'}`}>
        <span className="flex-1 text-sm font-semibold">{opened ? 'Did the email go out?' : 'Nothing is marked as sent until you confirm.'}</span>
        <button className="btn-primary min-h-10" onClick={onSent}>
          Yes, I sent it
        </button>
        <button className="btn-ghost min-h-10" onClick={onCancel}>
          Cancel
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
