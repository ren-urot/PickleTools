import { readJSON, writeJSON } from '../../shared/storage'
import { randomBase32 } from '../../shared/license'
import type { AppSlug } from '../../shared/apps'

/**
 * Status vocabulary shared by the customer pages, the admin desk and the email templates.
 * Customer-side only `submitted`, `not_sent` and `received` can be known without a server.
 */
export type OrderStatus = 'not_sent' | 'submitted' | 'verifying' | 'needs_info' | 'verified' | 'activated' | 'rejected' | 'refunded'

export const statusLabel: Record<OrderStatus, string> = {
  not_sent: 'Not sent yet',
  submitted: 'Submitted - awaiting verification',
  verifying: 'Verifying payment',
  needs_info: 'Waiting for customer reply',
  verified: 'Paid · install link sent',
  activated: 'Activated on device',
  rejected: 'Payment not found',
  refunded: 'Refunded',
}

/** PT-<APP>-<YYMMDD>-<4 Crockford base32>, e.g. PT-SK-261021-7KQ4. */
export function makeOrderId(appCode: string, now = new Date()): string {
  const yy = String(now.getFullYear()).slice(2)
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return `PT-${appCode}-${yy}${mm}${dd}-${randomBase32(4)}`
}

export interface CustomerOrder {
  orderId: string
  slug: AppSlug
  email: string
  reference: string
  amount: number
  submittedAt: number
  status: 'submitted' | 'not_sent'
  /** Customer ticked "I received my install link". */
  received?: boolean
}

const ORDERS_KEY = 'pt:store:orders'

export const getLocalOrders = () => readJSON<CustomerOrder[]>(ORDERS_KEY, [])

export function findLocalOrder(orderId: string) {
  return getLocalOrders().find((o) => o.orderId === orderId.trim().toUpperCase())
}

export function saveLocalOrder(order: CustomerOrder) {
  const rest = getLocalOrders().filter((o) => o.orderId !== order.orderId)
  writeJSON(ORDERS_KEY, [order, ...rest].slice(0, 50))
}

/**
 * One order ID per checkout attempt: re-used on retries and double submits, cleared after a
 * successful submission so the next purchase gets a fresh ID.
 */
export function checkoutOrderId(slug: string, appCode: string): string {
  const key = `pt:checkout:${slug}`
  try {
    const existing = sessionStorage.getItem(key)
    if (existing) return existing
    const id = makeOrderId(appCode)
    sessionStorage.setItem(key, id)
    return id
  } catch {
    return makeOrderId(appCode)
  }
}

export function clearCheckoutOrderId(slug: string) {
  try {
    sessionStorage.removeItem(`pt:checkout:${slug}`)
  } catch {
    /* ignore */
  }
}
