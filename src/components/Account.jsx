import { useState } from 'react'
import { Dialog, DialogHeader } from './Dialog.jsx'

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
const SYNC = { idle: 'Gesynchroniseerd', pending: 'Wacht op verbinding', syncing: 'Synchroniseren…', ok: 'Gesynchroniseerd', error: 'Synchroniseren lukte niet; straks opnieuw' }

export function AccountSettings({ account, syncStatus }) {
  const { status, user, profile, signIn, signOut, invite } = account
  if (status === 'loading') return <p className="hint">Even geduld…</p>
  if (status === 'out')
    return (
      <div className="setrow setrow--stack">
        <div className="setrow__text">
          <span className="setrow__label">{invite ? 'Je bent uitgenodigd' : 'Inloggen'}</span>
          <span className="setrow__hint">{invite ? 'Maak je account' : 'Op al je toestellen'}</span>
        </div>
        <GoogleButton onClick={signIn} />
      </div>
    )
  const email = user?.email || 'je account'
  return (
    <div className="rows">
      <div className="setrow">
        <div className="setrow__text">
          <span className="setrow__label">{email}</span>
          <span className="setrow__hint">{status === 'noInvite' ? 'Nog geen lid' : SYNC[syncStatus] || SYNC.ok}</span>
        </div>
        <button type="button" className="btn btn--quiet" onClick={signOut}>
          Uitloggen
        </button>
      </div>
      {status === 'noInvite' ? <RedeemRow account={account} /> : null}
      {profile?.is_admin ? <InviteRow account={account} /> : null}
    </div>
  )
}

// Ingelogd, nog geen lid: de uitnodiging alsnog verzilveren (zoals in de app).
const REDEEM = { ongeldig: 'Deze code werkt niet. Vraag een nieuwe uitnodiging.', fout: 'Dat lukte niet. Probeer het opnieuw.' }

function RedeemRow({ account }) {
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    setMsg('')
    let result
    try {
      result = await account.redeem(code)
    } catch {
      result = 'fout'
    }
    setBusy(false)
    if (result !== 'ok') setMsg(REDEEM[result] || REDEEM.fout)
  }
  return (
    <form className="invite" onSubmit={submit}>
      <span className="setrow__label">Lid worden</span>
      <span className="setrow__hint">Plak je uitnodigingslink of code.</span>
      <div className="invite__acts">
        <input className="input" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Uitnodigingslink of code" aria-label="Uitnodigingslink of code" autoCapitalize="off" autoCorrect="off" spellCheck={false} />
        <button type="submit" className="btn" disabled={busy || !code.trim()}>
          {busy ? 'Even…' : 'Word lid'}
        </button>
      </div>
      {msg ? (
        <p className="hint" role="status">
          {msg}
        </p>
      ) : null}
    </form>
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
      <span className="setrow__hint">Werkt één keer, 30 dagen lang.</span>
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
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Voor wie?" aria-label="Voor wie is deze uitnodiging" />
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

// Inloggen, in een blad. Twee ingangen met elk een eigen kop: vanuit "Jouw Editie in één minuut"
// (`reason` 'brief': gaat over de samenvatting), of vanzelf na een eind lezen (alleen als je via een
// uitnodigingslink binnenkwam, zie src/lib/join.js). Hoot is op uitnodiging; dat staat er vóór je inlogt.
const JOIN = {
  brief: {
    kicker: 'Voor leden',
    title: 'De Editie in één minuut',
    text: 'Een korte samenvatting door AI, met de bronnen erbij.',
  },
  // Inloggen rechtsboven op de rode intro van Welkom (zoals in de app): je hebt nog niets ingesteld.
  welkom: {
    kicker: 'Al lid?',
    title: 'Log in met Google.',
    text: null,
  },
  sync: {
    kicker: 'Hoot op al je toestellen',
    title: 'Log in om te bewaren wat je instelde',
    text: null,
  },
}

export function JoinSheet({ open, reason = 'sync', invited = false, onClose, onSignIn }) {
  const copy = JOIN[reason] || JOIN.sync
  return (
    <Dialog open={open} onClose={onClose} className="sheet--join" labelledBy="join-title">
      <DialogHeader id="join-title" label={copy.kicker} title={copy.title} onClose={onClose} />
      {copy.text ? <p className="join__text">{copy.text}</p> : null}
      <p className="join__text">
        {invited
          ? 'Je bent uitgenodigd. Log in, dan ben je meteen lid.'
          : 'Een account is op uitnodiging. Lezen kan zonder account. Heb je een code? Log in en vul hem in.'}
      </p>
      <div className="join__actions">
        <GoogleButton onClick={onSignIn} wide />
        <button type="button" className="linkbtn linkbtn--plain" onClick={onClose}>
          Niet nu
        </button>
      </div>
      <p className="sheet__note">
        Hoot krijgt van Google alleen je naam, e-mailadres en profielfoto.{' '}
        <a className="linkbtn linkbtn--inline" href="#/privacy" onClick={onClose}>
          Privacy
        </a>
      </p>
    </Dialog>
  )
}
