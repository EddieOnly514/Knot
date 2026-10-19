import sys, json, re, html
from html.parser import HTMLParser
base = sys.argv[1]
rows = []
class P(HTMLParser):
    def __init__(s):
        super().__init__(); s.d = {'meta':{}, 'canon':[], 'hreflang':[], 'h1':[], 'jsonld':[], 'imgs':0, 'imgs_noalt':0, 'lang':None, 'title':''}
        s.stack=None; s.buf=''
    def handle_starttag(s, t, a):
        a = dict(a)
        if t=='html': s.d['lang']=a.get('lang')
        if t=='meta':
            k = a.get('name') or a.get('property')
            if k: s.d['meta'][k.lower()] = a.get('content')
        if t=='link' and a.get('rel')=='canonical': s.d['canon'].append(a.get('href'))
        if t=='link' and a.get('rel')=='alternate' and a.get('hreflang'): s.d['hreflang'].append((a.get('hreflang'), a.get('href')))
        if t=='img':
            s.d['imgs']+=1
            if 'alt' not in a: s.d['imgs_noalt']+=1
        if t in ('h1','title') or (t=='script' and a.get('type')=='application/ld+json'):
            s.stack=t if t!='script' else 'ld'; s.buf=''
    def handle_endtag(s, t):
        if s.stack and (t==s.stack or (s.stack=='ld' and t=='script')):
            txt=s.buf.strip()
            if s.stack=='h1': s.d['h1'].append(re.sub(r'\s+',' ',txt)[:120])
            elif s.stack=='title': s.d['title']=txt
            else:
                try:
                    j=json.loads(txt); items = j if isinstance(j,list) else j.get('@graph',[j])
                    s.d['jsonld'] += [str(i.get('@type')) for i in items if isinstance(i,dict)]
                except Exception: s.d['jsonld'].append('INVALID')
            s.stack=None
    def handle_data(s, data):
        if s.stack: s.buf+=data
for line in open(base+'/raw/status.tsv'):
    f = line.rstrip('\n').split('\t')
    if len(f)<8: continue
    code, red, eff, size, tt, ttfb, url, fn = f
    try: h = open(base+'/'+fn+'.html', errors='ignore').read()
    except Exception: h=''
    p=P()
    try: p.feed(h)
    except Exception: pass
    d=p.d; m=d['meta']
    rows.append(dict(url=url, code=int(code), final=eff, size=int(size or 0), ttfb=float(ttfb or 0), title=html.unescape(d['title']), desc=m.get('description'), robots=m.get('robots'),
      canonical=d['canon'], hreflang=d['hreflang'], h1=d['h1'], lang=d['lang'], jsonld=d['jsonld'], imgs=d['imgs'], imgs_noalt=d['imgs_noalt'],
      og={k:m.get(k) for k in ['og:title','og:description','og:image','og:url','og:type','twitter:card','twitter:image']}))
json.dump(rows, open(base+'/pages.json','w'), indent=1)
print(len(rows))
