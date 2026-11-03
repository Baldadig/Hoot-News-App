from http.server import ThreadingHTTPServer,BaseHTTPRequestHandler
from pathlib import Path
import mimetypes,json,urllib.request,urllib.parse
root=Path('/tmp/hoot-ronde3-H-repro');
if not (root/'release').exists(): (root/'release').write_text('N')
if not (root/'feed.json').exists(): raise SystemExit('Feedfixture ontbreekt')
class Handler(BaseHTTPRequestHandler):
 def do_GET(self):
  path=self.path.split('?')[0]
  if path=='/probe.html':file=root/'probe.html'
  elif path=='/api/feed':file=root/'feed.json'
  elif path.startswith('/media/'):file=root/path.lstrip('/')
  elif path=='/__release':
   data=(root/'release').read_bytes();self.send_response(200);self.end_headers();self.wfile.write(data);return
  elif path.startswith('/lees/'):
   if (root/'fail-shell').exists():self.connection.close();return
   file=root/(root/'release').read_text().strip()/path.lstrip('/')
   if path.endswith('/'):file=file/'index.html'
  else:self.send_error(404);return
  if not file.is_file():self.send_error(404);return
  data=file.read_bytes()
  if path=='/api/feed':
   feed=json.loads(data);q=urllib.parse.parse_qs(self.path.split('?',1)[1] if '?' in self.path else '')
   if 'bron' in q:data=json.dumps({'items':[i for i in feed.get('items',[]) if i.get('source')==q['bron'][0]]}).encode()
   elif q.get('deel')==['start']:data=json.dumps({k:v for k,v in feed.items() if k not in ['items','related']}).encode()
   elif q.get('deel')==['verhalen']:data=json.dumps({'related':feed.get('related',[])}).encode()
  self.send_response(200);self.send_header('Content-Type',mimetypes.guess_type(file)[0] or 'application/octet-stream');self.send_header('Cache-Control','no-store');self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data)
 def log_message(self,*a):pass
ThreadingHTTPServer(('127.0.0.1',61242),Handler).serve_forever()
