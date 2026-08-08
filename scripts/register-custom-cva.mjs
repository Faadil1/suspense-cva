import 'dotenv/config';
import { readFile, writeFile } from 'node:fs/promises';
import { Wallet, getAddress } from 'ethers';
import { cleanverseEncrypted } from './cleanverse-encryption.mjs';

const chain = process.env.CHAIN || 'monad';
const icon = process.env.ATOKEN_ICON_URL || 'https://raw.githubusercontent.com/Faadil1/suspense-cva/main/assets/suspense-coupon.svg';

let wallets;
try {
  wallets = JSON.parse(await readFile(new URL('../.local/wallets.json', import.meta.url), 'utf8'));
} catch {
  throw new Error('Missing .local/wallets.json.');
}

let deployment;
try {
  deployment = JSON.parse(await readFile(new URL('../.local/custom-cva.json', import.meta.url), 'utf8'));
} catch {
  throw new Error('Missing .local/custom-cva.json. Run `npm run cva:deploy` first.');
}

const atokenAddress = getAddress(deployment.atokenAddress);
const owner = new Wallet(wallets.issuer.privateKey);

if (owner.address.toLowerCase() !== deployment.issuerAdmin.toLowerCase()) {
  throw new Error('Issuer private key does not match the deployed CVA owner/admin.');
}

// Cleanverse docs: EIP-191 personal_sign over lowercase(chain + atoken_address).
const ownerMessage = `${chain}${atokenAddress}`.toLowerCase();
const ownerSignature = await owner.signMessage(ownerMessage);

const payload = {
  chain,
  atoken_address: atokenAddress,
  owner_signature: ownerSignature,
  atoken_icon: icon
};

console.log('\n=== Register existing custom CVA with Cleanverse ===');
console.log(JSON.stringify({
  chain,
  atoken_address: atokenAddress,
  owner: owner.address,
  signed_message: ownerMessage,
  atoken_icon: icon
}, null, 2));
console.log('owner_signature generated locally (not printed).');

const result = await cleanverseEncrypted('/atoken/register_atoken', payload);
console.log('\n=== Cleanverse response ===');
console.log(JSON.stringify(result, null, 2));

await writeFile(
  new URL('../.local/custom-cva-register.json', import.meta.url),
  JSON.stringify({
    submittedAt: new Date().toISOString(),
    atokenAddress,
    owner: owner.address,
    response: result.data
  }, null, 2),
  'utf8'
);

if (result.data?.code === '0000' && result.data?.data?.requestId) {
  console.log(`\nRegistration submitted: ${result.data.data.requestId}`);
  console.log('Next: run `npm run cva:register:status` until ISSUED, REJECTED, or ISSUE_FAILED.');
} else {
  console.log('\nRegistration was not accepted. Do not retry blindly.');
  process.exitCode = 2;
}
