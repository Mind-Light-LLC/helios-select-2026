export async function GET(): Promise<Response> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return Response.json({ error: 'Account creation is not configured.' }, { status: 503 });
  try {
    if (new URL(url).protocol !== 'https:') throw new Error('Invalid URL');
    return Response.json({ url, key }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return Response.json({ error: 'Account configuration is invalid.' }, { status: 503 });
  }
}
