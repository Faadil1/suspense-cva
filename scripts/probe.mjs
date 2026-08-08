import { cleanverse, print } from './lib.mjs';

const chain = process.env.CHAIN || 'monad';

const result = await cleanverse('/validator/verify', {
  chain,
  contract_address: '0x0000000000000000000000000000000000000001',
  user_address: '0x0000000000000000000000000000000000000002'
});

print('Sandbox/auth probe', result);

console.log('\nInterpretation:');
console.log('- 403 / invalid api-id => STOP: credentials or permissions issue.');
console.log('- Reachable endpoint + business/read error => auth path is alive; continue.');
