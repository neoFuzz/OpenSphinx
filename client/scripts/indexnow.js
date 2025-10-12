/**
 * IndexNow API submission script
 * Notifies search engines (Bing, Yandex, etc.) of URL updates for faster indexing
 * Requires: INDEXNOW_KEY and VITE_SITE_URL environment variables
 * Creates verification key file in public directory
 */
import fs from 'fs';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const key = process.env.INDEXNOW_KEY;
const siteUrl = process.env.VITE_SITE_URL;
const adsContent = process.env.ADS_TXT_CONTENT;

// Skip if environment variables not configured
if (!key || !siteUrl) {
  console.log('IndexNow skipped (missing env vars)');
  process.exit(0);
}

// Create key file in dist directory for production deployment
const distDir = path.join(__dirname, '..', 'dist');
const keyFilePath = path.join(distDir, `${key}.txt`);
fs.writeFileSync(keyFilePath, key);
console.log(`Created key file: ${keyFilePath}`);

// Create ads.txt if content provided
if (adsContent) {
  const adsFilePath = path.join(distDir, 'ads.txt');
  fs.writeFileSync(adsFilePath, adsContent);
  console.log(`Created ads.txt: ${adsFilePath}`);
}

// Build IndexNow API payload
const url = new URL(siteUrl);
const data = JSON.stringify({
  host: url.hostname,
  key,
  keyLocation: `${url.origin}/${key}.txt`,
  urlList: [`${url.origin}/`]
});

// Submit to IndexNow API
const req = https.request('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
}, (res) => {
  console.log(`IndexNow: ${res.statusCode}`);
});

req.on('error', (e) => console.error('IndexNow failed:', e.message));
req.write(data);
req.end();
