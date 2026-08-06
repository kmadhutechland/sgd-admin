/**
 * Repairs rows seeded with a literal "IMG.someKey" instead of a URL.
 *
 * The first seed stubbed the image registry with a proxy that returned the key
 * name, so gallery and team rows stored "IMG.cultureCheer" and the site rendered
 * broken images. This resolves those against the real registry.
 *
 * Targeted rather than a re-seed, so anything edited through the panel survives.
 */
import { collection } from './store.js'
import { IMG_MAP, loadImageMap, readExport } from './seed.js'

loadImageMap()

let fixed = 0
let unresolved = 0

for (const [name, field] of [
  ['gallery', 'image'],
  ['team', 'photo'],
  ['banners', 'image'],
]) {
  const store = collection(name)
  for (const row of store.all()) {
    const value = row[field]
    if (typeof value !== 'string' || !value.startsWith('IMG.')) continue

    const key = value.slice(4)
    const url = IMG_MAP[key]
    if (url) {
      store.update(row.id, { [field]: url })
      fixed++
    } else {
      console.warn(`  no registry entry for ${value} (${name}/${row.id})`)
      unresolved++
    }
  }
}

/*
 * Backfill team portraits that ended up blank.
 *
 * Matched by name against the site's own leadership list rather than by row
 * order, so a member added or reordered in the panel does not get handed
 * someone else's face.
 */
let filled = 0
const team = collection('team')
const byName = new Map(
  (readExport('content.js', 'LEADERSHIP') ?? [])
    .filter((m) => typeof m.photo === 'string' && m.photo)
    .map((m) => [m.name, m.photo]),
)
for (const row of team.all()) {
  if (row.photo) continue
  const photo = byName.get(row.name)
  if (photo) {
    team.update(row.id, { photo })
    filled++
  } else {
    console.warn(`  no source portrait for ${row.name}`)
  }
}

console.log(`Repaired ${fixed} image references${unresolved ? `, ${unresolved} unresolved` : ''}`)
console.log(`Backfilled ${filled} blank team portraits`)
