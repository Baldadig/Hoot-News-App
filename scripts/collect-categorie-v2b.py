"""Alleen openbare feed ophalen; blind bestand bevat nooit classifieruitvoer."""
import argparse, concurrent.futures, datetime, hashlib, json, re, urllib.request, urllib.parse
from pathlib import Path
from zoneinfo import ZoneInfo
OUT=Path('docs/codex-blokken/categorie-v2b')
OLD=OUT/'baseline-overlap.json'
BASE='https://gethoot.app/api/feed'
def fetch(url):
    with urllib.request.urlopen(url,timeout=40) as r:
        raw=r.read()
        return json.loads(raw),{'url':url,'etag':r.headers.get('ETag'),'sha256':hashlib.sha256(raw).hexdigest(),'collectedAt':datetime.datetime.now(datetime.timezone.utc).isoformat()}
def urlkey(raw):
    u=urllib.parse.urlsplit(raw or '')
    return (u.hostname or '').removeprefix('www.')+u.path.rstrip('/')
def words(s): return set(re.findall(r'[a-zà-ž]{3,}',s.lower()))-set('het een van voor met door over uit aan bij als dat dit die zijn heeft niet naar the and for with from that this says said'.split())
def main():
    global OUT,OLD
    args=argparse.ArgumentParser(description=__doc__)
    args.add_argument('--out',type=Path,default=OUT)
    args.add_argument('--baseline',type=Path,default=OLD)
    options=args.parse_args();OUT=options.out;OLD=options.baseline
    if (OUT/'bevriezing.json').exists(): raise SystemExit('Deze controle is bevroren. Gebruik --out voor een andere map; overschrijf het holdout-bewijs niet.')
    OUT.mkdir(parents=True,exist_ok=True)
    root,rootmeta=fetch(BASE)
    old=json.loads(OLD.read_text())
    ids={x['id'] for x in old};urls={urlkey(x.get('url')) for x in old};stories={x.get('storyId') for x in old}-{None}
    sources=[s for s in root['sources'] if s.get('kind')!='social']
    bysource={s['id']:s for s in sources}
    parts=[];fail=[]
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        futures={pool.submit(fetch,BASE+'?bron='+urllib.parse.quote(s['id'])):s['id'] for s in sources}
        for f in concurrent.futures.as_completed(futures):
            source=futures[f]
            try: body,meta=f.result();parts.append({'source':source,'body':body,'meta':meta})
            except Exception as e:fail.append({'source':source,'error':str(e)})
    # Onbewerkte inhoud blijft buiten de repo en wordt bij blind labelen niet afgedrukt.
    Path('/tmp/hoot-v2b-raw-parts.json').write_text(json.dumps(parts))
    allitems={i['id']:i for p in parts for i in p['body'].get('items',[]) if i.get('id')}
    candidates=[];excluded=[]
    for i in allitems.values():
        if i.get('kind') not in (None,'article') or not i.get('title'):continue
        try: day=datetime.datetime.fromisoformat(i['publishedAt'].replace('Z','+00:00')).astimezone(ZoneInfo('Europe/Amsterdam')).date().isoformat()
        except (KeyError,ValueError):continue
        if day<'2026-11-02':continue
        first=i.get('firstSeenAt')
        try: firstday=datetime.datetime.fromisoformat(first.replace('Z','+00:00')).astimezone(ZoneInfo('Europe/Amsterdam')).date().isoformat() if first else None
        except ValueError: firstday=None
        urldate=re.search(r'/(2026)/(11|nov)/(\d{1,2})(?:/|$)',i.get('url',''))
        if firstday and firstday<'2026-11-02':excluded.append({'id':i['id'],'reason':'firstSeenBeforeCutoff'});continue
        if urldate and int(urldate[3])<2:excluded.append({'id':i['id'],'reason':'urlDateBeforeCutoff'});continue
        reason='id' if i['id'] in ids else 'url' if urlkey(i.get('url')) in urls else 'storyId' if i.get('storyId') in stories else None
        if reason:excluded.append({'id':i['id'],'reason':reason});continue
        # Vergelijking levert alleen aandachtspunten voor menselijke gebeurteniscontrole, geen labels.
        w=words(i['title']+' '+(i.get('summary') or ''))
        near=[]
        for x in old:
            a=x;v=words(a['title']+' '+(a.get('summary') or ''));score=len(w&v)/max(1,min(len(w),len(v)))
            if score>=.36:near.append({'id':a.get('id',x['id']),'title':a['title'],'event':x.get('eventId'),'score':round(score,3)})
        candidates.append({**{k:i.get(k) for k in ['id','kind','source','sourceName','title','summary','url','publishedAt','firstSeenAt']},'lang':bysource.get(i.get('source'),{}).get('lang'),'publicationDay':day,'possibleOldOverlap':sorted(near,key=lambda x:-x['score'])[:3]})
    candidates.sort(key=lambda x:(x['source'],x['publishedAt'],x['id']))
    (OUT/'blinde-kandidaten.json').write_text(json.dumps(candidates,ensure_ascii=False,indent=2)+'\n')
    (OUT/'collection.json').write_text(json.dumps({'root':rootmeta,'parts':[p['meta']|{'source':p['source']} for p in parts],'failed':fail,'totalItems':len(allitems),'newDayCandidates':len(candidates),'excludedIdentity':excluded,'oldFixtureSHA256':hashlib.sha256(OLD.read_bytes()).hexdigest(),'blindFieldsOnly':True,'noAtomicSnapshotClaim':True},ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'parts':len(parts),'failed':len(fail),'items':len(allitems),'newDayCandidates':len(candidates),'identityExcluded':len(excluded)}))
if __name__=='__main__':main()
