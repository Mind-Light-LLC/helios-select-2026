# HeliOS voice-to-verified-action spec

3 October 2026. Product direction and implementation contract. The partner action path below is proposed. The current HeliOS deployment has no partner-confirmed need, outbound provider adapter, or delivery receipt.

## Product job

A person says what they can contribute. HeliOS finds a current, specific need, asks only for facts required to establish fit, obtains approval for one concrete action, coordinates with the organization, follows the task through changes, and reports the state supported by external evidence. A nonprofit can publish and maintain the need without handling vague offers manually.

Voice is the primary conversation. A visible transcript, editable action summary, and text input provide the same task path for people who cannot or do not want to speak. [Voice-agent evaluations](https://proceedings.mlr.press/v306/ray26a.html) show that noise, accents, and interruptions can reduce task completion in tested service workflows. A natural sounding conversation is not a completed action.

## First pilot conversation

> Person: “I can bring 20 unopened cans of fish in Singapore on Tuesday.”
>
> HeliOS: “The Food Bank Singapore lists canned fish. Its public page does not confirm a current quantity or Tuesday drop-off. I can prepare an offer for the organization. May I share your offer and preferred contact method?”
>
> Person: “Yes, share the offer by email.”
>
> HeliOS: “I will ask the organization whether it can accept 20 cans on Tuesday. I will report its reply. This has not been accepted or delivered yet.”

With no willing partner or authorized contact channel, the demo ends at `prepared`. It may show a clearly labeled simulated provider response, but simulation must never populate the live evidence state.

## Canonical records

| Object | Required fields | Authority |
| --- | --- | --- |
| Need | `need_id`, organization, specific resource or service, quantity and unit if known, location, deadline, eligibility, source field evidence, checked time, expiry, publication state | Organization owns demand and confirms capacity. A public page is only a signal. |
| Offer | `offer_id`, need ID, item or skill, amount, availability, place, contact preference, consent scope and expiry | Person owns their offer and contact data. |
| Task | `task_id`, need and offer versions, responsible actor, next required action, dependency IDs, status, timeout, idempotency key | HeliOS owns coordination state, not provider acceptance. |
| Evidence event | actor, timestamp, state transition, exact request digest, evidence URI, visibility and provenance | Each external actor attests only to its own action. |
| Receipt | provider-issued reference, accepted item and quantity, place and time, status, readback method | Provider confirms acceptance and delivery. Receipt alone does not prove incremental social impact. |

The public API must not expose a recipient's identity, precise address, private contact details, or raw voice transcript. Keep those behind scoped consent and role access. Every mutable record is versioned; actions bind to exact versions so a changed need cannot silently reuse prior approval.

## State machine

`public_signal → partner_confirmed_need → offer_prepared → human_approved → provider_submitted → provider_acknowledged → accepted → delivered → partner_verified`

`rejected`, `expired`, `cancelled`, `failed`, and `unknown_after_dispatch` are explicit exits. A timeout never advances a task. If the provider accepts only part of an offer, create a new quantity and ask for approval before resubmitting. The UI and agent tools return the same current state and the evidence required for the next transition.

## Voice and agent behavior

1. Parse a spoken goal into typed need, place, time, quantity, and constraints. Read back uncertain or safety-critical fields. An accent, interruption, or changed answer must update the pending task before any action.
2. Show a concise, editable action summary. One explicit confirmation authorizes one bounded external request, not an open-ended agent mandate.
3. Assign a single owner and next action to each task. Agents communicate through versioned task state and events; they do not rely on chat history as the source of truth.
4. Recheck source freshness, need version, consent, and provider capability immediately before dispatch. Use an idempotency key, then reconcile the provider's canonical status after ambiguous network responses.
5. Tell the person what happened at each evidence boundary: prepared, submitted, acknowledged, accepted, delivered, or still unknown. Never convert a tool response, outbound message, or model statement into a provider receipt.

## External agent contract

The current read-only MCP server remains the discovery surface. Add authenticated, scoped tools only when one provider action is real: `propose_offer`, `get_task`, `approve_task`, `submit_task`, and `get_receipt`. `submit_task` accepts a task ID and exact approved version, not an arbitrary prompt. Return machine-readable status, next owner, next action, and evidence pointers. Use subscriptions or polling for long-running work; an agent must be able to resume after disconnection.

[MCP](https://blog.modelcontextprotocol.io/posts/2026-07-28/) connects another agent to HeliOS tools. [A2A](https://a2a-protocol.org/latest/specification/) can later advertise HeliOS as a task-capable agent through an Agent Card, but implementing a full A2A server before a provider workflow exists would add protocol surface without an outcome. Human partners can use a simple review inbox; they do not need to run an agent.

## Hackathon release slice

1. Make voice able to list the sourced need, check a proposed offer, and show the same card as text. The official provider page remains visible as evidence and fallback.
2. Add a task preview with `prepared` status, exact facts, missing fields, and the authority boundary. Do not display “sent” without an actual outbound receipt.
3. Demonstrate a separate, prominently labeled provider simulator to show how acceptance and delivery evidence would change the state. Keep simulator events out of production records.
4. Run three end-to-end cases: a feasible offer, an expired or incompatible offer, and a provider non-response. Score state correctness, spoken claims, and time to a usable next action.

As of this code pass, the read-only voice need tools and visual need card are wired and typechecked. A live microphone session has not been verified. The offer matcher is a narrow rule-based demo, and no provider request or task persistence exists. Steps 2–4 above remain proposed work.

## Product capabilities beyond the first slice

1. **Need compiler.** A nonprofit speaks or pastes a messy request. HeliOS extracts resource, unit, quantity, deadline, place, eligibility, receiving hours, and proof needed. It asks only for missing hard facts and shows the exact record for a named staff member to publish. Success means fewer clarification messages per accepted offer and no unsupported public quantity.
2. **Multi-party fulfillment.** One need can require donors, packers, transport, and a receiving slot. A dependency graph assigns each commitment to one owner and reserves quantities to prevent two agents from claiming the same gap. Partial offers reduce the remaining quantity only after provider acceptance. Success means fewer stranded commitments and fewer duplicate or excess deliveries.
3. **Capability directory.** An external agent advertises what it can actually do, which organization or person delegated it, allowed action types, location, data scope, budget, expiry, and callback channel. HeliOS matches capabilities to tasks, not agent branding. Rejected or missing scopes remain visible. Success means another agent can discover and resume a task without a custom integration conversation.
4. **Human partner adapter.** A nonprofit without an API can receive a concise review request and approve, reject, or change it through a simple inbox. HeliOS records the named reply and reference; an AI-generated interpretation is not itself acceptance. Success means a real partner can participate without installing agent infrastructure.
5. **Recovery and measurement.** On non-response, cancellation, schedule change, or ambiguous dispatch, HeliOS keeps the task open, reconciles with the provider, and proposes a new plan for human approval. Measure prepared offers, acknowledged requests, accepted quantities, verified deliveries, and recipient benefit separately. A delivery receipt supports an observed outcome, while an incremental impact claim needs an appropriate comparison.

## What creates value

Model quality, speech synthesis, tool calling, and generic agent orchestration will improve across the industry. HeliOS should use those capabilities, not claim them as its moat. The difficult asset is a maintained network of specific partner needs, consented authority to act, reliable provider acknowledgements, and an auditable trail from offer to resource delivered. Without partner participation, HeliOS remains a discovery and preparation product.

[AgentWorld](https://arxiv.org/pdf/2609.31590) motivates explicit roles, revisable shared state, and progress checks. It evaluates game tasks, so its success and collaboration scores are design signals rather than evidence that HeliOS works in communities. A real pilot must measure provider-acknowledged requests and verified deliveries separately from clicks, conversations, and inferred contribution.
