// De kern en de bron-delen in het geheugen van een functie-instantie (Editie sneller, B1; meting:
// Hoot-design/editie-sneller/METING.md §1). POST /api/edition las bij elke vraag de kern en alle gevolgde delen
// opnieuw uit Blobs (25 bronnen ≈ 1 MB, elk deel een eigen HTTP-ronde) en parste ze opnieuw. Een warme instantie
// leest nu alleen wat nieuw is:
//  - de kern met een voorwaardelijke vraag (If-None-Match op de ETag van Blobs): niet veranderd = 304, geen
//    bytes en niet opnieuw parsen; wel altijd één ronde, zodat een nieuw dagdeel er meteen is;
//  - een deel alleen als zijn versie in de kern (`meta.parts[id]`, de hash van de body, refresh.mjs) nog niet in
//    het geheugen staat. De versie is de inhoud: hetzelfde deel in het geheugen is byte voor byte wat Blobs zou
//    geven. Gaf Blobs (eventual consistency) nog een oudere versie, dan gebruiken we die, net als vroeger, maar
//    onthouden we haar onder haar eigen versie.
// Alleen publieke feed-inhoud: geen profiel, account of afdruk. De geparste kern en berichten worden door
// meerdere vragen gedeeld en mogen dus nooit gewijzigd worden (De Redacteur doet dat niet; tests/editie-sneller.test.mjs
// bevriest ze en vergelijkt met vers geparst).
export function feedMemory({ readStart, readPart, keep = 200 }) {
  let start = null // { tag, value }
  const parts = new Map() // id -> { tag, items }
  const loading = new Map() // id|tag -> belofte (twee gelijktijdige vragen lezen één keer)

  // De kern: `readStart(tag)` geeft { same: true } (niet veranderd), { body, tag } of null.
  async function loadStart() {
    const r = await readStart(start?.tag || null)
    if (r?.same && start) return start.value
    if (!r?.body) return null
    const value = JSON.parse(r.body)
    start = r.tag ? { tag: r.tag, value } : null
    return value
  }

  // De berichten van één bron in de versie van de kern; een fout is een lege lijst (zoals vroeger).
  function partItems(id, tag) {
    const hit = parts.get(id)
    if (hit && tag && hit.tag === tag) return hit.items
    const k = `${id}|${tag}`
    if (!loading.has(k)) {
      loading.set(
        k,
        readPart(id)
          .then((d) => {
            const items = d ? JSON.parse(d.body).items || [] : []
            if (d && d.etag) {
              parts.set(id, { tag: d.etag, items })
              if (parts.size > keep) parts.delete(parts.keys().next().value)
            }
            return items
          })
          .catch(() => [])
          .finally(() => loading.delete(k))
      )
    }
    return loading.get(k)
  }

  async function loadItems(s, followed) {
    const tags = s?.meta?.parts || {}
    const lists = await Promise.all(followed.filter((id) => tags[id]).map((id) => partItems(id, tags[id])))
    return lists.flat()
  }

  const size = () => ({ start: !!start, parts: parts.size })
  return { loadStart, loadItems, size }
}
