import { useId, useState } from 'react'
import { Dialog, DialogHeader } from './Dialog.jsx'
import { pendingShown, PENDING_TEXT } from '../lib/membership.js'
import { useOnline } from '../hooks/useOnline.js'
import { AccountIcon } from './icons.jsx'
import '../styles/account.css'
import { DELETE_TEXT, deleteAccount, appleCode } from '../lib/accountDelete.js'

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

// Een melding met een zichtbare Annuleer en precies wat er verandert (zoals de .alert van de app).
// `actions`: { label, kind: 'cancel' | 'danger' | 'plain', onClick }, in de volgorde van de app.
export function ConfirmDialog({ open, title, message, actions, onClose, busy = false }) {
  const id = useId()
  return (
    <Dialog open={open} onClose={onClose} className="sheet--confirm" labelledBy={id}>
      <h2 id={id} className="head-lg confirm__title">
        {title}
      </h2>
      <p className="confirm__text">{message}</p>
      <div className="confirm__actions">
        {actions.map((a) => (
          <button key={a.label} type="button" className={`btn${a.kind === 'cancel' ? ' btn--quiet' : a.kind === 'danger' ? ' btn--accent' : ''}`} onClick={a.onClick} disabled={busy} aria-busy={busy && a.kind === 'danger' ? 'true' : undefined}>
            {a.label}
          </button>
        ))}
      </div>
    </Dialog>
  )
}

// Account in Instellingen: inloggen, wie je bent en synchroniseren. Bovenaan Instellingen als
// accountkaart met de samenvatting van je Hoot (`summary`, Instellingen A met de samenvatting uit B).
// Met `manage` (Instellingen) ook Nu synchroniseren en Account verwijderen, zoals de accountpagina van de app.
// Status zoals de app: "Ingelogd" tot de eerste keer synchroniseren gelukt is, daarna "Gesynchroniseerd".
const SYNC = { pending: 'Wacht op verbinding', syncing: 'Synchroniseren…', error: 'Synchroniseren lukte niet; straks opnieuw' }
const syncLine = (syncStatus, pulled) => SYNC[syncStatus] || (pulled ? 'Gesynchroniseerd' : 'Ingelogd')

export function AccountSettings({ account, syncStatus, summary = null, manage = false }) {
  const { status, user, signIn, signOut } = account
  const pending = pendingShown(account, useOnline())
  // 'delete': de vraag; 'apple': intrekken bij Apple lukte niet, niets gewist.
  const [ask, setAsk] = useState(null)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState(null)

  const remove = async (skipApple = false) => {
    setBusy(true)
    setNote(null)
    const res = await deleteAccount({ client: account.client, skipApple, reauth: account.reauth || appleCode })
    if (res.ok) {
      // Netjes uitgelogd: eerst lokaal (de gebruiker bestaat op de server niet meer), dan zoals
      // Uitloggen, dat ook de gegevens van dit account van het toestel haalt.
      try {
        await account.client?.auth.signOut({ scope: 'local' })
      } catch {
        /* de sessie is al weg */
      }
      try {
        await signOut()
      } catch {
        /* idem */
      }
      setNote(res.note || null)
    } else if (res.appleFailed) {
      setAsk('apple')
      setBusy(false)
      return
    } else setNote(res.message)
    setAsk(null)
    setBusy(false)
  }
  const keep = () => {
    setAsk(null)
    setNote(DELETE_TEXT.stays)
  }

  if (status === 'loading') return <p className="hint">Even geduld…</p>
  if (status === 'out')
    return (
      <div className="acard">
        <div className="acard__row">
          <span className="acard__av" aria-hidden="true">
            <AccountIcon />
          </span>
          <div className="setrow__text">
            <span className="acard__name">Inloggen</span>
            <span className="setrow__hint">Bewaar je Hoot op al je toestellen</span>
            {summary ? <span className="setrow__hint acard__sum">{summary}</span> : null}
          </div>
        </div>
        <GoogleButton onClick={signIn} />
        <p className="sheet__note acard__note">Lezen kan zonder account.</p>
        {note ? (
          <p className="acard__msg" role="status">
            {note}
          </p>
        ) : null}
      </div>
    )
  const email = user?.email || 'je account'
  const waiting = account.status === 'in' && !account.profile
  return (
    <div className="acard">
      <div className="acard__row">
        <span className="acard__av acard__av--in" aria-hidden="true">
          {email.slice(0, 1).toUpperCase()}
        </span>
        <div className="setrow__text">
          <span className="acard__name">{email}</span>
          {summary ? <span className="setrow__hint acard__sum">{summary}</span> : null}
          <span className="setrow__hint">{pending ? PENDING_TEXT : waiting ? SYNC.pending : syncLine(syncStatus, account.pulled)}</span>
        </div>
        <button type="button" className="btn btn--quiet" onClick={signOut}>
          Uitloggen
        </button>
      </div>
      {pending ? <RetryRow account={account} /> : null}
      {manage ? (
        <div className="acard__manage">
          {!waiting ? (
            <>
              <button type="button" className="btn btn--quiet" onClick={() => account.syncNow?.()} disabled={syncStatus === 'syncing'}>
                Nu synchroniseren
              </button>
              <p className="sheet__note acard__note">Weergave en lezen blijven per toestel.</p>
            </>
          ) : null}
          <button type="button" className="btn btn--quiet" onClick={() => setAsk('delete')} disabled={busy}>
            Account verwijderen
          </button>
        </div>
      ) : null}
      {note ? (
        <p className="acard__msg" role="status">
          {note}
        </p>
      ) : null}
      <ConfirmDialog
        open={ask === 'delete'}
        title={DELETE_TEXT.title}
        message={DELETE_TEXT.message}
        busy={busy}
        onClose={() => setAsk((a) => (a === 'delete' ? null : a))}
        actions={[
          { label: DELETE_TEXT.cancel, kind: 'cancel', onClick: () => setAsk(null) },
          { label: DELETE_TEXT.confirm, kind: 'danger', onClick: () => remove(false) },
        ]}
      />
      <ConfirmDialog
        open={ask === 'apple'}
        title={DELETE_TEXT.appleTitle}
        message={DELETE_TEXT.appleMessageWeb}
        busy={busy}
        onClose={() => setAsk((a) => (a === 'apple' ? null : a))}
        actions={[
          { label: DELETE_TEXT.cancel, kind: 'cancel', onClick: keep },
          { label: DELETE_TEXT.appleSkip, kind: 'danger', onClick: () => remove(true) },
        ]}
      />
    </div>
  )
}

// Ingelogd, maar het profiel ontbreekt nog (zeldzaam): nog eens proberen.
function RetryRow({ account }) {
  const [busy, setBusy] = useState(false)
  const again = async () => {
    setBusy(true)
    try {
      await account.retry()
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="setrow">
      <button type="button" className="btn" onClick={again} disabled={busy}>
        {busy ? 'Even…' : 'Opnieuw'}
      </button>
    </div>
  )
}

// Inloggen, in een blad. Drie ingangen met elk een eigen kop: vanuit "De Editie in één minuut"
// (`reason` 'brief': gaat over de samenvatting), Inloggen op Welkom ('welkom'), of vanzelf na een
// eind lezen ('sync', zie src/lib/join.js). Een account is er voor iedereen.
export const JOIN_TEXT = 'Lezen kan zonder account. Met een account reist je Hoot mee naar je andere toestellen.'

const JOIN = {
  brief: {
    kicker: 'Met een account',
    title: 'De Editie in één minuut',
    text: 'Een korte samenvatting door AI, met de bronnen erbij.',
  },
  // Inloggen rechtsboven op de rode intro van Welkom (zoals in de app): je hebt nog niets ingesteld.
  welkom: {
    kicker: 'Al een account?',
    title: 'Log in met Google.',
    text: null,
  },
  sync: {
    kicker: 'Hoot op al je toestellen',
    title: 'Log in om te bewaren wat je instelde',
    text: null,
  },
}

export function JoinSheet({ open, reason = 'sync', onClose, onSignIn }) {
  const copy = JOIN[reason] || JOIN.sync
  return (
    <Dialog open={open} onClose={onClose} className="sheet--join" labelledBy="join-title">
      <DialogHeader id="join-title" label={copy.kicker} title={copy.title} onClose={onClose} />
      {copy.text ? <p className="join__text">{copy.text}</p> : null}
      <p className="join__text">{JOIN_TEXT}</p>
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
