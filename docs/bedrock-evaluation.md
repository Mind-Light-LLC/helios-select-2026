# Bedrock experiment, 3 October 2026

## Job and boundary

Helios must help a person find a relevant, sourced opportunity, understand its place and timing, and reach the organization's official next step. A model can interpret a request and select a record. It cannot establish that a slot is open, register the person, or confirm admission without provider evidence.

The test used the nine published Helios records and the existing Mind Light AWS SSO session in `us-west-2`. No private person or organization data was sent. Three prompts were chosen to exercise a schedule conflict, a place and date conflict, and an unconfirmed remote directory. AWS reported Nova 2 Lite and Claude Sonnet 4.6 authorized. Haiku 4.5 did not have an available agreement and was not invoked.

| Request | Current text search | Nova 2 Lite, prose prompt | Sonnet 4.6, constrained classification |
| --- | --- | --- | --- |
| Singapore food bank on Saturday 10 October, sign me up | Singapore warehouse record, with no timing decision | Identified weekday conflict; output JSON shape varied | `related_path`, Singapore record, `schedule_mismatch`, availability unconfirmed |
| Smoke alarms near Seattle on 4 October, confirm a spot | California Lakewood record appears as a text match | Returned no match | `no_match`, with place and date mismatch, no record ID |
| UN remote work this month | UNV directory plus unrelated text hits before token cleanup | Related path but included a copied record and variable JSON shape | `related_path`, UNV directory, availability unconfirmed |

The first Sonnet experiment requested free-form user copy inside a JSON schema. It described UN assignments as active "right now," which the source record does not support. This is a model error despite valid JSON. The second experiment allowed only `fit`, a catalog ID, and enumerated reason codes; it returned the expected classification on all three prompts. This is a three-case smoke test, not evidence of general accuracy.

A repeatable 14-case evaluation now covers all nine records, absent cities, remote requests, a weekday conflict, a fixed event date, and a date inside an event range. Its first strict run selected all 14 expected record IDs but failed two reason-code expectations: the Seattle no-match omitted place/date codes, and a Lakewood date conflict was labeled as a schedule conflict. An earlier probe also wrongly marked 24 October as outside a 22–25 October Chile event. The prompt now distinguishes fixed dates from recurring schedules and treats ranges as inclusive. The next full run passed 14/14 cases, including those three. This is still one small, model-dependent run; it does not establish accuracy on unseen sources or queries. Run `npm run eval:bedrock` with the existing AWS profile and Helios preview catalog environment before relying on a changed prompt.

Observed Bedrock model-side latency for the three constrained Sonnet responses was 1.3 to 1.5 seconds, with about 1,600 input tokens and 34 to 51 output tokens each. The unconstrained Sonnet responses took 4.2 to 7.2 seconds and made unsupported claims. Nova 2 Lite was faster in this sample (0.4 to 1.4 seconds) but rejected `outputConfig` and did not reliably follow the requested shape. These are individual observations, not an SLA or cost benchmark.

## What was built

- `server/bedrock-match.ts` calls Sonnet through Bedrock Converse only when `HELIOS_BEDROCK_MODEL_ID` is configured. It sends catalog fields, requests a JSON schema, validates the ID and reason codes, and returns no generated link or completion claim.
- `server/data.ts` applies the classification before text retrieval when enabled. It falls back to an explicitly labeled text match if Bedrock is unavailable. The text fallback now drops common filler words and handles organization acronyms.
- `api/mcp.ts` carries `fit` and `reason_codes` to external agents. The UI distinguishes a supported path from a related path and does not automatically fly to a keyword-only first result.
- Local integration with the AWS SSO profile returned the expected three classifications. `npm run build` passed.

## Highest-value next moves

1. **Make candidate retrieval real.** Embed the published records and query them in Supabase, then apply exact country, radius, date, and remote constraints before generation. The current database has zero stored embeddings. Nine records cannot demonstrate global coverage.
2. **Keep Bedrock's live role small.** Use Sonnet for a bounded fit decision and reason codes. The server must render titles, dates, sources, official URLs, and availability from canonical records. Add adversarial tests for city names, relative dates, stale events, and requests to book.
3. **Grow source coverage through reviewed intake.** Models can extract place, schedule, eligibility, action type, and source passages from official pages and flyers into draft records. Publication requires source checks and human review. A second model pass can flag contradictions, not silently resolve them.
4. **Use reranking only when retrieval has volume.** Bedrock Rerank can reorder text candidates after a broad semantic search. With nine records, it adds little. A Bedrock Knowledge Base would duplicate the existing Supabase vector store unless a specific ingestion source justifies it.
5. **Give agents the same authority boundary.** MCP should expose a typed `fit`, source, checked time, map meaning, action kind, and official URL. User-specific preferences and any registration attempt need user authentication, scoped consent, provider confirmation, and a durable receipt.
6. **Measure instead of adding live agent loops.** Build a benchmark of real and adversarial requests with expected record IDs, fit labels, unsupported-claim checks, and latency. Bedrock or AgentCore evaluations can score the model later. Multi-step agent loops are better reserved for background source verification than for every search.

## Bedrock capability map

| Use | Fit for Helios | Required boundary |
| --- | --- | --- |
| Constrained request-to-record classification | Live now in local testing; high immediate value | Catalog ID and reason codes only, validated before display |
| Official page and flyer extraction, including image input | High value for growing coverage | Draft record, source passage, checked time, human publication review |
| Second-pass contradiction checks | High value once intake exists | Flag date/place/action conflicts; never silently change canonical records |
| Rerank retrieved records | Useful after candidate retrieval reaches meaningful volume | Hard place/date filters first; rerank never creates availability facts |
| Multilingual intent and accessibility summaries | Useful for global reach | Preserve original source meaning, location and eligibility; label translations |
| Personal itinerary or voice-guided globe flight | Good experience after search quality | User preferences stay scoped; model chooses a record ID, UI owns globe state |
| Background source monitoring with AgentCore | Later, when sources and update volume justify it | Evidence and review queue before a published change |
| Provider action automation | Not ready | Authentication, user consent, provider acknowledgement, canonical readback and receipt |

Do not add Bedrock Agents Classic to the live path; AWS states it is in maintenance mode for new customers. The existing MCP interface is the simpler agent integration for this stage. Generated imagery is also a poor fit for opportunity cards because it could imply an event scene that the organization never published; use sourced organization marks and the photographic globe instead.

## Visual direction

Treat a search as a journey across a photographic globe, not a chat transcript. Keep the Meridian mark and organization logos. On a strong match, fly to the city and reveal a compact place card with the official next step. On a related path, show the precise constraint beside the result, such as “Weekday sessions; your Saturday request is unverified.” On no match, leave the globe in its global view and offer a clear way to broaden the place or timing. The model supplies a fit code; the interface composes the scene and copy from verified record fields. Avoid AI badges, synthetic confidence percentages, generic assistant prose, and claims of live availability.

## Live blocker

The Helios Vercel project has no AWS OIDC role or `HELIOS_BEDROCK_MODEL_ID` setting, and the AWS account has no Vercel OIDC provider or Helios role. The private preview therefore cannot call Bedrock. A preview-only Vercel-to-AWS OIDC role scoped to the Helios project and Bedrock Converse model is the next infrastructure step. `AGENTS.md` requires Dishant's approval for that exact security setting change. No AWS IAM or Vercel security settings were changed during this experiment.

References: [Bedrock Converse and multimodal input](https://docs.aws.amazon.com/bedrock/latest/userguide/conversation-inference.html), [structured outputs](https://docs.aws.amazon.com/bedrock/latest/userguide/structured-output.html), [reranking](https://docs.aws.amazon.com/bedrock/latest/userguide/rerank.html), [Bedrock evaluations](https://docs.aws.amazon.com/bedrock/latest/userguide/evaluation.html), [AgentCore evaluations](https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/evaluations-types.html), [Agents Classic status](https://docs.aws.amazon.com/bedrock/latest/userguide/agents-action-create.html), [Vercel AWS OIDC](https://vercel.com/docs/oidc/aws).
