import { toCSV } from '../../shared/download'
import type { AppSlug } from '../../shared/apps'
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
