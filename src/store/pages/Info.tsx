import { useState } from 'react'
import { store, peso } from '../../config/store'
import { faqs } from '../content'
import { Page, Steps } from '../Layout'
import { findLocalOrder, getLocalOrders, saveLocalOrder, statusLabel } from '../lib/order'
import { ORDER_ID_RE } from '../../shared/license'
import { getApp } from '../../shared/apps'
import { href, navigate } from '../router'
import { FaqList } from './Browse'

export function InstallGuide() {
  const [tab, setTab] = useState<'android' | 'ios' | 'desktop'>(() => (/iphone|ipad|ipod/i.test(navigator.userAgent) ? 'ios' : /android/i.test(navigator.userAgent) ? 'android' : 'desktop'))
  const guides = {
    android: {
      label: 'Android (Chrome)',
      steps: [
        'Open the install link from our email in Chrome on your phone.',
        <>Tap <strong>Install</strong> in the app’s top bar, or Chrome’s <strong>⋮ menu → Install app</strong> (some phones say <em>Add to Home screen</em>).</>,
        'Confirm. The app icon appears on your home screen and in your app drawer.',
        'That’s it: the app activated itself when you opened the link. Open it from the icon any time, even offline.',
        'Samsung Internet and Edge work the same way: menu → Add page to → Home screen.',
      ],
    },
    ios: {
      label: 'iPhone / iPad (Safari)',
      steps: [
        <>Open the install link in <strong>Safari</strong> and tap <strong>Copy install link</strong>.</>,
        <>Tap the <strong>Share</strong> button (square with an arrow), scroll, and choose <strong>Add to Home Screen</strong>.</>,
        'Tap Add. Then open the app from your Home Screen - not from Safari.',
        <>In the Home Screen app, tap <strong>Paste install link</strong>. It activates on this iPhone automatically. (Activation happens in the installed app because Safari and Home Screen apps keep separate data.)</>,
        'Open each app at least once a few weeks so iOS keeps its offline data.',
      ],
    },
    desktop: {
      label: 'Desktop (Chrome / Edge)',
      steps: [
        'Open the install link in Chrome or Edge on Windows, Mac, Linux or Chromebook.',
        <>Click the <strong>install icon</strong> at the right of the address bar, or menu → <strong>Install {store.businessName} app</strong> / Apps → Install this site as an app.</>,
        'The app opens in its own window and appears in your Start menu, Dock or launcher.',
        'The app activates itself the first time you open the link. No codes to type.',
        'Firefox and desktop Safari can use the app in a tab but don’t support installing it.',
      ],
    },
  }
  return (
    <Page narrow title="Install guide" intro="Install your app after we email your link. Each purchase activates one device, so install on the phone or computer you’ll use.">
      <div className="flex flex-wrap gap-2" role="tablist">
        {(Object.keys(guides) as (keyof typeof guides)[]).map((k) => (
          <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`min-h-11 rounded-full border px-4 text-sm font-semibold ${tab === k ? 'border-court-600 bg-court-600 text-white' : 'border-ink/15 bg-white'}`}>
            {guides[k].label}
          </button>
        ))}
      </div>
      <div className="card mt-5 p-6">
        <Steps items={guides[tab].steps} />
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="card p-5">
          <h2 className="font-bold">Offline use</h2>
          <p className="mt-2 text-sm text-ink/75">Open the app once while online after installing. After that, core features work without internet.</p>
        </div>
        <div className="card p-5">
          <h2 className="font-bold">Your data</h2>
          <p className="mt-2 text-sm text-ink/75">Records live only on this device. Clearing browser data, uninstalling or changing devices removes them. If you change phones, email us your order ID and we’ll move your purchase.</p>
        </div>
      </div>
    </Page>
  )
}

export function Faq() {
  return (
    <Page narrow title="Frequently asked questions" intro={<>Can’t find your answer? Email <a className="font-semibold text-court-700 underline" href={`mailto:${store.supportEmail}`}>{store.supportEmail}</a>.</>}>
      <FaqList items={faqs} />
    </Page>
  )
}

export function Track({ initialId }: { initialId: string }) {
  const [input, setInput] = useState(initialId)
  const [, force] = useState(0)
  const id = initialId.trim().toUpperCase()
  const valid = ORDER_ID_RE.test(id)
  const order = valid ? findLocalOrder(id) : undefined
  const recent = getLocalOrders()
  const app = order ? getApp(order.slug) : undefined

  const steps: { title: string; body: string; state: 'done' | 'current' | 'todo' }[] = [
    {
      title: 'Payment details submitted',
      body: order ? (order.status === 'not_sent' ? 'Not sent yet - please resubmit from checkout or email us.' : `Sent ${new Date(order.submittedAt).toLocaleString('en-PH')}.`) : 'You submitted your reference number at checkout.',
      state: order?.status === 'not_sent' ? 'current' : 'done',
    },
    { title: 'Payment verification', body: `We match your reference in our GoTyme account, usually within ${store.verificationHours} hours.`, state: order?.received ? 'done' : order?.status === 'not_sent' ? 'todo' : 'current' },
    { title: 'Install link emailed', body: 'Sent once your payment is confirmed. Check spam and Promotions folders.', state: order?.received ? 'done' : 'todo' },
    { title: 'Activate on your phone', body: 'Open the install link on your phone. The app activates itself automatically.', state: order?.received ? 'current' : 'todo' },
  ]

  return (
    <Page narrow title="Track your order" intro="Live status is sent by email - we don’t keep accounts. Enter your order ID to see where it is in the process.">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          navigate(`/track?id=${encodeURIComponent(input.trim().toUpperCase())}`)
        }}
      >
        <label className="sr-only" htmlFor="oid">
          Order ID
        </label>
        <input id="oid" className="input font-mono uppercase" placeholder="PT-SK-261021-7KQ4" value={input} onChange={(e) => setInput(e.target.value)} autoComplete="off" />
        <button className="btn-primary">Track</button>
      </form>
      {id && !valid && (
        <p className="mt-3 text-sm text-red-700" role="alert">
          That doesn’t look like an order ID. It looks like PT-SK-261021-7KQ4 and is on your confirmation page.
        </p>
      )}

      {valid && (
        <section className="card mt-6 p-6" aria-live="polite">
          <p className="font-mono text-sm text-ink/60">{id}</p>
          <h2 className="text-xl font-bold">{app ? app.name : 'Order timeline'}</h2>
          {!order && <p className="mt-2 text-sm text-ink/70">This order isn’t saved on this device (you may have used another phone or browser). The steps below still apply - your email is the source of truth.</p>}
          {order && <p className="mt-1 text-sm text-ink/70">On this device: {order.received ? 'install link received' : statusLabel[order.status]}</p>}
          <ol className="mt-5 space-y-4">
            {steps.map((s) => (
              <li key={s.title} className="flex gap-3">
                <span className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${s.state === 'done' ? 'bg-court-600 text-white' : s.state === 'current' ? 'bg-ball text-ink ring-4 ring-ball/30' : 'bg-ink/10 text-ink/40'}`} aria-label={s.state}>
                  {s.state === 'done' ? '✓' : ''}
                </span>
                <div>
                  <p className={`font-semibold ${s.state === 'todo' ? 'text-ink/50' : ''}`}>{s.title}</p>
                  <p className="text-sm text-ink/65">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-6 flex flex-wrap gap-2">
            {order && !order.received && (
              <button
                className="btn-ghost"
                onClick={() => {
                  saveLocalOrder({ ...order, received: true })
                  force((n) => n + 1)
                }}
              >
                I received my install link
              </button>
            )}
            <a className="btn-ghost" href={`mailto:${store.supportEmail}?subject=${encodeURIComponent(`Order status ${id}`)}&body=${encodeURIComponent(`Order ID: ${id}\n\nHi, could you tell me the status of my order?`)}`}>
              Ask about this order
            </a>
          </div>
        </section>
      )}

      {recent.length > 0 && (
        <section className="mt-8">
          <h2 className="font-bold">Orders on this device</h2>
          <ul className="mt-2 space-y-2">
            {recent.map((o) => (
              <li key={o.orderId}>
                <a className="card flex items-center justify-between gap-3 p-3 hover:border-court-500" href={href(`/track?id=${o.orderId}`)}>
                  <span>
                    <span className="block font-mono text-sm">{o.orderId}</span>
                    <span className="text-sm text-ink/60">{getApp(o.slug)?.name}</span>
                  </span>
                  <span className="text-xs text-ink/60">{o.received ? 'Link received' : o.status === 'not_sent' ? 'Not sent' : 'Pending'}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}
    </Page>
  )
}

export function Privacy() {
  return (
    <Page narrow title="Privacy policy" intro="We collect only what we need to verify your payment and deliver your app.">
      <div className="card space-y-5 p-6 text-ink/80 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-ink">
        <section>
          <h2>What we collect</h2>
          <p>When you submit the payment form: the app you bought, your email, the amount, your transaction reference number and, if you give them, the sender name, payment time, a backup contact and a receipt image. When you activate an app: your order ID, a random code that identifies the app on your phone (not a phone number or hardware ID) and the activation time.</p>
        </section>
        <section>
          <h2>How we use it</h2>
          <p>Only to verify your payment in our GoTyme account, send your install link and activation code, handle support and refunds, and prevent the same reference being used twice. We don’t sell or share it, and we don’t send marketing email.</p>
        </section>
        <section>
          <h2>Where it goes</h2>
          <p>Form submissions are relayed to our inbox by a form-processing service ({store.form.provider === 'formspree' ? 'Formspree' : 'Web3Forms'}). Order records are kept privately by us and never published.</p>
        </section>
        <section>
          <h2>How long we keep it</h2>
          <p>Order records are kept for {store.retentionMonths} months for support, refunds and replacement activations, then deleted.</p>
        </section>
        <section>
          <h2>Data in the apps</h2>
          <p>Scores, match history, tournaments, favourites and settings are stored only in your browser on your device. We can’t see, back up or restore them. Clearing browser data or changing devices removes them.</p>
        </section>
        <section>
          <h2>Your rights</h2>
          <p>Under the Philippine Data Privacy Act of 2012 (RA 10173) you may ask to see, correct or delete your personal data. Email <a className="font-semibold text-court-700 underline" href={`mailto:${store.supportEmail}`}>{store.supportEmail}</a>.</p>
        </section>
      </div>
    </Page>
  )
}

export function Policy() {
  return (
    <Page narrow title="Purchase & refund policy" intro={`Each app costs ${peso(store.price)}, paid once.`}>
      <div className="card space-y-5 p-6 text-ink/80 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-ink">
        <section>
          <h2>Payment & verification</h2>
          <p>Pay by scanning our GoTyme QR Ph code with GCash or a supported bank app, then submit your reference number. We verify every payment by hand, usually within {store.verificationHours} hours. A submitted reference or receipt is not proof of payment until we confirm the money arrived. Transfer fees charged by your payment app are separate; we must receive the full {peso(store.price)}.</p>
        </section>
        <section>
          <h2>Licence: one device per purchase</h2>
          <p>Each purchase is a personal licence to use one app on one device. The app is activated with a code tied to that device and won’t work on others. You may not share, resell or redistribute the app or its activation code. To use an app on another device, purchase it again.</p>
        </section>
        <section>
          <h2>Replacement activations</h2>
          <p>If your phone is lost, replaced or reset, or browser data is cleared, email your order ID and we’ll release the purchase so you can activate it again from your install link. We provide one free move per order; further moves are at our discretion.</p>
        </section>
        <section>
          <h2>Refunds</h2>
          <ul className="list-disc space-y-1 pl-5">
            <li>Duplicate payments and over-payments are refunded in full.</li>
            <li>If we can’t verify and deliver your order within 3 days of a confirmed payment, you may request a full refund.</li>
            <li>If the app doesn’t work on your device and we can’t fix it, we’ll refund you.</li>
            <li>Otherwise, once an app is delivered and activated, purchases are final.</li>
          </ul>
          <p className="mt-2">Refunds are sent to the account the payment came from, within 7 days of approval.</p>
        </section>
        <section>
          <h2>Honest limitations</h2>
          <p>The apps run in your browser without accounts or servers. Activation discourages sharing but, like any web app, isn’t tamper-proof. Your app data stays on your device and isn’t backed up by us. Paddle prices and rules content are kept up to date as best we can; always confirm prices with retailers and defer to the official rulebook.</p>
        </section>
      </div>
    </Page>
  )
}

export function NotFound() {
  return (
    <Page narrow title="Page not found" intro="That page doesn’t exist.">
      <a className="btn-primary" href={href('/')}>
        Go home
      </a>
    </Page>
  )
}
