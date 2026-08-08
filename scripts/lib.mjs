import 'dotenv/config';

export const BASE = process.env.CLEANVERSE_BASE_URL || 'https://uatapi.cleanverse.com/api/cooperate';
export const API_ID = process.env.CLEANVERSE_API_ID;

export function requireEnv(names) {
  for (const name of names) {
    if (!process.env[name]) throw new Error(`Missing ${name} in .env`);
  }
}

export async function cleanverse(path, body = {}) {
  requireEnv(['CLEANVERSE_API_ID']);

  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-id': API_ID,
      'X-Request-ID': crypto.randomUUID()
    },
    body: JSON.stringify(body)
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  return { httpStatus: res.status, ok: res.ok, data };
}

export function print(label, result) {
  console.log(`\n=== ${label} ===`);
  console.log(JSON.stringify(result, null, 2));
}
