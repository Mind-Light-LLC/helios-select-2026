export function readGeminiEmbedding(payload: unknown): number[] | null {
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) return null;
  const response = payload as Record<string, unknown>;
  const embedding = response.embedding ?? (Array.isArray(response.embeddings) ? response.embeddings[0] : null);
  if (typeof embedding !== 'object' || embedding === null || Array.isArray(embedding)) return null;
  const values = (embedding as Record<string, unknown>).values;
  if (!Array.isArray(values) || values.length !== 768
    || !values.every((value: unknown) => typeof value === 'number' && Number.isFinite(value))) return null;
  return values;
}
