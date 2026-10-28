// De vakgebieden van de Vakweek (server: netlify/lib/vak.mjs; app: Instellingen en de tab Vak).
export const VAK_FIELDS = [
  { id: 'paid-social', label: 'Paid social', about: 'Adverteren op Meta, TikTok, LinkedIn en andere platforms' },
  { id: 'ux', label: 'UI/UX', about: 'Interfaces, gebruiksvriendelijkheid en design systems' },
  { id: 'design', label: 'Digital Design', about: 'Merken, beeld en trends in digitaal ontwerp' },
  { id: 'ai', label: 'AI', about: 'Nieuwe modellen, tools, MCP en werkwijzen voor je werk' },
  { id: 'ecommerce', label: 'E-commerce', about: 'Webwinkels, Shopify, conversie en online retail' },
  { id: 'seo', label: 'SEO & content', about: 'Zoekmachines, AI-zoeken, contentstrategie en copywriting' },
  { id: 'merk', label: 'Merk & reclame', about: 'Merkstrategie, campagnes, creatie en reclamebureaus' },
  { id: 'dev', label: 'Development', about: 'Web- en appontwikkeling, front-end, platforms en de praktijk van het vak' },
  { id: 'product', label: 'Productmanagement', about: 'Productstrategie, discovery, roadmaps, productteams en metrics' },
  { id: 'ondernemen', label: 'Startups & ondernemen', about: 'Oprichten, groeien, financiering en ondernemerschap' },
]
export const VAK_FIELD_IDS = VAK_FIELDS.map((f) => f.id)
