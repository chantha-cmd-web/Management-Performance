const http = require('http');
const fs = require('fs');
const path = require('path');
const https = require('https');
const url = require('url');

const PORT = 3000;
const SHEET1 = '2PACX-1vTO68GX9WFErMXR7GxUbaAybv0Vu-Cuia482ACsE8LDVOy_g_fAmvuEG7Y6WTSAII_PG521XZoBgBM_';
const SHEET2 = '1PtOX76nXMJFZ7ymlyrmdYMlPSVU6p614b5Azx1MBkMk';

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

function proxy(res, sheetId, gid, cb, useExport) {
  var cbParam = cb ? '&_cb=' + encodeURIComponent(cb) : '&_cb=' + Date.now();
  var basePath = useExport
    ? '/spreadsheets/d/' + sheetId + '/export?format=csv&gid=' + gid
    : '/spreadsheets/d/e/' + sheetId + '/pub?gid=' + gid + '&single=true&output=csv';
  var opts = {
    hostname: 'docs.google.com',
    path: basePath + cbParam,
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/csv,text/plain,*/*',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache'
    }
  };
  https.get(opts, function(proxyRes) {
    var body = '';
    if (proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers.location) {
      https.get(proxyRes.headers.location, { headers: opts.headers }, function(r2) {
        var b2 = '';
        r2.on('data', function(c) { b2 += c; });
        r2.on('end', function() {
          res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
          res.end(b2);
        });
      }).on('error', function() { res.writeHead(500); res.end('Proxy error'); });
      return;
    }
    proxyRes.on('data', function(c) { body += c; });
    proxyRes.on('end', function() {
      res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Access-Control-Allow-Origin': '*' });
      res.end(body);
    });
  }).on('error', function() {
    res.writeHead(500);
    res.end('Proxy error');
  });
}

var srv = http.createServer(function(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.url.indexOf('/api/sheet1') === 0) {
    var q = url.parse(req.url, true).query;
    proxy(res, SHEET1, q.gid || '0', q._cb || '', false);
    return;
  }
  if (req.url.indexOf('/api/sheet2') === 0) {
    var q2 = url.parse(req.url, true).query;
    proxy(res, SHEET2, q2.gid || '607488980', q2._cb || '', true);
    return;
  }

  var fp = req.url === '/' ? '/index.html' : req.url;
  fp = path.join(__dirname, fp);
  var ext = path.extname(fp);
  fs.readFile(fp, function(err, data) {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

srv.listen(PORT, function() {
  console.log('Server: http://localhost:' + PORT + '/Management_Appriasal.html');
});
