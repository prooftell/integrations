# The Make listing

What goes into the app's page in Make and into the partner form at https://f.make.com/submit-your-app once the
invite link exists. The words follow the plan (`plans/2026-10-31-integrations.md` §1) and the voice of the design
system.

| Field | Value |
|-------|-------|
| App name | ProofTell |
| App id (name in Make) | `prooftell-pu2f1x` (`prooftell` was asked for; Make appends a random suffix to a custom app's name) |
| Invite link | https://www.make.com/en/hq/app-invitation/711be10b6633929513d0180ed0b31208 |
| Category | Developer tools (if a second is allowed: Security) |
| Website | https://prooftell.com/integrations?utm_source=make&utm_medium=integration |
| Help page | https://prooftell.com/integrations#make |
| Support email | support@prooftell.com |
| Theme colour | `#2458e6` (the design system's `primary`) |
| Language | English |
| Audience | Global (every country) |
| Logo | `assets/logo-512.png`: the single-ink mark (`design/system/assets/Logos/prooftell-mark-ink.svg`) rendered black on a transparent 512 × 512 canvas by `scripts/logo.cjs`. Make's App logo page says PNG, square, 512 to 2048 px, under 500 kB; its API takes exactly 512 × 512. White or transparent areas show in the theme colour, black ones white, semi-transparent ones a tint between the two — so the mark comes out white on the ProofTell blue, its bowl a lighter blue |

## One-line description

Phone, email and IP checks, and one risk score for the three, charged per check from a balance.

## Full description

ProofTell checks a phone number, an email address and an IP address, one at a time or together as a 0 to 100
risk score with a verdict and its reasons. In Make, four modules do that in any scenario:

- Look up a phone number: whether it is valid, its formats and its country, and, by level, its line type, the
  carrier it is on today, whether it is on the network right now, or its fraud score.
- Verify an email address: whether its mailbox exists and accepts mail, with the reason and the flags
  (disposable, role account, free provider, catch-all).
- Look up an IP address: whether it is a Tor exit, a VPN or a datacenter address, and its country, city and
  network.
- Assess the risk of an identity: a phone number, an email address and an IP address scored together, any one of
  the three at least, with a verdict (allow, review, deny) and the reasons.

Each check is charged from your balance at the step of the volume curve your account's month has reached; no plans,
no credit packs. The sandbox is free: a `pt_test_` key answers every module with simulated, deterministic results,
so a scenario can be built and tested before it spends anything.

## Connecting

Create an API key in the ProofTell dashboard (Developers → Integrations), named for Make, and paste it when Make
asks for it. A `pt_test_` key is the free sandbox; a `pt_live_` key spends the account's balance. The connection
shows Sandbox or Live next to its name.
