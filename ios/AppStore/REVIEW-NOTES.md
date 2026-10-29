# Notities voor App Review

Plak de Engelse tekst hieronder in App Store Connect → je versie → **App Review-informatie → Notities**. Beoordelaars lezen meestal Engels. Inloggen is niet nodig, dus "Inloggen vereist" blijft uit. De uitnodigingscode voor de beoordelaar staat alleen in App Store Connect › App Review-informatie, nooit in deze repo: vul hem daar in op de plek van [CODE].

---

Hoot News is a calm news reader for Dutch-speaking readers, made by Baldadig.nl. No account is needed: on the welcome screen, "Stel je Hoot samen" (choose interests and sources) or "Of kijk eerst even rond" (start with free Dutch sources) both give the full app. Signing in is optional and only syncs settings and saved items with hootnews.nl.

What the app does
- Edition: three times a day (06:00, 12:00, 17:00 Amsterdam time) an edition of ten stories, composed on our server from the reader's own sources and interests. The reader's chosen sources, interests and favourite sources are sent to our server to compose it; nothing is stored.
- Compare: when several outlets cover the same story, "Vergelijk N bronnen" shows how each of them reports it.
- Stream: all items from the reader's chosen sources, newest first. Optionally, posts from Bluesky accounts the reader adds themselves (public Bluesky API, read-only; off by default).
- Selectie (weekly selection): every Monday the three most important professional articles of the week per field (for example paid social, UI/UX, AI, e-commerce), chosen by how many trade publications covered them and by human curation.
- Saved and Search work on the device.

Where the content comes from
- Headlines, short introductions and images come from the publishers' own public RSS feeds and the share image they publish for each article. Every story links to the article on the publisher's website.
- Reader ("Hoot-lezer"): when the reader taps a story, the app loads the publisher's page on the device in a web view, exactly as Safari would, and shows a reader view of it (Mozilla Readability, the technique behind Firefox Reader View), comparable to Safari Reader. Nothing passes through our server and nothing is stored. Consent and login pages of the publisher are shown to the reader unchanged; paywalls stay in place: without a subscription the reader only sees what the publisher shows anyone. Readers can log in to their own subscription on the publisher's site inside the reader; Hoot never sees those credentials. "Open bij de uitgever" is always one tap away, and readers can choose in Settings to open articles on the website or in Safari instead.

Privacy
- No analytics, no advertising, no tracking. Without an account, preferences, saved items, read state and reading preferences stay on the device.
- Optional account (Settings → Account, or "Log in met je account" on the welcome screen): Sign in with Apple or Google. It syncs sources, interests, read state and saved items with the same account on hootnews.nl (Supabase, EU). Hoot accounts are invite-only for now: after signing in, a new user is asked for an invitation code. Invitation code for review: [CODE]. Accounts can be deleted in the app: Settings → Account → "Account verwijderen" removes the account and all synced data from the server.

Navigating the app
- Tabs: Editie (Edition), Stroom (Stream), Selectie (weekly selection), Bewaard (Saved), Search. Settings: the gear button at the top right.
- Bluesky: Settings → "Bluesky in de Stroom", then in the Stream switch to Bluesky and tap "Accounts" to add someone by @handle (for example @theverge.com).
- On iPad and on wide windows the layout switches to two columns and the tab bar can become a sidebar.

Contact: see the App Review contact details.
