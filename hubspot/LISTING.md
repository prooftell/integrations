# The HubSpot marketplace listing

What goes into the listing of the production app (`prooftell`, app 60526039, account 6798532): HubSpot → Development
→ App listings → Create a listing, by a Super Admin of the developer account. The form has seven tabs, in this
order below; HubSpot's pages (developers.hubspot.com → "Listing your app", "App Marketplace listing requirements",
read on 2026-11-11) give no character limits but the URLs' 250. The words follow the workspace's plan
(`../../plans/2026-10-31-integrations.md` §1, §7.1) and the voice of the design system; no price (D38), the levels'
provider never named (D68), HubSpot's name never joined to ours or our mark.

## Before submitting

- **Three active installs** by HubSpot production accounts unaffiliated with us, each with a successful action or API
  call in the last 30 days, or the submission is refused. 6798532 is ours: it does not count.
- **Every URL live and public**: HubSpot's crawler opens each. The setup guide is `/integrations#hubspot`, a section
  of the site that renders only once HubSpot's entry is `available` in `web/src/data/integrations.ts` (and the
  dashboard already connects in production): it must be live before the submission.
- One app under review at a time per developer account: a second submission meanwhile is refused.
- The initial review: within 10 business days; the whole exchange at most 60 days from the first feedback.

## 1. Listing info

| Field | Value |
|-------|-------|
| Public app name | ProofTell |
| Company name | Epic Grove Ltd |
| Tagline | Verify phone numbers, email addresses and IP addresses in your workflows, and score each contact's risk. |
| Install experience | Seamless install. Install button URL: `https://app.prooftell.com/integrations/hubspot/callback` (the app's one redirect URL). Sign-in: a ProofTell account is required (the page asks which organization the HubSpot account joins) |
| Icon | `assets/listing-icon-800.png` (800 × 800, the mark touching the top and bottom edges; `scripts/icon.cjs`) |
| Categories (two) | The closest the form offers to data quality, then to security or compliance |
| Search terms | phone verification, email verification, IP lookup, line type, carrier lookup, fraud, risk score, data quality |

## 2. App details

**Demo video:** none at first (optional).

**Screenshots** (up to eight, each with its alt text):
1. A HubSpot workflow with "Look up a phone number" and its outputs: "A HubSpot workflow step that looks up the
   contact's phone number with ProofTell."
2. The action's outputs used in a branch on `line_type`: "A workflow branch on the line type ProofTell returned."
3. The dashboard's Integrations page with the HubSpot account connected: "The HubSpot account connected in the
   ProofTell dashboard."
4. The file of all contacts, mapped and estimated: "All the account's contacts read into a ProofTell file, with the
   estimate before the run."
5. A contact's ProofTell properties in HubSpot: "The results written back to a contact as ProofTell properties."

**App overview:**

ProofTell checks the people in your CRM. Its four workflow actions verify a contact's phone number, email address or
IP address, or score all three together as one risk score from 0 to 100 with a verdict (allow, review, deny) and its
reasons. Each answer comes back as the action's outputs, for an Edit record action to copy into properties or a
branch to act on: route a disposable email to review, call only the mobile numbers, stop a sign-up from a Tor exit.

To clean the contacts you already have, Check all contacts reads every contact with a phone or an email into a
ProofTell file; you pick the checks, see the estimate, run it, and the results are written back to the contacts as
properties of a ProofTell group.

Each check is charged from your ProofTell balance; a sandbox connection is free and returns simulated results for
the documented test inputs, so a workflow can be built before it spends anything.

**Shared data** (every object of the scopes, both directions since the app reads and writes contacts):

| ProofTell | HubSpot | Direction | Description |
|-----------|---------|-----------|-------------|
| Check results | Contacts | Both | The workflow actions take a contact's phone, email or IP address and return the result. Check all contacts reads the contacts' phone, mobile phone and email; writing the results back sets the ProofTell properties (phone valid, E.164, line type, country, current carrier, ported, fraud score, risk level, email result, verdict, reason, checked on), in a property group ProofTell created the first time |

**HubSpot features your app works with:** Workflows; Contacts; Contact properties.

**Other tools your software integrates with:** Zapier; Make; n8n; Google Sheets.

**Languages:** English.

## 3. Pricing

HubSpot wants the pricing to match the site's and lists a free plan only for a free-forever model: ProofTell has no
free plan (the pricing page says so), so none is listed.

| Field | Value |
|-------|-------|
| Currency | USD |
| Plan | The usage-based model, or the closest the form offers; name: Pay as you go |
| Tagline | Charged per check from your balance |
| Detail | No plan to choose and no monthly fee: a dollar balance, topped up once or every month, pays for each check at the public rates, which fall as the month's checks grow. The sandbox is free |
| Link to the pricing | https://prooftell.com/pricing?utm_source=hubspot&utm_medium=integration |

## 4. App features

Each with its scope groups, a description and an image (the screenshots above).

| Feature | Scopes | Description |
|---------|--------|-------------|
| Four workflow actions | `automation`, `crm.objects.contacts.read` | Look up a phone number, Verify an email address, Look up an IP address and Assess the risk of an identity, as steps of any contact workflow; their outputs feed the next steps |
| Check all contacts | `crm.objects.contacts.read`, `crm.objects.contacts.write`, `crm.schemas.contacts.read`, `crm.schemas.contacts.write` | Every contact with a phone or an email checked in one ProofTell file, the results written back as ProofTell properties |
| A free sandbox | — | A sandbox connection answers the actions with simulated results for the documented test inputs, at no cost |

## 5. Support info

| Field | Value |
|-------|-------|
| Support email | support@prooftell.com |
| Support languages | English |
| Company website | https://prooftell.com/?utm_source=hubspot&utm_medium=integration |
| Setup documentation | https://prooftell.com/integrations#hubspot |
| Terms of Service | https://prooftell.com/terms |
| Privacy Policy | https://prooftell.com/privacy |

## 6. Testing info

Not described by HubSpot's pages; what to give the reviewers if it asks: a ProofTell account is free to create at
https://app.prooftell.com; a Sandbox connection runs the four actions free, with the inputs `+447700900123` (a GB
mobile), `jane@example.com` (deliverable), `203.0.113.1` (a clean address) and `203.0.113.66` (a Tor exit). Check
all contacts needs a live connection and a balance: on request, an organization of our production account with a
small top-up, as Zapier's reviewers had.

## 7. Review info

"Run validation", then "Validate & submit"; accept the terms, English only (no auto-translation).
