# Notities voor App Review

Plak de Engelse tekst hieronder in App Store Connect → je versie → **App Review-informatie → Notities**. Beoordelaars lezen meestal Engels. Inloggen is optioneel (de app werkt zonder account), dus "Inloggen vereist" blijft uit. Accounts zijn open voor iedereen: er is geen uitnodigingscode nodig. Plak precies deze tekst ook in ASC, zodat repo en ASC gelijk blijven.

---

Hoot ("Hoot: Nieuws met een einde.") is a calm news reader for Dutch-speaking readers, made by Baldadig.nl. No account is needed: the welcome flow starts with interests (then sources and the optional weekly selection topics); "Liever meteen lezen" skips it and starts with free Dutch sources. Both give the full app. Signing in is optional and only syncs settings and saved items with the Hoot website (gethoot.app).

What the app does
- Edition: three times a day (morning, midday and evening) an edition of ten numbered stories plus an optional "outside your bubble" story, composed on the device from the reader's own sources and interests (the app falls back to our server if that fails; the chosen sources and interests are then sent to compose it, and nothing is stored). Pull to refresh shows the Hoot "h." mark.
- Compare: when several outlets cover the same story, "Vergelijk N bronnen" shows how each of them reports it.
- Stream: all items from the reader's chosen sources, newest first. Optionally, posts from Bluesky accounts the reader adds themselves (public Bluesky API, read-only; none are added by default).
- Selectie (weekly selection): every Monday the three most important professional articles of the week per field (for example paid social, UI/UX, AI, e-commerce), chosen by how many trade publications covered them and by human curation.
- Saved and Search work on the device.

Where the content comes from
- Headlines, short introductions and images come from the publishers' own public RSS feeds and the share image they publish for each article. Every story links to the article on the publisher's website.
- Reader ("Hoot-lezer"): when the reader taps a story, the app loads the publisher's page on the device in a web view, exactly as Safari would, and shows a reader view of it (Mozilla Readability, the technique behind Firefox Reader View), comparable to Safari Reader. Nothing passes through our server and nothing is stored. Consent and login pages of the publisher are shown to the reader unchanged; paywalls stay in place: without a subscription the reader only sees what the publisher shows anyone. Readers can log in to their own subscription on the publisher's site inside the reader; Hoot never sees those credentials. "Open bij de uitgever" is always one tap away, and readers can choose in Settings to open articles on the website or in Safari instead.

Privacy
- No analytics, no advertising, no tracking. Without an account, preferences, saved items, read state and reading preferences stay on the device.
- Optional account (Settings → Account, or "Log in met je account" on the welcome screen): Sign in with Apple or Google. It syncs sources, interests, read state and saved items with the same account on the Hoot website, gethoot.app (Supabase, EU). Accounts are open to everyone; no invitation code is needed. Accounts can be deleted in the app: Settings → Account → "Account verwijderen" removes the account and all synced data from the server, and also revokes Sign in with Apple.

Navigating the app
- Tabs: Editie (Edition), Stroom (Stream), Selectie (weekly selection), Bewaard (Saved), Search. Settings: the gear button at the top right.
- Bluesky: Settings → "Bluesky in de Stroom", then add an account by @handle (for example @theverge.com); it appears in the Stream. Settings also has Weergave (System, Light, Dark, Night).
- On iPad and on wide windows the layout switches to two columns and the tab bar can become a sidebar.

Contact: info@gethoot.app
