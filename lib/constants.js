export const CHAIN_ID = 10143;
export const TOKEN_ADDRESS = '0xEE4B42402219d49Fa3Ea05562d8096A9Afa20A04';
export const VAULT_ADDRESS = '0xA94C6cF70570e0D360D668E0113132c57a6C88E0';
export const POLICY_ADDRESS = '0x36489bE45fa84f70a0c2BDB11D824Be608CB12Dd';
export const TOKEN_DECIMALS_CANONICAL_HINT = 6;
export function oneToken(decimals) { return 10n ** BigInt(decimals); }
export function assertDecimalsMatch(liveDecimals) {
  if (Number(liveDecimals) !== TOKEN_DECIMALS_CANONICAL_HINT) {
    throw new Error(`DECIMALS_MISMATCH: token.decimals() returned ${liveDecimals} but TOKEN_DECIMALS_CANONICAL_HINT is ${TOKEN_DECIMALS_CANONICAL_HINT}. Update constants.js before Phase D.`);
  }
}
export const DISTRIBUTION_AMOUNT_TOKENS = 1n;
export const MAX_ALLOCATIONS = 5n;
export const DEMO_COHORT = Object.freeze([
  { holder: 1, address: '0x7Af35af23cD7d8555ac5Fc6DfFc13D5228D65dCf', country: 'CA', cvRecord: 1894 },
  { holder: 2, address: '0x067d4E3E6806c2bEd1D140574993a28259fCB85E', country: 'CA', cvRecord: 1895 },
  { holder: 3, address: '0xC222E51b1F456F51aDF2598ed7450A4ec6372752', country: 'CA', cvRecord: 1896 },
  { holder: 4, address: '0xc06Fc03A3701Ce5EFe3CE5C0052FaE6797Db69EC', country: 'CA', cvRecord: 1897 },
  { holder: 5, address: '0x4065D109d7A008107257113D8EED7607d965513f', country: 'US', cvRecord: 1898 },
]);
export const AllocationState = Object.freeze({ NONE: 0, READY: 1, PAID: 2, SUSPENDED: 3, RELEASED: 4 });
export const ALLOCATION_STATE_LABEL = Object.freeze({ 0: 'NONE', 1: 'READY', 2: 'PAID', 3: 'SUSPENDED', 4: 'RELEASED' });
export const REALITY = Object.freeze({ LIVE_POLICY_CHECK: 'LIVE_POLICY_CHECK', FRESH_CLEANVERSE_API_CHECK: 'FRESH_CLEANVERSE_API_CHECK', LIVE_CHAIN_STATE: 'LIVE_CHAIN_STATE', HISTORICAL_EVIDENCE: 'HISTORICAL_EVIDENCE' });
export const EXPLORER_BASE = 'https://testnet.monadscan.com/tx/';
export const ERC20_ABI = ['function balanceOf(address account) view returns (uint256)','function decimals() view returns (uint8)','function symbol() view returns (string)','function name() view returns (string)','function totalSupply() view returns (uint256)'];
export const VAULT_ABI = ['function token() view returns (address)','function policy() view returns (address)','function owner() view returns (address)','function allocations(bytes32 allocationId) view returns (address recipient, uint256 amount, uint8 state)','function distribute(bytes32[] calldata allocationIds, address[] calldata recipients, uint256[] calldata amounts)','function release(bytes32 allocationId)','event AllocationCreated(bytes32 indexed allocationId, address indexed recipient, uint256 amount)','event AllocationPaid(bytes32 indexed allocationId, address indexed recipient, uint256 amount)','event AllocationSuspended(bytes32 indexed allocationId, address indexed recipient, uint256 amount, bytes4 cleanverseSelector)','event AllocationReleased(bytes32 indexed allocationId, address indexed recipient, uint256 amount)','error InvalidArrayLengths()','error InvalidAllocation()','error DuplicateAllocation(bytes32 allocationId)','error InsufficientFunding(uint256 required, uint256 available)','error NotSuspended(bytes32 allocationId)','error StillBlocked(bytes32 allocationId, bytes4 cleanverseSelector)'];
export const POLICY_ABI = ['function canTransfer(address token, address from, address to, uint256 amount) view returns (bool)'];
