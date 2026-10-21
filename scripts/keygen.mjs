// Creates the business's activation signing key pair.
//   public key  -> src/config/license-public-key.json (committed, built into every app)
//   private key -> keys/license-private-key.json      (gitignored - back it up somewhere safe)
// Re-running with --force rotates the key and INVALIDATES every activation code already issued.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { webcrypto as crypto } from 'node:crypto'

const PRIVATE = 'keys/license-private-key.json'
const PUBLIC = 'src/config/license-public-key.json'

if (existsSync(PRIVATE) && !process.argv.includes('--force')) {
  console.error(`${PRIVATE} already exists. Re-run with --force to rotate (this invalidates all issued activation codes).`)
  process.exit(1)
}

const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'])
const publicJwk = await crypto.subtle.exportKey('jwk', pair.publicKey)
const privateJwk = await crypto.subtle.exportKey('jwk', pair.privateKey)

mkdirSync('keys', { recursive: true })
writeFileSync(PRIVATE, JSON.stringify(privateJwk, null, 2) + '\n')
writeFileSync(PUBLIC, JSON.stringify(publicJwk, null, 2) + '\n')

console.log(`Public key written to ${PUBLIC} (commit this).`)
console.log(`Private key written to ${PRIVATE} - NEVER commit or share it.`)
console.log('Paste the private key into the Order desk (#/admin) on the device you fulfil orders from:\n')
console.log(JSON.stringify(privateJwk))
