// Paid apps are published at unlisted paths: apps/<slug>-<suffix>/ where
// suffix = first 10 hex chars of sha256("<DELIVERY_SALT>:<slug>").
// The salt is a build-time secret; the admin desk recomputes the same URL in the browser.
// Shared by the build script (Node) and the admin desk (browser) - both have WebCrypto.

export async function deliverySuffix(salt: string, slug: string): Promise<string> {
  if (!salt) return ''
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${salt}:${slug}`))
  const hex = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('')
  return `-${hex.slice(0, 10)}`
}

/** Absolute install URL for an app, given the site root URL (ending in "/"). */
export async function installUrl(siteRoot: string, salt: string, slug: string): Promise<string> {
  return `${siteRoot}apps/${slug}${await deliverySuffix(salt, slug)}/`
}
