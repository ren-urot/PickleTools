// Called by an app the first time it opens from its install link.
import { activate } from '../src/server/activation.js'
import { blobStore, json, notConfigured, serverEnv } from './_shared.js'

export async function POST(request: Request) {
  const env = serverEnv()
  if (!env) return notConfigured()
  const body = (await request.json().catch(() => null)) as { token?: unknown; device?: unknown } | null
  if (typeof body?.token !== 'string' || typeof body.device !== 'string') return json({ ok: false, error: 'invalid_link' }, 400)
  const result = await activate(env, blobStore, body.token, body.device)
  return json(result, result.ok ? 200 : result.error === 'other_device' ? 409 : 400)
}
