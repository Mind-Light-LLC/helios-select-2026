# Helios build rules

- Build the hackathon project from original code written during the event. Do not import private Mind Light source into this repository.
- Keep the product centered on a real outcome: a person finds a relevant, sourced opportunity and reaches its official next step. Agents must be able to consume the same records and actions through documented interfaces.
- Keep source URL, checked time, publication state, and action authority with every record. Never claim a booking, payment, admission, or attendance without a provider receipt and readback.
- Keep API credentials on the server. Public keys may be exposed only when intended by their provider. Do not read or commit `.env*`, keys, or PEM files.
- Use TypeScript with explicit types and error handling. Never use `any`. Keep `src/` files below 300 lines. Use `@api` as the client data-access barrel.
- Database migrations must be additive, RLS-on, and preceded by live schema attestation. Verify deployed schema with canonical readback.
- Do not deploy a public production build or change billing or security settings without Dishant's explicit approval for the exact action.
