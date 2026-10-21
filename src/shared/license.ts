// Device-bound activation without a server.
//
// Each app install creates a random device code. The business signs
// "pickletools/v1|<app>|<device>|<order>" with an ECDSA P-256 PRIVATE key that never leaves
// the admin's device; the apps ship only the PUBLIC key, so they can check a code but nobody
// can mint one. A code issued for one device fails on any other device or app.
//
// Limits (stated in the purchase policy): browsers expose no hardware ID, so the device code
// lives in site storage - clearing it requires a re-issue - and a determined person could
// modify the public JavaScript. This deters casual sharing; it is not DRM.

const ALG = { name: 'ECDSA', namedCurve: 'P-256' } as const
const SIGN = { name: 'ECDSA', hash: 'SHA-256' } as const
const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'

export const ORDER_ID_RE = /^PT-[A-Z]{2}-\d{6}-[0-9A-HJKMNP-TV-Z]{4}$/

export function randomBase32(length: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length))
  return Array.from(bytes, (b) => CROCKFORD[b & 31]).join('')
}

/** Normalises user-typed device codes: case, spaces, and look-alike letters (O→0, I/L→1). */
export function normalizeDeviceCode(input: string): string {
  const raw = input.toUpperCase().replace(/[^0-9A-Z]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1')
  return raw.match(/.{1,4}/g)?.join('-') ?? ''
}

export const isDeviceCode = (s: string) => /^[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/.test(s)


export const licenseMessage = (slug: string, device: string, orderId: string) => `pickletools/v1|${slug}|${device}|${orderId}`

function toB64url(buf: ArrayBuffer): string {
  let s = ''
  for (const b of new Uint8Array(buf)) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromB64url(s: string): Uint8Array<ArrayBuffer> | null {
  try {
    const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4))
    return Uint8Array.from(bin, (c) => c.charCodeAt(0))
  } catch {
    return null
  }
}

/** Admin side: produce the activation code "<orderId>.<signature>". */
export async function signActivation(privateJwk: JsonWebKey, slug: string, device: string, orderId: string): Promise<string> {
  const key = await crypto.subtle.importKey('jwk', privateJwk, ALG, false, ['sign'])
  const sig = await crypto.subtle.sign(SIGN, key, new TextEncoder().encode(licenseMessage(slug, device, orderId)))
  return `${orderId}.${toB64url(sig)}`
}

/** App side: returns the order ID if the code is valid for this app on this device. */
export async function verifyActivation(code: string, publicJwk: JsonWebKey, slug: string, device: string): Promise<string | null> {
  const clean = code.replace(/\s+/g, '')
  const dot = clean.indexOf('.')
  if (dot < 0) return null
  const orderId = clean.slice(0, dot).toUpperCase()
  const sig = fromB64url(clean.slice(dot + 1))
  if (!ORDER_ID_RE.test(orderId) || !sig || sig.length !== 64) return null
  try {
    const key = await crypto.subtle.importKey('jwk', publicJwk, ALG, false, ['verify'])
    const ok = await crypto.subtle.verify(SIGN, key, sig, new TextEncoder().encode(licenseMessage(slug, device, orderId)))
    return ok ? orderId : null
  } catch {
    return null
  }
}

export async function generateKeyPair(): Promise<{ publicJwk: JsonWebKey; privateJwk: JsonWebKey }> {
  const pair = await crypto.subtle.generateKey(ALG, true, ['sign', 'verify'])
  return {
    publicJwk: await crypto.subtle.exportKey('jwk', pair.publicKey),
    privateJwk: await crypto.subtle.exportKey('jwk', pair.privateKey),
  }
}
