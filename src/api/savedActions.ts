import { getAuthClient } from './authClient';

export type SavedAction = { catalog_item_id: string; created_at: string };
export const savedActionsEvent = 'helios-saved-actions-changed';

function isSavedAction(value: unknown): value is SavedAction {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    && 'catalog_item_id' in value && typeof value.catalog_item_id === 'string'
    && 'created_at' in value && typeof value.created_at === 'string';
}

export async function listSavedActions(): Promise<SavedAction[]> {
  const client = await getAuthClient();
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user) throw new Error('Sign in to see saved actions.');
  const { data, error } = await client.from('saved_actions')
    .select('catalog_item_id,created_at').order('created_at', { ascending: false });
  if (error) throw new Error(`Saved actions could not be loaded: ${error.message}`);
  if (!Array.isArray(data) || !data.every(isSavedAction)) throw new Error('Saved actions returned invalid data.');
  return data;
}

export async function saveAccountAction(id: string): Promise<void> {
  const client = await getAuthClient();
  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user) throw new Error('Sign in to save across devices.');
  const { error } = await client.from('saved_actions').insert({
    user_id: userData.user.id, catalog_item_id: id,
  });
  if (error && error.code !== '23505') throw new Error(`Save failed: ${error.message}`);
  window.dispatchEvent(new Event(savedActionsEvent));
}
