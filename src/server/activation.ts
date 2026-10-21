// Server-side approval and one-phone activation (runs in Vercel Functions, see /api).
//
// approve:  admin → signed install link  apps/<slug>-<suffix>/#t=<orderId>.<hmac>
// activate: the app sends that token + its device code; the first phone to activate an order
//           is recorded, gets an ECDSA activation code, and every other phone is refused.
// The private key, token secret and admin password exist only as Vercel environment variables.

import apps from '../shared/apps.json' with { type: 'json' }
import { deliverySuffix } from '../shared/delivery.js'
import { isDeviceCode, ORDER_ID_RE, signActivation } from '../shared/license.js'

export interface ServerEnv {
  tokenSecret: string
  privateJwk: JsonWebKey
  deliverySalt: string
  adminPassword: string
}

export interface ActivationRecord {
  device: string
  at: number
}

/** Where each order's activated phone is remembered (Vercel Blob in production). */
export interface ActivationStore {
  get(orderId: string): Promise<ActivationRecord | null>
  /** Must be atomic: returns false if the order already has a record. */
  create(orderId: string, record: ActivationRecord): Promise<boolean>
  remove(orderId: string): Promise<void>
}

export const slugForOrder = (orderId: string) => (ORDER_ID_RE.test(orderId) ? apps.find((a) => orderId.startsWith(`PT-${a.code}-`))?.slug : undefined)

const b64url = (buf: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

async function hmac(secret: string, message: string) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  // 128 bits of the HMAC keeps install links short while staying unguessable.
  return b64url(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`install|${message}`))).slice(0, 22)
}

export async function makeInstallToken(secret: string, orderId: string) {
  return `${orderId}.${await hmac(secret, orderId)}`
}

/** Returns the order ID if the token was issued by us, else null. */
export async function readInstallToken(secret: string, token: string): Promise<string | null> {
  const [orderId, mac, extra] = token.trim().split('.')
  if (extra !== undefined || !orderId || !mac || !slugForOrder(orderId)) return null
  const expected = await hmac(secret, orderId)
  return timingSafeEqual(mac, expected) ? orderId : null
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export function checkAdmin(env: ServerEnv, authorization: string | null) {
  if (!env.adminPassword || !authorization?.startsWith('Bearer ')) return false
  return timingSafeEqual(authorization.slice(7).trim(), env.adminPassword)
}

export async function approve(env: ServerEnv, orderId: string, origin: string): Promise<{ ok: true; installUrl: string } | { ok: false; error: string }> {
  const slug = slugForOrder(orderId)
  if (!slug) return { ok: false, error: 'That isn’t a valid order ID.' }
  const token = await makeInstallToken(env.tokenSecret, orderId)
  return { ok: true, installUrl: `${origin}/apps/${slug}${await deliverySuffix(env.deliverySalt, slug)}/#t=${token}` }
}

export type ActivateResult = { ok: true; code: string; orderId: string } | { ok: false; error: 'invalid_link' | 'bad_device' | 'other_device' }

export async function activate(env: ServerEnv, store: ActivationStore, token: string, device: string): Promise<ActivateResult> {
  const orderId = await readInstallToken(env.tokenSecret, token)
  if (!orderId) return { ok: false, error: 'invalid_link' }
  if (!isDeviceCode(device)) return { ok: false, error: 'bad_device' }

  let record = await store.get(orderId)
  if (!record) {
    const created = await store.create(orderId, { device, at: Date.now() })
    // Lost a race with another phone: use whatever was stored first.
    record = created ? { device, at: Date.now() } : await store.get(orderId)
  }
  if (!record || record.device !== device) return { ok: false, error: 'other_device' }

  const code = await signActivation(env.privateJwk, slugForOrder(orderId)!, device, orderId)
  return { ok: true, code, orderId }
}
