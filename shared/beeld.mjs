// Mag een beeld groot? Eén poort voor web (src/lib/img.js) en server (netlify/lib/image-measure.mjs);
// de app spiegelt dit in ios/Hoot/ImageURL.swift en BeeldOpMaat.swift (tests/img.test.mjs houdt ze gelijk).
//
// Aanleiding (13 november 2026): Tyra Banks bij NU.nl in Buiten je bubbel. De feed gaf een vierkant van
// 256 px uit een staand origineel van 536 breed. Wij vroegen _wd1280/0/0/0/0/: NU.nl perst dan het hele
// origineel in 1280 x 720, dus uitgerekt én opgeschaald. Gemeten: _wd640, _wd854 en _wd1280 geven altijd
// precies 16:9, wat de uitsnede ook is; een uitsnede buiten het beeld valt terug op het hele beeld.

// Hoe breed het beeld minstens echt moet zijn om groot te mogen. Het smalste grote vak is de kolom op
// een telefoon (390 - 32 = 358 punten); 600 is daar 1,7 keer, scherp genoeg op een retinascherm. Het
// beeld van Tyra Banks (536) en een beeld van 400 breed vallen eronder: dat waren de zachte beelden.
export const GROOT_MIN_BREED = 600
// Welke verhoudingen een groot vak kan vullen zonder vervorming. De vakken snijden bij (cover), ze rekken
// nooit uit; maar buiten dit bereik blijft er te weinig van het beeld over. 0,6: een staande foto van 2:3
// past nog (de vakken krijgen dan hun staande vorm), een schermafbeelding van 9:16 niet. 2,4: een breed
// beeld van 21:9 past nog, een banner van 3:1 niet.
export const GROOT_VERHOUDING = [0.6, 2.4]

// breedte: hoe breed het getoonde beeld echt is (null: onbekend). verhouding: breedte / hoogte van wat
// getoond wordt (null: onbekend). kleinVierkant: het adres is een bekend klein vierkant en de echte maat
// van de grote variant is niet gemeten; de breedte die we vragen zegt dan niets (het FD schaalt op).
// Bij twijfel geen groot beeld; onbekend blijft zoals altijd (tonen).
export function grootBeeldMag({ breedte = null, verhouding = null, kleinVierkant = false } = {}) {
  if (kleinVierkant) return false
  if (verhouding != null && !(verhouding >= GROOT_VERHOUDING[0] && verhouding <= GROOT_VERHOUDING[1])) return false
  return breedte == null || breedte >= GROOT_MIN_BREED
}

// ---- NU.nl ----
// De feed: https://images.nu.nl/m/<id>_sqr256/<x>/<y>/<b>/<h>/<naam>.jpg, met de vierkante uitsnede in de
// pixels van het origineel. Liggend bestaat alleen 16:9 (_wd640, _wd854, _wd1280), en NU.nl rekt elke
// uitsnede daarin. Een 16:9-uitsnede binnen het vierkant uit de feed ligt altijd binnen het beeld en houdt
// het midden dat de redactie koos; zo rekt er niets. Het origineel is hooguit zo breed als die uitsnede.
const NU = /^(https:\/\/images\.nu\.nl\/m\/[a-z0-9]+)_sqr256\/(\d+)\/(\d+)\/(\d+)\/(\d+)\/(.+)$/
export const NU_BREEDTES = [640, 854, 1280]

export function nuVierkant(url) {
  const m = typeof url === 'string' ? url.match(NU) : null
  if (!m) return null
  const [x, y, b, h] = m.slice(2, 6).map(Number)
  return b > 0 && h > 0 ? { basis: m[1], x, y, zijde: Math.min(b, h), naam: m[6] } : null
}

export function nuLiggend(url, breedte) {
  const v = nuVierkant(url)
  if (!v) return null
  const hoog = Math.round((v.zijde * 9) / 16)
  return `${v.basis}_wd${breedte}/${v.x}/${v.y + Math.floor((v.zijde - hoog) / 2)}/${v.zijde}/${hoog}/${v.naam}`
}
