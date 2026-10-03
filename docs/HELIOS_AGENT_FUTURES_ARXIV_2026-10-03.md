# Helios and the future of agents: arXiv research and interface direction

3 October 2026. Research and design only. No product code, provider integration, or production setting was changed for this brief.

Implementation update, later on 3 October: the first web UI and voice-state pass is now in the source tree. The source-code findings below describe the state at the time of research. See the [interface framework](HELIOS_INTERFACE_FRAMEWORK.md) for the adopted design rules. Live catalog, microphone, provider, and outcome proof remain separate.

## Direct judgment

**"What agents want" is a bad theme.** Agents have no product need of their own. They execute a person's or organization's delegated task. The useful question is whether Helios gives them a more reliable route from a human intention to a real, independently checkable result.

The research points toward agents that use tools, hold state across time, coordinate with other actors, speak and listen, and increasingly affect digital or physical systems. The gap is proof. A transcript or tool log can show what an agent attempted; it cannot show that a provider accepted the action, that a person participated, or that the world improved. The product thesis should therefore be **a sourced path to action with a visible chain of evidence**. This is an internal design criterion, not a proposed marketing slogan.

Helios today has a narrower, honest contract. Its [product brief](product-brief.md) describes nine curated records, a globe, read-only agent tools, and official next-step links. Availability is not confirmed for those records in the documented readback. Voice and semantic retrieval are marked unverified. Registration, attendance, and impact are not implemented. The [three-case Bedrock experiment](bedrock-evaluation.md) is useful local evidence of a constrained fit classifier, but it does not establish general search accuracy or a deployed agent. The following design is a direction from that baseline, not a claim that Helios already delivers outcomes.

## Research question and method

Question: **What capabilities are agents gaining, what fails when they meet real institutions, and what evidence would justify saying Helios helped produce a real-world outcome?** I reviewed original arXiv papers through 3 October 2026 across tool use, stateful work, collaboration, delegated authority, action verification, causal measurement, and realtime speech. Some are conference papers; several 2026 systems papers are early preprints. Results below are the authors' reported results in their own test settings, not measured Helios performance. This is a focused review, not a systematic meta-analysis.

### 1. Agents are becoming actors, but action reliability is the bottleneck

| Original paper | What it demonstrates | Limit and Helios decision |
| --- | --- | --- |
| [ReAct (2022)](https://arxiv.org/abs/2210.03629) | Interleaving reasoning, tool action, and observation can outperform answer-only approaches in interactive tasks. | Its environments are not volunteer providers. Use a search → inspect → verify loop, then judge the returned state rather than the agent's explanation. |
| [Voyager (2023)](https://arxiv.org/abs/2305.16291) | A persistent library of learned skills helps an agent make progress over long tasks in Minecraft. | Reusable skills are promising, but a game achievement is not a live opportunity. Helios should preserve successful *verified* handoff patterns while rechecking volatile source facts. |
| [OSWorld (2024)](https://arxiv.org/abs/2404.07972) | Agents can attempt real application workflows in controlled computer environments; the paper's best baseline completed 12.24% of 369 tasks versus 72.36% for humans. | The controlled VM is not a live institution. Give external agents typed tools and direct state checks instead of relying on visual clicks through the globe. |
| [τ-bench (2024)](https://arxiv.org/abs/2406.12045) | The benchmark scores the **final database state** after simulated user conversations. Its tested leading function-calling agents completed fewer than half the tasks; retail pass⁸ was below 25%. | Simulated retail and airline tasks. For Helios, evaluate correct final action state and repeatability, not a confident spoken or written completion claim. |
| [AgentWorld (2026)](https://arxiv.org/abs/2609.31590) | In a 3–20 agent game with 100 human-annotated long tasks, the best evaluated model reached 52% task success; coordination, role, and shared-plan failures remained common. | The setting is an MMORPG. Its "causal collaboration" graph uses an LLM judge for some dependencies, so it is an inferred contribution map, not certified causal attribution. Record actor roles and handoffs, but label inferred contribution as inferred. |
| [How Well Does Agent Development Reflect Real-World Work? (2026)](https://arxiv.org/abs/2603.01203) | Mapping 43 benchmarks and 72,342 tasks to 1,016 US occupations found that agent evaluation is disproportionately centered on programming compared with the distribution of work. | The mapping is observational. Helios should evaluate actual community and provider workflows, including no-match, changing schedules, approval, and follow-through. |
| [OpenVLA (2024)](https://arxiv.org/abs/2406.09246) | Vision-language-action models trained on 970,000 robot demonstrations can generalize across tested physical manipulation tasks. | Laboratory manipulation does not establish safe open-world service or public benefit. Physical agents may later consume Helios's place and task data; robotics is not the next Helios build. |

**Inference:** The move is from single answers to systems that observe, act, check state, and continue. The commercially impressive part is execution. The scientifically hard part is knowing whether the intended state actually changed.

### 2. Traceability requires authority, external receipts, and recovery

| Original paper | What it contributes | Limit and Helios decision |
| --- | --- | --- |
| [AgentDojo (2024)](https://arxiv.org/abs/2406.13352) | Tool outputs and retrieved content can carry prompt injections that redirect agents. | A benchmark cannot cover all live attacks. Treat opportunity pages and descriptions as untrusted data, and keep authority outside model text. |
| [Authenticated Delegation and Authorized AI Agents (2025)](https://arxiv.org/abs/2501.09674) | Proposes scoped human-to-agent delegation, auditable authority, and agent credentials compatible with existing identity protocols. | It is a framework proposal, not proof that every provider supports it. An action must name who authorized it, its exact scope, and its expiry. |
| [Proof-Carrying Agent Actions (2026)](https://arxiv.org/abs/2606.04104) | Proposes a portable action certificate spanning admissibility, assumptions, approval, and outcome closure; evaluates 96 protected traces across runtimes. | Small, partly disclosure-bounded validation. Use the certificate concept to design a portable receipt; do not claim proven ecosystem interoperability. |
| [Authority at Commit Time (2026)](https://arxiv.org/abs/2609.31490) | A controlled prototype rechecks current authority before an idempotent external dispatch and reconciles lost responses from canonical receipts. | The paper explicitly does not establish production reliability or prevent direct-credential bypass effects. Revalidate consent and provider state at dispatch, and design for ambiguous responses. |
| [Outcome Monitors (2026)](https://arxiv.org/abs/2608.19303) | In injected-failure benchmarks, outcome-contract monitors improved tool-task completion by supplying recovery options after silent failures. | Detection fell to 46% outside the learned failure vocabulary. Helios needs explicit provider readback and a visible unresolved state, not just a success-shaped API response. |
| [Credit Without Ground Truth (2026)](https://arxiv.org/abs/2608.19760) | Executed counterfactual replay in ALFWorld found no reliable incremental fidelity for tested step-credit signals beyond their shuffled controls; some judge fidelity remained inconclusive. | One simulated environment. It is a strong warning against using an agent trace, confidence score, or LLM judge to declare that an agent *caused* an outcome. |

**Inference:** A safe architecture separates the agent's proposal from the authority that permits a write and the provider that can confirm it. A tamper-evident local log is valuable, but it cannot supply a missing partner acknowledgment or make an unsupported claim true.

### 3. Actual impact needs a measurement design

| Original paper | What it measures | Limit and Helios decision |
| --- | --- | --- |
| [Collaborating with AI Agents: Field Experiments (2025, revised 2026)](https://arxiv.org/abs/2503.18238) | In its current arXiv version, 2,234 participants were randomized to human-human or human-AI teams producing ads for a think tank. Human-AI teams produced 50% more ads per worker; field testing reached about 5 million impressions, with different text and image quality effects. | This is a real field test of human-agent collaboration, not volunteering or an autonomous agent's verified social benefit. It shows how to measure worker behavior and external response separately. |
| [Generative AI at Work (2023)](https://arxiv.org/abs/2304.11771) | In a staggered introduction to 5,172 support workers, AI assistance was associated with 15% more issues resolved per hour on average. | An assistant for human workers is not the same as an autonomous agent; the setting is customer support. It shows the need for independent operational outcomes. |
| [Estimating the Causal Impact of Recommendation Systems (2015)](https://arxiv.org/abs/1510.05569) | In one Amazon observational study, the authors estimated that at least 75% of observed recommendation click-through activity would likely have happened without recommendations. | Its instrumental-variable assumptions and numeric estimate do not transfer to Helios. The lesson is to avoid calling clicks or referrals "impact" without a comparison. |

**Inference:** Helios must count discovery, official handoff, provider acceptance, participation, and downstream benefit separately. To claim Helios *caused* extra participation or benefit, use a consented randomized or defensible quasi-experimental comparison. A receipt proves an event happened; it does not by itself prove incrementality.

### 4. Realtime voice is an interface to grounded action, not proof of it

| Original paper | Reported evidence | Limit and Helios decision |
| --- | --- | --- |
| [τ-Voice (2026)](https://arxiv.org/abs/2603.13686) | On 278 simulated service tasks, evaluated voice agents completed 31–51% in clean audio and 26–38% with realistic noise and accents, versus 85% for the compared text reasoning agent. | The domains and simulator differ from Helios. Measure spoken task completion and exact action state separately from how natural the voice sounds. |
| [TurnBench (2026)](https://arxiv.org/abs/2608.25218) | Thirty hours of triple-annotated human dialogue and 14 systems showed interruption false positives depend strongly on conversation style. | It measures turn detection, not Helios task success. Balance premature interruption against sluggish response. |
| [From Text to Voice (2026)](https://arxiv.org/abs/2605.15104) | Seven evaluated models on paired text/audio tool tasks often failed by misunderstanding spoken **argument values**. | Much of the audio is generated for controlled tests. Validate city, country, cause, date, and selected record ID with real microphones and users. |
| [DuplexWorld (2026)](https://arxiv.org/abs/2608.10716) | The best tested voice agent reached Pass@1 of 0.490 across 156 simulated everyday scenarios. | The simulated worlds do not measure provider participation. Speech quality, turn management, and task outcome need separate scores. |

## The product model: one chain, seven distinct states

```mermaid
flowchart LR
  A[Sourced opportunity] --> B[Person approves exact next step]
  B --> C[Authorized agent attempt]
  C --> D[Provider acknowledges]
  D --> E[Provider state read back]
  E --> F[Organization confirms participation]
  F --> G[Observed service outcome]
  G -. comparison study .-> H[Incremental impact estimate]
```

For each step, store an action ID, actor, time, evidence URI, canonical record/version, and a digest of the exact approved or executed payload. Keep private deliberation out of public receipts. When a provider offers no receipt or readback, the state remains **unverified**. A person can still follow an official link; Helios must not rename that event "registered." This operational model combines the state-based evaluation in [τ-bench](https://arxiv.org/abs/2406.12045), the authority structure in [Authenticated Delegation](https://arxiv.org/abs/2501.09674), and the receipt/reconciliation ideas in [Authority at Commit Time](https://arxiv.org/abs/2609.31490). It is a proposed design, not an existing Helios implementation.

The agent-facing reason to use Helios is specific: a stable, documented interface to source-linked records with location, eligibility, timing, availability uncertainty, official next action, and eventually a verifiable action state. The current [read-only MCP tools](../api/mcp.ts) make only the first part plausible. With nine records and no confirmed availability or provider receipts, agent demand and real-world impact are unproven.

## The application design

Apple's current [design principles](https://developer.apple.com/design/human-interface-guidelines/design-principles) say that simplicity is **not** minimalism: keep necessary information close and remove what competes with the task. Its [writing guidance](https://developer.apple.com/design/human-interface-guidelines/writing) favors direct, concise labels, while [layout guidance](https://developer.apple.com/design/human-interface-guidelines/layout) emphasizes visual hierarchy. The target is Apple-level craft and accessibility, not a copied operating-system skin or glass effects over every surface.

Before the interface pass, [App.tsx](../src/App.tsx) placed a hero headline, lead paragraph, search label, example chips, voice button, map headline, result status, result list, detailed card, footnote, footer, and an agent access essay on the same screen. **This was bad because it made the map and the next action compete with explanatory text.** The [style sheet](../src/styles.css) already had a coherent navy, warm accent, globe, and quiet translucent card; the pass keeps that visual identity and simplifies the composition.

| State | Dominant content | Visible controls and text |
| --- | --- | --- |
| Arrive | Full-viewport globe and its real organization markers. | Helios mark; one floating input, "Cause or place"; microphone; optional Explore. One short entry line at most. |
| Search | Globe remains the scene; compact results tray appears. | Result count, title, place, one fit/availability label. No paragraph per result. |
| Select | Globe flies to the exact pin; one focused card. | Organization, title, place and timing, availability state, **Official next step**, **Source**. Explain whether the pin is an event site or an organization city. |
| No match | Keep the globe and input, with a small honest empty panel. | "No match in this catalog" and one way to widen the search. Do not fly to a wrong city. |
| Activity, later | Small status timeline accessible from the selected card. | Suggested, approved, sent, provider confirmed, completed, outcome observed. Each status opens its evidence. Only show states that actually exist. |

Desktop: use the globe as the canvas with the search dock in a consistent safe corner and a restrained results sheet. Mobile: use the same dock above the safe area and a bottom sheet that can collapse, partially open, or expand. The result list must also work without the globe for screen readers, keyboard users, reduced motion, and low graphics performance. Preserve the selected card during search corrections. Use one clear primary action per state. Avoid a persistent chat transcript, multiple hero slogans, AI badges, fake confidence percentages, and decorative motion that delays the task. Apple's [accessibility guidance](https://developer.apple.com/design/human-interface-guidelines/accessibility) and [disclosure guidance](https://developer.apple.com/design/human-interface-guidelines/disclosure-controls) support a readable primary surface with details available on demand.

## Realtime voice integration, using the current Helios path

Helios already issues short-lived Realtime client secrets in [api/voice-token.ts](../api/voice-token.ts), opens a browser WebRTC session in [VoiceControl.tsx](../src/VoiceControl.tsx), and exposes `search_catalog` and `focus_result`. Those tools call the same catalog path as text search. Keep that architecture for the first verified version. The [official OpenAI WebRTC guide](https://developers.openai.com/api/docs/guides/voice-webrtc?voice-api=realtime) describes ephemeral browser credentials, media audio, and data-channel events; the [conversation](https://developers.openai.com/api/docs/guides/realtime-conversations) and [VAD](https://developers.openai.com/api/docs/guides/realtime-vad) guides cover events and turn handling.

The voice dock should have an explicit state machine: **Idle → Requesting microphone → Connecting → Listening → Searching → Speaking → Idle**, with **Stopped**, **Interrupted**, and **Error** reachable at any point. Show a small caption of the current utterance and the exact visible record being discussed. Never make the visual card and the spoken answer diverge. Offer Stop, mute, retry, and text search at all relevant states. Ask for microphone access only on user action, consistent with [Apple's privacy guidance](https://developer.apple.com/design/human-interface-guidelines/privacy/). Do not infer playback completion from a model's response-generation completion event.

Two concrete risks existed in [VoiceControl.tsx](../src/VoiceControl.tsx): `getUserMedia` could return after Stop and leave its newly acquired stream running; a pending search could call the UI callbacks after Stop or after a newer correction. The first pass now stops a late stream, fences session events by generation, aborts stale searches, and displays connection, listening, searching, and responding states. These are source-code changes; no live microphone session has verified them yet.

For the next voice eval, test spoken city/country/cause/date extraction, no-match, accents and background noise, interruption while speaking, correction while a search is in flight, permission denial, network loss, and immediate Stop. Score exact tool arguments, correct sourced result, unsupported speech, false completion claim, microphone release, stale UI update rate, p50/p95 time to first response, and mistaken versus missed interruptions. Keep voice and text task-success results side by side. [τ-Voice](https://arxiv.org/abs/2603.13686), [TurnBench](https://arxiv.org/abs/2608.25218), and [From Text to Voice](https://arxiv.org/abs/2605.15104) motivate these tests; none supplies a Helios threshold.

## Sequence and proof gates

1. **Make discovery true.** Add typed hard constraints for location, date, schedule, and eligibility; resolve the current [search fallback](../server/data.ts) that can return topical records outside an unsupported place; track source freshness and availability separately. Evaluate a human-labeled, held-out set of covered, uncovered, stale, and conflicting requests. The initial target of 100 varied requests is an engineering proposal, not a paper-derived guarantee.
2. **Ship one excellent visual/voice loop in a prototype.** Compose the globe, one dock, a result tray, and one sourced card. Fix voice cancellation races and expose live status/captions. Test desktop, phone, keyboard/screen reader, reduced motion, mic denial, interruption, and no-match. The gate is a person reaching a correct official next step without an unsupported claim.
3. **Prove one external action with one willing provider.** Agree on one action type and its authority, idempotency, acknowledgment, readback, and failure reconciliation. Capture exact human approval before any provider write. The gate is a provider-issued receipt and canonical state readback, not a tool success string.
4. **Measure observed outcomes.** Partner confirms whether the person participated and what service was delivered. Report funnel conversion separately from an estimate of incremental impact. If sample and ethics permit, compare to a consented control or staged rollout; otherwise label impact as observed contribution without a causal claim.

Do not prioritize an agent swarm, autonomous registrations across unknown providers, a new model stack, or robot integration now. The papers make those futures intellectually interesting. They do not solve Helios's current coverage, correctness, authority, or outcome gaps.

## Decision

Build a high-craft **discovery and voice interface around a truthful record**. Treat agent action and impact as successive evidence gates, each visible to the person. The research supports that direction strongly as an architecture and evaluation method. It does **not** establish that Helios has agent adoption, confirmed participation, or measurable social impact today.
