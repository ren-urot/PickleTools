import { toCSV } from '../../shared/download'
import { apps, type AppSlug } from '../../shared/apps'
import type { OrderStatus } from './order'

export interface Activation {
  device: string
  code: string
  issuedAt: number
  replacement: boolean
}

export interface DeskOrder {
  orderId: string
  slug: AppSlug
  email: string
  reference: string
  amount: number
  senderName: string
  paidAt: string
  notes: string
  status: OrderStatus
  checks: { amount: boolean; reference: boolean; unique: boolean }
  activations: Activation[]
  history: { at: number; status: OrderStatus; note?: string }[]
  createdAt: number
}

export const allChecked = (o: DeskOrder) => o.checks.amount && o.checks.reference && o.checks.unique

/** Other orders that already used this reference - one reference can only pay for one order. */
export function duplicateReferences(orders: DeskOrder[], reference: string, exceptOrderId?: string) {
  const ref = reference.replace(/[\s-]/g, '').toUpperCase()
  return orders.filter((o) => o.orderId !== exceptOrderId && o.reference === ref && o.status !== 'rejected')
}

/** Orders still waiting on us past the promised verification time. */
export function isOverdue(o: DeskOrder, hours: number, now = Date.now()) {
  return (o.status === 'submitted' || o.status === 'verifying') && now - o.createdAt > hours * 3600 * 1000
}

/** Whether issuing to `device` needs the replacement flag (order already activated on another device). */
export function needsReplacement(o: DeskOrder, device: string) {
  return o.activations.length > 0 && !o.activations.some((a) => a.device === device)
}

export function withStatus(o: DeskOrder, status: OrderStatus, note?: string): DeskOrder {
  return { ...o, status, history: [...o.history, { at: Date.now(), status, note }] }
}

export function ordersCSV(orders: DeskOrder[]) {
  const header = ['Order ID', 'App', 'Status', 'Email', 'Reference', 'Amount', 'Sender', 'Paid at', 'Logged', 'Devices', 'Replacements', 'Notes']
  const rows = orders.map((o) => [
    o.orderId,
    o.slug,
    o.status,
    o.email,
    o.reference,
    o.amount,
    o.senderName,
    o.paidAt,
    new Date(o.createdAt).toISOString(),
    o.activations.map((a) => a.device).join(' '),
    o.activations.filter((a) => a.replacement).length,
    o.notes,
  ])
  return toCSV([header, ...rows])
}

/** The submission fields the desk needs to log an order. */
export interface Submission {
  orderId: string
  email: string
  reference: string
  amount: string
  senderName: string
  paidAt: string
  contact: string
}

const IMPORT_KEYS: [keyof Submission, string][] = [
  ['orderId', 'o'],
  ['email', 'e'],
  ['reference', 'r'],
  ['amount', 'm'],
  ['senderName', 's'],
  ['paidAt', 'p'],
  ['contact', 'c'],
]

/** Compact, URL-safe payload for the "Open in Order desk" link in each submission email. */
export function encodeSubmission(s: Submission): string {
  const compact = Object.fromEntries(IMPORT_KEYS.filter(([k]) => s[k]).map(([k, short]) => [short, s[k]]))
  const bytes = new TextEncoder().encode(JSON.stringify(compact))
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function decodeSubmission(encoded: string): Submission | null {
  try {
    const bin = atob(encoded.replace(/-/g, '+').replace(/_/g, '/'))
    const compact = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)))) as Record<string, unknown>
    const s = Object.fromEntries(IMPORT_KEYS.map(([k, short]) => [k, typeof compact[short] === 'string' ? (compact[short] as string).slice(0, 200) : ''])) as unknown as Submission
    return s.orderId ? s : null
  } catch {
    return null
  }
}

const EMAIL_RE = /[^\s@<>()"',;:]+@[^\s@<>()"',;:]+\.[a-z]{2,}/i

/** Text after a field label, on the same line ("Label: value") or the next non-empty line (email tables). */
function fieldAfter(text: string, label: string): string {
  const lines = text.split(/\r?\n/).map((l) => l.trim())
  const i = lines.findIndex((l) => l.toLowerCase().startsWith(label.toLowerCase()))
  if (i < 0) return ''
  const sameLine = lines[i].slice(label.length).replace(/^\s*[:-]?\s*/, '').trim()
  const value = sameLine || lines.slice(i + 1).find((l) => l.length > 0) || ''
  return value === '-' ? '' : value
}

/** Pulls order fields out of a pasted submission email (Web3Forms or the customer's email fallback). */
export function parseSubmissionText(text: string): Submission {
  const orderId = text.match(/PT-[A-Z]{2}-\d{6}-[0-9A-HJKMNP-TV-Z]{4}/i)?.[0].toUpperCase() ?? ''
  const emailField = fieldAfter(text, 'Customer email')
  return {
    orderId,
    email: (emailField.match(EMAIL_RE) ?? text.match(EMAIL_RE))?.[0] ?? '',
    reference: fieldAfter(text, 'Reference number').replace(/[\s-]/g, '').toUpperCase() || (text.match(/\bref\s+([A-Z0-9]{6,30})\b/i)?.[1].toUpperCase() ?? ''),
    amount: fieldAfter(text, 'Amount paid').replace(/[₱,\s]/g, ''),
    senderName: fieldAfter(text, 'Sender name'),
    paidAt: fieldAfter(text, 'Payment date/time'),
    contact: fieldAfter(text, 'Backup contact'),
  }
}

/** A new desk entry in "Submitted - awaiting verification", or null if the order ID isn't valid. */
export function newDeskOrder(s: Submission, note = 'Logged from submission', now = Date.now()): DeskOrder | null {
  const orderId = s.orderId.trim().toUpperCase()
  const app = apps.find((a) => orderId.startsWith(`PT-${a.code}-`))
  if (!app || !/^PT-[A-Z]{2}-\d{6}-[0-9A-HJKMNP-TV-Z]{4}$/.test(orderId)) return null
  return {
    orderId,
    slug: app.slug as AppSlug,
    email: s.email.trim(),
    reference: s.reference.replace(/[\s-]/g, '').toUpperCase(),
    amount: Number(s.amount.replace(/[₱,\s]/g, '')) || 0,
    senderName: s.senderName.trim(),
    paidAt: s.paidAt.trim(),
    notes: s.contact.trim() ? `Backup contact: ${s.contact.trim()}` : '',
    status: 'submitted',
    checks: { amount: false, reference: false, unique: false },
    activations: [],
    history: [{ at: now, status: 'submitted', note }],
    createdAt: now,
  }
}
