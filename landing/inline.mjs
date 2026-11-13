// Het kleine inline script van de landing (CSP-hash wordt in build.mjs uitgerekend): oude #/-links,
// uitnodigingen en de terugkeer van Google naar /lees/ doorsturen. Google geeft het antwoord als
// '#state=…&id_token=…' of '#error=…' (redirect_uri is origin + '/', src/lib/account.js), dus op
// de parameters letten, niet op het begin van het fragment.
// Op iPhone en iPad krijgt <html> de klasse .ios: dan is de App Store de hoofdknop in de held (Alex, 6 november).
export const INLINE = "(function(){var h=location.hash,q=location.search,p={has:function(){return false}};try{p=new URLSearchParams(h.slice(1))}catch(e){}if(h.indexOf('#/')===0||p.has('id_token')||p.has('error')||/[?&]uitnodiging=/.test(q)){location.replace('/lees/'+q+h)}var n=navigator;if(/iPhone|iPad|iPod/.test(n.userAgent)||(n.platform==='MacIntel'&&n.maxTouchPoints>1)){document.documentElement.classList.add('ios')}})();"

// Het ritueel (kleuren per dagdeel) vóór de eerste weergave: dit stond bovenaan hoot.js, dat daardoor de weergave
// blokkeerde. Nu inline (eigen CSP-hash, zie build.mjs) en hoot.js met defer (review 13 november, deel 6).
// Vroege avond: de derde tekstkleur #675B4A (was #6F6250, 4,71 op papier; nu 5,26).
export const PALET = "(function(){var R=document.documentElement;R.classList.add('init');" +
  "var K=['papier','wit','rood','op-rood','inkt','inkt2','inkt3','lijn','chip','s-bg','s-ink','s-ink2','s-ink3','s-red','s-line','s-card','s-blok'];" +
  "var P={ochtend:['#F5F1E8','#FBF8F1','#9A3324','#F5F1E8','#1A1814','#4B453B','#6B6457','#DED5C4','#EFE9DD','#F5F1E8','#1A1814','#4B453B','#6B6457','#9A3324','#DED5C4','#FCFAF5','#9A3324']," +
  "middag:['#F3F1EC','#FFFFFF','#9A3324','#F7F5F0','#15130F','#45403A','#67615A','#E2DDD3','#EFECE6','#F7F5F0','#15130F','#45403A','#67615A','#9A3324','#E2DDD3','#FFFFFF','#9A3324']," +
  "vroeg:['#EEE4D3','#F5ECDD','#933422','#F4EBDC','#2A231B','#5A4D3D','#675B4A','#DCCDB5','#E9DDC9','#EFE5D4','#2A231B','#584B3C','#675B4A','#933422','#DCCDB5','#F8F0E3','#933422']," +
  "nacht:['#151310','#1E1B17','#9A3324','#F5F1E8','#F1ECE2','#CBC3B5','#A39B8D','#34302A','#2A2621','#151310','#F1ECE2','#CBC3B5','#A39B8D','#EC7A70','#34302A','#1E1B17','#8B3023']};" +
  "var A=[[0,'nacht'],[5.5,'nacht'],[7.5,'ochtend'],[11,'ochtend'],[13,'middag'],[16.5,'middag'],[18.5,'vroeg'],[20,'vroeg'],[21.5,'nacht'],[24,'nacht']];" +
  "function hex(h){return[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)]}" +
  "function mix(a,b,t){var x=hex(a),y=hex(b);return'rgb('+[0,1,2].map(function(i){return Math.round(x[i]+(y[i]-x[i])*t)}).join(',')+')'}" +
  "function palet(u){for(var i=0;i<A.length-1;i++){if(u>=A[i][0]&&u<=A[i+1][0]){var t=(u-A[i][0])/((A[i+1][0]-A[i][0])||1);t=t*t*(3-2*t);var a=P[A[i][1]],b=P[A[i+1][1]];" +
  "return{k:a.map(function(c,j){return mix(c,b[j],t)}),donker:(A[i][1]==='nacht'&&t<.5)||(A[i+1][1]==='nacht'&&t>=.5)}}}return{k:P.nacht,donker:true}}" +
  "var S={modus:'auto',uur:null,demo:false},mq=window.matchMedia?matchMedia('(prefers-color-scheme: dark)'):null;" +
  "function nu(){var d=new Date();return d.getHours()+d.getMinutes()/60}" +
  "function dagdeel(u){return u>=5&&u<12?'ochtend':(u>=12&&u<17.5?'middag':'avond')}" +
  "function pas(){var u=S.uur==null?nu():S.uur,p;if(S.modus==='light')p={k:P.middag,donker:false};else if(S.modus==='dark')p={k:P.nacht,donker:true};" +
  "else if(mq&&mq.matches&&!S.demo)p={k:P.nacht,donker:true};else p=palet(u);" +
  "K.forEach(function(k,i){R.style.setProperty('--'+k,p.k[i])});R.classList.toggle('donker',p.donker);R.style.colorScheme=p.donker?'dark':'light';" +
  "if(S.modus==='auto')R.removeAttribute('data-theme');else R.setAttribute('data-theme',S.modus);R.setAttribute('data-dagdeel',dagdeel(u));if(window.hootDagdeel)window.hootDagdeel(dagdeel(u))}" +
  "window.hootSet=function(o){for(var k in o)S[k]=o[k];pas()};pas();if(mq&&mq.addEventListener)mq.addEventListener('change',pas);" +
  "setInterval(function(){if(S.uur==null)pas()},60000);" +
  "if(/[?&]demo\\b/.test(location.search)){addEventListener('message',function(e){var d=e.data;if(d&&d.hoot&&typeof d.hoot==='object')window.hootSet(d.hoot)})}})();"
