// Bewaart een artikel in Instapaper via de Simple API.
// Inloggegevens staan veilig als Netlify-omgevingsvariabelen (nooit in de client):
//   INSTAPAPER_USERNAME  = je Instapaper e-mail
//   INSTAPAPER_PASSWORD  = je Instapaper wachtwoord (account moet een wachtwoord hebben)
const json = (status, obj) => ({
  statusCode: status,
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify(obj),
})

export const handler = async (event) => {
  if ((event.httpMethod || 'POST') !== 'POST') return json(405, { error: 'method_not_allowed' })

  const user = process.env.INSTAPAPER_USERNAME
  const pass = process.env.INSTAPAPER_PASSWORD
  if (!user || !pass) return json(503, { error: 'not_configured' })

  let url
  let title
  try {
    const b = JSON.parse(event.body || '{}')
    url = b.url
    title = b.title
  } catch {
    return json(400, { error: 'bad_request' })
  }
  if (!url) return json(400, { error: 'missing_url' })

  const auth = Buffer.from(`${user}:${pass}`).toString('base64')
  const params = new URLSearchParams({ url })
  if (title) params.set('title', title)

  try {
    const res = await fetch('https://www.instapaper.com/api/add', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'HootReader/0.6 (+https://hoot.app)',
      },
      body: params.toString(),
      signal: AbortSignal.timeout(9000),
    })
    if (res.status === 200 || res.status === 201) return json(200, { ok: true })
    if (res.status === 403) return json(401, { error: 'auth' })
    return json(502, { error: 'instapaper', status: res.status })
  } catch {
    return json(502, { error: 'network' })
  }
}
