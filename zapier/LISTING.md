# The Zapier listing

What goes into the app's directory page at developer.zapier.com (the integration's Settings and Publishing
forms). The words follow the plan (`plans/2026-10-31-integrations.md` §1) and the voice of the design system.

| Field | Value |
|-------|-------|
| Name | ProofTell |
| Category | Developer Tools (`developer-tools` on the command line; the alternative is `security-identity`) |
| Homepage URL | https://prooftell.com/integrations?utm_source=zapier&utm_medium=integration |
| Help or support URL | https://prooftell.com/integrations#zapier |
| Support email | support@prooftell.com |
| Role | Employee of ProofTell (the account is support@prooftell.com) |
| Intended audience | Public |
| Logo | `assets/logo-512.png`, committed here: the ProofTell mark (`design/system/assets/Logos/prooftell-mark.svg`) rendered square at 512 × 512 on a transparent background by `scripts/logo.cjs`, the way `web/scripts/icons.cjs` renders the site's bitmap icons (Playwright and Chromium from outside the repo: `NODE_PATH=… CH=… node scripts/logo.cjs`). Zapier asks for a square PNG of at least 256 × 256 |

## One-line description

Zapier's check M002: it begins with the app's name followed by "is a", 40 to 140 characters, no mention of Zapier.

ProofTell is a verification API: a phone number, an email address and an IP address checked, or scored together as one risk score.

## Full description

ProofTell checks a phone number, an email address and an IP address, one at a time or together as a 0 to 100
risk score with a verdict and its reasons. In Zapier, four actions do that in any Zap:

- Look up a phone number: whether it is valid, its formats and its country, and, by level, its line type, the
  carrier it is on today, whether it is on the network right now, or its fraud score.
- Verify an email address: whether its mailbox exists and accepts mail, with the reason and the flags
  (disposable, role account, free provider, catch-all).
- Look up an IP address: whether it is a Tor exit, a VPN or a datacenter address, and its country, city and
  network.
- Assess the risk of an identity: a phone number, an email address and an IP address scored together, any one of
  the three at least, with a verdict (allow, review, deny) and the reasons.

A trigger, File completed, fires when a file you uploaded to ProofTell completes.

Charged per check from your balance, at the step of the volume curve your account's month has reached: no plans,
no credit packs. The sandbox is free: a `pt_test_` key answers every action with simulated, deterministic
results, so a Zap can be built and tested before it spends anything.

## Connecting

Create an API key in the ProofTell dashboard (Developers → Integrations), named for Zapier, and paste it when
Zapier asks for it. A `pt_test_` key is the free sandbox; a `pt_live_` key spends the account's balance.
