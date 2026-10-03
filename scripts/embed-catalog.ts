type CatalogRow = {
  id: string;
  title: string;
  summary: string;
  organization_name: string;
  country: string;
  place_label: string;
  record_kind: string;
  embedding_model: string | null;
  embedding_updated_at: string | null;
};

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isRow(value: unknown): value is CatalogRow {
  if (!object(value)) return false;
  return ['id', 'title', 'summary', 'organization_name', 'country', 'place_label', 'record_kind']
    .every((key) => typeof value[key] === 'string')
    && (value.embedding_model === null || typeof value.embedding_model === 'string')
    && (value.embedding_updated_at === null || typeof value.embedding_updated_at === 'string');
}

function configuration() {
  const base = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!base || !serviceKey || !geminiKey) throw new Error('Supabase URL, service role key, or Gemini key is missing.');
  const url = new URL(base);
  if (url.protocol !== 'https:' || url.hostname !== 'htpyrttusvchudpoghwk.supabase.co') {
    throw new Error('Embedding writes are limited to the isolated Helios Supabase project.');
  }
  return { base: url.origin, serviceKey, geminiKey };
}

async function rows(base: string, key: string): Promise<CatalogRow[]> {
  const params = new URLSearchParams({
    select: 'id,title,summary,organization_name,country,place_label,record_kind,embedding_model,embedding_updated_at',
    published: 'eq.true', order: 'id.asc', limit: '500',
  });
  const response = await fetch(`${base}/rest/v1/helios_items?${params}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}`, Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`Catalog read failed (${response.status}).`);
  const value: unknown = await response.json();
  if (!Array.isArray(value) || !value.every(isRow)) throw new Error('Catalog read returned invalid rows.');
  return value;
}

async function embed(row: CatalogRow, key: string): Promise<number[]> {
  const text = `title: ${row.title} | text: ${row.summary} Organization: ${row.organization_name}. Type: ${row.record_kind}. Country: ${row.country}. Place: ${row.place_label}.`;
  const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent', {
    method: 'POST',
    headers: { 'x-goog-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: { parts: [{ text }] }, output_dimensionality: 768 }),
  });
  if (!response.ok) throw new Error(`Gemini embedding failed (${response.status}) for ${row.id}.`);
  const value: unknown = await response.json();
  if (!object(value) || !Array.isArray(value.embeddings) || !object(value.embeddings[0])
    || !Array.isArray(value.embeddings[0].values)) throw new Error(`Invalid Gemini response for ${row.id}.`);
  const vector = value.embeddings[0].values;
  if (vector.length !== 768 || !vector.every((number: unknown) => typeof number === 'number' && Number.isFinite(number))) {
    throw new Error(`Gemini returned the wrong embedding size for ${row.id}.`);
  }
  return vector;
}

async function save(base: string, key: string, id: string, vector: number[]): Promise<void> {
  const params = new URLSearchParams({ id: `eq.${id}`, select: 'id,embedding_model,embedding_updated_at' });
  const response = await fetch(`${base}/rest/v1/helios_items?${params}`, {
    method: 'PATCH',
    headers: {
      apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify({
      embedding: `[${vector.join(',')}]`,
      embedding_model: 'gemini-embedding-2',
      embedding_updated_at: new Date().toISOString(),
    }),
  });
  if (!response.ok) throw new Error(`Embedding write failed (${response.status}) for ${id}.`);
  const value: unknown = await response.json();
  if (!Array.isArray(value) || value.length !== 1 || !object(value[0])
    || value[0].id !== id || value[0].embedding_model !== 'gemini-embedding-2') {
    throw new Error(`Embedding write lacked canonical readback for ${id}.`);
  }
}

async function main(): Promise<void> {
  const write = process.argv.includes('--write');
  const { base, serviceKey, geminiKey } = configuration();
  const catalog = await rows(base, serviceKey);
  const pending = catalog.filter((row) => row.embedding_model !== 'gemini-embedding-2' || !row.embedding_updated_at);
  process.stdout.write(`${catalog.length} published rows; ${pending.length} need embeddings. ${write ? 'Writing' : 'Dry run'} mode.\n`);
  if (!write) return;
  for (const row of pending) {
    await save(base, serviceKey, row.id, await embed(row, geminiKey));
    process.stdout.write(`Embedded ${row.id}.\n`);
  }
  const verified = await rows(base, serviceKey);
  const embeddedCount = verified.filter((row) => row.embedding_model === 'gemini-embedding-2' && row.embedding_updated_at).length;
  if (embeddedCount !== catalog.length) throw new Error(`Only ${embeddedCount} of ${catalog.length} rows have embedding readback.`);
  process.stdout.write(`Verified ${embeddedCount} Gemini embeddings in the Helios catalog.\n`);
}

main().catch((cause: unknown) => {
  process.stderr.write(`${cause instanceof Error ? cause.message : 'Embedding failed.'}\n`);
  process.exitCode = 1;
});
