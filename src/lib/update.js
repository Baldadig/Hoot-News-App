// App-updates — de beslisregels (getest in tests/update.test.mjs); src/lib/swUpdate.js
// koppelt ze aan de service worker.
//
// Een nieuwe versie wordt op de achtergrond klaargezet en wacht. We herladen nooit uit
// onszelf: je krijgt een stille melding en kiest zelf het moment.

// Moet de melding "Nieuwe versie beschikbaar" staan?
//  - waiting: er staat een nieuwe service worker klaar
//  - hasController: deze pagina werd al door een (oudere) service worker bediend —
//    bij de allereerste installatie valt er niets te vernieuwen
//  - changedElsewhere: een ander tabblad heeft de nieuwe versie al geactiveerd; deze pagina
//    draait dan nog oude code
//  - dismissed: je hebt de melding voor deze versie weggeklikt
export function shouldPrompt({ waiting, hasController, changedElsewhere = false, dismissed = false }) {
  if (dismissed) return false
  return (waiting && hasController) || changedElsewhere
}

// Wat te doen als de actieve service worker wisselt (controllerchange)?
//  - 'reload'  : jij koos "Vernieuwen" — één keer herladen
//  - 'prompt'  : het gebeurde buiten jou om (ander tabblad) — alleen de melding tonen
//  - 'ignore'  : eerste installatie, of we zijn al aan het herladen (geen lus)
export function onControllerChange({ hadController, requested, reloading }) {
  if (reloading) return 'ignore'
  if (!hadController) return 'ignore'
  return requested ? 'reload' : 'prompt'
}
