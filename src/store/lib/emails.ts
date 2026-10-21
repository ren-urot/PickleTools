import { store, peso } from '../../config/store'
import type { AppMeta } from '../../shared/apps'

export interface Email {
  to: string
  subject: string
  body: string
}

const sign = `\n\nThank you,\n${store.businessName}\n${store.supportEmail}`

export function installEmail(o: { orderId: string; email: string }, app: AppMeta, url: string): Email {
  return {
    to: o.email,
    subject: `Your ${app.name} is ready · ${o.orderId}`,
    body: `Hi!

We've confirmed your ${peso(store.price)} payment for ${app.name}. Thank you!

1) On the phone you'll use, open this link:
${url}

   The app activates automatically on that phone. That's it!

2) Add it to your home screen so it works offline:
   • Android (Chrome): tap Install, or ⋮ menu → Install app.
   • iPhone/iPad (Safari): tap "Copy install link", then Share → Add to Home Screen.
     Open the app from your Home Screen and tap "Paste install link".

Your purchase works on one phone. If you forward this link, it won't work on anyone else's phone.

Order ID: ${o.orderId}${sign}`,
  }
}

export function needsInfoEmail(o: { orderId: string; email: string; reference: string }, app: AppMeta): Email {
  return {
    to: o.email,
    subject: `We need a bit more info · ${o.orderId}`,
    body: `Hi!

We couldn't match your ${app.name} payment yet (reference ${o.reference}).

Could you reply with:
  • a screenshot of your payment receipt, and
  • the sender name and the date/time of the payment?

We'll finish verifying as soon as we hear from you. (We'll never ask for your PIN, OTP or password.)

Order ID: ${o.orderId}${sign}`,
  }
}

export function notFoundEmail(o: { orderId: string; email: string; reference: string }, app: AppMeta): Email {
  return {
    to: o.email,
    subject: `Payment not found · ${o.orderId}`,
    body: `Hi,

We're sorry - we couldn't find a ${peso(store.price)} payment matching reference ${o.reference} for ${app.name} in our GoTyme account.

If you did pay, please reply with your receipt screenshot and we'll check again. If the payment didn't go through, you can place a new order any time.

Order ID: ${o.orderId}${sign}`,
  }
}

export function refundEmail(o: { orderId: string; email: string }, app: AppMeta, amount: number): Email {
  return {
    to: o.email,
    subject: `Refund sent · ${o.orderId}`,
    body: `Hi,

We've refunded ${peso(amount)} for ${app.name} to the account the payment came from. Depending on your bank or e-wallet, it may take a few days to appear.

Order ID: ${o.orderId}${sign}`,
  }
}

export const mailto = (e: Email) => `mailto:${encodeURIComponent(e.to)}?subject=${encodeURIComponent(e.subject)}&body=${encodeURIComponent(e.body)}`

/**
 * Gmail's web compose window, pre-filled. Works without a desktop email program, and
 * `authuser` picks the support mailbox when several Google accounts are signed in.
 */
export const gmailCompose = (e: Email, from = store.supportEmail) =>
  `https://mail.google.com/mail/?view=cm&fs=1&authuser=${encodeURIComponent(from)}&to=${encodeURIComponent(e.to)}&su=${encodeURIComponent(e.subject)}&body=${encodeURIComponent(e.body)}`
