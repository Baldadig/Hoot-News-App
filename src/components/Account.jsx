import { useEffect, useRef, useState } from 'react'
import { CloseIcon } from './icons.jsx'

// Account in Instellingen: inloggen, wie je bent, synchroniseren en (voor beheerders) uitnodigen.
const SYNC = { syncing: 'Bezig met synchroniseren…', ok: 'Gesynchroniseerd met je andere toestellen.', error: 'Synchroniseren lukte net niet; Hoot probeert het opnieuw.' }

export function AccountSettings({ account, syncStatus }) {
  const { status, user, profile, signIn, signOut, invite } = account
  if (status === 'loading') return <p className="hint">Even kijken of je bent ingelogd…</p>
  if (status === 'out')
    return (
      <div className="setrow setrow--stack">
        <div className="setrow__text">
          <span className="setrow__label">{invite ? 'Je bent uitgenodigd' : 'Inloggen'}</span>
          <span className="setrow__hint">{invite ? 'Log in met Google om je account te maken. Wat je hier al instelde gaat mee.' : 'Met je Google-account. Je instellingen, Bewaard en wat je las gaan dan mee naar je andere toestellen.'}</span>
        </div>
        <button type="button" className="btn" onClick={signIn}>
          Inloggen met Google
        </button>
      </div>
    )
  const email = user?.email || 'je account'
  return (
    <>
      <div className="setrow">
        <div className="setrow__text">
          <span className="setrow__label">{email}</span>
          <span className="setrow__hint">{status === 'noInvite' ? 'Dit account is nog geen lid. Hoot is op uitnodiging: open de uitnodigingslink die je kreeg, of vraag er een aan.' : SYNC[syncStatus] || SYNC.ok}</span>
        </div>
        <button type="button" className="linkbtn" onClick={signOut}>
          Uitloggen
        </button>
      </div>
      {profile?.is_admin ? <InviteRow account={account} /> : null}
    </>
  )
}

function InviteRow({ account }) {
  const [link, setLink] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const make = async () => {
    setBusy(true)
    setMsg('')
    try {
      setLink(await account.createInvite(note.trim()))
    } catch {
      setMsg('Dat lukte niet. Probeer het zo nog eens.')
    } finally {
      setBusy(false)
    }
  }
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setMsg('Gekopieerd.')
    } catch {
      setMsg('Kopiëren lukte niet; selecteer de link hierboven.')
    }
  }
  const share = () => navigator.share?.({ title: 'Uitnodiging voor Hoot', text: 'Je bent uitgenodigd voor Hoot, mijn nieuwslezer.', url: link }).catch(() => {})
  return (
    <div className="invite">
      <span className="setrow__label">Iemand uitnodigen</span>
      <span className="setrow__hint">Een persoonlijke link, één keer te gebruiken en 30 dagen geldig.</span>
      {link ? (
        <>
          <input className="input invite__link" readOnly value={link} onFocus={(e) => e.currentTarget.select()} aria-label="Uitnodigingslink" />
          <div className="invite__acts">
            {navigator.share ? (
              <button type="button" className="btn" onClick={share}>
                Delen
              </button>
            ) : null}
            <button type="button" className="btn btn--quiet" onClick={copy}>
              Kopieer link
            </button>
            <button type="button" className="linkbtn" onClick={() => (setLink(''), setNote(''), setMsg(''))}>
              Nog een
            </button>
          </div>
        </>
      ) : (
        <div className="invite__acts">
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Voor wie? (alleen voor jezelf)" aria-label="Voor wie is deze uitnodiging" />
          <button type="button" className="btn" onClick={make} disabled={busy}>
            {busy ? 'Even…' : 'Maak link'}
          </button>
        </div>
      )}
      {msg ? (
        <p className="hint" role="status">
          {msg}
        </p>
      ) : null}
    </div>
  )
}

// Na het instellen, als je een eind aan het lezen bent: één keer vragen of je wilt inloggen.
export function JoinSheet({ open, onClose, onSignIn }) {
  const ref = useRef(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog ref={ref} className="sheet sheet--join" onClose={onClose} onClick={(e) => e.target === ref.current && onClose()} aria-labelledby="join-title">
      <div className="sheet__in">
        <div className="sheet__head">
          <span className="kicker">Hoot op al je toestellen</span>
          <button type="button" className="iconbtn" onClick={onClose} aria-label="Sluiten">
            <CloseIcon />
          </button>
        </div>
        <h2 id="join-title" className="join__title">
          Bewaar wat je net hebt ingesteld
        </h2>
        <p className="join__text">Log in met Google. Dan gaan je bronnen, onderwerpen, Bewaard en wat je al las mee naar je telefoon, tablet en computer.</p>
        <div className="join__actions">
          <button type="button" className="btn join__btn" onClick={onSignIn}>
            Inloggen met Google
          </button>
          <button type="button" className="linkbtn" onClick={onClose}>
            Niet nu
          </button>
        </div>
        <p className="sheet__note">Hoot krijgt van Google alleen je naam, e-mailadres en profielfoto.</p>
      </div>
    </dialog>
  )
}
