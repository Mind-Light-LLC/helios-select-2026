# Helios: research-backed path beyond the hackathon

Supplemental research on opportunity retrieval and volunteer discovery. The arXiv-focused agent futures, traceable impact, interface, and voice brief requested later is [Helios and the future of agents](HELIOS_AGENT_FUTURES_ARXIV_2026-10-03.md).

3 October 2026. Research and product assessment. No code, provider, or production change is proposed as already proven.

## Executive judgment

Helios currently has a useful contract: an agent and a person can inspect the same sourced record, see what its map pin means, and reach the provider's official next step. The catalog has nine manually reviewed records, all with availability marked not confirmed at the last documented database readback. Semantic retrieval, voice, and provider outcomes remain unverified in the product brief. A separate [Bedrock experiment](bedrock-evaluation.md) exercised three requests locally; that is a smoke test, not a ranking benchmark or deployed agent proof. This is a credible discovery demonstration, not evidence of a functioning volunteer marketplace. See [product brief](product-brief.md#evidence-and-limits) and [schema attestation](schema-attestation.md#official-action-contract-preflight-and-readback).

The most valuable next work is more verified opportunity density in a chosen use case, correct handling of user constraints, and freshness at the point of handoff. More models cannot compensate for absent opportunities or an unavailable role. This is a product inference supported by the retrieval and volunteer-matching studies below; none of them measures Helios.

## The theme and the reason an agent would use it

Keep the human theme already present in [src/App.tsx](../src/App.tsx): **"The world is within reach"** and **"Explore the world. Find your place in it."** The visual idea is the whole world; the product moment is one specific place where the person can show up. The [Bedrock experiment](bedrock-evaluation.md#visual-direction) describes the search as a journey across the globe, with the result card grounded in record facts. That is a clearer creative and product direction than an infrastructure slogan.

The agent proposition is a different sentence: **"When someone asks where they can help, give their agent a real, checkable answer and a route to the organization."** An agent needs a current opportunity, its actual location and requirements, a source it can cite, and an honest action state. It can then bring the person back to the same record on the globe. The answer may be "nothing in this catalog fits." That is useful information when the catalog's limits are clear.

Agents do not have independent preferences. An agent host or developer must expose Helios, the model must select its tool, and the result must improve the person's task. The current MCP interface offers structured records, stable IDs, a human view URL, official source and action URLs, limited-catalog disclosure, and a read-only boundary in [api/mcp.ts](../api/mcp.ts). That gives an agent a reason to use it **when a relevant record exists**. Nine records spread across countries, no confirmed availability, and no provider receipt give an agent little reason to prefer it over web search for most requests. Agent demand is unproven.

The falsifiable promise to agent builders is: "For covered places and causes, Helios returns a more accurate, faster-to-check opportunity and action state than generic web search." Tool-discovery and tool-use research shows why documentation and end-to-end testing matter: [ToolRet](https://aclanthology.org/2025.findings-acl.1258/) found that retrieved tools reduced downstream task success compared with curated tools, and [DRAFT](https://proceedings.iclr.cc/paper_files/paper/2025/hash/8c22e5e918198702765ecff4b20d0a90-Abstract-Conference.html) found that better tool documentation improved tool use on its benchmarks. Neither establishes demand for Helios.

## What the current checkout actually supports

| Area | Observed in source | Consequence |
| --- | --- | --- |
| Catalog | [src/types.ts](../src/types.ts) defines title, summary, country, place label, pin meaning, schedule text, one source URL, one check time, action link, and availability status. | Source presence is visible, but individual fields have no evidence span, source snapshot, or validity window. |
| Search | [server/data.ts](../server/data.ts) tries a configured Bedrock classifier for at most 25 candidates, then a Gemini vector path if configured, then keyword scoring. | A [three-request Bedrock smoke test](bedrock-evaluation.md) found useful fit labels and a geographic text-match error. There is no systematic search benchmark. Semantic retrieval remains unverified in the product brief. |
| Place | The [place constraint helper](../server/data.ts) returns all items if no city or country string matches the request. The client sends a plain query without an explicit country filter in [src/App.tsx](../src/App.tsx). | A request for an unsupported place can surface a topical record elsewhere. This is bad because a plausible result can violate the person's most important constraint. |
| Time and availability | The schema has a start timestamp and free-text schedule; [searchItems](../server/data.ts) has no deterministic date, timezone, closure, or expiry filter. All nine documented records were not confirmed for availability. | A past event or incompatible shift can be retrieved. A checked date does not certify an open place. |
| Agent handoff | [api/mcp.ts](../api/mcp.ts) marks the next action not started and requires provider confirmation. | The boundary is honest. There is no provider acknowledgement or attendance evidence yet. |
| Voice | [api/voice-token.ts](../api/voice-token.ts) instructs voice to search before naming an opportunity; [src/VoiceControl.tsx](../src/VoiceControl.tsx) invokes the same search API. | The instruction is sensible, but voice accuracy and live-path success are unverified. |

These are code and documented-state observations on this checkout, not a new live deployment or provider audit. Existing uncommitted work was preserved.

## Research evidence and transfer limits

### 1. Retrieval must respect constraints

| Primary paper | Finding in its own setting | Helios implication and limit |
| --- | --- | --- |
| [MultiConIR, EMNLP Findings 2025](https://aclanthology.org/2025.findings-emnlp.726/) | Fifteen retrievers and rerankers deteriorated as queries gained more conditions; ranking was sensitive to wording and condition order. | Separate eligibility from relevance. Its benchmark is not volunteer listings. |
| [InfoSearch, ICLR 2025](https://proceedings.iclr.cc/paper_files/paper/2025/hash/d37a4093931f359eb5fac5a25199db57-Abstract-Conference.html) | Most evaluated dense and reranking models fell short of strict positive and negative document-attribute instructions. | Never let semantic similarity decide a hard rule such as city, age, date, or remote-only. The tested attributes differ from Helios fields. |
| [Reproducing Complex Set-Compositional Information Retrieval, SIGIR 2026](https://doi.org/10.1145/3805712.3808555) | Neural methods performed well on semantic retrieval but poorly on controlled set predicates compared with lexical retrieval. | Test conjunctions and exclusions independently from topical relevance. Its artificial predicate benchmark does not predict Helios error rates. |
| [BEIR, NeurIPS 2021](https://datasets-benchmarks-proceedings.neurips.cc/paper/2021/hash/65b9eea6e1cc6bb9f0cd2a47751a186f-Abstract-round2.html) | BM25 was a robust zero-shot baseline across many retrieval datasets; heavier rerankers improved some results with more compute. | Keep a simple lexical baseline and make embeddings earn their cost on Helios queries. BEIR does not evaluate eligibility constraints. |
| [Negation and neural retrieval, EMNLP Findings 2025](https://aclanthology.org/2025.findings-emnlp.839/) | Dense retrievers struggled with negated conditions in synthetic tests. | Include paired requests such as "remote only" and "no remote work"; enforce exclusions through typed fields. |
| [Around the World in 24 Hours, ACL 2025](https://aclanthology.org/2025.acl-long.1115/) | Models were weaker on combined geographic and temporal reasoning than simple time questions. | Normalize actual schedule intervals and timezones in code rather than depending on a model to infer cross-border timing. This was a language-model probe, not a volunteer search trial. |

Design response: parse cause and preferences, classify each condition as hard, soft, or unknown, filter verified hard constraints, then rank remaining records. Preserve "related path" only when explicitly labeled. If place is unsupported, return no local match with catalog coverage, not a location-mismatched answer disguised as a match. If schedule or eligibility is unknown, show the uncertainty before the action link.

### 2. Truth is field-level and time-dependent

| Primary paper | Finding in its own setting | Helios implication and limit |
| --- | --- | --- |
| [ALCE, EMNLP 2023](https://aclanthology.org/2023.emnlp-main.398/) | Its citation benchmark found that about half of evaluated long-form answers from ChatGPT/GPT-4 baselines lacked full cited support. | A card-level URL is weaker than evidence for each material claim. The study tests generated answers, not Helios cards. |
| [FActScore, EMNLP 2023](https://aclanthology.org/2023.emnlp-main.741/) | Atomic factual claims can be checked separately; factual precision alone can reward short or over-abstaining output. | Audit time, place, eligibility, status, and next action individually, while also measuring required-field coverage. Its corpus was biographies. |
| [FreshLLMs, ACL Findings 2024](https://aclanthology.org/2024.findings-acl.813/) | Fast-changing questions and false premises are difficult for search-augmented answers; the benchmark itself requires updating. | Test false premises such as "the event is still open" and give volatile fields shorter recheck targets. |
| [HoH, ACL 2025](https://aclanthology.org/2025.acl-long.301/) | Stale passages reduced answer performance by at least 20% in tested setups even when current evidence was retrieved. | Version source evidence and exclude superseded claims from present-tense recommendations. The experiment used Wikipedia snapshots. |
| [GaRAGe, ACL Findings 2025](https://aclanthology.org/2025.findings-acl.875/) | Its evaluated models had limited attribution and deflection when grounding was insufficient, especially for time-sensitive questions. | Treat unknown availability as a data state with a policy gate; prompt instructions alone are insufficient. Benchmark results are not Helios rates. |
| [UAEval4RAG, ACL 2025](https://aclanthology.org/2025.acl-long.415/) | No tested RAG configuration was consistently best on both answerable and unanswerable questions. | Evaluate correct no-match and correct abstention alongside recall; a system that always refuses is also defective. |
| [Dynamic content expiration in web search, 2026 preprint](https://arxiv.org/abs/2605.13052) | Baidu researchers report offline and online gains from query-aware expiry signals. | Different claims have different lifetimes, but an LLM expiry model is unnecessary for nine curated records. Start with explicit deadlines and source-diff review. This is a preprint and its commercial setting differs. |

Design response: keep an append-only official-page snapshot or partner feed record with fetch time and content hash. Store the exact supporting passage or data field for each displayed claim, plus reviewer and version. Separate "source checked" from "provider confirmed open." A material source change should queue review; expired events and broken action paths should leave the public match set. Recheck time-sensitive claims at handoff. For a directory page, label the result as a directory, not an available shift.

### 3. Human choice and actual outcomes matter

| Primary paper | Finding in its own setting | Helios implication and limit |
| --- | --- | --- |
| [Redesigning VolunteerMatch's Search Algorithm, Management Science 2026](https://pubsonline.informs.org/doi/10.1287/mnsc.2023.03838) | Two regional SmartSort deployments were associated with about 8% more opportunities per week receiving at least one connection, with no statistically significant decrease in total connections. | Once Helios has volume, assess exposure across suitable providers, not just total clicks. This measured connections, not completed shifts, and used a difference-in-differences design. |
| [Volunteer task-selection autonomy, Socio-Economic Planning Sciences 2024](https://www.sciencedirect.com/science/article/pii/S0038012124002957) | A task menu followed by expressed willingness improved modeled assignments in a computational experiment informed by one nonprofit's data. | Offer several feasible options and let people choose or refine. It is not a proven live UI optimum; avoid demographic preference proxies. |
| [Build it and they will come, Canadian Journal of Economics 2023](https://onlinelibrary.wiley.com/doi/10.1111/caje.12671) | Charity proximity was associated with greater predicted volunteering, with the effect falling with distance. | Real service location matters. The paper geocodes charity premises, not specific open shifts, so a headquarters pin must not be treated as a shift location. |
| [Motivating Experts to Contribute to Digital Public Goods, Management Science 2024](https://pubsonline.informs.org/doi/10.1287/mnsc.2023.4852) | An expertise-match signal raised expressed willingness from 45% to 51%, but treatments did not significantly change actual contributions. | Measure provider-confirmed signups and participation separately from interest, clicks, or persuasive copy. The participants were Wikipedia experts, not Helios volunteers. |

### 4. Agent access requires end-to-end proof

| Primary paper | Finding in its own setting | Helios implication and limit |
| --- | --- | --- |
| [ToolRet, ACL Findings 2025](https://aclanthology.org/2025.findings-acl.1258/) | Tool retrieval from a large catalog degraded downstream pass rates compared with curated tool access. | Clear tool names, task-oriented descriptions, schemas, examples, and discoverability need testing. A public MCP URL alone proves no external agent adoption. |
| [MCP-AgentBench, AAAI 2026](https://ojs.aaai.org/index.php/AAAI/article/view/40347) | Its multi-server tasks exposed missed tool calls, misread constraints, omitted tool data, and unsupported answers. | Test the full agent answer against source and task state, not only a successful MCP response. Benchmarks use simulated tasks and judging. |
| [tau-bench, ICLR 2025](https://proceedings.iclr.cc/paper_files/paper/2025/file/1b126cc38b8638e07bef37e7b2bb72bf-Paper-Conference.pdf) | Multi-turn agents showed inconsistent success under state-based evaluation. | Run repeated dialogues and verify final state, particularly whether the agent falsely claims signup or attendance. Its retail and airline domains differ. |
| [AgentDojo, NeurIPS 2024](https://proceedings.neurips.cc/paper_files/paper/2024/file/97091a5177d8dc64b1da8bf3e1f6fb54-Paper-Datasets_and_Benchmarks_Track.pdf) | Tool-scope filtering reduced some injection attacks, especially when malicious instructions required a write outside the legitimate read task. | Preserve read-only catalog tools and test malicious text embedded in source material. Read-only scope does not guarantee truthful answers. |
| [tau-Voice, ICML 2026](https://proceedings.mlr.press/v306/ray26a.html) | Simulated voice agents completed fewer tasks under realistic noise and accents than in clean audio, and lagged a text reasoning baseline. | Evaluate spoken constraints, correction, interruption, and grounded handoff against text. Its service domains were not volunteering. |

The [2026 MCP specification](https://blog.modelcontextprotocol.io/posts/2026-07-28/) supports structured tool outputs and discovery patterns, but protocol compliance alone is not product value. Before adopting a new protocol feature, check the installed Helios SDK and compatibility with intended agent hosts.

## Roadmap with proof gates

### Phase 1: make the result trustworthy

1. Choose a dense, partner-relevant wedge, such as a city and one or two causes, based on provider willingness to keep listings current. The nine-country demo proves breadth of presentation, not useful local coverage.
2. Distinguish organization, directory, actual opportunity, and dated event. Add typed service location, remote/in-person mode, schedule interval and timezone, eligibility, effort, capacity status, source evidence, and validity. Unknown must be explicit.
3. Build source-diff and human review before increasing ingestion volume. Expire past events and disable broken actions. Track review time and the fraction of records within freshness targets.
4. Fix hard-constraint matching. A named unsupported city should yield an honest no-match result. Rank only eligible records. Keep lexical search as the baseline; compare optional semantic ranking on a held-out query set.

**Gate:** Zero observed hard-constraint violations in the frozen offline evaluation set, no known closed listing presented as open, and every displayed material claim supported by a current official source. Zero observed errors in a small sample is a release check, not proof of a zero population error rate.

### Phase 2: prove that people and agents can use it

1. Test one end-to-end journey with real people: request, feasible shortlist, source inspection, chosen next step, provider response. Record where the path stops. Do not call an outbound click a registration.
2. Register Helios in two or three actual external agent hosts beside generic web search. Use covered, uncovered, stale, and conflicting requests. Measure whether the host exposes the tool, whether the model selects it, whether it uses filters correctly, and whether its final answer preserves the source and action state.
3. Improve the three existing read-only MCP tools with tested examples, stable field semantics, explicit no-match and stale states, and a declared output schema where compatible. Keep a versioned contract. Compare tool-selection and answer success before and after.
4. Run voice tests separately from text, including accents, noise, date correction, and "stop" or changed-location turns.

**Gate:** Helios beats web search on time to a correct, source-backed next step in the chosen wedge without increasing false eligibility or false completion claims. If it does not, improve inventory or contract before adding another model.

### Phase 3: close the real-world loop

1. Seek provider participation for availability feeds and acknowledgement or receipts. Keep any action state explicit: discovered, source-verified, referred, provider-acknowledged, accepted, attended, or unknown. Only the provider can substantiate the latter states.
2. Add user-controlled preferences and accessibility needs only with a clear purpose and consent. Test whether options become more feasible, not just more clickable.
3. Once enough qualified matches exist, test fair exposure across providers after eligibility filtering. Use confirmed outcomes and provider feedback, not ranking impressions alone.

**Gate:** Repeated provider-confirmed participation with measured effort for the person and provider. An attendance or impact claim requires the actual provider or organizational evidence. This is also the point at which Helios could contribute verified participation facts to Mind Light's broader impact record.

## Evaluation design

Create at least 100 human-labeled queries as an initial engineering test set, with a held-out portion and a second reviewer for disputed labels. Include plain requests, paraphrases, two to four simultaneous constraints, negation, unsupported cities, remote-only, age requirements, group versus individual participation, expired events, broken links, unknown availability, and false premises. Label every catalog record against each query as eligible, ineligible, or unknown, with graded relevance only inside eligible records. The sample size is a starting proposal, not a research-derived guarantee.

Compare current keyword search, optional embeddings, optional classifier, and deterministic eligibility plus lexical ranking on the same frozen records. Report hard-constraint violation rate at top three, eligible recall at three, correct no-match rate, unsupported-claim rate, stale/closed recommendation rate, p50/p95 latency, and cost per successful eligible shortlist. Evaluate source checking independently: claim support, required-field coverage, broken action links, time from source change to review, and over-abstention on actually valid records.

The product funnel has distinct states: agent tool exposure, agent selection, valid result, person-selected official handoff, provider acknowledgement, accepted registration, attendance, and any provider-verified impact. Measure each separately. Without provider integration, Helios can measure a qualified handoff and user-reported follow-up, not confirmed registration or volunteering.

## What to defer

- A larger agent swarm, autonomous web crawling, knowledge graph, fine-tuned retriever, and learned personalization have no demonstrated gain at nine records. Each adds data-quality and maintenance cost.
- Voice and the globe can make Helios approachable, but neither is proof of a usable local opportunity. Keep them only if user testing shows they shorten or clarify the path to action.
- Automated registration, donation, payment, and attendance claims require provider authority, explicit human approval, and canonical receipt readback. The current read-only boundary is appropriate.
- A global marketplace claim is premature until supply is dense and maintained in at least one real use case.

## Method and confidence

Focused review of primary journal/conference papers and original preprints available by 3 October 2026, plus the current Helios source and official MCP specification. This was not a systematic review. Publisher or proceedings pages were preferred; some claims could be checked only against public abstracts. Confidence is high in the cited studies' stated findings, moderate in their transfer to Helios, and low in any claim of agent or volunteer adoption because Helios has no observed provider outcomes. The next decision should be driven by a bounded pilot and its actual funnel data.
