import 'dotenv/config';

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import solc from 'solc';
import {
  ContractFactory,
  JsonRpcProvider,
  Wallet,
  getAddress
} from 'ethers';

const require = createRequire(import.meta.url);

const rpcUrl = process.env.MONAD_RPC_URL;
const rawPolicy = process.env.CLEANVERSE_POLICY_ADDRESS;

if (!rpcUrl) throw new Error('Missing MONAD_RPC_URL in .env');
if (!rawPolicy) throw new Error('Missing CLEANVERSE_POLICY_ADDRESS in .env');

const policy = getAddress(rawPolicy);
const token = getAddress('0xA17EaB812000679FE3C87a0C4a29Cf8A0714A7bD');

const provider = new JsonRpcProvider(rpcUrl);
const network = await provider.getNetwork();

if (Number(network.chainId) !== 10143) {
  throw new Error(`Wrong network: ${network.chainId}`);
}

const wallets = JSON.parse(
  await readFile(new URL('../.local/wallets.json', import.meta.url), 'utf8')
);

const signer = new Wallet(wallets.issuer.privateKey, provider);

function source(path) {
  return {
    content: readFileSync(resolve(process.cwd(), path), 'utf8')
  };
}

const input = {
  language: 'Solidity',
  sources: {
    'contracts/SuspenseVault.sol': source('contracts/SuspenseVault.sol'),
    'contracts/IATokenPolicy.sol': source('contracts/IATokenPolicy.sol')
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
    return {
      contents: readFileSync(require.resolve(importPath), 'utf8')
    };
  } catch {
    return {
      error: `Import not found: ${importPath}`
    };
  }
}

const output = JSON.parse(
  solc.compile(JSON.stringify(input), { import: findImports })
);

for (const item of output.errors || []) {
  console.log(`${item.severity.toUpperCase()}: ${item.formattedMessage}`);
}

if ((output.errors || []).some((item) => item.severity === 'error')) {
  throw new Error('SuspenseVault compilation failed');
}

const artifact =
  output.contracts['contracts/SuspenseVault.sol'].SuspenseVault;

const factory = new ContractFactory(
  artifact.abi,
  `0x${artifact.evm.bytecode.object}`,
  signer
);

console.log('Deploying SuspenseVault...');
console.log('owner:', signer.address);
console.log('token:', token);
console.log('policy:', policy);

const vault = await factory.deploy(
  token,
  policy,
  signer.address
);

console.log('deployment tx:', vault.deploymentTransaction().hash);

await vault.waitForDeployment();

const address = await vault.getAddress();
const receipt = await vault.deploymentTransaction().wait();

const evidence = {
  deployedAt: new Date().toISOString(),
  chain: 'monad',
  chainId: 10143,
  contract: 'SuspenseVault',
  address,
  owner: signer.address,
  token,
  policy,
  txHash: receipt.hash,
  blockNumber: receipt.blockNumber,
  gasUsed: receipt.gasUsed.toString()
};

await mkdir(new URL('../.local/', import.meta.url), {
  recursive: true
});

await writeFile(
  new URL('../.local/suspense-vault.json', import.meta.url),
  JSON.stringify(evidence, null, 2),
  'utf8'
);

console.log('\nSUSPENSE VAULT DEPLOYED ?');
console.log(JSON.stringify(evidence, null, 2));
