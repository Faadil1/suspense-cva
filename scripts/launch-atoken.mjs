import 'dotenv/config';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { cleanverseEncrypted } from './cleanverse-encryption.mjs';

const chain = process.env.CHAIN || 'monad';
const walletsUrl = new URL('../.local/wallets.json', import.meta.url);
const applyUrl = new URL('../.local/atoken-apply.json', import.meta.url);

let walletData;
try {
  walletData = JSON.parse(await readFile(walletsUrl, 'utf8'));
} catch {
  throw new Error('Missing .local/wallets.json. Run `npm run wallets` first.');
}

const payload = {
  chain,
  token_name: 'Suspense Coupon',
  token_symbol: 'SCPN',
  decimals: 6,
  admin_address: walletData.issuer.address,
  rule: {
    allowed_group: '',
    allowed_sub_group: '',
    min_tier: 0,
    min_sub_tier: 0,
    is_black_list: false,
    countries: ['CA']
  },
  icon: 'https://raw.githubusercontent.com/Faadil1/suspense-cva/main/assets/suspense-coupon.svg'
};

console.log('\n=== Launch Suspense Coupon A-Token application ===');
console.log(JSON.stringify(payload, null, 2));
console.log('\nEligibility intent: CA A-Pass holders allowed; US A-Pass holder blocked by the same CVA rule.');

const result = await cleanverseEncrypted('/atoken/launch', payload);
console.log('\n=== Cleanverse response ===');
console.log(JSON.stringify(result, null, 2));

await mkdir(new URL('../.local/', import.meta.url), { recursive: true });
await writeFile(applyUrl, JSON.stringify({
  submittedAt: new Date().toISOString(),
  payload,
  response: result.data
}, null, 2), 'utf8');

if (result.data?.code === '0000' && result.data?.data?.requestId) {
  console.log(`\nApplication submitted: ${result.data.data.requestId}`);
  console.log('Next: run `npm run atoken:status` until applyStatus is ISSUED, REJECTED, or ISSUE_FAILED.');
} else {
  console.log('\nSTOP: A-Token launch application was not accepted. Preserve this response as evidence and diagnose before retrying.');
}
