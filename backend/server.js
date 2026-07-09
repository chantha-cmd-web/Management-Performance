const express = require('express');
const cors = require('cors');
const path = require('path');
const https = require('https');
const url = require('url');
const admin = require('firebase-admin');
require('dotenv').config();

const SHEET1 = '2PACX-1vTO68GX9WFErMXR7GxUbaAybv0Vu-Cuia482ACsE8LDVOy_g_fAmvuEG7Y6WTSAII_PG521XZoBgBM_';
const SHEET2 = '1PtOX76nXMJFZ7ymlyrmdYMlPSVU6p614b5Azx1MBkMk';
const SHEET3 = '2PACX-1vQzNvf-UHV5u4jirdF9NuZTltzXozEi13j3U0Nme62VDH9a4UpQTbUYUqHG0hyv1uyzmFdYD5dIOPbR';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

function proxyGoogleSheet(res, sheetId, gid, cb, useExport) {
  const cbParam = cb ? '&_cb=' + encodeURIComponent(cb) : '&_cb=' + Date.now();
  const basePath = useExport
    ? '/spreadsheets/d/' + sheetId + '/export?format=csv&gid=' + gid
    : '/spreadsheets/d/e/' + sheetId + '/pub?gid=' + gid + '&single=true&output=csv';
  const opts = {
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
    let body = '';
    if (proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers.location) {
      https.get(proxyRes.headers.location, { headers: opts.headers }, function(r2) {
        let b2 = '';
        r2.on('data', function(c) { b2 += c; });
        r2.on('end', function() {
          res.set('Content-Type', 'text/csv; charset=utf-8');
          res.send(b2);
        });
      }).on('error', function() { res.status(500).send('Proxy error'); });
      return;
    }
    proxyRes.on('data', function(c) { body += c; });
    proxyRes.on('end', function() {
      res.set('Content-Type', 'text/csv; charset=utf-8');
      res.send(body);
    });
  }).on('error', function() {
    res.status(500).send('Proxy error');
  });
}

app.get('/api/sheet1', function(req, res) {
  const q = url.parse(req.url, true).query;
  proxyGoogleSheet(res, SHEET1, q.gid || '0', q._cb || '', false);
});

app.get('/api/sheet2', function(req, res) {
  const q = url.parse(req.url, true).query;
  proxyGoogleSheet(res, SHEET2, q.gid || '607488980', q._cb || '', true);
});

app.get('/api/sheet3', function(req, res) {
  proxyGoogleSheet(res, SHEET3, '0', '', false);
});

let fbInitialized = false;
try {
  let serviceAccount;
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } else {
    serviceAccount = {
      type: 'service_account',
      project_id: 'performance-200aa',
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY
        ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        : undefined,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
    };
  }
  if (serviceAccount.private_key && serviceAccount.client_email) {
    if (admin.apps.length === 0) {
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    }
    fbInitialized = true;
    console.log('Firebase Admin initialized');
  } else {
    console.warn('Firebase credentials not configured. API routes will return 503.');
  }
} catch (err) {
  console.warn('Firebase initialization failed:', err.message);
}

const authRoutes = require('./routes/auth');
const evalRoutes = require('./routes/evaluations');
const userRoutes = require('./routes/users');

app.use('/api/auth', authRoutes);
app.use('/api/evaluations', evalRoutes);
app.use('/api/users', userRoutes);

app.get('/api/health', function(req, res) {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(express.static(path.join(__dirname, '..')));

app.get('*', function(req, res) {
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

app.listen(PORT, function() {
  console.log('Performance API server running on http://localhost:' + PORT);
});
