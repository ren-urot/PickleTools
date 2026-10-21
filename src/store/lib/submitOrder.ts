import { store, type FormProvider } from '../../config/store'
import type { AppMeta } from '../../shared/apps'
import { normalizeReference, type PaymentFormValues } from './paymentForm'

export type SubmitResult = { ok: true } | { ok: false; reason: 'not_configured' | 'network' | 'rejected' | 'timeout'; message: string }

export interface OrderSubmission {
  orderId: string
  app: AppMeta
  values: PaymentFormValues
  receipt?: File | null
}

export function orderSubject(s: Pick<OrderSubmission, 'orderId' | 'app'> & { reference: string }) {
  return `[${store.businessName}] ${s.orderId} · ${s.app.name} · ref ${s.reference}`
}

/** The same key/value lines go to the form service and to the email fallback. */
export function orderFields(s: OrderSubmission): [string, string][] {
  const v = s.values
  return [
    ['Order ID', s.orderId],
    ['App', `${s.app.name} (${s.app.slug})`],
    ['Customer email', v.email.trim()],
    ['Amount paid', `₱${v.amount.replace(/[₱,\s]/g, '')}`],
    ['Reference number', normalizeReference(v.reference)],
    ['Sender name', v.senderName.trim() || '-'],
    ['Payment date/time', v.paidAt ? new Date(v.paidAt).toLocaleString('en-PH') : '-'],
    ['Backup contact', v.contact.trim() || '-'],
    ['Submitted', new Date().toLocaleString('en-PH')],
  ]
}

export function mailtoFallback(s: OrderSubmission) {
  const subject = orderSubject({ ...s, reference: normalizeReference(s.values.reference) })
  const body = [...orderFields(s).map(([k, v]) => `${k}: ${v}`), '', 'I will attach my payment screenshot to this email if available.'].join('\n')
  return `mailto:${store.supportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

const ENDPOINTS: Record<Exclude<FormProvider, 'none'>, (key: string) => string> = {
  web3forms: () => 'https://api.web3forms.com/submit',
  formspree: (id) => `https://formspree.io/f/${encodeURIComponent(id)}`,
}

export async function submitOrder(s: OrderSubmission, fetchImpl: typeof fetch = fetch): Promise<SubmitResult> {
  const { provider, accessKey, receiptUploads, timeoutMs } = store.form
  if (provider === 'none' || !accessKey)
    return { ok: false, reason: 'not_configured', message: 'Online submission isn’t available right now. Please send your details by email instead.' }

  const reference = normalizeReference(s.values.reference)
  const data = new FormData()
  const subject = orderSubject({ ...s, reference })
  if (provider === 'web3forms') {
    data.append('access_key', accessKey)
    data.append('subject', subject)
    data.append('from_name', `${store.businessName} checkout`)
    data.append('replyto', s.values.email.trim())
    data.append('botcheck', '')
  } else {
    data.append('_subject', subject)
    data.append('_replyto', s.values.email.trim())
    data.append('email', s.values.email.trim())
  }
  for (const [k, v] of orderFields(s)) data.append(k, v)
  if (receiptUploads && s.receipt) data.append('attachment', s.receipt, s.receipt.name)

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const res = await fetchImpl(ENDPOINTS[provider](accessKey), { method: 'POST', body: data, headers: { Accept: 'application/json' }, signal: ctrl.signal })
    const json = (await res.json().catch(() => ({}))) as { success?: boolean; ok?: boolean; message?: string }
    if (res.ok && json.success !== false) return { ok: true }
    return { ok: false, reason: 'rejected', message: json.message || `The form service returned an error (${res.status}).` }
  } catch (err) {
    if ((err as Error).name === 'AbortError') return { ok: false, reason: 'timeout', message: 'The connection timed out.' }
    return { ok: false, reason: 'network', message: 'We couldn’t reach the server. Check your internet connection.' }
  } finally {
    clearTimeout(timer)
  }
}
