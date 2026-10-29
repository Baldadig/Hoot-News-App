// De onderwerpen van de Selectie, in acht domeinen (server: netlify/lib/vak.mjs; app: Instellingen
// en de tab Selectie). Een domein is een wereld (je werk of wat je bezighoudt), een onderwerp is
// wat je volgt. De id's van de eerste tien blijven gelijk: wie die al koos, houdt ze.
export const VAK_DOMAINS = [
  { id: 'marketing', label: 'Marketing & communicatie' },
  { id: 'creatie', label: 'Design & creatie' },
  { id: 'tech', label: 'Tech & product' },
  { id: 'werk', label: 'Ondernemen & werk' },
  { id: 'geld', label: 'Geld & economie' },
  { id: 'wetenschap', label: 'Wetenschap & gezondheid' },
  { id: 'maatschappij', label: 'Maatschappij' },
  { id: 'cultuur', label: 'Cultuur & vrije tijd' },
]

export const VAK_FIELDS = [
  // Marketing & communicatie
  { id: 'merk', domain: 'marketing', label: 'Merk & reclame', about: 'Merkstrategie, campagnes, creatie en reclamebureaus' },
  { id: 'paid-social', domain: 'marketing', label: 'Online adverteren', about: 'Adverteren op social media en in zoekmachines' },
  { id: 'seo', domain: 'marketing', label: 'SEO & content', about: 'Zoekmachines, AI-zoeken, contentstrategie en copywriting' },
  { id: 'pr', domain: 'marketing', label: 'PR & communicatie', about: 'Woordvoering, corporate en interne communicatie' },
  { id: 'social', domain: 'marketing', label: 'Social media & creators', about: 'Platforms, creators, influencers en community' },
  // Design & creatie
  { id: 'ux', domain: 'creatie', label: 'UI/UX', about: 'Interfaces, gebruiksvriendelijkheid en design systems' },
  { id: 'design', domain: 'creatie', label: 'Digitaal ontwerp', about: 'Merken, beeld en trends in digitaal ontwerp' },
  { id: 'architectuur', domain: 'creatie', label: 'Architectuur & wonen', about: 'Architectuur, stedenbouw en interieur' },
  { id: 'fotografie', domain: 'creatie', label: 'Fotografie', about: 'Fotografie als vak en als hobby' },
  // Tech & product
  { id: 'ai', domain: 'tech', label: 'AI', about: 'Nieuwe modellen, tools en werken met AI' },
  { id: 'dev', domain: 'tech', label: 'Development', about: 'Web- en appontwikkeling en de praktijk van het vak' },
  { id: 'product', domain: 'tech', label: 'Productmanagement', about: 'Productstrategie, discovery, roadmaps en productteams' },
  { id: 'data', domain: 'tech', label: 'Data & analytics', about: 'Data-analyse, BI, data engineering en meten' },
  { id: 'security', domain: 'tech', label: 'Security & privacy', about: 'Cybersecurity, lekken en hacks, privacy en de AVG' },
  { id: 'gadgets', domain: 'tech', label: 'Tech & gadgets', about: 'Telefoons, laptops, apps en andere techniek' },
  // Ondernemen & werk
  { id: 'ondernemen', domain: 'werk', label: 'Startups & ondernemen', about: 'Oprichten, groeien, financiering en ondernemerschap' },
  { id: 'ecommerce', domain: 'werk', label: 'E-commerce & retail', about: 'Webwinkels, conversie en de winkelstraat' },
  { id: 'leiderschap', domain: 'werk', label: 'Leiderschap & management', about: 'Leidinggeven, organisaties en strategie' },
  { id: 'hr', domain: 'werk', label: 'HR & werk', about: 'Arbeidsmarkt, werving, cultuur en loopbaan' },
  // Geld & economie
  { id: 'economie', domain: 'geld', label: 'Economie', about: 'Economisch beleid, bedrijven en markten' },
  { id: 'geld', domain: 'geld', label: 'Geld & beleggen', about: 'Sparen, pensioen, belastingen en beleggen' },
  { id: 'vastgoed', domain: 'geld', label: 'Wonen & vastgoed', about: 'Woningmarkt, hypotheken, bouw en vastgoed' },
  // Wetenschap & gezondheid
  { id: 'wetenschap', domain: 'wetenschap', label: 'Wetenschap', about: 'Onderzoek en ontdekkingen, uitgelegd' },
  { id: 'zorg', domain: 'wetenschap', label: 'Zorg & gezondheid', about: 'De zorg en je gezondheid' },
  { id: 'klimaat', domain: 'wetenschap', label: 'Klimaat & energie', about: 'Klimaat, energietransitie en duurzaamheid' },
  // Maatschappij
  { id: 'politiek', domain: 'maatschappij', label: 'Politiek & bestuur', about: 'Den Haag, gemeenten, Europa en beleid' },
  { id: 'recht', domain: 'maatschappij', label: 'Recht', about: 'Rechtspraak, wetgeving en advocatuur' },
  { id: 'onderwijs', domain: 'maatschappij', label: 'Onderwijs', about: 'Van basisschool tot universiteit' },
  { id: 'media', domain: 'maatschappij', label: 'Journalistiek & media', about: 'Journalistiek, mediabedrijven en omroepen' },
  // Cultuur & vrije tijd
  { id: 'film', domain: 'cultuur', label: 'Film & series', about: 'Recensies, achtergronden en de filmwereld' },
  { id: 'muziek', domain: 'cultuur', label: 'Muziek', about: 'Nieuwe muziek, recensies en verhalen' },
  { id: 'boeken', domain: 'cultuur', label: 'Boeken', about: 'Recensies, schrijvers en de boekenwereld' },
  { id: 'kunst', domain: 'cultuur', label: 'Kunst & musea', about: 'Beeldende kunst, tentoonstellingen en erfgoed' },
  { id: 'gaming', domain: 'cultuur', label: 'Gaming', about: 'Games, recensies en de gamewereld' },
  { id: 'eten', domain: 'cultuur', label: 'Eten & drinken', about: 'Koken, restaurants, wijn en de foodwereld' },
  { id: 'reizen', domain: 'cultuur', label: 'Reizen', about: 'Bestemmingen, reisverhalen en de reiswereld' },
  { id: 'sport', domain: 'cultuur', label: 'Sport', about: 'Achtergrond en analyse, niet alleen de uitslag' },
]
export const VAK_FIELD_IDS = VAK_FIELDS.map((f) => f.id)
// Per domein zijn onderwerpen, in de volgorde hierboven.
export const vakByDomain = (fields = VAK_FIELDS) => VAK_DOMAINS.map((d) => ({ ...d, fields: fields.filter((f) => f.domain === d.id) })).filter((d) => d.fields.length)
