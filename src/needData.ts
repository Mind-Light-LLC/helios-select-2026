export type HelpRoute = {
  id: 'food' | 'warehouse' | 'delivery';
  label: string;
  detail: string;
  action_url: string;
  source_url: string;
  source_checked_at: string;
  publication_state: 'published';
  action_authority: 'external_provider';
};

export type NeedEvidenceStep = {
  id: 'public_source' | 'partner_need' | 'offer_acceptance' | 'recipient_delivery';
  label: string;
  state: 'documented' | 'unverified';
  evidence_required: string;
};

export type SourcedNeed = {
  id: string;
  title: string;
  organization: string;
  place: string;
  summary: string;
  source_url: string;
  source_checked_at: string;
  review_due_at: string;
  publication_state: 'published';
  action_authority: 'external_provider';
  evidence_status: 'public_source';
  quantity_needed: null;
  delivery_status: 'unverified';
  accepted_examples: string[];
  requirements: string[];
  routes: HelpRoute[];
  evidence_steps: NeedEvidenceStep[];
};

export type PartnerNeed = {
  id: string;
  title: string;
  organization_name: string;
  place_label: string;
  summary: string;
  quantity_needed: number;
  quantity_unit: string;
  needed_by: string;
  eligibility_summary: string | null;
  official_action_url: string;
  source_url: string;
  source_checked_at: string;
  review_due_at: string;
  publication_state: 'published';
  evidence_status: 'partner_confirmed';
};

export type NeedRecord = SourcedNeed | PartnerNeed;
export type NeedView = NeedRecord & { view_url: string };

export type OfferAssessment = {
  fit: 'possible' | 'not_eligible' | 'unknown';
  explanation: string;
  route: HelpRoute | null;
};

const foodSource = 'https://foodbank.sg/donate-food/';
const volunteerSource = 'https://foodbank.sg/volunteer/';
const sourceCheckedAt = '2026-10-03';

export const sourcedNeeds: SourcedNeed[] = [{
  id: 'food-bank-singapore-food-support',
  title: 'Food support in Singapore',
  organization: 'The Food Bank Singapore',
  place: 'Singapore',
  summary: 'The organization publishes a food donation wishlist and offers warehouse and delivery volunteer roles. It has not published a quantity needed for this request.',
  source_url: foodSource,
  source_checked_at: sourceCheckedAt,
  review_due_at: '2026-10-10',
  publication_state: 'published',
  action_authority: 'external_provider',
  evidence_status: 'public_source',
  quantity_needed: null,
  delivery_status: 'unverified',
  accepted_examples: ['Canned fish', 'Rice', 'Cooking oil', 'Cereal', 'Milk', 'Noodles'],
  requirements: [
    'Food Bank Boxes accept unopened, unexpired dry or packaged food with at least four weeks until expiry.',
    'Check the official page before drop-off; the public wishlist does not confirm a specific quantity or recipient delivery.',
  ],
  routes: [
    {
      id: 'food',
      label: 'Offer food',
      detail: 'Check the accepted items and find an official Food Bank Box or food drive path.',
      action_url: foodSource,
      source_url: foodSource,
      source_checked_at: sourceCheckedAt,
      publication_state: 'published',
      action_authority: 'external_provider',
    },
    {
      id: 'warehouse',
      label: 'Help sort and pack',
      detail: 'Warehouse sessions are on weekdays. The organization lists a minimum age of 16.',
      action_url: volunteerSource,
      source_url: volunteerSource,
      source_checked_at: sourceCheckedAt,
      publication_state: 'published',
      action_authority: 'external_provider',
    },
    {
      id: 'delivery',
      label: 'Help deliver food',
      detail: 'Delivery assistant sessions are typically on weekdays. The organization lists a minimum age of 18.',
      action_url: volunteerSource,
      source_url: volunteerSource,
      source_checked_at: sourceCheckedAt,
      publication_state: 'published',
      action_authority: 'external_provider',
    },
  ],
  evidence_steps: [
    { id: 'public_source', label: 'Public need signal', state: 'documented', evidence_required: 'Official source URL and review date' },
    { id: 'partner_need', label: 'Partner confirms a specific need', state: 'unverified', evidence_required: 'Named partner, quantity, place, and needed-by date' },
    { id: 'offer_acceptance', label: 'Partner accepts an offer', state: 'unverified', evidence_required: 'Provider acknowledgement and reference' },
    { id: 'recipient_delivery', label: 'Resource reaches a recipient', state: 'unverified', evidence_required: 'Authorized delivery receipt and partner readback' },
  ],
}];

const foodPattern = /\b(tuna|sardines|salmon|canned fish|rice|cooking oil|cereal|cereals|milk|noodles|biscuits|beans|peanut butter|jam)\b/i;
const negatedOfferPattern = /\b(don't|do not|cannot|can't|not able to)\b/i;

export function assessOffer(input: string, need: SourcedNeed = sourcedNeeds[0], asOf: Date = new Date()): OfferAssessment {
  const offer = input.trim().toLocaleLowerCase();
  if (!offer) return { fit: 'unknown', explanation: 'Describe what you can offer and where you can help.', route: null };
  if (asOf.getTime() > new Date(`${need.review_due_at}T23:59:59Z`).getTime()) {
    return { fit: 'unknown', explanation: 'This source is due for review. Check the official page before using this match.', route: null };
  }
  if (negatedOfferPattern.test(offer)) {
    return { fit: 'unknown', explanation: 'I cannot confirm an offer from that description. State what you can provide.', route: null };
  }
  if (!/\bsingapore\b/.test(offer)) {
    return { fit: 'unknown', explanation: 'This sourced need is in Singapore. Include your location to check whether the route fits.', route: null };
  }
  const route = (id: HelpRoute['id']) => need.routes.find((item) => item.id === id) ?? null;
  const expired = /\bexpired\b/.test(offer) && !/\b(not expired|unexpired)\b/.test(offer);
  const opened = /\bopened\b/.test(offer) && !/\b(not opened|unopened)\b/.test(offer);
  if (foodPattern.test(offer) && (expired || opened || /\b(fresh meat|raw meat|perishable)\b/.test(offer))) {
    return { fit: 'not_eligible', explanation: 'Food Bank Boxes do not accept opened, expired, or fresh food. Check the official rules for other donation routes.', route: route('food') };
  }
  const ageMatch = offer.match(/\b(\d{1,2})\s*(?:years? old|yo)\b/)
    ?? offer.match(/\b(?:i am|i'm|age|aged)\s+(\d{1,2})\b/);
  const age = ageMatch ? Number(ageMatch[1]) : null;
  if (/\b(deliver|delivery)\b/.test(offer)) {
    if (age !== null && age < 18) {
      return { fit: 'not_eligible', explanation: 'The listed delivery assistant role requires volunteers to be at least 18.', route: route('delivery') };
    }
    if (/\b(weekends?|saturday|sunday)\b/.test(offer)) {
      return { fit: 'unknown', explanation: 'The listed delivery assistant sessions are typically on weekdays. Check the official page for another role.', route: route('delivery') };
    }
    return { fit: 'possible', explanation: 'The organization lists a delivery assistant role for adults. Confirm your age, schedule, and an available place with it.', route: route('delivery') };
  }
  if (/\b(pack|sort|warehouse|volunteer|time)\b/.test(offer)) {
    if (age !== null && age < 16) {
      return { fit: 'not_eligible', explanation: 'The listed warehouse role requires volunteers to be at least 16.', route: route('warehouse') };
    }
    if (/\b(weekends?|saturday|sunday)\b/.test(offer)) {
      return { fit: 'unknown', explanation: 'The listed warehouse sessions are on weekdays. Check the official page for another suitable role.', route: route('warehouse') };
    }
    return { fit: 'possible', explanation: 'The organization lists weekday sorting and packing sessions for people aged 16 or older. Confirm an available place with it.', route: route('warehouse') };
  }
  if (foodPattern.test(offer)) {
    return { fit: 'possible', explanation: 'That item appears on the public wishlist. Check packaging, expiry, and the official drop-off instructions before acting.', route: route('food') };
  }
  return { fit: 'unknown', explanation: 'This offer is not confirmed by the reviewed source. Check the official page or try a listed item or role.', route: null };
}
