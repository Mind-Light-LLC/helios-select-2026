# Helios interface framework

3 October 2026. Product direction for the Helios web application.

## Product job

Help a person or their agent find a sourced opportunity, understand where and when it applies, and reach the organization's official next step. A search result is not a booking. An outbound click is not participation or impact. The [agent futures research](HELIOS_AGENT_FUTURES_ARXIV_2026-10-03.md) sets the evidence model for later action and outcome states.

## Apple standard, applied to a web app

Use Apple's [design principles](https://developer.apple.com/design/human-interface-guidelines/design-principles), [layout](https://developer.apple.com/design/human-interface-guidelines/layout), [writing](https://developer.apple.com/design/human-interface-guidelines/writing), [accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility), and [privacy](https://developer.apple.com/design/human-interface-guidelines/privacy/) guidance as review criteria. Helios runs in a browser, so native Apple components are not the implementation framework. Preserve its own visual identity.

1. **One dominant task per view.** Globe first; one search and voice dock; results only after Explore or search; one selected record at a time.
2. **Progressive detail.** Rows show title, organization, and place. The selected card shows schedule, what the pin represents, source check, availability, official action, and source. Longer context stays in the card.
3. **Explicit states.** Loading, no match, service error, microphone permission, connection, listening, searching, response, and stop have distinct feedback. No blank silence should imply success.
4. **Direct language.** Controls name the action. Avoid agent mythology, AI badges, generic confidence scores, and outcome claims that the record cannot support.
5. **Input parity.** Text, map selection, and speech drive the same catalog and selected record. Keyboard and screen readers can use the result list without manipulating the globe.
6. **Privacy by action.** Request microphone access only after the person presses the microphone control. Show when it is active and release it on Stop or failure.

## Current component contract

| Surface | Job | Code |
| --- | --- | --- |
| Globe | Spatial context; marker labels distinguish organizations and events | [`src/Globe.tsx`](../src/Globe.tsx) |
| Search dock and sheets | Find, compare, select, and open an official next step | [`src/App.tsx`](../src/App.tsx), [`src/styles.css`](../src/styles.css) |
| Voice control | Browser WebRTC session, bounded catalog tools, visible status and caption | [`src/VoiceControl.tsx`](../src/VoiceControl.tsx), [`api/voice-token.ts`](../api/voice-token.ts) |
| Agent access | Same read-only catalog through MCP | [`api/mcp.ts`](../api/mcp.ts) |

Desktop keeps the selected pin visible beside the card. Phone places results and details above the fixed dock and safe area. All primary controls have a usable touch target, visible focus, and reduced-motion behavior. Avoid overlaying the action button with the dock at intermediate widths.

## Evidence and acceptance

For every selected record, display its source, checked time, availability status, pin meaning, and official action. If availability is unconfirmed, say so. A provider-confirmed action, attendance, and measured impact require separate evidence and UI states; do not add them as decorative steps.

When an organization has a verified [Stripe donation option](STRIPE_DONATION_FLOW.md), show it as a secondary action with the recipient named. Keep volunteer registration and donating distinct. Hide the action when no authorized payment link exists.

Review each change in this order: source truth and action wording, desktop and phone rendering, keyboard and screen-reader path, error and no-match states, voice cancellation and recovery, then live catalog and microphone behavior. A local fixture proves layout only. A build proves code compiles only. Provider and outcome claims require their own receipts.
