import fs from 'fs';
import https from 'https';

const key = process.env.VITE_INDEXNOW_KEY;
const siteUrl = process.env.VITE_SITE_URL;

if (!key || !siteUrl) {
  console.log('IndexNow skipped (missing env vars)');
  process.exit(0);
}

const data = JSON.stringify({
  host: new URL(siteUrl).hostname,
  key,
  keyLocation: `${siteUrl}/${key}.txt`,
  urlList: [siteUrl]
});

const req = https.request('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
}, (res) => {
  console.log(`IndexNow: ${res.statusCode}`);
});

req.on('error', (e) => console.error('IndexNow failed:', e.message));
req.write(data);
req.end();
