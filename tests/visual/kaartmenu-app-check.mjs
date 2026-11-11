// Reproduceerbare app-keuring: eerst Vite starten, dan dit script met --stills <map>.
// Keurder kaartmenu: echte app (vite dev op 5311, live data), headless Chrome via CDP.
// Per breedte en per route: alle ⋯-knoppen in .meta/.kmeta, per soort (klasse van de kaart + kolombreedte)
// een paar openen, meten voor/na, menu binnen venster, onderaan het scherm, Esc/klik-buiten/Tab/pijltjes, aria.
import { spawn } from 'node:child_process'
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { bottomPosition } from './kaartmenu-position.mjs'
const arg = k => process.argv.includes(k) ? process.argv[process.argv.indexOf(k)+1] : null
const OUT = resolve(arg('--stills') || mkdtempSync(join(tmpdir(),'kaartmenu-app-')))
mkdirSync(OUT,{recursive:true})
const SCR = process.env.SCR || OUT
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const DEBUG = 9411, BASE = arg('--url') || 'http://127.0.0.1:5311/lees/'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${DEBUG}`, `--user-data-dir=${mkdtempSync(join(SCR, 'chr-'))}`, 'about:blank'], { stdio: 'ignore' })
let ws, id = 0
const pending = new Map()
const send = (method, params = {}) => new Promise((ok, fail) => { const n = ++id; pending.set(n, { ok, fail }); ws.send(JSON.stringify({ id: n, method, params })) })
const ev = async (expression) => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400)); return r.result.value }
const shot = async (name) => { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(join(OUT, name + '.png'), Buffer.from(r.data, 'base64')) }
const key = async (k, code, vk) => { await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, windowsVirtualKeyCode: vk, ...(k === 'Enter' ? { text: '\r' } : {}) }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk }) }
let touchInput = false
const click = async (x, y) => { if(touchInput) { await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});return } for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 }) }

const HELP = `
window.__bottomPosition = ${bottomPosition.toString()};
window.__k = {
  scroll: b => { let p=b.parentElement; while(p && p!==document.body) {const s=getComputedStyle(p).overflowY;if((s==='auto'||s==='scroll')&&p.scrollHeight>p.clientHeight)return p;p=p.parentElement}return document.scrollingElement },
  // Meet de aanklikbare onderrand: op smal kan de vaste terugknop de menuknop bedekken.
  bottom: b => { const r=b.getBoundingClientRect(),x=r.left+r.width/2;return Math.min(innerHeight, __k.scroll(b).getBoundingClientRect().bottom,...[...document.querySelectorAll('.totop')].filter(e=>{const s=getComputedStyle(e),q=e.getBoundingClientRect();return s.pointerEvents!=='none' && s.visibility!=='hidden' && +s.opacity>0 && q.width && q.left<=x && q.right>=x}).map(e=>e.getBoundingClientRect().top)) },
  menuBottom: () => Math.min(innerHeight,...[...document.querySelectorAll('.app__nav,.nav')].map(e=>e.getBoundingClientRect()).filter(r=>r.width>r.height && r.top>0 && r.bottom>=innerHeight-1).map(r=>r.top)),
  btns: () => [...document.querySelectorAll(':is(.meta,.kmeta) > button[aria-haspopup="menu"]')].filter(b => b.offsetParent),
  kind: (b) => { const card = b.closest('article, li, .kaart, [data-id]') || b.parentElement; const col = b.closest('[class*="col"]'); return (card.className.split(' ')[0]||card.tagName) + '|' + (b.closest('.kmeta') ? 'kmeta' : 'meta') + '|w' + Math.round(b.closest('.meta,.kmeta').getBoundingClientRect().width/40)*40 },
  rect: (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return { x: +b.left.toFixed(1), y: +b.top.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1), r: +b.right.toFixed(1), b: +b.bottom.toFixed(1) } },
  row: (b) => { const row = b.closest('.meta,.kmeta'); const kids = [...row.querySelectorAll('*')].filter(e => e.getClientRects().length).map(e => __k.rect(e));
    // woordbreuk: elk tekstknooppunt — elk woord op één regel?
    const broken = []; const w = document.createTreeWalker(row, NodeFilter.SHOW_TEXT); let n;
    while ((n = w.nextNode())) { const t = n.textContent; const re = /\\S+/g; let m; while ((m = re.exec(t))) { const r = document.createRange(); r.setStart(n, m.index); r.setEnd(n, m.index + m[0].length); const rs = [...r.getClientRects()].filter(x=>x.width>0); const tops = new Set(rs.map(x => Math.round(x.top))); if (tops.size > 1) broken.push(m[0]) } }
    const name = row.querySelector('.srcmeta__name'), time = row.querySelector('.srcmeta__time');
    const lines = (el) => { if (!el) return null; const r = document.createRange(); r.selectNodeContents(el); return new Set([...r.getClientRects()].filter(x=>x.width>0).map(x=>Math.round(x.top))).size };
    return { row: __k.rect(row), kids, broken, nameLines: lines(name), timeLines: lines(time), name: name?.textContent, time: time?.textContent, text: row.innerText.replace(/\\s+/g,' ').slice(0,120) } },
}`

const result = { checks: [], fails: [] }
const ok = (cond, label, data) => { result.checks.push({ ok: !!cond, label, data }); if (!cond) { result.fails.push({ label, data }); console.log('FOUT', label, JSON.stringify(data).slice(0, 300)) } }

try {
  let page
  for (let i = 0; i < 50 && !page; i++) { await sleep(200); page = await fetch(`http://127.0.0.1:${DEBUG}/json/list`).then((r) => r.json()).then((l) => l.find((t) => t.type === 'page')).catch(() => null) }
  ws = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((o) => ws.addEventListener('open', o))
  ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); const p = pending.get(m.id); if (p) { pending.delete(m.id); m.error ? p.fail(new Error(m.error.message)) : p.ok(m.result) } })
  await send('Page.enable'); await send('Runtime.enable')
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `try{ if(!localStorage.getItem('hoot:prefs')) localStorage.setItem('hoot:prefs', JSON.stringify({muted:[],pinned:[],onboarded:true,joinAsked:{n:2}})) }catch{}` })
  const SCHERMEN = (process.env.W ? process.env.W.split(',').map(Number) : [1440, 1280, 1024, 390]).map((w) => [w, w === 390 ? 844 : w === 1024 ? 768 : +(process.env.HEIGHT || 900), w === 390])
  const ROUTES = (process.env.R || 'editie,stroom').split(',')
  for (const [w, h, mobile] of SCHERMEN) {
    touchInput = mobile
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 2, mobile, screenWidth: w, screenHeight: h })
    await send('Emulation.setEmulatedMedia', { features: mobile ? [{ name: 'hover', value: 'none' }, { name: 'pointer', value: 'coarse' }, { name: 'any-hover', value: 'none' }, { name: 'any-pointer', value: 'coarse' }] : [{ name: 'hover', value: 'hover' }, { name: 'pointer', value: 'fine' }, { name: 'any-hover', value: 'hover' }, { name: 'any-pointer', value: 'fine' }] })
    await send('Emulation.setTouchEmulationEnabled', mobile ? { enabled: true, maxTouchPoints: 5 } : { enabled: false })
    for (const route of ROUTES) {
      await send('Emulation.setDeviceMetricsOverride', { width:w,height:h,deviceScaleFactor:2,mobile,screenWidth:w,screenHeight:h })
      await send('Page.navigate', { url: BASE + '#/' + route })
      let n = 0
      for (let i = 0; i < 200; i++) { await sleep(500); try { await ev(HELP); n = await ev('__k.btns().length') } catch { n = 0 } if (n >= 3) break }
      await sleep(2500); await ev(HELP); await ev('document.fonts.ready.then(()=>1)')
      // Sluit een eventuele starttip via haar gewone knop; geen app- of voorkeurenlogica aanpassen.
      const tip = await ev(`(() => { const b=document.querySelector('.toast--tip [aria-label="Tip sluiten"]');return b && __k.rect(b) })()`)
      if(tip) {await click(tip.x+tip.w/2,tip.y+tip.h/2);await sleep(250)}
      n = await ev('__k.btns().length')
      await shot(`${w}-${route}-overzicht`)
      ok(n > 0, `${w} ${route}: ⋯-knoppen gevonden`, { n })
      // soorten
      const kinds = await ev(`(() => { const m = {}; __k.btns().forEach((b,i) => { const k = __k.kind(b); (m[k] ||= []).push(i) }); return m })()`)
      console.log(w, route, n, JSON.stringify(kinds))
      result.checks.push({ ok: true, label: `${w} ${route} soorten`, data: kinds })
      let shotN = 0
      for (const [kind, idxs] of Object.entries(kinds)) {
        for (const pos of ['midden', 'onder']) {
          const i = pos === "onder" ? idxs[Math.floor(idxs.length / 2)] : idxs[0]
          // Eerst de oorspronkelijke vensterhoogte herstellen; geen aangepaste opstelling laten doorlekken.
          await send('Emulation.setDeviceMetricsOverride', { width:w,height:h,deviceScaleFactor:2,mobile,screenWidth:w,screenHeight:h })
          await ev('document.activeElement?.blur?.()'); await sleep(250)
          const setup = []
          if (pos === 'midden') {
            await ev(`(() => { const b=__k.btns()[${i}], sc=__k.scroll(b);sc.scrollTop += b.getBoundingClientRect().top - innerHeight*0.4 })()`)
            await sleep(500)
          } else {
            // Afbeeldingen en de mast kunnen tijdens het scrollen de geometrie nog wijzigen.
            for (let attempt=0;attempt<5;attempt++) {
              const p = await ev(`(() => { const b=__k.btns()[${i}],r=b.getBoundingClientRect(),sc=__k.scroll(b);return __bottomPosition({top:r.top,height:r.height,scrollTop:sc.scrollTop,scrollMax:sc.scrollHeight-sc.clientHeight,viewportHeight:innerHeight,lowerEdge:__k.bottom(b),gutter:parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--gutter'))}) })()`)
              setup.push(p)
              if (p.resize) await send('Emulation.setDeviceMetricsOverride', { width:w,height:p.viewportHeight,deviceScaleFactor:2,mobile,screenWidth:w,screenHeight:p.viewportHeight })
              else await ev(`__k.scroll(__k.btns()[${i}]).scrollTop = ${p.scrollTop}`)
              await sleep(350)
              if (!p.resize && await ev(`(() => {const b=__k.btns()[${i}],sc=__k.scroll(b),edge=__k.bottom(b),g=parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--gutter'));return Math.abs(b.getBoundingClientRect().bottom-(edge-g))<=1 || (sc.scrollTop>=sc.scrollHeight-sc.clientHeight-1 && b.getBoundingClientRect().bottom>=edge-g && b.getBoundingClientRect().bottom<=edge)})()`)) break
            }
          }
          const before = await ev(`__k.row(__k.btns()[${i}])`)
          const bb = await ev(`__k.rect(__k.btns()[${i}])`)
          const frame = await ev(`(() => {const b=__k.btns()[${i}];return {height:innerHeight,edge:__k.bottom(b),gutter:parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--gutter'))} })()`)
          if (pos === 'onder') ok(bb && bb.b >= frame.edge-frame.gutter-1 && bb.b <= frame.edge+0.5, `${w} ${route} ${kind} onder: knop onderaan gekregen`, {bb,frame,setup})
          const visible = bb && bb.b <= frame.edge+0.5 && bb.y >= 0
          ok(visible, `${w} ${route} ${kind} ${pos}: knop werkelijk zichtbaar`, {bb,frame})
          if (!visible) continue
          const reachable = await ev(`(() => {const b=__k.btns()[${i}],r=b.getBoundingClientRect();return b.contains(document.elementFromPoint(r.left+r.width/2,r.top+r.height/2))})()`)
          ok(reachable,`${w} ${route} ${kind} ${pos}: menuknop werkelijk aanklikbaar`,{bb,frame,setup})
          if(!reachable) continue
          await click(bb.x + bb.w / 2, bb.y + bb.h / 2)
          await sleep(350)
          const after = await ev(`__k.row(__k.btns()[${i}])`)
          const menu = await ev(`(() => { const m = document.querySelector('.popmenu'); if (!m) return null; const b = __k.btns()[${i}]; return { rect: __k.rect(m), side: m.dataset.side, role: m.getAttribute('role'), label: m.getAttribute('aria-label'), items: [...m.querySelectorAll('[role=menuitem]')].map(x => x.textContent.trim()), focus: document.activeElement?.textContent?.trim(), focusIn: m.contains(document.activeElement), expanded: b.getAttribute('aria-expanded'), controls: b.getAttribute('aria-controls') === m.id, haspopup: b.getAttribute('aria-haspopup'), vw: document.documentElement.clientWidth, vh: innerHeight, parent: m.parentElement.tagName, overRow: (() => { const r = b.closest('.meta,.kmeta').getBoundingClientRect(), q = m.getBoundingClientRect(); return !(q.bottom <= r.top || q.top >= r.bottom) && !(q.right <= r.left || q.left >= r.right) })(), ink: Math.max(0, ...[...b.closest('.meta,.kmeta').querySelectorAll(':scope > .iconbtn svg')].map(s=>s.getBoundingClientRect()).filter(r=>r.width).map(r=>r.right)), itemH: [...m.querySelectorAll('[role=menuitem]')].map(x=>Math.round(x.getBoundingClientRect().height)), fs: getComputedStyle(m.querySelector('[role=menuitem]')).fontSize, padL: [...m.querySelectorAll('[role=menuitem]')].map(x=>Math.round(x.querySelector('span').getBoundingClientRect().left - m.getBoundingClientRect().left)) } })()`)
          const tag = `${w} ${route} [${kind}] ${pos}`
          ok(menu, `${tag}: menu open`, { bb, hit: await ev(`(() => { const e = document.elementFromPoint(${bb.x + bb.w / 2}, ${bb.y + bb.h / 2}); return e && (e.tagName + "." + e.className + " " + (e.closest("button")?.getAttribute("aria-label")||"")) })()`)  })
          if (!menu) continue
          const R = menu.rect
          ok(R.x >= 15.5 && R.r <= menu.vw - 15.5 && R.y >= 15.5 && R.b <= menu.vh - 15.5, `${tag}: menu binnen venster (16 rand)`, { R, vw: menu.vw, vh: menu.vh, side: menu.side })
          ok(R.b <= (await ev('__k.menuBottom()')) - 15.5, `${tag}: menu boven de vaste tabbalk`, {R,bottom:await ev('__k.menuBottom()')})
          ok(!menu.overRow, `${tag}: menu ligt niet over de bronregel`, { R, row: after.row })
          ok(Math.abs(R.r - menu.ink) <= 1 || R.x <= 16.5 || R.r >= menu.vw - 16.5, `${tag}: rechterrand op kolomlijn`, { r: R.r, ink: menu.ink })
          ok(before.row.h === after.row.h && before.row.w === after.row.w && JSON.stringify(before.kids) === JSON.stringify(after.kids), `${tag}: bronregel verschuift niet`, { voor: before.row, na: after.row })
          ok(after.broken.length === 0 && (after.nameLines ?? 1) === 1 && (after.timeLines ?? 1) === 1, `${tag}: geen woordbreuk, naam/tijd 1 regel`, { broken: after.broken, nl: after.nameLines, tl: after.timeLines, text: after.text })
          ok(before.broken.length === 0, `${tag}: geen woordbreuk dicht`, { broken: before.broken, text: before.text })
          ok(menu.role === 'menu' && menu.expanded === 'true' && menu.controls && menu.haspopup === 'menu', `${tag}: aria`, menu)
          ok(menu.focusIn && menu.focus === menu.items[0], `${tag}: focus op eerste keuze`, { focus: menu.focus })
          ok(menu.items.every(t => /^(Deel|Meer hiervan|Minder hiervan|Klopt dit niet\?)$/.test(t)), `${tag}: labels`, menu.items)
          result.checks.push({ ok: true, label: `${tag}: maat`, data: { R, side: menu.side, itemH: menu.itemH, fs: menu.fs, padL: menu.padL, items: menu.items, row: after.text } })
          if (shotN++ < 3 || pos === 'onder') await shot(`${w}-${route}-${kind.replace(/[|]/g, '_')}-${pos}`)
          // Esc
          await key('Escape', 'Escape', 27); await sleep(200)
          const esc = await ev(`({ open: !!document.querySelector('.popmenu'), back: document.activeElement === __k.btns()[${i}], exp: __k.btns()[${i}].getAttribute('aria-expanded') })`)
          ok(!esc.open && esc.back && esc.exp === 'false', `${tag}: Esc sluit, focus terug op ⋯`, esc)
          // klik buiten
          await click(bb.x + bb.w / 2, bb.y + bb.h / 2); await sleep(250)
          const ox = 4, oy = Math.min(frame.height - 8, Math.max(8, bb.y - 120)); const outEl = await ev(`(() => { const e = document.elementFromPoint(${ox}, ${oy}); return e ? e.tagName + '.' + e.className + ' a=' + !!e.closest('a,button,[role=link]') : null })()`); const hashB = await ev('location.hash'); await click(ox, oy); await sleep(250); const hashA = await ev('location.hash'); ok(hashA === hashB, `${tag}: klik buiten opent niets`, { outEl, hashB, hashA }); if (hashA !== hashB) { await send('Page.navigate', { url: BASE + '#/' + route }); await sleep(4000); await ev(HELP) }
          ok(!(await ev(`!!document.querySelector('.popmenu')`)), `${tag}: klik buiten sluit`, {})
          // ⋯ nogmaals sluit
          await click(bb.x + bb.w / 2, bb.y + bb.h / 2); await sleep(250)
          await click(bb.x + bb.w / 2, bb.y + bb.h / 2); await sleep(250)
          ok(!(await ev(`!!document.querySelector('.popmenu')`)), `${tag}: ⋯ nogmaals sluit`, {})
          if (pos === 'midden' && kind === Object.keys(kinds)[0]) {
            // toetsenbord: focus ⋯, Enter, pijltjes, End, Enter → redenen, Esc
            await ev(`__k.btns()[${i}].focus()`); await key('Enter', 'Enter', 13); await sleep(300)
            const f0 = await ev(`document.activeElement.textContent.trim()`)
            await key('ArrowDown', 'ArrowDown', 40); const f1 = await ev(`document.activeElement.textContent.trim()`)
            await key('ArrowUp', 'ArrowUp', 38); await key('ArrowUp', 'ArrowUp', 38); const fwrap = await ev(`document.activeElement.textContent.trim()`)
            await key('Home', 'Home', 36); const fh = await ev(`document.activeElement.textContent.trim()`)
            await key('End', 'End', 35); const fe = await ev(`document.activeElement.textContent.trim()`)
            await key('Enter', 'Enter', 13); await sleep(300)
            const sub = await ev(`(() => { const m = document.querySelector('.popmenu'); return m && { label: m.getAttribute('aria-label'), items: [...m.querySelectorAll('[role=menuitem]')].map(x=>x.textContent.trim()), focus: document.activeElement.textContent.trim(), rect: __k.rect(m), vh: innerHeight, vw: document.documentElement.clientWidth } })()`)
            await shot(`${w}-${route}-redenen`)
            ok(sub && sub.items.length >= 3 && sub.rect.b <= sub.vh - 15.5 && sub.rect.y >= 15.5, `${w} ${route}: redenen-submenu binnen venster`, sub)
            const after2 = await ev(`__k.row(__k.btns()[${i}])`)
            ok(after2.row.h === before.row.h, `${w} ${route}: bronregel gelijk met redenen open`, { voor: before.row, na: after2.row })
            await key('Escape', 'Escape', 27); await sleep(200)
            const e2 = await ev(`({ open: !!document.querySelector('.popmenu'), back: document.activeElement === __k.btns()[${i}] })`)
            ok(f0 === 'Meer hiervan' || f0 === 'Deel', `${w} ${route}: Enter opent, focus eerste`, { f0 })
            result.checks.push({ ok: true, label: `${w} ${route}: toetsen`, data: { f0, f1, fwrap, fh, fe, sub: sub?.items, e2 } })
            ok(!e2.open && e2.back, `${w} ${route}: Esc uit redenen sluit en focus terug`, e2)
            // Tab
            await key('Enter', 'Enter', 13); await sleep(250)
            await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 }); await sleep(250)
            const tb = await ev(`({ open: !!document.querySelector('.popmenu'), focus: document.activeElement.getAttribute('aria-label') || document.activeElement.textContent.trim().slice(0,40), body: document.activeElement === document.body })`)
            ok(!tb.open && !tb.body, `${w} ${route}: Tab sluit en focus loopt door`, tb)
          }
        }
      }
    }
  }
} catch (e) { console.error(e); result.fails.push({ label: 'crash', data: String(e) }) }
finally {
  writeFileSync(join(OUT, `meting-keurder${process.env.W ? '-' + process.env.W.replace(/,/g, '_') : ''}.json`), JSON.stringify(result, null, 1))
  console.log('checks', result.checks.length, 'fouten', result.fails.length)
  ws?.close(); chrome.kill(); process.exit(result.fails.length ? 1 : 0)
}
