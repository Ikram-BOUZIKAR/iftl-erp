/**
 * deploy-hosting.mjs
 * Deploys dist/ to Firebase Hosting via OAuth2 Device Flow + Hosting REST API
 * Usage: node scripts/deploy-hosting.mjs
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { createHash } from 'crypto';

const PROJECT_ID = 'erp-pedago-iftl';
const SITE_ID   = 'erp-pedago-iftl';
const DIST_DIR  = new URL('../dist', import.meta.url).pathname;

const CLIENT_ID     = '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
const CLIENT_SECRET = 'j9iVZfS8kkCEFUPaAeJV0sAi';
const SCOPES        = 'https://www.googleapis.com/auth/firebase https://www.googleapis.com/auth/cloud-platform';

async function post(url, body) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body),
  });
  return r.json();
}

async function api(method, url, token, body) {
  const r = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`${method} ${url} → ${r.status}: ${t}`);
  }
  return r.json();
}

// ── 1. Device flow ──────────────────────────────────────────────────────────
async function getAccessToken() {
  const dc = await post('https://oauth2.googleapis.com/device/code', {
    client_id: CLIENT_ID,
    scope: SCOPES,
  });
  if (!dc.device_code) throw new Error('Device code failed: ' + JSON.stringify(dc));

  console.log('\n─────────────────────────────────────────────');
  console.log('🔐  Authentification requise');
  console.log(`\n   1. Allez sur : ${dc.verification_url}`);
  console.log(`   2. Entrez le code : ${dc.user_code}`);
  console.log('\n   En attente de votre approbation…');
  console.log('─────────────────────────────────────────────\n');

  const interval = (dc.interval || 5) * 1000;
  const expires  = Date.now() + dc.expires_in * 1000;

  while (Date.now() < expires) {
    await new Promise(r => setTimeout(r, interval));
    const tok = await post('https://oauth2.googleapis.com/token', {
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      device_code:   dc.device_code,
      grant_type:    'urn:ietf:params:oauth:grant-type:device_code',
    });
    if (tok.access_token) {
      console.log('✅  Authentifié !\n');
      return tok.access_token;
    }
    if (tok.error !== 'authorization_pending') {
      throw new Error('Auth error: ' + tok.error);
    }
  }
  throw new Error('Timeout — code expiré');
}

// ── 2. Collect dist files ───────────────────────────────────────────────────
function collectFiles(dir, base = dir) {
  const files = {};
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      Object.assign(files, collectFiles(full, base));
    } else {
      const rel  = '/' + relative(base, full).replace(/\\/g, '/');
      const data = readFileSync(full);
      const hash = createHash('sha256').update(data).digest('hex');
      files[rel] = { data, hash };
    }
  }
  return files;
}

// ── 3. Deploy ───────────────────────────────────────────────────────────────
async function deploy(token) {
  const BASE = `https://firebasehosting.googleapis.com/v1beta1/sites/${SITE_ID}`;

  // Create version
  console.log('📦  Création de la version…');
  const version = await api('POST', `${BASE}/versions`, token, {
    config: {
      headers: [{ glob: '**', headers: { 'Cache-Control': 'max-age=3600' } }],
      rewrites: [{ glob: '**', path: '/index.html' }],
    },
  });
  const versionName = version.name;
  console.log(`    ${versionName}`);

  // Collect files
  const files = collectFiles(DIST_DIR);
  console.log(`📂  ${Object.keys(files).length} fichiers à uploader`);

  // Populate files (tell Firebase which hashes we have)
  const fileMap = {};
  for (const [path, { hash }] of Object.entries(files)) {
    fileMap[path] = hash;
  }
  const populate = await api('POST', `${versionName}:populateFiles`, token, { files: fileMap });
  const required = new Set(populate.uploadRequiredHashes || []);
  console.log(`⬆️   ${required.size} fichiers à envoyer (${Object.keys(files).length - required.size} en cache)`);

  // Upload required files
  const uploadUrl = populate.uploadUrl;
  let uploaded = 0;
  for (const [, { data, hash }] of Object.entries(files)) {
    if (!required.has(hash)) continue;
    const r = await fetch(`${uploadUrl}/${hash}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/octet-stream' },
      body: data,
    });
    if (!r.ok) throw new Error(`Upload ${hash} failed: ${r.status}`);
    uploaded++;
    process.stdout.write(`\r    ${uploaded}/${required.size} uploadés…`);
  }
  if (required.size > 0) console.log();

  // Finalize version
  console.log('🔒  Finalisation de la version…');
  await api('PATCH', `${versionName}?update_mask=status`, token, { status: 'FINALIZED' });

  // Create release
  console.log('🚀  Mise en ligne…');
  await api('POST', `${BASE}/releases?versionName=${versionName}`, token, {
    message: 'Deploy from claude/scheduling-attendance-app-zxwsP',
  });

  console.log('\n✅  Déployé sur https://erp-pedago-iftl.web.app\n');
}

// ── Main ────────────────────────────────────────────────────────────────────
const token = await getAccessToken();
await deploy(token);
