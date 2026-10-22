// Order desk actions, protected by the ADMIN_PASSWORD environment variable.
import { approve, checkAdmin, slugForOrder } from '../src/server/activation.js'
import { isVenueList, writeSnapshot } from './_courts.js'
import { blobStore, json, notConfigured, serverEnv } from './_shared.js'

type Action = 'ping' | 'approve' | 'status' | 'reset' | 'courts-upload'

export async function POST(request: Request) {
  const env = serverEnv()
  if (!env) return notConfigured()
  if (!checkAdmin(env, request.headers.get('authorization'))) return json({ ok: false, error: 'wrong_password' }, 401)

  const body = (await request.json().catch(() => null)) as { action?: Action; orderId?: string; venues?: unknown } | null
  const orderId = (body?.orderId ?? '').trim().toUpperCase()
  if (body?.action === 'ping') return json({ ok: true })
  // Owner's refresh script (scripts/refresh-courts.mjs) uploads a court list fetched from their own computer.
  if (body?.action === 'courts-upload') {
    if (!isVenueList(body.venues)) return json({ ok: false, error: 'bad_courts' }, 400)
    const saved = await writeSnapshot(body.venues)
    return json({ ok: true, count: saved.venues.length, updatedAt: saved.updatedAt })
  }
  if (!slugForOrder(orderId)) return json({ ok: false, error: 'bad_order' }, 400)

  switch (body?.action) {
    case 'approve': {
      const origin = new URL(request.url).origin
      return json(await approve(env, orderId, origin))
    }
    case 'status':
      return json({ ok: true, activation: await blobStore.get(orderId) })
    case 'reset':
      await blobStore.remove(orderId)
      return json({ ok: true })
    default:
      return json({ ok: false, error: 'bad_action' }, 400)
  }
}
