// Echte koppen en samenvattingen uit de feed van 9 oktober 2026 (de dag van de audit).
let n = 0
const at = (h) => new Date(Date.UTC(2026, 9, 9, 6, 0) - h * 3600e3).toISOString()
export const art = (source, title, summary = '', hoursAgo = 2, extra = {}) => ({
  id: 'a' + ++n,
  kind: 'article',
  source,
  sourceName: source,
  title,
  summary,
  text: summary,
  image: 'x.jpg',
  publishedAt: at(hoursAgo),
  ...extra,
})
export const NOW = Date.UTC(2026, 9, 9, 6, 30)
export const MAIN = new Set(['nrc', 'volkskrant', 'nyt', 'theverge', 'wired', 'nos'])

export const ice = () => [
  art('nos', 'ICE schiet man neer in auto in New York, met kind van 5 op achterbank', 'De Amerikaanse immigratiedienst ICE heeft in de stad New York een man neergeschoten in zijn auto. Volgens burgemeester Mamdani zat er ook een 5-jarig kind in de auto.', 3),
  art('volkskrant', 'Agent immigratiepolitie schiet man neer in New York, burgemeester wil vertrek ICE uit zijn stad', '', 2),
  art('nyt', 'ICE Agent Shoots Man During Arrest Attempt in New York Neighborhood', 'The man was in a car with a 5-year-old in the back seat when he was shot and wounded, the authorities said.', 4),
  art('bbc', 'ICE agent shoots man in New York City', 'The mayor of New York expressed outrage at the shooting which the Department of Homeland Security said happened during the arrest of a "criminal illegal alien".', 3),
]
export const hasan = () => [
  art('nos', 'Pentagon wil executie Nidal Hasan door vuurpeloton live uitzenden', 'Het Amerikaanse ministerie van Defensie wil de executie van een man die in 2009 dertien mensen doodde livestreamen.', 2),
  art('volkskrant', 'VS gaan executie van militair door vuurpeloton live uitzenden', 'Het Amerikaanse ministerie van Defensie wil de executie van een man die in 2009 dertien mensen doodde livestreamen.', 2),
  art('bbc', 'Firing squad execution to be livestreamed, Pentagon says', 'Pete Hegseth says the execution will be public, but a legal expert says the "unprecedented" decision is on "uncertain legal terrain".', 5),
  art('npr', 'Pentagon says the firing squad execution of Fort Hood shooter will be livestreamed', 'The Pentagon says the firing squad execution of Fort Hood shooter Nidal Malik Hasan will be livestreamed after Defense Secretary Pete Hegseth said the execution would be public.', 6),
  art('theverge', 'US plans livestream of execution by firing squad', "The United States' execution of the Fort Hood shooter will be livestreamed, anonymous officials from the Defense Department told the BBC and Associated Press.", 4),
  art('nyt', 'Fort Hood Shooter’s Execution Will Be Public and Streamed Live, Pentagon Says', 'If carried out, the public execution of Maj. Nidal Malik Hasan by firing squad would be the first of its kind in generations.', 7),
]
// Lijken op elkaar, maar zijn andere gebeurtenissen.
export const lookalikes = () => [
  art('wired', 'ICE Agent at NYC Shooting Has History of Alleged Violence and Illegal Arrests', 'Brenden Cuni, an ICE supervisor, has been accused of excessive force and tackling people.', 3),
  art('nrc', 'Twee indringers opgepakt op terrein van Britse luchtmachtbasis in Cambridgeshire', 'De politie arresteerde twee mannen bij de basis van de Royal Air Force.', 3),
  art('bbc', 'Bear kills man in home attack near Mongolian capital', 'Police in Ulaanbaatar said the man died at the scene.', 3),
  art('guardian', 'Russian attack on bus kills at least 30 people near Ukraine frontline', 'Ukraine accused Russia of targeting two crowded vehicles in the front line city of Kramatorsk.', 3),
  art('wired', 'Life Is Asymmetric. The Scientists Who Figured Out Why Won the 2026 Nobel Prize in Chemistry', 'Three researchers share the prize.', 3),
  art('guardian', 'Anne Carson wins Nobel prize in literature 2026', 'The Canadian poet was praised by the Swedish Academy.', 3),
  art('nrc', 'Dilemma voor het Nobelcomité: uitwijken voor Trump of tegen hem opstaan', 'Vrijdag wordt de Nobelprijs voor de Vrede bekendgemaakt.', 3),
  art('aljazeera', 'Trump says US will not strike Iran before midterm elections', 'Oil prices drop as Trump dismisses speculation of pre-midterm military action against Iran.', 3),
  art('nos', 'Iran executeert drie demonstranten na massaproces', 'Mensenrechtenorganisaties spreken van een schijnproces in Teheran.', 3),
]
