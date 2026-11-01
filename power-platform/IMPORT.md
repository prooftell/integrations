# Import ProofTell as a custom connector in Power Automate

Until the certified connector is listed, a customer imports `apiDefinition.swagger.json` from this folder as a custom
connector. The site's how-to (`/integrations#power-automate`) mirrors these steps. Custom connectors are premium in
Power Automate and Power Apps: the maker needs a licence that includes them, and the connector lives in the environment
it is created in.

## In the portal (no tools)

1. Download `apiDefinition.swagger.json` and create an API key in the ProofTell dashboard (Developers, then
   Integrations), named "Power Automate": a `pt_test_` key is the free sandbox; a `pt_live_` key spends the balance.
   Copy the key, it is shown once.
2. Open [make.powerautomate.com](https://make.powerautomate.com), choose the environment, then in the left menu
   **Solutions**. Open one of your solutions, or **New solution** (a name such as `ProofTell`, your publisher). A
   custom connector lives in a solution now; the old Custom connectors page is gone.
3. In the solution: **New**, **Automation**, **Custom connector**, **Import an OpenAPI file**. Connector name:
   `ProofTell`. Choose the file, **Continue**.
4. **General**: the host `api.prooftell.com` and the HTTPS scheme come from the file. Optionally upload an icon: a PNG
   export of `design/system/assets/Logos/prooftell-app-icon.svg` (the colour mark on the ink tile), with the
   background colour set to the tile's `#0e1530`. **Security** (next).
5. **Security**: the file sets API key authentication with the parameter label `API key`, parameter name
   `Authorization` and location `Header`. Leave it as it is. **Definition** (next).
6. **Definition**: the five actions are listed (Look up a phone number, Verify an email address, Look up an IP
   address, Assess the risk of an identity, Get the balance). Scroll to **Policies**, **New policy**, template
   **Set HTTP header**: Header name `Authorization`, Header value `Bearer @connectionParameters('api_key')`, Action if
   header exists `override`, Run policy on `Request`; leave Operations empty (all of them). This is what turns the key
   into the `Authorization: Bearer <key>` header. **Create connector** (top right).
7. **Test**, a few minutes after Create connector (the connector takes that long to be ready): **New connection**. In
   the API key field paste the key itself: `pt_test_…`. Create. Back on the Test tab, pick **Get the balance** and
   **Test operation**: a 200 with the balance proves the key. Try **Look up a phone number** with `+447700900123` (a
   sandbox key answers it as a GB mobile).
8. In a flow, add an action, open the **Custom** tab, choose ProofTell and the action. The outputs (Valid, Line type,
   Deliverable, Tor, Score, Verdict and the rest) appear as dynamic content for the next steps.

To let colleagues use it, open the connector's **Share** and add them; or put it in a solution and export it to another
environment.

## With the CLI (the properties file too)

The Power Platform Connectors CLI imports both files, so the connection form carries the key's help text and the
policy of step 6 comes with the properties file (nothing to add by hand):

```sh
pip install paconn
paconn login                      # a Microsoft account with access to the environment
paconn create --api-def apiDefinition.swagger.json --api-prop apiProperties.json
```

Then create a connection as in step 7.

## What the key field takes

The key itself. The policy (step 6, or the properties file) sends it as `Authorization: Bearer <key>`. A connector
imported without the policy sends the field's value as the header as it is: every action then fails with
`401 invalid_api_key` until the policy is added, or the value is entered as `Bearer ` followed by the key.
