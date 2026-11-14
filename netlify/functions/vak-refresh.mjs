// Elk uur de vakbronnen ophalen (feeds bewaren maar een paar dagen; zo missen we niets van de
// week). Op maandag na 07:00 stelt de eerste ronde de nieuwe Vakweek samen. Een ronde blijft binnen
// de tijd (FETCH_MS en OG_MS in vakRefresh.mjs).
import { refreshVak } from '../lib/vakRefresh.mjs'

export default async () => {
  const doc = await refreshVak()
  return new Response(`ok ${doc.week}`)
}

export const config = { schedule: '5 * * * *' }
