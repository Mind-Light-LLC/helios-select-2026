import { assessOffer, loadNeeds, sourcedNeeds, type NeedView } from '@api';

type Result = { output: Record<string, unknown>; needs: NeedView[] };

function field(args: Record<string, unknown>, key: string): string | null {
  const value = args[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export async function executeNeedVoiceTool(name: string, args: Record<string, unknown>, seen: NeedView[],
  onNeed: (id: string, offer?: string) => void): Promise<Result> {
  if (name === 'list_sourced_needs') {
    const needs = await loadNeeds();
    return { needs, output: {
      coverage: 'Published partner requests and reviewed public signals. Provider acceptance and delivery remain unknown.',
      records: needs.map((need) => ({ id: need.id, title: need.title,
        organization: need.evidence_status === 'partner_confirmed' ? need.organization_name : need.organization,
        place: need.evidence_status === 'partner_confirmed' ? need.place_label : need.place,
        source_url: need.source_url, source_checked_at: need.source_checked_at,
        review_due_at: need.review_due_at, evidence_status: need.evidence_status })),
    } };
  }
  if (name === 'check_offer') {
    const offer = field(args, 'offer');
    if (!offer) throw new Error('Describe the proposed offer.');
    const id = field(args, 'need_id') ?? sourcedNeeds[0].id;
    const need = seen.find((entry) => entry.id === id)
      ?? sourcedNeeds.map((entry) => ({ ...entry, view_url: `/?need=${entry.id}` })).find((entry) => entry.id === id);
    if (!need) throw new Error('List published needs before checking that offer.');
    onNeed(id, offer);
    const assessment = need.evidence_status === 'public_source' ? assessOffer(offer, need)
      : { fit: 'unknown', explanation: 'The organization must confirm this offer and eligibility.', route: null };
    return { needs: seen, output: { need_id: id, assessment, action_state: 'not_started',
      delivery_status: 'unverified' } };
  }
  if (name === 'focus_need') {
    const id = field(args, 'id');
    const need = seen.find((entry) => entry.id === id);
    if (!need) throw new Error('List published needs before opening one.');
    onNeed(need.id);
    return { needs: seen, output: { focused: true, title: need.title, source_url: need.source_url } };
  }
  throw new Error('Unknown need action.');
}
