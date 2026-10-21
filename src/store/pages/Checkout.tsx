import { useEffect, useRef, useState, type ReactNode } from 'react'
import { store, peso } from '../../config/store'
import { AppIcon } from '../../shared/AppIcon'
import type { AppMeta, AppSlug } from '../../shared/apps'
import { copyText } from '../../shared/download'
import { checkoutSteps } from '../content'
import { Steps } from '../Layout'
import { checkoutOrderId, clearCheckoutOrderId, findLocalOrder, saveLocalOrder } from '../lib/order'
import { amountMismatch, emptyForm, normalizeReference, validatePaymentForm, type FieldErrors, type PaymentFormValues } from '../lib/paymentForm'
import { mailtoFallback, submitOrder, type SubmitResult } from '../lib/submitOrder'
import { href, navigate } from '../router'

/** The exact confirmation text required by the PRD (§6.4). */
export const SUBMITTED_MESSAGE = `Your payment details have been submitted for verification. Once your ${peso(store.price)} payment is confirmed, we will send your app installation instructions to your email.`

const qrUrl = store.qrImage ? `${import.meta.env.BASE_URL}${store.qrImage}` : null

export function Checkout({ app }: { app: AppMeta }) {
  const [orderId] = useState(() => checkoutOrderId(app.slug, app.code))
  const [method, setMethod] = useState<'gcash' | 'bank'>('gcash')

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:py-12">
      <a className="text-sm font-semibold text-court-700 hover:underline" href={href(`/apps/${app.slug}`)}>
        ‹ Back to {app.name}
      </a>
      <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Checkout</h1>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          {/* 1. Selected app summary + 2. amount */}
          <section className="card flex items-center gap-4 p-5" aria-label="Order summary">
            <AppIcon glyph={app.glyph} color={app.color} size={56} />
            <div className="min-w-0 flex-1">
              <p className="font-bold">{app.name}</p>
              <p className="text-sm text-ink/60">One-time purchase · 1 device</p>
              <p className="mt-1 font-mono text-xs text-ink/50">Order {orderId}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold uppercase text-ink/50">Amount due</p>
              <p className="text-3xl font-black tabular-nums">{peso(store.price)}</p>
            </div>
          </section>

          {/* 3. GoTyme QR */}
          <section className="card p-5" aria-labelledby="qr-h">
            <h2 id="qr-h" className="text-xl font-bold">
              Scan to pay {peso(store.price)}.00
            </h2>
            {qrUrl ? (
              <div className="mt-4 text-center">
                <img src={qrUrl} alt={`GoTyme QR Ph code to pay ${store.businessName}`} className="mx-auto aspect-square w-64 max-w-full rounded-xl border border-ink/10 bg-white p-2" />
                <dl className="mx-auto mt-4 max-w-xs space-y-1 text-left text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-ink/60">Via</dt>
                    <dd className="font-semibold">GoTyme Bank (QR Ph)</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-ink/60">Amount</dt>
                    <dd className="font-bold tabular-nums">{peso(store.price)}.00</dd>
                  </div>
                </dl>
                <a className="btn-ghost mt-4 text-sm" href={qrUrl} download="PickleTools-GoTyme-QR.png">
                  Save QR image
                </a>
                <p className="mt-2 text-xs text-ink/60">Paying on this phone? Save the QR, then use “Upload QR” / “Scan from gallery” in GCash or your bank app.</p>
              </div>
            ) : (
              <div className="mt-4 rounded-xl border-2 border-red-300 bg-red-50 p-4 text-red-900" role="alert">
                <p className="font-bold">Payments are not open yet - please don’t send money.</p>
                <p className="mt-1 text-sm">Our payment QR code hasn’t been set up. Contact {store.supportEmail} if you’d like to be told when it’s ready.</p>
              </div>
            )}
          </section>

          {/* 4. Instructions for GCash and bank payment */}
          <section className="card p-5" aria-labelledby="how-h">
            <h2 id="how-h" className="text-xl font-bold">
              How to pay
            </h2>
            <div className="mt-3 flex rounded-xl bg-ink/5 p-1" role="tablist">
              {(
                [
                  ['gcash', 'GCash'],
                  ['bank', 'Bank app'],
                ] as const
              ).map(([m, label]) => (
                <button key={m} role="tab" aria-selected={method === m} onClick={() => setMethod(m)} className={`min-h-10 flex-1 rounded-lg text-sm font-semibold ${method === m ? 'bg-white text-court-700 shadow' : 'text-ink/70'}`}>
                  {label}
                </button>
              ))}
            </div>
            <ol className="mt-4 list-decimal space-y-1.5 pl-5 text-sm text-ink/80">
              {method === 'gcash' ? (
                <>
                  <li>Open GCash and tap <strong>QR</strong>.</li>
                  <li>Scan the code above, or tap <strong>Upload QR</strong> and choose the saved image.</li>
                  <li>Check the amount shows <strong>{peso(store.price)}.00</strong> (it fills in automatically), then tap Pay.</li>
                  <li>Copy the <strong>Ref. No.</strong> from the receipt.</li>
                </>
              ) : (
                <>
                  <li>Open your bank app and choose <strong>Scan to Pay</strong> / <strong>QR Ph</strong>.</li>
                  <li>Scan the code above or upload the saved image.</li>
                  <li>Check the amount shows <strong>{peso(store.price)}.00</strong> (it fills in automatically) and confirm. Any InstaPay fee is charged separately by your bank.</li>
                  <li>Copy the <strong>reference / trace number</strong> from the confirmation screen.</li>
                </>
              )}
            </ol>
            <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
              🔒 We will <strong>never</strong> ask for your PIN, OTP or password. Only enter those inside your own payment app.
            </p>
          </section>

          <details className="card p-5">
            <summary className="cursor-pointer font-bold">All checkout steps</summary>
            <div className="mt-4 text-sm">
              <Steps items={checkoutSteps} />
            </div>
          </details>
        </div>

        {/* 5. Payment confirmation form + 6. pending notice */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <PaymentForm app={app} orderId={orderId} disabled={!qrUrl} />
        </div>
      </div>
    </div>
  )
}

function PaymentForm({ app, orderId, disabled }: { app: AppMeta; orderId: string; disabled: boolean }) {
  const [v, setV] = useState<PaymentFormValues>(emptyForm)
  const [receipt, setReceipt] = useState<File | null>(null)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [touched, setTouched] = useState<Partial<Record<keyof FieldErrors, boolean>>>({})
  const [sending, setSending] = useState(false)
  const [failure, setFailure] = useState<Extract<SubmitResult, { ok: false }> | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const set = <K extends keyof PaymentFormValues>(k: K, val: PaymentFormValues[K]) => setV((p) => ({ ...p, [k]: val }))

  // Re-validate touched fields as the customer types, so messages clear as soon as they're fixed.
  useEffect(() => {
    setErrors(validatePaymentForm(v, receipt))
  }, [v, receipt])

  const show = (k: keyof FieldErrors) => (touched[k] ? errors[k] : undefined)
  const blur = (k: keyof FieldErrors) => () => setTouched((t) => ({ ...t, [k]: true }))

  const record = (status: 'submitted' | 'not_sent') =>
    saveLocalOrder({
      orderId,
      slug: app.slug as AppSlug,
      email: v.email.trim(),
      reference: normalizeReference(v.reference),
      amount: Number(v.amount.replace(/[₱,\s]/g, '')),
      submittedAt: Date.now(),
      status,
    })

  const finish = () => {
    clearCheckoutOrderId(app.slug)
    navigate(`/confirmation/${orderId}`)
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (sending) return
    const errs = validatePaymentForm(v, receipt)
    setErrors(errs)
    setTouched({ email: true, confirmEmail: true, amount: true, reference: true, paidAt: true, consent: true, receipt: true })
    const first = Object.keys(errs)[0]
    if (first) {
      formRef.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus()
      return
    }
    setSending(true)
    setFailure(null)
    const result = await submitOrder({ orderId, app, values: v, receipt })
    setSending(false)
    if (result.ok) {
      record('submitted')
      finish()
    } else {
      record('not_sent')
      setFailure(result)
    }
  }

  return (
    <form ref={formRef} noValidate onSubmit={onSubmit} className="card space-y-4 p-5" aria-labelledby="form-h">
      <div>
        <h2 id="form-h" className="text-xl font-bold">
          Submit your payment details
        </h2>
        <p className="mt-1 text-sm text-ink/70">After paying, send us your reference number so we can match your payment.</p>
      </div>

      <Field label="App purchased" htmlFor="app">
        <input id="app" className="input bg-ink/5" value={`${app.name} - ${peso(store.price)}`} readOnly />
      </Field>

      <Field label="Email address" htmlFor="email" error={show('email')} hint="We’ll send your install link and activation code here.">
        <input id="email" name="email" type="email" inputMode="email" autoComplete="email" className="input" value={v.email} onChange={(e) => set('email', e.target.value)} onBlur={blur('email')} aria-invalid={!!show('email')} aria-describedby="email-msg" disabled={disabled} />
      </Field>

      <Field label="Confirm email address" htmlFor="confirmEmail" error={show('confirmEmail')}>
        <input id="confirmEmail" name="confirmEmail" type="email" inputMode="email" autoComplete="email" className="input" value={v.confirmEmail} onChange={(e) => set('confirmEmail', e.target.value)} onBlur={blur('confirmEmail')} aria-invalid={!!show('confirmEmail')} aria-describedby="confirmEmail-msg" disabled={disabled} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Amount paid (₱)" htmlFor="amount" error={show('amount')} warning={amountMismatch(v) ? `The price is ${peso(store.price)}. If you sent a different amount, submit anyway and we’ll contact you.` : undefined}>
          <input id="amount" name="amount" inputMode="decimal" className="input tabular-nums" value={v.amount} onChange={(e) => set('amount', e.target.value)} onBlur={blur('amount')} aria-invalid={!!show('amount')} aria-describedby="amount-msg" disabled={disabled} />
        </Field>
        <Field label="Reference number" htmlFor="reference" error={show('reference')} hint="From your GCash or bank receipt.">
          <input id="reference" name="reference" autoComplete="off" autoCapitalize="characters" spellCheck={false} className="input font-mono" value={v.reference} onChange={(e) => set('reference', e.target.value)} onBlur={blur('reference')} aria-invalid={!!show('reference')} aria-describedby="reference-msg" disabled={disabled} />
        </Field>
      </div>

      <details className="rounded-xl border border-ink/10 p-3" open={!!(v.senderName || v.paidAt || v.contact)}>
        <summary className="cursor-pointer text-sm font-semibold">Optional details that help us find your payment faster</summary>
        <div className="mt-3 space-y-4">
          <Field label="Sender name (as shown in your payment app)" htmlFor="senderName">
            <input id="senderName" name="senderName" autoComplete="name" className="input" value={v.senderName} onChange={(e) => set('senderName', e.target.value)} disabled={disabled} />
          </Field>
          <Field label="Payment date and time" htmlFor="paidAt" error={show('paidAt')}>
            <input id="paidAt" name="paidAt" type="datetime-local" className="input" value={v.paidAt} onChange={(e) => set('paidAt', e.target.value)} onBlur={blur('paidAt')} aria-describedby="paidAt-msg" disabled={disabled} />
          </Field>
          <Field label="Backup contact (mobile or Messenger)" htmlFor="contact" hint="Only used if your email bounces.">
            <input id="contact" name="contact" autoComplete="tel" className="input" value={v.contact} onChange={(e) => set('contact', e.target.value)} disabled={disabled} />
          </Field>
          {store.form.receiptUploads ? (
            <Field label="Receipt screenshot" htmlFor="receipt" error={show('receipt')} hint="JPG or PNG, up to 5 MB.">
              <input id="receipt" name="receipt" type="file" accept="image/*" className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-court-50 file:px-3 file:py-2 file:font-semibold file:text-court-700" onChange={(e) => { setReceipt(e.target.files?.[0] ?? null); setTouched((t) => ({ ...t, receipt: true })) }} aria-describedby="receipt-msg" disabled={disabled} />
            </Field>
          ) : (
            <p className="text-sm text-ink/60">Keep your receipt screenshot. If we can’t match your payment, we’ll ask you to reply with it.</p>
          )}
        </div>
      </details>

      <label className="flex gap-3 text-sm">
        <input name="consent" type="checkbox" className="mt-0.5 size-5 shrink-0 accent-court-600" checked={v.consent} onChange={(e) => set('consent', e.target.checked)} onBlur={blur('consent')} aria-invalid={!!show('consent')} aria-describedby="consent-msg" disabled={disabled} />
        <span>
          I agree that {store.businessName} may use these details to verify my payment and deliver my app, as described in the{' '}
          <a className="font-semibold text-court-700 underline" href={href('/privacy')} target="_blank" rel="noopener">privacy policy</a>.
        </span>
      </label>
      <p id="consent-msg" className="-mt-2 text-sm text-red-700" role={show('consent') ? 'alert' : undefined}>
        {show('consent')}
      </p>

      {failure && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900" role="alert">
          <p className="font-bold">Your details were not sent.</p>
          <p className="mt-1">{failure.message} Your order ID <strong className="font-mono">{orderId}</strong> is saved - nothing is lost.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {failure.reason !== 'not_configured' && (
              <button type="submit" className="btn-primary min-h-10 text-sm">
                Try again
              </button>
            )}
            <a className="btn-ghost min-h-10 text-sm" href={mailtoFallback({ orderId, app, values: v, receipt })}>
              Send by email instead
            </a>
            <button type="button" className="btn-ghost min-h-10 text-sm" onClick={() => { record('submitted'); finish() }}>
              I’ve sent the email
            </button>
          </div>
        </div>
      )}

      <button type="submit" className="btn-primary w-full py-3.5 text-lg" disabled={disabled || sending} aria-busy={sending}>
        {sending ? 'Submitting…' : 'Submit for verification'}
      </button>

      <p className="rounded-xl bg-court-50 p-3 text-sm text-court-900">
        <strong>Pending verification:</strong> submitting this form does not confirm your payment. We check every payment in our GoTyme account by hand (usually within {store.verificationHours} hours) before sending your install link.
      </p>
      <p className="text-center text-xs text-ink/60">
        Questions? <a className="underline" href={`mailto:${store.supportEmail}`}>{store.supportEmail}</a> · <a className="underline" href={href('/faq')}>FAQ</a>
      </p>
    </form>
  )
}

function Field({ label, htmlFor, error, warning, hint, children }: { label: string; htmlFor: string; error?: string; warning?: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label className="label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      <p id={`${htmlFor}-msg`} className={`mt-1 text-sm ${error ? 'text-red-700' : warning ? 'text-amber-800' : 'text-ink/55'}`} role={error ? 'alert' : undefined}>
        {error ?? warning ?? hint}
      </p>
    </div>
  )
}

export function Confirmation({ orderId }: { orderId: string }) {
  const order = findLocalOrder(orderId)
  const [copied, setCopied] = useState(false)
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:py-16">
      <div className="card p-6 sm:p-8">
        <p className="chip bg-amber-100 text-amber-900">Pending verification</p>
        <h1 className="mt-3 text-3xl font-black tracking-tight">Details received</h1>
        <p className="mt-3 text-lg text-ink/80">{SUBMITTED_MESSAGE}</p>

        <div className="mt-6 rounded-2xl bg-court-50 p-4">
          <p className="text-sm font-semibold text-court-800">Your order ID - keep it for tracking and support</p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <code className="text-2xl font-black tracking-wide text-court-900">{orderId}</code>
            <button
              className="btn-ghost min-h-9 px-3 text-sm"
              onClick={async () => {
                setCopied(await copyText(orderId))
                setTimeout(() => setCopied(false), 2000)
              }}
            >
              {copied ? 'Copied ✓' : 'Copy'}
            </button>
          </div>
          {order && (
            <p className="mt-2 text-sm text-court-900">
              Reference <span className="font-mono">{order.reference}</span> · we’ll email <strong>{order.email}</strong>
            </p>
          )}
        </div>

        <h2 className="mt-8 text-lg font-bold">What happens next</h2>
        <div className="mt-3 text-ink/80">
          <Steps
            items={[
              <>We match your reference in our GoTyme account (usually within {store.verificationHours} hours).</>,
              'We email your install link. Check your spam or Promotions folder too.',
              'Install the app on your phone and open it - it shows a device code.',
              'Send us that device code; we reply with your activation code. Paste it in and you’re done.',
            ]}
          />
        </div>

        <div className="mt-8 flex flex-wrap gap-2">
          <a className="btn-primary" href={href(`/track?id=${orderId}`)}>
            Track this order
          </a>
          <a className="btn-ghost" href={href('/install')}>
            Read the install guide
          </a>
        </div>
        <p className="mt-6 text-sm text-ink/60">
          Haven’t heard from us after {store.verificationHours} hours? Email <a className="underline" href={`mailto:${store.supportEmail}?subject=${encodeURIComponent(`Order ${orderId}`)}`}>{store.supportEmail}</a> with your order ID.
        </p>
      </div>
    </div>
  )
}
