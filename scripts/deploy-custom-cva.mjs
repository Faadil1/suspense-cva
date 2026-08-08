import 'dotenv/config';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import solc from 'solc';
import { ContractFactory, JsonRpcProvider, Wallet, formatEther, getAddress } from 'ethers';

const require = createRequire(import.meta.url);
const rpcUrl = process.env.MONAD_RPC_URL || 'https://rpc.testnet.monad.xyz';
const rawPolicy = process.env.CLEANVERSE_POLICY_ADDRESS;

if (!rawPolicy) {
  throw new Error('Missing CLEANVERSE_POLICY_ADDRESS in .env. Do not guess the Cleanverse policy address.');
}

const policy = getAddress(rawPolicy);
const provider = new JsonRpcProvider(rpcUrl);
const network = await provider.getNetwork();
if (Number(network.chainId) !== 10143) {
  throw new Error(`Wrong network. Expected Monad Testnet chainId 10143, got ${network.chainId}.`);
}

const policyCode = await provider.getCode(policy);
if (policyCode === '0x') {
  throw new Error('No contract bytecode at CLEANVERSE_POLICY_ADDRESS on Monad Testnet.');
}

let walletData;
try {
  walletData = JSON.parse(await readFile(new URL('../.local/wallets.json', import.meta.url), 'utf8'));
} catch {
  throw new Error('Missing .local/wallets.json. Run `npm run wallets` first.');
}

const signer = new Wallet(walletData.issuer.privateKey, provider);
if (signer.address.toLowerCase() !== walletData.issuer.address.toLowerCase()) {
  throw new Error('Local issuer wallet integrity check failed.');
}

const balance = await provider.getBalance(signer.address);
if (balance === 0n) {
  throw new Error('Issuer/admin has 0 MON. Fund it with Monad Testnet MON before deployment.');
}

function source(path) {
  return { content: readFileSync(resolve(process.cwd(), path), 'utf8') };
}

const input = {
  language: 'Solidity',
  sources: {
    'contracts/IATokenPolicy.sol': source('contracts/IATokenPolicy.sol'),
    'contracts/PartnerCompliantATokenV2.sol': source('contracts/PartnerCompliantATokenV2.sol')
  },
  settings: {
    optimizer: { enabled: true, runs: 200 },
    outputSelection: {
      '*': {
        '*': ['abi', 'evm.bytecode.object']
      }
    }
  }
};

function findImports(importPath) {
  const direct = resolve(process.cwd(), importPath);
  if (existsSync(direct)) {
    return { contents: readFileSync(direct, 'utf8') };
  }

  try {
    return { contents: readFileSync(require.resolve(importPath), 'utf8') };
  } catch {
    return { error: `Import not found: ${importPath}` };
  }
}

const output = JSON.parse(solc.compile(JSON.stringify(input), { import: findImports }));
const errors = output.errors || [];
for (const item of errors) {
  console.log(`${item.severity.toUpperCase()}: ${item.formattedMessage}`);
}
if (errors.some((item) => item.severity === 'error')) {
  throw new Error('Solidity compilation failed.');
}

const artifact = output.contracts['contracts/PartnerCompliantATokenV2.sol'].PartnerCompliantATokenV2;
const bytecode = `0x${artifact.evm.bytecode.object}`;

console.log('\n=== Custom CVA fallback deployment ===');
console.log(JSON.stringify({
  chain: 'monad',
  chainId: 10143,
  rpcUrl,
  issuerAdmin: signer.address,
  issuerBalanceMON: formatEther(balance),
  policy,
  tokenName: 'Suspense Coupon',
  tokenSymbol: 'SCPN',
  decimals: 6
}, null, 2));

const factory = new ContractFactory(artifact.abi, bytecode, signer);
const contract = await factory.deploy(
  'Suspense Coupon',
  'SCPN',
  6,
  policy,
  signer.address
);

console.log(`Deployment submitted: ${contract.deploymentTransaction().hash}`);
await contract.waitForDeployment();
const address = await contract.getAddress();
const receipt = await contract.deploymentTransaction().wait();

const evidence = {
  deployedAt: new Date().toISOString(),
  chain: 'monad',
  chainId: 10143,
  rpcUrl,
  contract: 'PartnerCompliantATokenV2',
  atokenAddress: address,
  policyAddress: policy,
  issuerAdmin: signer.address,
  tokenName: 'Suspense Coupon',
  tokenSymbol: 'SCPN',
  decimals: 6,
  txHash: receipt.hash,
  blockNumber: receipt.blockNumber,
  gasUsed: receipt.gasUsed.toString()
};

await mkdir(new URL('../.local/', import.meta.url), { recursive: true });
await writeFile(
  new URL('../.local/custom-cva.json', import.meta.url),
  JSON.stringify(evidence, null, 2),
  'utf8'
);

console.log('\nCUSTOM CVA DEPLOYED ✅');
console.log(JSON.stringify(evidence, null, 2));
console.log('\nSaved public deployment evidence to .local/custom-cva.json (gitignored).');
console.log('Next only after deployment: register this existing CVA with Cleanverse using `npm run cva:register`.');
