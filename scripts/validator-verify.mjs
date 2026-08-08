import { cleanverse, print, requireEnv } from './lib.mjs';

requireEnv(['VALIDATOR_POOL_ADDRESS', 'WALLET_ELIGIBLE', 'WALLET_INELIGIBLE']);

const chain = process.env.CHAIN || 'monad';
const contract_address = process.env.VALIDATOR_POOL_ADDRESS;

for (const [label, user_address] of [
  ['EXPECTED ELIGIBLE', process.env.WALLET_ELIGIBLE],
  ['EXPECTED INELIGIBLE', process.env.WALLET_INELIGIBLE]
]) {
  const result = await cleanverse('/validator/verify', {
    chain,
    contract_address,
    user_address
  });
  print(label, result);
}
