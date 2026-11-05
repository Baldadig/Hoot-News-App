import { useState } from 'react'
import '../styles/account.css'
import { ViewHeader } from '../components/Shell.jsx'
import { ConfirmDialog } from '../components/Account.jsx'
import { syncedUid } from '../lib/membership.js'

// Op dit toestel: wat je zelden doet, één tik dieper (zelfde pagina als in de app, DeviceDataView in
// ios/Hoot/Views/SettingsView.swift). Wissen alleen na een bevestiging met een zichtbare Annuleer.
// Teksten letterlijk uit de app.
export const DEVICE_TEXT = {
  title: 'Op dit toestel',
  unread: 'Alles als ongelezen markeren',
  clearSaved: 'Bewaarde artikelen verwijderen',
  reset: 'Stel Hoot opnieuw in',
  savedSyncs: 'Bewaard gaat mee met je account.',
  resetNote: 'Bewaard en gelezen blijven.',
  cancel: 'Annuleer',
  unreadTitle: 'Alles als ongelezen markeren?',
  unreadMessage: 'Bewaard blijft staan.',
  unreadConfirm: 'Markeer als ongelezen',
  savedTitle: 'Alle bewaarde artikelen verwijderen?',
  savedConfirm: 'Verwijder',
  resetTitle: 'Hoot opnieuw instellen?',
  resetMessage: 'Je kiest je interesses en bronnen opnieuw. Bewaard en gelezen blijven.',
  resetConfirm: 'Stel opnieuw in',
}

// "1 artikel verdwijnt uit Bewaard." of "3 artikelen verdwijnen uit Bewaard, ook op je andere toestellen. Dit kun je niet ongedaan maken."
export const savedMessage = (count, syncs) =>
  `${count === 1 ? '1 artikel verdwijnt' : `${count} artikelen verdwijnen`} uit Bewaard${syncs ? ', ook op je andere toestellen' : ''}. Dit kun je niet ongedaan maken.`

function ActionRow({ label, onClick, disabled = false, danger = false }) {
  return (
    <button type="button" className={`setrow setrow--link setrow--action${danger ? ' setrow--danger' : ''}`} onClick={onClick} disabled={disabled}>
      <span className="setrow__label">{label}</span>
    </button>
  )
}

export default function Device({ account, saved = {}, onClearSaved, onClearRead, onReset, onBack, backLabel }) {
  const [confirm, setConfirm] = useState(null) // 'gelezen' | 'bewaard' | 'reset'
  const count = Object.keys(saved).length
  // Ingelogd (of je account laadt nog): Bewaard gaat mee met je account, dus wissen wist ook daar.
  const savedSyncs = account?.status === 'loading' || !!syncedUid(account)
  const close = (kind) => setConfirm((c) => (c === kind ? null : c))
  const T = DEVICE_TEXT
  return (
    <section className="view view--page" aria-label={T.title}>
      <div className="col col--form">
        <ViewHeader title={T.title} showSearch={false} account={false} onBack={onBack} backLabel={backLabel} backInNav />

        <div className="rows">
          <ActionRow label={T.unread} onClick={() => setConfirm('gelezen')} danger />
          <ActionRow label={T.clearSaved} onClick={() => setConfirm('bewaard')} disabled={count === 0} danger />
        </div>
        {savedSyncs ? <p className="hint setfoot">{T.savedSyncs}</p> : null}

        <div className="rows device__reset">
          <ActionRow label={T.reset} onClick={() => setConfirm('reset')} />
        </div>
        <p className="hint setfoot">{T.resetNote}</p>

        <ConfirmDialog
          open={confirm === 'gelezen'}
          title={T.unreadTitle}
          message={T.unreadMessage}
          onClose={() => close('gelezen')}
          actions={[
            { label: T.cancel, kind: 'cancel', onClick: () => setConfirm(null) },
            {
              label: T.unreadConfirm,
              kind: 'danger',
              onClick: () => {
                onClearRead?.()
                setConfirm(null)
              },
            },
          ]}
        />
        <ConfirmDialog
          open={confirm === 'bewaard'}
          title={T.savedTitle}
          message={savedMessage(count, savedSyncs)}
          onClose={() => close('bewaard')}
          actions={[
            { label: T.cancel, kind: 'cancel', onClick: () => setConfirm(null) },
            {
              label: T.savedConfirm,
              kind: 'danger',
              onClick: () => {
                onClearSaved?.()
                setConfirm(null)
              },
            },
          ]}
        />
        <ConfirmDialog
          open={confirm === 'reset'}
          title={T.resetTitle}
          message={T.resetMessage}
          onClose={() => close('reset')}
          actions={[
            { label: T.cancel, kind: 'cancel', onClick: () => setConfirm(null) },
            {
              label: T.resetConfirm,
              kind: 'danger',
              onClick: () => {
                setConfirm(null)
                onReset?.()
              },
            },
          ]}
        />
      </div>
    </section>
  )
}
