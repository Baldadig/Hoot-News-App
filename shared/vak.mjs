// De vakgebieden van de Vakweek (server: netlify/lib/vak.mjs; app: Instellingen en de tab Vak).
export const VAK_FIELDS = [
  { id: 'paid-social', label: 'Paid social', about: 'Adverteren op Meta, TikTok, LinkedIn en andere platforms' },
  { id: 'ux', label: 'UI/UX', about: 'Interfaces, gebruiksvriendelijkheid en design systems' },
  { id: 'design', label: 'Digital Design', about: 'Merken, beeld en trends in digitaal ontwerp' },
  { id: 'ai', label: 'AI', about: 'Nieuwe modellen, tools, MCP en werkwijzen voor je werk' },
]
export const VAK_FIELD_IDS = VAK_FIELDS.map((f) => f.id)
