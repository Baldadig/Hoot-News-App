// Het kleine inline script van de landing (CSP-hash wordt in build.mjs uitgerekend): oude #/-links,
// uitnodigingen en de terugkeer van Google naar /lees/ doorsturen. Google geeft het antwoord als
// '#state=…&id_token=…' of '#error=…' (redirect_uri is origin + '/', src/lib/account.js), dus op
// de parameters letten, niet op het begin van het fragment.
// Op iPhone en iPad krijgt <html> de klasse .ios: dan is de App Store de hoofdknop in de held (Alex, 6 november).
export const INLINE = "(function(){var h=location.hash,q=location.search,p={has:function(){return false}};try{p=new URLSearchParams(h.slice(1))}catch(e){}if(h.indexOf('#/')===0||p.has('id_token')||p.has('error')||/[?&]uitnodiging=/.test(q)){location.replace('/lees/'+q+h)}var n=navigator;if(/iPhone|iPad|iPod/.test(n.userAgent)||(n.platform==='MacIntel'&&n.maxTouchPoints>1)){document.documentElement.classList.add('ios')}})();"
