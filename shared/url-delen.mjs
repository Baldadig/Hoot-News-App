// Host en pad van een link, zonder URL-object. JavaScriptCore op het toestel (de rekenkern van de app) heeft geen
// `URL` en geen `URLSearchParams`: een `new URL(…)` in een try viel daar stil weg, en dan rekende de app anders dan
// web en server (nachttest 14 november, R2). Zelfde aanpak als rubricSegments in shared/editie-filter.mjs.
// Geeft { host, path } (host in kleine letters, zonder poort of inlog; pad zonder query of anker, minstens "/"),
// of null als het geen absolute link met een host is.
const RE = /^[a-z][a-z0-9+.-]*:\/\/(?:[^@/?#]*@)?(\[[^\]]*\]|[^:/?#]*)(?::\d*)?([^?#]*)/i
export function urlDelen(raw) {
  const m = RE.exec(String(raw ?? '').trim())
  if (!m || !m[1]) return null
  return { host: m[1].toLowerCase(), path: m[2] || '/' }
}
