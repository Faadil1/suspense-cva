import { cleanverse, print, requireEnv } from './lib.mjs';

requireEnv(['ATOKEN_ADDRESS', 'WALLET_ELIGIBLE', 'WALLET_INELIGIBLE']);

const chain = process.env.CHAIN || 'monad';
const atoken = process.env.ATOKEN_ADDRESS;

for (const [label, address] of [
  ['EXPECTED ELIGIBLE', process.env.WALLET_ELIGIBLE],
  ['EXPECTED INELIGIBLE', process.env.WALLET_INELIGIBLE]
]) {
  const result = await cleanverse('/verify_apass', { atoken, chain, address });
  print(label, result);
}

console.log('\nGO only if Cleanverse itself returns a meaningful contrast between the two wallets.');
