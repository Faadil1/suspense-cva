import { mkdir, writeFile } from 'node:fs/promises';
import { Wallet } from 'ethers';

const outDir = new URL('../.local/', import.meta.url);
const outFile = new URL('../.local/wallets.json', import.meta.url);

const issuer = Wallet.createRandom();
const holders = Array.from({ length: 5 }, (_, index) => {
  const wallet = Wallet.createRandom();
  return {
    label: `holder-${index + 1}`,
    country: index < 4 ? 'CA' : 'US',
    address: wallet.address,
    privateKey: wallet.privateKey
  };
});

const payload = {
  warning: 'SANDBOX TEST WALLETS ONLY. NEVER USE THESE KEYS FOR MAINNET FUNDS.',
  createdAt: new Date().toISOString(),
  chain: process.env.CHAIN || 'monad',
  issuer: {
    label: 'issuer-admin',
    address: issuer.address,
    privateKey: issuer.privateKey
  },
  holders
};

await mkdir(outDir, { recursive: true });
await writeFile(outFile, JSON.stringify(payload, null, 2), { encoding: 'utf8', mode: 0o600 });

console.log('Created local sandbox wallets at .local/wallets.json');
console.log('This file is gitignored. Do NOT commit or paste its private keys.');
console.log('\nIssuer/admin:', payload.issuer.address);
console.log('\nRecipients:');
for (const holder of holders) {
  console.log(`${holder.label}: ${holder.address} (${holder.country})`);
}
