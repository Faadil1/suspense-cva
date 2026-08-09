import { JsonRpcProvider, Contract } from 'ethers';
import { CHAIN_ID, TOKEN_ADDRESS, VAULT_ADDRESS, POLICY_ADDRESS, ERC20_ABI, VAULT_ABI, POLICY_ABI } from './constants.js';
const DEFAULT_RPC = 'https://rpc.testnet.monad.xyz';
export async function getProvider() {
  const provider = new JsonRpcProvider(process.env.MONAD_RPC_URL || DEFAULT_RPC);
  const network = await provider.getNetwork();
  const actualChainId = Number(network.chainId);
  if (actualChainId !== CHAIN_ID) throw new Error(`CHAIN_MISMATCH: expected Monad Testnet chainId ${CHAIN_ID}, got ${actualChainId}`);
  return provider;
}
export async function getContracts() {
  const provider = await getProvider();
  return { provider, token: new Contract(TOKEN_ADDRESS, ERC20_ABI, provider), vault: new Contract(VAULT_ADDRESS, VAULT_ABI, provider), policy: new Contract(POLICY_ADDRESS, POLICY_ABI, provider) };
}
export { getProvider as buildProvider };
