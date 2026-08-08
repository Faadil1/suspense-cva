import 'dotenv/config';
import crypto from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

const base = process.env.CLEANVERSE_BASE_URL || 'https://uatapi.cleanverse.com/api/cooperate';
const apiId = process.env.CLEANVERSE_API_ID;
if (!apiId) throw new Error('Missing CLEANVERSE_API_ID in .env');

const stateUrl = new URL('../.local/custom-cva-register.json', import.meta.url);
let saved;
try {
  saved = JSON.parse(await readFile(stateUrl, 'utf8'));
} catch {
  throw new Error('Missing .local/custom-cva-register.json. Run `npm run cva:register` first.');
}

const requestId = saved?.response?.data?.requestId;
if (!requestId) throw new Error('No requestId found in custom CVA registration state.');

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

console.log('\n=== Custom CVA registration status ===');
console.log(JSON.stringify({ httpStatus: res.status, ok: res.ok, data }, null, 2));

saved.lastCheckedAt = new Date().toISOString();
saved.statusResponse = data;
await writeFile(stateUrl, JSON.stringify(saved, null, 2), 'utf8');

const status = data?.data?.applyStatus;
if (status === 'ISSUED') {
  console.log('\nCUSTOM CVA REGISTERED / ISSUED ✅');
  console.log(`ATOKEN_ADDRESS=${data.data.atokenAddress || saved.atokenAddress}`);
  console.log('Next: configure the RuleV2 policy, then complete Gate B2 with /verify_apass.');
} else if (status === 'REJECTED' || status === 'ISSUE_FAILED') {
  console.log(`\nCUSTOM CVA REGISTRATION TERMINAL FAILURE (${status}) ❌`);
  console.log('Inspect rejectReason / issueErrorMsg before taking any further write action.');
  process.exitCode = 2;
} else {
  console.log(`\nCurrent status: ${status || 'UNKNOWN'}. Re-run \`npm run cva:register:status\` later.`);
}
