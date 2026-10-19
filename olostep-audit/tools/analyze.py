import json, collections, sys
rows=[r for r in json.load(open(sys.argv[1])) if r['code']==200]
print('pages 200:', len(rows))
def cnt(label, pred): 
    xs=[r['url'] for r in rows if pred(r)]; print(f'{label}: {len(xs)}', xs[:6])
cnt('no title', lambda r: not r['title'])
cnt('no description', lambda r: not r['desc'])
cnt('no canonical', lambda r: not r['canonical'])
cnt('multiple canonicals', lambda r: len(r['canonical'])>1)
cnt('canonical != final url', lambda r: r['canonical'] and r['canonical'][0].rstrip('/')!=r['final'].rstrip('/'))
cnt('noindex', lambda r: r['robots'] and 'noindex' in r['robots'])
cnt('no og:image', lambda r: not r['og']['og:image'])
cnt('no og:title', lambda r: not r['og']['og:title'])
cnt('no twitter:card', lambda r: not r['og']['twitter:card'])
cnt('h1 count 0', lambda r: len(r['h1'])==0)
cnt('h1 count >1', lambda r: len(r['h1'])>1)
cnt('no jsonld', lambda r: not r['jsonld'])
cnt('invalid jsonld', lambda r: 'INVALID' in r['jsonld'])
cnt('title > 60', lambda r: len(r['title'])>60)
cnt('desc > 160', lambda r: r['desc'] and len(r['desc'])>160)
cnt('desc < 70', lambda r: r['desc'] and len(r['desc'])<70)
cnt('has hreflang', lambda r: r['hreflang'])
for k in ['title','desc']:
    g=collections.defaultdict(list)
    for r in rows:
        if r[k]: g[r[k]].append(r['url'])
    d={t:u for t,u in g.items() if len(u)>1}
    print(f'\nDUPLICATE {k}: {len(d)} groups')
    for t,u in sorted(d.items(), key=lambda x:-len(x[1]))[:15]: print(' ',len(u), repr(t[:80]), u[:4])
g=collections.defaultdict(list)
for r in rows:
    if r['canonical']: g[r['canonical'][0]].append(r['url'])
print('\nshared canonical groups:', {k:v for k,v in g.items() if len(v)>1})
jl=collections.Counter(t for r in rows for t in set(r['jsonld'])); print('\njsonld types:', jl.most_common(20))
sizes=sorted(rows,key=lambda r:-r['size'])[:8]; print('\nlargest HTML:', [(r['url'][24:],r['size']//1024) for r in sizes])
import statistics; print('median html KB', statistics.median(r['size'] for r in rows)//1024, 'median ttfb', round(statistics.median(r['ttfb'] for r in rows),2))
