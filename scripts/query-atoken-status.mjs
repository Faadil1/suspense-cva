import 'dotenv/config';
import crypto from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

const base = process.env.CLEANVERSE_BASE_URL || 'https://uatapi.cleanverse.com/api/cooperate';
const apiId = process.env.CLEANVERSE_API_ID;
if (!apiId) throw new Error('Missing CLEANVERSE_API_ID in .env');

const applyUrl = new URL('../.local/atoken-apply.json', import.meta.url);
let saved;
try {
  saved = JSON.parse(await readFile(applyUrl, 'utf8'));
} catch {
  throw new Error('Missing .local/atoken-apply.json. Run `npm run atoken:launch` first.');
}

const requestId = saved?.response?.data?.requestId;
if (!requestId) throw new Error('No requestId found in .local/atoken-apply.json.');

const res = await fetch(`${base}/atoken/query_apply_status/${encodeURIComponent(requestId)}`, {
  method: 'GET',
  headers: {
    'api-id': apiId,
    'X-Request-ID': crypto.randomUUID()
  }
});

const text = await res.text();
let data;
try {
  data = JSON.parse(text);
} catch {
  data = { raw: text };
}

console.log('\n=== A-Token application status ===');
console.log(JSON.stringify({ httpStatus: res.status, ok: res.ok, data }, null, 2));

saved.lastCheckedAt = new Date().toISOString();
saved.statusResponse = data;
await writeFile(applyUrl, JSON.stringify(saved, null, 2), 'utf8');

const status = data?.data?.applyStatus;
if (status === 'ISSUED') {
  console.log('\nGATE: CVA ISSUED ✅');
  console.log(`ATOKEN_ADDRESS=${data.data.atokenAddress}`);
  console.log('Copy that public address into your local .env as ATOKEN_ADDRESS.');
} else if (status === 'REJECTED' || status === 'ISSUE_FAILED') {
  console.log(`\nGATE: CVA launch terminal failure (${status}) ❌`);
  console.log('Do not resubmit blindly; diagnose rejectReason / issueErrorMsg first.');
} else {
  console.log(`\nCurrent status: ${status || 'UNKNOWN'}. Re-run \`npm run atoken:status\` later.`);
}
