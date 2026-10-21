import { store } from '../../config/store'

export interface PaymentFormValues {
  email: string
  confirmEmail: string
  amount: string
  reference: string
  senderName: string
  paidAt: string
  contact: string
  consent: boolean
}

export type FieldErrors = Partial<Record<keyof PaymentFormValues | 'receipt', string>>

export const emptyForm = (): PaymentFormValues => ({
  email: '',
  confirmEmail: '',
  amount: String(store.price),
  reference: '',
  senderName: '',
  paidAt: '',
  contact: '',
  consent: false,
})

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

/** Strips spaces and dashes that payment apps insert when displaying reference numbers. */
export const normalizeReference = (s: string) => s.replace(/[\s-]/g, '').toUpperCase()

export const MAX_RECEIPT_BYTES = 5 * 1024 * 1024

export function validatePaymentForm(v: PaymentFormValues, receipt?: File | null, now = Date.now()): FieldErrors {
  const e: FieldErrors = {}
  const email = v.email.trim()
  if (!email) e.email = 'Enter the email where we should send your app.'
  else if (!EMAIL_RE.test(email)) e.email = 'Enter a valid email address, like name@gmail.com.'
  if (!e.email && v.confirmEmail.trim().toLowerCase() !== email.toLowerCase()) e.confirmEmail = 'The emails don’t match. Please check for typos.'

  const amount = Number(v.amount.replace(/[₱,\s]/g, ''))
  if (!v.amount.trim() || !Number.isFinite(amount) || amount <= 0) e.amount = `Enter the amount you paid (${store.price}).`

  const ref = normalizeReference(v.reference)
  if (!ref) e.reference = 'Enter the reference number from your payment receipt.'
  else if (!/^[A-Z0-9]{6,30}$/.test(ref)) e.reference = 'Reference numbers are 6-30 letters or digits. Copy it exactly from your receipt.'

  if (v.paidAt) {
    const t = new Date(v.paidAt).getTime()
    if (Number.isNaN(t)) e.paidAt = 'Enter a valid date and time.'
    else if (t > now + 10 * 60 * 1000) e.paidAt = 'Payment time can’t be in the future.'
  }

  if (receipt) {
    if (!receipt.type.startsWith('image/')) e.receipt = 'Upload a screenshot image (JPG or PNG).'
    else if (receipt.size > MAX_RECEIPT_BYTES) e.receipt = 'The image is larger than 5 MB. Please crop or compress it.'
  }

  if (!v.consent) e.consent = 'Please agree so we can use these details to verify your payment.'
  return e
}

/** True when the amount differs from the price - shown as a warning, not a blocking error. */
export function amountMismatch(v: PaymentFormValues) {
  const amount = Number(v.amount.replace(/[₱,\s]/g, ''))
  return Number.isFinite(amount) && amount > 0 && amount !== store.price
}
