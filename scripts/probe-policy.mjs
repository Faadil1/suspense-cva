import 'dotenv/config';
import { Interface, JsonRpcProvider, ZeroAddress, getAddress } from 'ethers';

const rpcUrl = process.env.MONAD_RPC_URL || 'https://rpc.testnet.monad.xyz';
const rawPolicy = process.env.CLEANVERSE_POLICY_ADDRESS;

if (!rawPolicy) {
  throw new Error('Missing CLEANVERSE_POLICY_ADDRESS in .env. Wait for the official Cleanverse Monad Testnet IATokenPolicy address.');
}

const policy = getAddress(rawPolicy);
const provider = new JsonRpcProvider(rpcUrl);
const network = await provider.getNetwork();

console.log('\n=== Cleanverse policy probe ===');
console.log(JSON.stringify({
  rpcUrl,
  chainId: Number(network.chainId),
  policy
}, null, 2));

if (Number(network.chainId) !== 10143) {
  throw new Error(`Wrong network. Expected Monad Testnet chainId 10143, got ${network.chainId}.`);
}

const code = await provider.getCode(policy);
if (code === '0x') {
  throw new Error('NO-GO: no contract bytecode exists at CLEANVERSE_POLICY_ADDRESS on Monad Testnet.');
}

console.log(`Contract bytecode: present (${(code.length - 2) / 2} bytes)`);

const abi = [
  'function canTransfer(address token,address from,address to,uint256 amount) view returns (bool)'
];
const iface = new Interface(abi);
const data = iface.encodeFunctionData('canTransfer', [
  ZeroAddress,
  ZeroAddress,
  ZeroAddress,
  0n
]);

try {
  const raw = await provider.call({ to: policy, data });
  if (!raw || raw === '0x') {
    console.log('Interface probe: empty return data — policy interface NOT confirmed.');
    process.exitCode = 2;
  } else {
    const [allowed] = iface.decodeFunctionResult('canTransfer', raw);
    console.log(`Interface probe: canTransfer callable; returned ${allowed}.`);
    console.log('POLICY PROBE: PASS ✅');
  }
} catch (error) {
  console.log('Interface probe reverted. The address has code, but canTransfer is not yet proven callable with this synthetic zero-address probe.');
  console.log('Revert summary:', error.shortMessage || error.message);
  console.log('POLICY PROBE: INCONCLUSIVE — do not deploy until address/function is confirmed.');
  process.exitCode = 2;
}
