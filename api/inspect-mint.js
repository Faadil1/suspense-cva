import { getProvider } from '../lib/rpc.js';

const TX_HASH = '0xfa522a34a7351976ffe1318b00b06451f9eceaa70a791a32647a2bbba8173314';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });
  try {
    const provider = await getProvider();
    const tx = await provider.getTransaction(TX_HASH);
    const receipt = await provider.getTransactionReceipt(TX_HASH);
    if (!tx) return res.status(404).json({ error: 'TX_NOT_FOUND' });
    return res.status(200).json({
      hash: tx.hash,
      from: tx.from,
      to: tx.to,
      data: tx.data,
      value: tx.value?.toString?.() ?? '0',
      blockNumber: tx.blockNumber,
      status: receipt?.status ?? null,
      logs: receipt?.logs?.map((log) => ({ address: log.address, topics: log.topics, data: log.data })) ?? [],
    });
  } catch {
    return res.status(503).json({ error: 'INSPECTION_FAILED' });
  }
}
