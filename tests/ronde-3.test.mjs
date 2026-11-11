// Hoot 1.1.1, ronde 3 (keuzes van 5 november, "Na de review"): de app gelijk aan web-nu. Teksten en
// vormen die web en app allebei moeten hebben; het gedrag zelf staat in de eigen toetsen
// (stroom-einde, kanten-tip, selectie-voorproef, maak-van-jou en ios/HootTests/Ronde3Tests.swift).
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')

test('r5-stroom-einde: web en app eindigen bij je vorige bezoek, met dezelfde woorden', () => {
  const web = read('src/views/Stream.jsx')
  const app = read('ios/Hoot/Views/StreamView.swift')
  for (const zin of ['Hier was je gebleven', 'Je bent bij.', 'Ouder nieuws tonen']) {
    assert.ok(web.includes(zin), `web: ${zin}`)
    assert.ok(app.includes(zin), `app: ${zin}`)
  }
  assert.doesNotMatch(app, /Button\("Meer berichten"\)/, 'de Stroom laadt niet meer per knop door tot het eind')
  // Dezelfde grens: een dag, per keer zestig.
  const swift = read('ios/Hoot/StroomEinde.swift')
  assert.match(swift, /dag: TimeInterval = 24 \* 60 \* 60/)
  assert.match(swift, /page = 60/)
  assert.match(read('src/lib/stroom-einde.js'), /DAG = 24 \* 60 \* 60 \* 1000/)
})

test('r5-einde-rust en r5-seintje: de seintje-kaart staat onder het einde, met een dagdeel en de ochtend voorgekozen', () => {
  const app = read('ios/Hoot/Views/EditionView.swift')
  // Niet meer zwevend over de eindkaart (safeAreaInset), maar als kaart in de lijst ná het einde.
  const inset = app.slice(app.indexOf('.safeAreaInset(edge: .bottom)'), app.indexOf('// De stappen van het welkom vanaf de interesses'))
  assert.doesNotMatch(inset, /AlertOffer\(/)
  assert.match(app, /AlertOffer\(done: alertYes, slot: \$alertSlot/)
  assert.match(app, /static let standaard = "ochtend"/)
  assert.match(app, /\("avond", "Vroege avond"\)/)
  assert.match(app, /store\.notifySlots = AlertOffer\.slots\(for: alertSlot\)/)
  assert.doesNotMatch(app, /store\.notifySlots = EditionAlerts\.slots\.map/)
})

test('r5-selectie-onderwerpen: de app toont bij een lege Selectie hetzelfde voorproefje als het web', async () => {
  const { VOORPROEF } = await import('../src/lib/selection-index.js')
  const app = read('ios/Hoot/Views/DigestView.swift')
  assert.ok(app.includes(`static let voorproef = "${VOORPROEF}"`))
  assert.match(app, /voorproef\(SelectionOverview\.voorproefje\(store\.digest\)\)/)
})

test('r5-kanten-welkom: dezelfde eenmalige tip in de app, met Vergelijk en sluiten', () => {
  const web = read('src/views/Edition.jsx')
  const app = read('ios/Hoot/Views/EditionView.swift')
  assert.ok(web.includes('Meer kanten van één verhaal: bij ‘'))
  assert.ok(app.includes('Meer kanten van één verhaal: bij ‘'))
  assert.ok(web.includes('zie je hoe elke bron het brengt.') && app.includes('zie je hoe elke bron het brengt.'))
  assert.match(app, /Text\("Vergelijk"\)\.underline\(\)/)
  assert.match(app, /accessibilityLabel\("Tip sluiten"\)/)
  assert.match(app, /UserDefaults\.standard\.set\(true, forKey: KantenTip\.key\)/, 'wie vergelijkt, ziet de tip niet meer')
})

test('r5-namen: de app gebruikt dezelfde woordenlijst als web en landing', () => {
  const welkom = read('ios/Hoot/Views/WelcomeView.swift')
  assert.match(welkom, /Button\("Account"\) \{ login = true \}/)
  assert.match(welkom, /"Drie keer per dag tien verhalen\. Dan ben je bij\."/)
  assert.match(welkom, /"Elke maandag het beste over wat jou bezighoudt\."/)
  assert.match(welkom, /"Elke maandag het beste over je werk of hobby\."/)
  assert.doesNotMatch(welkom, /hooguit tien|[Ee]én keer per week|Button\("Inloggen"\)/)
  // De accountrij zonder account heet Account. Bovenaan Instellingen staat sinds 1.2.1 "Inloggen" met de knoppen
  // er meteen onder (advies instellingen-positie), want daar doe je het.
  assert.match(read('ios/Hoot/Views/AccountView.swift'), /case \.out:\n\s*Text\("Account"\)/)
  assert.match(read('ios/Hoot/Views/SettingsView.swift'), /case \.out: return "Account"/)
  assert.match(read('ios/Hoot/Views/SettingsView.swift'), /kaart\(title: "Inloggen", status: "Hoot op al je toestellen"\)/)
  assert.match(read('ios/Hoot/Views/EditionView.swift'), /\.navigationTitle\("Vergelijken"\)/)
  // De accountknop rechtsboven heet voor VoiceOver gewoon Instellingen, net als op het web.
  assert.match(read('ios/Hoot/Views/AccountView.swift'), /struct AccountKnop[\s\S]*?accessibilityLabel\("Instellingen"\)/)
  // Gelijk aan het web.
  const web = read('src/views/Welcome.jsx')
  for (const zin of ['Drie keer per dag tien verhalen. Dan ben je bij.', 'Elke maandag het beste over wat jou bezighoudt.', 'Elke maandag het beste over je werk of hobby.']) assert.ok(web.includes(zin), zin)
})

test('r5-apple-web: de inlogpagina van de app zegt dat je op gethoot.app (nog) met Google inlogt, en het web kent alleen Google', () => {
  const app = read('ios/Hoot/Views/AccountView.swift')
  assert.match(app, /static let webNote = "Op gethoot\.app log je \(nog\) in met Google\."/)
  assert.match(app, /Text\(Self\.webNote\)/)
  assert.doesNotMatch(read('src/components/Account.jsx'), /Inloggen met Apple/)
})

test('laag B, klein: de Tien-zin klopt met wat je krijgt (A9), Tien in Schibsted (A21), Zoeken op één lijn en leesbaar bij grote tekst (A2, A18)', async () => {
  const { TEXT } = await import('../src/lib/tien.js')
  assert.equal(TEXT.ready, 'Je eerste Editie staat klaar. Tien verhalen, en één buiten je bubbel.')
  const mark = read('ios/Hoot/Views/FirstEditionMark.swift')
  assert.ok(mark.includes(`static let ready = "${TEXT.ready}"`))
  assert.doesNotMatch(mark, /\.font\(\.system\(size:/)
  const zoek = read('ios/Hoot/Views/StreamView.swift')
  assert.doesNotMatch(zoek, /pickerStyle\(\.segmented\)\.padding\(\.horizontal/)
  assert.match(zoek, /picker\.pickerStyle\(\.menu\)/)
})
