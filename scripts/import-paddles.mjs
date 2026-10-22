// Rebuilds src/apps/paddle-finder/catalog.json from the Pickleball Effect paddle database.
//
//   curl -L -o pe.json https://pickleballeffect.com/wp-content/uploads/pe-paddle-db.json
//   node scripts/import-paddles.mjs pe.json
//
// Only published, factual specs are imported (brand, model, shape, core, weight, play style,
// year, approval, US list price). Pickleball Effect's own lab measurements and affiliate links
// are deliberately left out.
import { readFileSync, writeFileSync } from 'node:fs'

const USD_TO_PHP = 58 // approximate; shown to users as an estimate
const OUT = 'src/apps/paddle-finder/catalog.json'

const BRAND_NAMES = { Element6: 'Element 6', GRUVN: 'Gruvn', LUZZ: 'Luzz', Technifibre: 'Tecnifibre', Prokennex: 'ProKennex' }
const STYLE = { Control: 'control', 'Control+': 'control', 'All-Court': 'all-court', 'All-Court+': 'all-court', Power: 'power', 'Power+': 'power' }
const SHAPE = { Elongated: 'elongated', 'Extra-elongated': 'elongated', Widebody: 'widebody', Hybrid: 'hybrid' }
// Suggested levels follow play style: control paddles forgive mistakes, power paddles reward clean contact.
const LEVELS = { control: ['beginner', 'intermediate'], 'all-court': ['beginner', 'intermediate', 'advanced'], power: ['intermediate', 'advanced'] }

const src = JSON.parse(readFileSync(process.argv[2], 'utf8'))
const rows = src.rows.map((r) => Object.fromEntries(src.cols.map((c, i) => [c, r[i]])))
const slug = (s) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const seen = new Set()
const skipped = []
const paddles = []
for (const r of rows) {
  const brand = BRAND_NAMES[r.brand] ?? r.brand
  const style = STYLE[r.type]
  const shape = SHAPE[r.shape]
  const weightOz = Number(r.weight)
  const thicknessMm = Number(r.core)
  const priceUsd = Number(String(r.price).replace(/[^0-9.]/g, ''))
  if (!style || !shape || !weightOz || !thicknessMm || !priceUsd) {
    skipped.push(`${brand} ${r.paddle}`)
    continue
  }
  let id = slug(`${brand} ${r.paddle}`)
  while (seen.has(id)) id += '-x'
  seen.add(id)
  paddles.push({
    id,
    brand,
    model: r.paddle.trim(),
    shape,
    weightOz: Math.round(weightOz * 100) / 100,
    thicknessMm,
    style,
    levels: LEVELS[style],
    year: Number(r.year) || null,
    approval: r.approval || '',
    priceUsd,
    pricePhp: Math.round((priceUsd * USD_TO_PHP) / 100) * 100,
    url: '',
  })
}
paddles.sort((a, b) => a.brand.localeCompare(b.brand) || a.model.localeCompare(b.model))

const catalog = {
  lastReviewed: new Date().toISOString().slice(0, 10),
  source: { name: 'Pickleball Effect paddle database', url: 'https://pickleballeffect.com/pickleball-paddle-database/' },
  usdToPhp: USD_TO_PHP,
  note: `Specs are published figures and vary by unit (about ±0.3 oz). Peso prices are estimates converted from US list prices at ₱${USD_TO_PHP} = $1; local prices and availability differ, so confirm with the retailer before buying.`,
  paddles,
}
writeFileSync(OUT, JSON.stringify(catalog, null, 1) + '\n')
console.log(`✓ ${paddles.length} paddles from ${new Set(paddles.map((p) => p.brand)).size} brands → ${OUT}`)
if (skipped.length) console.log(`  skipped (missing specs): ${skipped.join(', ')}`)
