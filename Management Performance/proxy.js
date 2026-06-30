const https = require('https');

const SHEET1 = '2PACX-1vTO68GX9WFErMXR7GxUbaAybv0Vu-Cuia482ACsE8LDVOy_g_fAmvuEG7Y6WTSAII_PG521XZoBgBM_';
const SHEET2 = '1PtOX76nXMJFZ7ymlyrmdYMlPSVU6p614b5Azx1MBkMk';

module.exports = async (req, res) => {
  const sheet = req.query.sheet;
  const gid = req.query.gid || '0';
  const id = sheet === '2' ? SHEET2 : SHEET1;
  const cb = Date.now() + '_' + Math.random().toString(36).slice(2, 6);

  const path = sheet === '2'
    ? '/spreadsheets/d/' + id + '/export?format=csv&gid=' + gid + '&_cb=' + cb
    : '/spreadsheets/d/e/' + id + '/pub?gid=' + gid + '&single=true&output=csv&_cb=' + cb;

  const opts = {
    hostname: 'docs.google.com',
    path: path,
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/csv,text/plain,*/*',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache'
    }
  };

  try {
    const body = await new Promise((resolve, reject) => {
      https.get(opts, (proxyRes) => {
        let data = '';
        if (proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers.location) {
          https.get(proxyRes.headers.location, { headers: opts.headers }, (r2) => {
            let b2 = '';
            r2.on('data', (c) => b2 += c);
            r2.on('end', () => resolve(b2));
            r2.on('error', reject);
          }).on('error', reject);
          return;
        }
        proxyRes.on('data', (c) => data += c);
        proxyRes.on('end', () => resolve(data));
        proxyRes.on('error', reject);
      }).on('error', reject);
    });
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.status(200).send(body);
  } catch (e) {
    res.status(500).send('Proxy error');
  }
};
