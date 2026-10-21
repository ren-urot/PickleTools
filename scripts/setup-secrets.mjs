// One-time server setup for automatic activation. Run it yourself:  npm run setup-secrets
//
// Uploads three encrypted secrets to the Vercel project (Production + Preview), redeploys,
// and prints the Order desk password:
//   LICENSE_PRIVATE_KEY  from keys/license-private-key.json (signs activation codes)
//   TOKEN_SECRET         new random value (signs install links)
//   ADMIN_PASSWORD       new random value, or pass your own: npm run setup-secrets -- "my password"
import { spawnSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { readFileSync } from 'node:fs'

const privateKey = JSON.stringify(JSON.parse(readFileSync('keys/license-private-key.json', 'utf8')))
const tokenSecret = randomBytes(32).toString('base64url')
const alphabet = 'ABCDEFGHJKMNPQRSTVWXYZ23456789'
const generated = 'pickle-' + [...randomBytes(12)].map((b) => alphabet[b % alphabet.length]).join('').replace(/(.{4})(?=.)/g, '$1-')
const adminPassword = process.argv[2]?.trim() || generated

const secrets = { LICENSE_PRIVATE_KEY: privateKey, TOKEN_SECRET: tokenSecret, ADMIN_PASSWORD: adminPassword }
const run = (args, input) => spawnSync('npx', ['-y', 'vercel@latest', ...args], { input, encoding: 'utf8', shell: process.platform === 'win32' })

for (const env of ['production', 'preview']) {
  for (const [name, value] of Object.entries(secrets)) {
    const r = run(['env', 'add', name, env, '--sensitive', '--force'], value)
    if (r.status !== 0) {
      console.error(`✗ Could not set ${name} (${env}):\n${r.stderr || r.stdout}`)
      process.exit(1)
    }
    console.log(`✓ ${name} set for ${env}`)
  }
}

console.log('\nRedeploying production so the new secrets take effect…')
const deploy = run(['deploy', '--prod', '--yes'])
console.log(deploy.status === 0 ? '✓ Deployed: https://pickletools.vercel.app' : `✗ Deploy failed:\n${deploy.stderr}`)

console.log(`\nOrder desk password (save it in your password manager):\n\n    ${adminPassword}\n`)
console.log('Sign in once at https://pickletools.vercel.app/#/admin')
