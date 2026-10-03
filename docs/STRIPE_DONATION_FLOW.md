# Stripe donation link pilot

3 October 2026. Design only. No live donation route is active in Helios.

## Decision

Use one Stripe Payment Link owned by each nonprofit. The nonprofit creates the link in its own Stripe Dashboard. Helios reviews and displays it as **Donate on Stripe** on that organization's page. Stripe hosts checkout and handles the payment. Helios does not collect card or bank details.

This is the entry-level path. No Stripe Connect, API-created payment link, webhook, payment ledger, or agent-initiated charge is needed for this pilot. The existing `helios-payments` Vercel resource is a sandbox and does not make any nonprofit ready to accept donations.

## Nonprofit setup

1. The nonprofit chooses **Add your organization** and provides its name, official website, contact email, and Stripe donation link. A contact without a Stripe account can [sign up and create a Payment Link](https://docs.stripe.com/payment-links); an existing Stripe user can [create one in the Dashboard](https://docs.stripe.com/payment-links/create). Recommend **Customers choose what to pay** for a one-time donation. Stripe does not support recurring donations with that amount mode.
2. Helios verifies the contact's authority, confirms the nonprofit name shown at Stripe checkout, checks that the link opens, and records the official source and checked time. For the first pilot, a human approves publication.
3. Helios shows **Donate on Stripe** only after approval. The button opens the nonprofit's link. The donor does not need a Helios account.

The signup UI needs only **Submit link**, **Pending review**, and **Live**. Give the nonprofit a way to replace or remove its link through the verified contact. Donation is a separate action; it does not replace an opportunity's official next step.

## Truthful status

Helios may say that a person selected the donation link. It cannot verify that the page loaded or that a donation was completed because this link-only flow has no access to Stripe payment events. Agents receive the same reviewed URL and must describe it as an external checkout. The nonprofit manages donor receipts and refunds in its Stripe account.

The first pilot needs one consenting nonprofit, a reviewed link, and a rendered Donate path that reaches the correct Stripe checkout. Publishing a live link requires the nonprofit's approval and Dishant's approval of the exact recipient and URL.
