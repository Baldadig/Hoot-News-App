import { useEffect, useRef, useState } from 'react'
import { CloseIcon } from './icons.jsx'

// "Inloggen met Google" volgens Googles richtlijnen voor de knop (donker thema): hun eigen
// G in kleur, Roboto Medium, bijna zwart met een grijze rand. Kleuren en letter liggen vast.
const G_LOGO = (
  <svg className="gbtn__logo" viewBox="0 0 48 48" width="20" height="20" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </svg>
)

export function GoogleButton({ onClick, wide = false }) {
  return (
    <button type="button" className={`gbtn${wide ? ' gbtn--wide' : ''}`} onClick={onClick}>
      {G_LOGO}
      <span>Inloggen met Google</span>
    </button>
  )
}

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
        <GoogleButton onClick={signIn} />
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
          <GoogleButton onClick={onSignIn} wide />
          <button type="button" className="linkbtn" onClick={onClose}>
            Niet nu
          </button>
        </div>
        <p className="sheet__note">Hoot krijgt van Google alleen je naam, e-mailadres en profielfoto.</p>
      </div>
    </dialog>
  )
}
