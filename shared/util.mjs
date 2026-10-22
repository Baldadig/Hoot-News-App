// Kleine hulpfuncties die server en app allebei gebruiken (één bron van waarheid).

// djb2-variant: korte, stabiele id's. Server en app rekenen hetzelfde, zodat id's matchen.
export function hash(str) {
  let h = 5381
  for (let i = 0; i < str.length; i++) h = (((h << 5) + h) ^ str.charCodeAt(i)) >>> 0
  return h.toString(36)
}

// Alleen http(s)-adressen doorlaten. Wat uit een feed of post komt, belandt in een href of src;
// een `javascript:`-link houdt React 18 niet tegen.
export function safeHttpUrl(u) {
  if (typeof u !== 'string') return null
  const t = u.trim()
  if (!/^https?:\/\//i.test(t)) return null
  try {
    new URL(t)
    return t
  } catch {
    return null
  }
}

export function hostname(u) {
  try {
    return new URL(u).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

export function safeIso(d) {
  if (!d) return null
  const t = new Date(d).getTime()
  return Number.isNaN(t) ? null : new Date(t).toISOString()
}
