// Shared by the API routes (files starting with "_" are not deployed as routes).
import { del, get, put } from '@vercel/blob'
import type { ActivationRecord, ActivationStore, ServerEnv } from '../src/server/activation.js'

export function serverEnv(): ServerEnv | null {
  const { TOKEN_SECRET, LICENSE_PRIVATE_KEY, DELIVERY_SALT, ADMIN_PASSWORD } = process.env
  if (!TOKEN_SECRET || !LICENSE_PRIVATE_KEY || !ADMIN_PASSWORD) return null
  try {
    return { tokenSecret: TOKEN_SECRET, privateJwk: JSON.parse(LICENSE_PRIVATE_KEY) as JsonWebKey, deliverySalt: DELIVERY_SALT ?? '', adminPassword: ADMIN_PASSWORD }
  } catch {
    return null
  }
}

const path = (orderId: string) => `activations/${orderId}.json`

/** One private JSON blob per order; allowOverwrite:false makes the first phone win. */
export const blobStore: ActivationStore = {
  async get(orderId) {
    const res = await get(path(orderId), { access: 'private', useCache: false })
    if (!res) return null
    return JSON.parse(await new Response(res.stream).text()) as ActivationRecord
  },
  async create(orderId, record) {
    try {
      await put(path(orderId), JSON.stringify(record), { access: 'private', addRandomSuffix: false, allowOverwrite: false, contentType: 'application/json' })
      return true
    } catch (err) {
      if (await blobStore.get(orderId)) return false
      throw err
    }
  },
  async remove(orderId) {
    await del(path(orderId))
  },
}

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } })

export const notConfigured = () => json({ ok: false, error: 'not_configured', message: 'Activation is not set up on the server yet.' }, 503)
