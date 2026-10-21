// Prints the unlisted install URL for every app.
//   SITE_URL=https://<you>.github.io/<repo>/ DELIVERY_SALT=... npm run delivery-links
import { readFileSync } from 'node:fs'
import { deliverySuffix } from './delivery-suffix.mjs'

const site = (process.env.SITE_URL ?? 'http://localhost:4173/').replace(/\/?$/, '/')
const salt = process.env.DELIVERY_SALT ?? ''
if (!salt) console.warn('⚠  DELIVERY_SALT is empty - these are the guessable development paths.\n')

for (const app of JSON.parse(readFileSync('src/shared/apps.json', 'utf8'))) {
  console.log(`${app.name.padEnd(26)} ${site}apps/${app.slug}${deliverySuffix(salt, app.slug)}/`)
}
