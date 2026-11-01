# The pull request to microsoft/PowerPlatformConnectors

The connector is submitted as an independent-publisher connector: a PR against the `dev` branch of
[microsoft/PowerPlatformConnectors](https://github.com/microsoft/PowerPlatformConnectors), folder
`independent-publisher-connectors/ProofTell/`, holding `apiDefinition.swagger.json`, `apiProperties.json` and
`readme.md` from this folder (`IMPORT.md` and this file stay here). The process (Microsoft's
[independent publisher certification](https://learn.microsoft.com/en-us/connectors/custom-connectors/certification-submission-ip)):

1. A PR titled `Proposal - ProofTell (Independent Publisher)` with the files, from `adbek`. Microsoft's bot asks the
   author to sign the CLA. Then the certification team emails the GitHub account's address the verified-credentials
   form (the one-time identity check of the plan's §6: the GitHub profile's name must match the ID), to complete within
   30 days.
2. Once verified, the author adds to the folder the `package.zip` below and to the PR's description the screenshots
   the checklist asks for (three operations working in a flow, each flow succeeding, and the connector's Test tab),
   ticks the checklist, and removes `Proposal - ` from the title.
3. The certification team comments `certify-connector`, reviews, and deploys. Microsoft's figures: the certification
   3–5 business days after the verification, the deployment to every region 7–10 days later. The folder name
   `ProofTell` cannot change afterwards, and updates must come from the same GitHub account.

## The package and the screenshots

Every independent-publisher PR now carries, besides the three files, a `package.zip` that Microsoft's validator
accepts, and the screenshots. Both need a Power Platform environment; so does `paconn login`. The account Adil creates
for it: a work or school account on the Power Apps Developer Plan (free, with its own developer environment:
powerapps.microsoft.com/developerplan), signed up with `support@prooftell.com` — a personal Microsoft account is
refused. The steps, in that environment:

1. **Solutions**, **New solution** (`ProofTell connector`, a publisher of ours), then in it **New**, **Automation**,
   **Custom connector**, **Import an OpenAPI file** with `apiDefinition.swagger.json`; in **Definition**, **Policies**,
   add the two Set HTTP header policies of `apiProperties.json` (`Authorization` =
   `Bearer @connectionParameters('api_key')`; `User-Agent` = `prooftell-power-platform/1.0`), both override, on the
   request; **Create connector**.
2. On the solution, **Solution checker**, **Run**: no error.
3. A few minutes later, **Test**: a connection with the smoke sandbox key, **Get the balance**, **Test operation**: the
   200 is the Test tab screenshot.
4. A second solution (`ProofTell flow`): **New**, **Automation**, **Cloud flow**, **Instant** (a manual trigger), with
   three actions of the connector — Look up a phone number (`+447700900123`), Verify an email address
   (`jane@example.com`), Look up an IP address (`203.0.113.66`). Save, **Test**, run it: screenshots of the flow and of
   the run succeeding.
5. Export both solutions (**Export solution**, managed, the default version) as `ConnectorSolution.zip` and
   `FlowSolution.zip`. Zip the two as `package.zip`; zip `package.zip` with `readme.md` renamed `intro.md` as the file
   to validate (Microsoft's layout: `intro.md` beside `package.zip`, which holds the two solutions).
6. Validate: `pwsh ./ConnectorPackageValidator.ps1 <the zip>` with the script from the repo's `scripts/` folder
   (PowerShell 7; on the Mac `brew install powershell`): "Validation successful".
7. `package.zip` goes into `independent-publisher-connectors/ProofTell/` on the branch (the commands below); the
   screenshots are pasted into the PR's description; the checklist is ticked.

## Title

```
Proposal - ProofTell (Independent Publisher)
```

## Body

The body follows the repo's `.github/pull_request_template.md`. The items that need the connector deployed in an
environment (tested operations, the screenshots) are unticked until that is done.

<!-- body -->
ProofTell checks a phone number, an email address and an IP address, one at a time or together as a 0 to 100 risk score with a verdict and its reasons. This connector brings the five operations of the public API (https://prooftell.com/docs) to flows: Look up a phone number, Verify an email address, Look up an IP address, Assess the risk of an identity, Get the balance. Authentication is an API key sent as the Authorization header; a sandbox key gives free, deterministic answers for testing.

Publisher: ProofTell (the owner of the service, submitting as an independent publisher).

---
### When submitting a connector, please make sure that you follow the requirements below, otherwise your PR might be rejected. We want to make you have a well-built connector, a smooth certification experience, and your users are happy :)

If this is your first time submitting to GitHub and you need some help, please sign up for this [session](https://forms.office.com/pages/responsepage.aspx?id=KtIy2vgLW0SOgZbwvQuRaXDXyCl9DkBHq4A2OG7uLpdUMTFJWFFGVUxBNUFZQjZWRUdaOE5BMFkwNS4u).

- [x] I attest that the connector doesn't exist on the Power Platform today. I've verified by checking the pull requests in GitHub and by searching for the connector on the platform or in the documentation.
- [ ] I attest that the connector works and I verified by deploying and testing all the operations.
- [x] I attest that I have added detailed descriptions for all operations and parameters in the swagger file.
- [x] I attest that I have added response schemas to my actions, unless the response schema is dynamic.
- [ ] I validated the swagger file, `apiDefinition.swagger.json`, by running `paconn validate` command.
- [x] If this is a certified connector, I confirm that `apiProperties.json` has a valid brand color and doesn't use an invalid brand color, `#007ee5` or `#ffffff`. If this is an independent publisher connector, I confirm that I am not submitting a connector icon.

If you are an Independent Publisher, you must also attest to the following to ensure a smooth publishing process:
- [x] I have named this PR after the pattern of "Connector Name (Independent Publisher)" ex: HubSpot Marketing (Independent Publisher)
- [ ] Within this PR markdown file, I have pasted screenshots that show: 3 unique operations (actions/triggers) working within a Flow. This can be in one flow or part of multiple flows. For each one of those flows, I have pasted in screenshots of the Flow succeeding.
- [ ] Within this PR markdown file, I have pasted in a screenshot from the Test operations section within the Custom Connector UI.
- [x] If the connector uses OAuth, I have provided detailed steps on how to create an app in the readme.md.
<!-- /body -->

## The commands

Done tonight (the fork exists; the branch is pushed):

```sh
gh repo fork microsoft/PowerPlatformConnectors --clone=false --default-branch-only     # https://github.com/adbek/PowerPlatformConnectors
git clone --filter=blob:none --sparse --branch dev git@github.com:adbek/PowerPlatformConnectors.git
cd PowerPlatformConnectors
git sparse-checkout set 'independent-publisher-connectors/ProofTell'
git remote add upstream https://github.com/microsoft/PowerPlatformConnectors.git
git checkout -b prooftell-independent-publisher
mkdir -p independent-publisher-connectors/ProofTell
cp ~/projects/prooftell/integrations/power-platform/{apiDefinition.swagger.json,apiProperties.json,readme.md} independent-publisher-connectors/ProofTell/
git add independent-publisher-connectors/ProofTell
git commit -m "ProofTell (Independent Publisher): the connector's definition, properties and readme"
git push -u origin prooftell-independent-publisher
```

To refresh the branch after a change here (the same clone, or a new one as above):

```sh
cp ~/projects/prooftell/integrations/power-platform/{apiDefinition.swagger.json,apiProperties.json,readme.md} independent-publisher-connectors/ProofTell/
git add independent-publisher-connectors/ProofTell && git commit -m "ProofTell (Independent Publisher): <what changed>" && git push
```

To open the PR, on Adil's word (from this folder; the body is the block between the markers above):

```sh
sed -n '/^<!-- body -->$/,/^<!-- \/body -->$/{//!p}' PR.md > /tmp/prooftell-pr-body.md
gh pr create --repo microsoft/PowerPlatformConnectors --base dev --head adbek:prooftell-independent-publisher \
  --title "Proposal - ProofTell (Independent Publisher)" --body-file /tmp/prooftell-pr-body.md
```

Before the PR: `paconn login` once (the account above), then `paconn validate --api-def apiDefinition.swagger.json`
here, and the result pasted into the PR when it is clean.
