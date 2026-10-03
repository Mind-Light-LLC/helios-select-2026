# Helios build rules

- Build the hackathon project from original code written during the event. Do not import private Mind Light source into this repository.
- Keep the product centered on a real outcome: a person finds a relevant, sourced opportunity and reaches its official next step. Agents must be able to consume the same records and actions through documented interfaces.
- Keep source URL, checked time, publication state, and action authority with every record. Never claim a booking, payment, admission, or attendance without a provider receipt and readback.
- Keep API credentials on the server. Public keys may be exposed only when intended by their provider. Do not read or commit `.env*`, keys, or PEM files.
- Use TypeScript with explicit types and error handling. Never use `any`. Keep `src/` files below 300 lines. Use `@api` as the client data-access barrel.
- Database migrations must be additive, RLS-on, and preceded by live schema attestation. Verify deployed schema with canonical readback.
- Do not deploy a public production build or change billing or security settings without Dishant's explicit approval for the exact action.

## Parallel change control

- Treat freshly fetched `origin/main` as the integration source. Make each task in its own worktree from that ref or an explicitly named dependency PR. Do not start new edits in the shared project checkout.
- Give each task a bounded path set. Coordinate overlapping files before editing; agents must not share a working directory.
- Commit and push intended changes in a reviewable PR. State the base ref, dependency PRs, owned paths, checks, and rendered evidence. A local edit or preview is not an integrated change.
- Before integration, compare the PR against current `origin/main` for accidental reversions and verify the combined behavior where PRs overlap. Never copy an older file wholesale over newer work.
- Do not reset, clean, pull over, or remove a dirty worktree. Preserve and reconcile its work first. Remove a clean worktree only after its commits are contained in the integration branch or deliberately archived.
