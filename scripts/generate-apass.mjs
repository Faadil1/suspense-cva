import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { cleanverseEncrypted } from './cleanverse-encryption.mjs';

const mode = process.argv.includes('--all') ? 'all' : 'one';
const chain = process.env.CHAIN || 'monad';

let walletData;
try {
  walletData = JSON.parse(await readFile(new URL('../.local/wallets.json', import.meta.url), 'utf8'));
} catch {
  throw new Error('Missing .local/wallets.json. Run `npm run wallets` first.');
}

const holders = mode === 'all' ? walletData.holders : walletData.holders.slice(0, 1);
const expirationTime = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60);

for (let i = 0; i < holders.length; i += 1) {
  const holder = holders[i];
  const customerId = `SUSP${holder.address.slice(2, 18)}`;

  const payload = {
    customerId,
    subTier: 10,
    override: false,
    expirationTime,
    wallet: {
      address: holder.address,
      chain
    },
    identityDataList: [
      {
        idType: 'PASSPORT',
        fullName: `Sandbox Holder ${i + 1}`,
        issuingCountryISO2: holder.country
      }
    ]
  };

  console.log(`\n=== Provision ${holder.label} (${holder.country}) ===`);
  console.log(JSON.stringify({
    customerId,
    wallet: payload.wallet,
    country: holder.country,
    expirationTime
  }, null, 2));

  const result = await cleanverseEncrypted('/generate_apass', payload);
  console.log(JSON.stringify(result, null, 2));

  if (result.httpStatus === 403) {
    console.log('\nSTOP: api-id role/IP/decryption permission is blocking A-Pass provisioning.');
    break;
  }

  if (result.data?.code !== '0000') {
    console.log('\nSTOP after first business failure. Do not create more A-Passes until this response is understood.');
    break;
  }
}

console.log('\nNext: if the one-wallet probe returns code 0000, run `npm run apass:all`.');
