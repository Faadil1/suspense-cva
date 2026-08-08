import crypto from 'node:crypto';

export function encryptCleanversePayload(payload, base64Key) {
  if (!base64Key) throw new Error('Missing CLEANVERSE_API_KEY_BASE64 in .env');

  const key = Buffer.from(base64Key, 'base64');
  if (![16, 24, 32].includes(key.length)) {
    throw new Error(`Decoded Cleanverse API key has invalid AES length: ${key.length} bytes`);
  }

  const iv = Buffer.alloc(16, 0);
  const cipher = crypto.createCipheriv(`aes-${key.length * 8}-cbc`, key, iv);
  cipher.setAutoPadding(true);

  const plaintext = JSON.stringify(payload);
  return Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final()
  ]).toString('base64');
}

export async function cleanverseEncrypted(path, payload) {
  const base = process.env.CLEANVERSE_BASE_URL || 'https://uatapi.cleanverse.com/api/cooperate';
  const apiId = process.env.CLEANVERSE_API_ID;
  const apiKey = process.env.CLEANVERSE_API_KEY_BASE64;

  if (!apiId) throw new Error('Missing CLEANVERSE_API_ID in .env');
  if (!apiKey) throw new Error('Missing CLEANVERSE_API_KEY_BASE64 in .env');

  const data = encryptCleanversePayload(payload, apiKey);

  const res = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-id': apiId,
      'X-Request-ID': crypto.randomUUID()
    },
    body: JSON.stringify({ data })
  });

  const text = await res.text();
  let response;
  try {
    response = JSON.parse(text);
  } catch {
    response = { raw: text };
  }

  return { httpStatus: res.status, ok: res.ok, data: response };
}
