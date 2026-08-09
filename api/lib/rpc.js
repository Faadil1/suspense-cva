/**
 * SUSPENSE-CVA — RPC provider factory.
 *
 * Creates a validated JsonRpcProvider pinned to Monad Testnet (chainId 10143).
 * Rejects if the connected network is not the expected chain.
 *
 * The RPC URL comes from the server-side MONAD_RPC_URL environment variable.
 * A public default is used if not configured, so read-only Phase B endpoints
 * deploy without any secrets.
 *
 * Security: This module never exposes the RPC URL to client code.
 */

import { JsonRpcProvider, Contract } from 'ethers';
import {
  CHAIN_ID,
  TOKEN_ADDRESS,
  VAULT_ADDRESS,
  POLICY_ADDRESS,
  ERC20_ABI,
  VAULT_ABI,
  POLICY_ABI,
} from './constants.js';

const DEFAULT_RPC = 'https://rpc.testnet.monad.xyz';

/**
 * Build a provider and verify the chain ID.
 * Throws with a descriptive error if the chain does not match CHAIN_ID.
 */
export async function getProvider() {
  const rpcUrl = process.env.MONAD_RPC_URL || DEFAULT_RPC;
  const provider = new JsonRpcProvider(rpcUrl);

  const network = await provider.getNetwork();
  const actualChainId = Number(network.chainId);

  if (actualChainId !== CHAIN_ID) {
    throw new Error(
      `CHAIN_MISMATCH: expected Monad Testnet chainId ${CHAIN_ID}, got ${actualChainId}`
    );
  }

  return provider;
}

/**
 * Build provider + all three canonical contract instances.
 * All addresses are hardcoded from constants — never client-provided.
 */
export async function getContracts() {
  const provider = await getProvider();

  return {
    provider,
    token:  new Contract(TOKEN_ADDRESS,  ERC20_ABI,   provider),
    vault:  new Contract(VAULT_ADDRESS,  VAULT_ABI,   provider),
    policy: new Contract(POLICY_ADDRESS, POLICY_ABI,  provider),
  };
}

/**
 * Build provider only (for callers that don't need contracts).
 */
export { getProvider as buildProvider };
