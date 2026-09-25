// Physical-phone QA only: adb reverse tcp:8791 tcp:8792. Restore afterwards.
import { createServer, request } from 'node:http';
import { readFileSync } from 'node:fs';
const settings = new URL('../.tools/hub-network.json', import.meta.url);
createServer(async (req, res) => {
  let config = {};
  try { config = JSON.parse(readFileSync(settings, 'utf8')); } catch {}
  const list = req.method === 'GET' && (req.url === '/v2/tables' || req.url === '/v2/table-history');
  if (list) {
    await new Promise(r => setTimeout(r, Math.min(Number(config.delayMs) || 0, 15000)));
    if (config.fail) { res.writeHead(503, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'QA simulated network interruption' })); return; }
  }
  const upstream = request({ hostname: '127.0.0.1', port: 8791, path: req.url, method: req.method, headers: req.headers }, response => { res.writeHead(response.statusCode, response.headers); response.pipe(res); });
  upstream.on('error', () => { if (!res.headersSent) res.writeHead(502); res.end(); });
  req.pipe(upstream);
}).listen(8792, '127.0.0.1', () => console.log('Local hub-refresh QA proxy ready on 8792.'));
