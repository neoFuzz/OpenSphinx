/**
 * IndexNow API submission script
 * Notifies search engines (Bing, Yandex, etc.) of URL updates for faster indexing
 * Requires: INDEXNOW_KEY and VITE_SITE_URL environment variables
 * Creates verification key file in public directory
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const key = process.env.INDEXNOW_KEY;
const siteUrl = process.env.VITE_SITE_URL;
const adsContent = process.env.ADS_TXT_CONTENT;
const url = new URL(siteUrl);

async function submitToIndexNow(urls) {
  try {
    const payload = {
      host: url.hostname,
      key: key,
      keyLocation: `${url.origin}/${key}.txt`,
      urlList: urls
    };
    console.log("IndexNow Payload: ", payload);

    const response = await fetch("https://api.indexnow.org/IndexNow", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`IndexNow submission failed: ${response.status} - ${text}`);
    }

    console.log("✅ IndexNow submission successful");
    const result = await response.json().catch(() => ({}));
    console.log(result);
  } catch (err) {
    console.error("❌ Error submitting to IndexNow:", err);
  }
}

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
  
  const appAdsFilePath = path.join(distDir, 'app-ads.txt');
  fs.writeFileSync(appAdsFilePath, adsContent);
  console.log(`Created ads.txt: ${appAdsFilePath}`);
}

submitToIndexNow([`${url.origin}/`, `${url.origin}/sitemap.xml`]);