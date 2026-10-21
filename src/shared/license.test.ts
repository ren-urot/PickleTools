import { beforeAll, describe, expect, it } from 'vitest'
import { getDeviceCode } from './device'
import { generateKeyPair, isDeviceCode, normalizeDeviceCode, signActivation, verifyActivation } from './license'

let keys: Awaited<ReturnType<typeof generateKeyPair>>
let other: Awaited<ReturnType<typeof generateKeyPair>>
const ORDER = 'PT-SK-261021-7KQ4'
const DEVICE = 'AB12-CD34-EF56'

beforeAll(async () => {
  keys = await generateKeyPair()
  other = await generateKeyPair()
})

describe('activation codes', () => {
  it('unlock the app on the device they were issued for', async () => {
    const code = await signActivation(keys.privateJwk, 'scorekeeper', DEVICE, ORDER)
    expect(code.startsWith(`${ORDER}.`)).toBe(true)
    expect(await verifyActivation(code, keys.publicJwk, 'scorekeeper', DEVICE)).toBe(ORDER)
  })

  it('survive pasting with spaces and line breaks', async () => {
    const code = await signActivation(keys.privateJwk, 'scorekeeper', DEVICE, ORDER)
    const messy = `  ${code.slice(0, 30)}\n ${code.slice(30)}  `
    expect(await verifyActivation(messy, keys.publicJwk, 'scorekeeper', DEVICE)).toBe(ORDER)
  })

  it('fail on another phone', async () => {
    const code = await signActivation(keys.privateJwk, 'scorekeeper', DEVICE, ORDER)
    expect(await verifyActivation(code, keys.publicJwk, 'scorekeeper', 'ZZ99-ZZ99-ZZ99')).toBeNull()
  })

  it('fail for a different app', async () => {
    const code = await signActivation(keys.privateJwk, 'scorekeeper', DEVICE, ORDER)
    expect(await verifyActivation(code, keys.publicJwk, 'rules-quiz', DEVICE)).toBeNull()
  })

  it('fail when signed by a key other than the business key', async () => {
    const forged = await signActivation(other.privateJwk, 'scorekeeper', DEVICE, ORDER)
    expect(await verifyActivation(forged, keys.publicJwk, 'scorekeeper', DEVICE)).toBeNull()
  })

  it('fail when the order ID is edited', async () => {
    const code = await signActivation(keys.privateJwk, 'scorekeeper', DEVICE, ORDER)
    const edited = code.replace(ORDER, 'PT-SK-261021-0000')
    expect(await verifyActivation(edited, keys.publicJwk, 'scorekeeper', DEVICE)).toBeNull()
  })

  it('reject garbage without throwing', async () => {
    for (const junk of ['', 'hello', 'PT-SK-261021-7KQ4.', 'PT-SK-261021-7KQ4.!!!', 'x.y.z'])
      expect(await verifyActivation(junk, keys.publicJwk, 'scorekeeper', DEVICE)).toBeNull()
  })
})

describe('device codes', () => {
  it('are stable on a device and well-formed', () => {
    localStorage.clear()
    const a = getDeviceCode()
    expect(isDeviceCode(a)).toBe(true)
    expect(getDeviceCode()).toBe(a)
  })

  it('normalise typed input and look-alike characters', () => {
    expect(normalizeDeviceCode('ab12 cd34 ef56')).toBe('AB12-CD34-EF56')
    expect(normalizeDeviceCode('O0IL-1234-5678')).toBe('0011-1234-5678')
  })
})
