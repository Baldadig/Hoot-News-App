// Het kleine inline script van de landing (CSP-hash wordt in build.mjs uitgerekend): oude #/-links,
// uitnodigingen en de terugkeer van Google naar /lees/ doorsturen. Google geeft het antwoord als
// '#state=…&id_token=…' of '#error=…' (redirect_uri is origin + '/', src/lib/account.js), dus op
// de parameters letten, niet op het begin van het fragment.
export const INLINE = "(function(){var h=location.hash,q=location.search,p={has:function(){return false}};try{p=new URLSearchParams(h.slice(1))}catch(e){}if(h.indexOf('#/')===0||p.has('id_token')||p.has('error')||/[?&]uitnodiging=/.test(q)){location.replace('/lees/'+q+h)}})();"
