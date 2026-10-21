import { beforeAll, describe, expect, it } from 'vitest'
import { generateKeyPair, verifyActivation } from '../shared/license'
import { activate, approve, checkAdmin, makeInstallToken, readInstallToken, type ActivationRecord, type ActivationStore, type ServerEnv } from './activation'

function memoryStore(): ActivationStore & { data: Map<string, ActivationRecord> } {
  const data = new Map<string, ActivationRecord>()
  return {
    data,
    get: async (id) => data.get(id) ?? null,
    create: async (id, rec) => {
      if (data.has(id)) return false
      data.set(id, rec)
      return true
    },
    remove: async (id) => {
      data.delete(id)
    },
  }
}

let env: ServerEnv
let publicJwk: JsonWebKey
const ORDER = 'PT-SK-261022-KB48'

beforeAll(async () => {
  const keys = await generateKeyPair()
  publicJwk = keys.publicJwk
  env = { tokenSecret: 'test-secret', privateJwk: keys.privateJwk, deliverySalt: 'salt', adminPassword: 'pickle-AAAA-BBBB-CCCC' }
})

describe('install tokens', () => {
  it('round-trip and reject tampering or another secret', async () => {
    const t = await makeInstallToken('test-secret', ORDER)
    expect(t.startsWith(`${ORDER}.`)).toBe(true)
    expect(await readInstallToken('test-secret', t)).toBe(ORDER)
    expect(await readInstallToken('other-secret', t)).toBeNull()
    expect(await readInstallToken('test-secret', t.replace('KB48', 'KB49'))).toBeNull()
    expect(await readInstallToken('test-secret', 'garbage')).toBeNull()
  })
})

describe('approve', () => {
  it('returns the unlisted install URL carrying a signed token', async () => {
    const r = await approve(env, ORDER, 'https://pickletools.vercel.app')
    if (!r.ok) throw new Error(r.error)
    expect(r.installUrl).toMatch(/^https:\/\/pickletools\.vercel\.app\/apps\/scorekeeper-[0-9a-f]{10}\/#t=PT-SK-261022-KB48\./)
  })

  it('rejects malformed or unknown-app order IDs', async () => {
    expect(await approve(env, 'PT-ZZ-261022-KB48', 'https://x')).toMatchObject({ ok: false })
    expect(await approve(env, 'nope', 'https://x')).toMatchObject({ ok: false })
  })
})

describe('activate', () => {
  it('binds the first phone, re-issues for the same phone, refuses a second phone', async () => {
    const store = memoryStore()
    const url = await approve(env, ORDER, 'https://x')
    if (!url.ok) throw new Error()
    const token = url.installUrl.split('#t=')[1]

    const first = await activate(env, store, token, 'AAAA-BBBB-CCCC')
    if (!first.ok) throw new Error(first.error)
    expect(await verifyActivation(first.code, publicJwk, 'scorekeeper', 'AAAA-BBBB-CCCC')).toBe(ORDER)

    const again = await activate(env, store, token, 'AAAA-BBBB-CCCC')
    expect(again.ok).toBe(true)

    expect(await activate(env, store, token, 'ZZZZ-ZZZZ-ZZZZ')).toEqual({ ok: false, error: 'other_device' })
  })

  it('allows a new phone after the admin resets the order', async () => {
    const store = memoryStore()
    const token = await makeInstallToken(env.tokenSecret, ORDER)
    await activate(env, store, token, 'AAAA-BBBB-CCCC')
    await store.remove(ORDER)
    expect((await activate(env, store, token, 'ZZZZ-ZZZZ-ZZZZ')).ok).toBe(true)
  })

  it('rejects forged links and bad device codes', async () => {
    const store = memoryStore()
    expect(await activate(env, store, `${ORDER}.forged`, 'AAAA-BBBB-CCCC')).toEqual({ ok: false, error: 'invalid_link' })
    const token = await makeInstallToken(env.tokenSecret, ORDER)
    expect(await activate(env, store, token, 'not-a-device')).toEqual({ ok: false, error: 'bad_device' })
  })
})

describe('checkAdmin', () => {
  it('accepts only the exact password', () => {
    expect(checkAdmin(env, 'Bearer pickle-AAAA-BBBB-CCCC')).toBe(true)
    expect(checkAdmin(env, 'Bearer pickle-AAAA-BBBB-CCCD')).toBe(false)
    expect(checkAdmin(env, null)).toBe(false)
    expect(checkAdmin({ ...env, adminPassword: '' }, 'Bearer ')).toBe(false)
  })
})
