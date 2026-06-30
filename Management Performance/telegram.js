const https = require('https');
const TOKEN = '8852222510:AAECCekE7PCbxawfnJar9KrDI12dJyk6ouk';
const CHAT_ID = '-1003918995543';

function sendMessage(text, parseMode) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      chat_id: CHAT_ID,
      text: text,
      parse_mode: parseMode || 'HTML',
      disable_web_page_preview: true
    });
    const opts = {
      hostname: 'api.telegram.org',
      path: '/bot' + TOKEN + '/sendMessage',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };
    const req = https.request(opts, (res) => {
      let body = '';
      res.on('data', (c) => body += c);
      res.on('end', () => resolve(body));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function sendDocument(fileBase64, filename, caption) {
  return new Promise((resolve, reject) => {
    const fileBuffer = Buffer.from(fileBase64, 'base64');
    const boundary = '----FormBoundary' + Math.random().toString(36).slice(2);
    const ext = filename.split('.').pop().toLowerCase();
    const mime = ext === 'json' ? 'application/json'
      : ext === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      : ext === 'xls' ? 'application/vnd.ms-excel'
      : 'application/octet-stream';

    let parts = '';
    parts += '--' + boundary + '\r\n';
    parts += 'Content-Disposition: form-data; name="chat_id"\r\n\r\n';
    parts += CHAT_ID + '\r\n';

    parts += '--' + boundary + '\r\n';
    parts += 'Content-Disposition: form-data; name="document"; filename="' + filename + '"\r\n';
    parts += 'Content-Type: ' + mime + '\r\n\r\n';

    const head = Buffer.from(parts, 'utf-8');
    const tail = Buffer.from('\r\n--' + boundary + '--\r\n', 'utf-8');

    if (caption) {
      const capBuf = Buffer.from(
        '\r\n--' + boundary + '\r\n' +
        'Content-Disposition: form-data; name="caption"\r\n\r\n' +
        caption + '\r\n' +
        '--' + boundary + '--\r\n', 'utf-8'
      );
      // rebuild with caption before closing boundary
      const tail2 = Buffer.from(
        '\r\n--' + boundary + '\r\n' +
        'Content-Disposition: form-data; name="caption"\r\n\r\n' +
        caption + '\r\n' +
        '--' + boundary + '--\r\n', 'utf-8'
      );

      const fullPayload = Buffer.concat([head, fileBuffer, tail2]);
      const opts = {
        hostname: 'api.telegram.org',
        path: '/bot' + TOKEN + '/sendDocument',
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data; boundary=' + boundary,
          'Content-Length': fullPayload.length
        }
      };
      const req = https.request(opts, (res) => {
        let body = '';
        res.on('data', (c) => body += c);
        res.on('end', () => resolve(body));
        res.on('error', reject);
      });
      req.on('error', reject);
      req.write(fullPayload);
      req.end();
      return;
    }

    const fullPayload = Buffer.concat([head, fileBuffer, tail]);
    const opts = {
      hostname: 'api.telegram.org',
      path: '/bot' + TOKEN + '/sendDocument',
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data; boundary=' + boundary,
        'Content-Length': fullPayload.length
      }
    };
    const req = https.request(opts, (res) => {
      let body = '';
      res.on('data', (c) => body += c);
      res.on('end', () => resolve(body));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.write(fullPayload);
    req.end();
  });
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).send('POST only');

  const body = req.body || {};

  try {
    let result;
    if (body.file) {
      result = await sendDocument(body.file, body.filename || 'report', body.caption || '');
    } else if (body.text) {
      result = await sendMessage(body.text, body.parse_mode);
    } else {
      return res.status(400).json({ ok: false, error: 'text or file required' });
    }

    const json = JSON.parse(result);
    res.status(json.ok ? 200 : 400).json(json);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
};
