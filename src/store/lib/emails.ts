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

2) Install it:
   • Android (Chrome): tap Install, or ⋮ menu → Install app / Add to Home screen.
   • iPhone/iPad (Safari): Share → Add to Home Screen, then open it from your Home Screen.

3) Open the installed app. It shows a DEVICE CODE (like AB12-CD34-EF56).
   Reply to this email with that code (or use the "Email activation request" button in the app).

4) We'll reply with your activation code. Paste it into the app and you're set.

Your purchase activates one device. Please don't share this link - it won't work without an activation code for your device.

Order ID: ${o.orderId}${sign}`,
  }
}

export function activationEmail(o: { orderId: string; email: string }, app: AppMeta, device: string, code: string, url: string): Email {
  return {
    to: o.email,
    subject: `Activation code for ${app.name} · ${o.orderId}`,
    body: `Hi!

Here is your activation code for ${app.name} on device ${device}:

${code}

Open the installed app, paste the whole code above into "Enter your activation code", and tap Activate.

On Android or a computer you can also just open this link on the same device:
${url}#activate=${code}

This code only works on the device with code ${device}. If you change phones or clear your browser data, email us your order ID and the new device code.

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
