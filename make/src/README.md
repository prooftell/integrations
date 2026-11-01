# ProofTell

ProofTell checks a phone number, an email address and an IP address, one at a time or together as a 0 to 100
risk score with a verdict and its reasons. Four modules do that in any scenario:

- **Look up a phone number**: whether it is valid, its formats and its country and, by level, its line type, the
  carrier it is on today, whether it is on the network right now, or its fraud score.
- **Verify an email address**: whether its mailbox exists and accepts mail, with the reason and the flags
  (disposable, role account, free provider, catch-all).
- **Look up an IP address**: whether it is a Tor exit, a VPN or a datacenter address, and its country, city and
  network.
- **Assess the risk of an identity**: a phone number, an email address and an IP address scored together, any one
  of the three at least, with a verdict (allow, review, deny) and the reasons.

## Connecting

Create an API key in the ProofTell dashboard (Developers → Integrations), named for Make, and paste it into the
connection. A `pt_test_` key is the free sandbox: every module answers with simulated, deterministic results, so a
scenario can be built and tested before it spends anything. A `pt_live_` key spends the account's balance. The
connection's test reads the account's balance; the connection shows Sandbox or Live next to its name.

## What it costs

Each check is charged from your balance at the step of the volume curve your account's month has reached; no plans,
no credit packs. The sandbox is free. Every answer carries `cost` (US dollars, six decimals) and a line per signal
under `signals`. Without balance a check fails with a message that names the amount missing and where to top up.

## Errors

The api's message is shown as it is, after its status and code: `[402 insufficient_balance] …`. An invalid input
is a data error (with "Store incomplete executions" on, the bundle waits for repair and the scenario goes on); a
missing, revoked or refused key stops the scenario and notifies you; a rate limit or an outage is retried by Make.

Documentation: https://prooftell.com/docs. Help: support@prooftell.com.
