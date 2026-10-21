import type { ReactNode } from 'react'
import { store, peso } from '../config/store'
import { href } from './router'

const P = peso(store.price)
const H = store.verificationHours

/** The PRD's seven checkout steps, plus device activation. */
export const checkoutSteps: ReactNode[] = [
  'Choose the app you want to buy.',
  <>Confirm the amount due is <strong>{P}</strong>.</>,
  'Scan the GoTyme QR code with GCash or a supported bank app.',
  <>Check that the amount is <strong>{P}.00</strong> in your payment app.</>,
  'Complete the payment and keep the receipt screen open.',
  'Submit your transaction reference number using the form below.',
  <>Wait for us to verify your payment (usually within {H} hours). We’ll email your install link.</>,
  'Install the app, then activate it on your phone with the code we send.',
]

export const howItWorks: { title: string; body: string }[] = [
  { title: 'Pick an app', body: `Each tool is a separate ${P} one-time purchase. No subscription, no account.` },
  { title: 'Pay by QR', body: 'Scan our GoTyme QR with GCash or your bank app and pay the exact amount.' },
  { title: 'Send your reference', body: 'Submit the transaction reference so we can match your payment.' },
  { title: 'Install & activate', body: `Once verified (within ${H} hours), we email your install link and activate the app on your phone.` },
]

export const faqs: { id: string; q: string; a: ReactNode }[] = [
  {
    id: 'gotyme',
    q: 'How do I pay using the GoTyme QR code?',
    a: (
      <>
        On the checkout page, open your payment app’s <em>Scan QR</em> feature and scan our GoTyme QR. The amount <strong>{P}.00</strong> fills in automatically - check it, then confirm. Then submit
        your reference number on the same page.
      </>
    ),
  },
  {
    id: 'gcash',
    q: 'How do I pay using GCash?',
    a: (
      <>
        Open GCash → <strong>QR</strong> → scan our code (or <em>Upload QR</em> if you saved a screenshot). Check the amount shows {P}.00 (it fills in automatically) and pay. Copy the reference number from the receipt.
      </>
    ),
  },
  {
    id: 'bank',
    q: 'Can I pay through my bank app?',
    a: 'Yes, if your bank app can scan QR Ph codes (most Philippine banks and e-wallets can). Use its Scan to Pay / QR Ph option, check the amount shows ₱100.00, and confirm. Some banks charge a small InstaPay fee - that fee is separate; we need to receive the full ₱100.',
  },
  {
    id: 'fees',
    q: 'Who pays transfer fees?',
    a: `Any fee your payment app charges is separate from the price. Please make sure the amount you send is ${P}.00 so we receive the full amount.`,
  },
  {
    id: 'verify-time',
    q: 'How long does payment verification take?',
    a: `We check payments by hand in our GoTyme account, usually within ${H} hours. Submitting your reference doesn’t mean the payment is confirmed yet - you’ll get an email once it is.`,
  },
  {
    id: 'install',
    q: 'How do I install the app?',
    a: (
      <>
        Open the install link from our email on your phone. On Android, tap <strong>Install</strong> (or ⋮ → Add to Home screen). On iPhone, open the link in Safari and choose Share → Add to Home Screen.
        See the <a className="font-semibold text-court-700 underline" href={href('/install')}>install guide</a>.
      </>
    ),
  },
  {
    id: 'one-device',
    q: 'Can I use the app on more than one phone, or share it?',
    a: 'Each purchase activates one device. When you first open the app it shows a device code; we send an activation code that works only on that device. A shared link opens to the activation screen, and the code won’t work on another phone. To use an app on a second device, buy it again.',
  },
  {
    id: 'new-phone',
    q: 'I changed phones or cleared my browser data. What now?',
    a: 'Your device code changes when browser data is cleared or you switch phones. Email us your order ID and the new device code and we’ll send a replacement activation (one free replacement per order for lost, broken or reset devices).',
  },
  {
    id: 'offline',
    q: 'Do the apps work offline?',
    a: 'Yes. After you install and open an app once with internet, its core features work offline. Paddle Finder’s retailer links need a connection.',
  },
  {
    id: 'data',
    q: 'Where is my data stored?',
    a: 'Match history, tournaments, favourites and settings are saved only on your device. We never see them. Clearing browser data, uninstalling, or changing devices removes them - use the export buttons in Match Tracker and Tournament to keep a backup.',
  },
  {
    id: 'refund',
    q: 'What is your refund policy?',
    a: (
      <>
        We refund duplicate or over-payments, and any order we can’t deliver within 3 days. Read the full <a className="font-semibold text-court-700 underline" href={href('/policy')}>purchase & refund policy</a>.
      </>
    ),
  },
  {
    id: 'pin',
    q: 'Will you ever ask for my PIN, OTP or password?',
    a: 'Never. We only need your email and transaction reference number. Anyone asking for your PIN, OTP or password is not us.',
  },
]
