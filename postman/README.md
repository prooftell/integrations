# ProofTell on Postman

`prooftell.postman_collection.json` is the public API as a Postman collection (v2.1), generated from `api/openapi.yaml`
by `build.sh` (openapi-to-postmanv2, then `postprocess.js`; its header says what it changes). Four folders in the
spec's order: Pricing and balance, Checks (the four actions: look up a phone number, verify an email address, look up an
IP address, assess the risk of an identity), Files, Compatibility. Every request but the rate card sends
`Authorization: Bearer {{api_key}}` from the collection's auth; every request runs on `{{base_url}}`
(`https://api.prooftell.com`), has its body filled with the spec's examples (the sandbox's documented inputs) and keeps
the spec's response examples as saved examples. One test on every request: a 2xx, or the error's code and message.

## Using it with a key

1. Import the file (Postman: Import, then the file or its URL).
2. Open the collection's Variables tab and set `api_key`. Create a key in the ProofTell dashboard (Developers →
   Integrations), named after this platform (Postman). A `pt_test_` key is the free sandbox: simulated, deterministic
   answers. A `pt_live_` key spends the account's balance. Leave `base_url` as it is.
3. Send "Your account's balance" in Pricing and balance: a 200 proves the key. Then the Checks: each body holds the
   sandbox's documented input (`+447700900123`, `jane@example.com`, `203.0.113.66`; the assessment sends the number, the
   address and `203.0.113.1`).
4. The Files folder needs a live key (the sandbox answers 501). "Start a file job" stores the new file's id in the
   collection variable `file_id`, which the other Files requests use; the upload itself is a PUT of the file to the
   answer's `upload_url` with its `headers`, outside the collection; then "The signed upload landed", "Run the file" and
   the rest.

From the command line, the same with newman, the key never written down:

```sh
npx newman run prooftell.postman_collection.json --folder "Pricing and balance" --folder Checks \
  --env-var api_key="$K" --env-var base_url=https://api.prooftell.com
```

## Rebuilding after a spec change

`sh build.sh` from this folder (node and npx). The build is stable: an unchanged spec yields an unchanged file. Review
the diff of the collection before committing: the generator's output is the artifact.

## Tomorrow (Adil)

1. A Postman account on `support@prooftell.com` (postman.com, Sign up), and a team named ProofTell.
2. A workspace "ProofTell", visibility Public (Workspaces, Create workspace, Public). Its summary: the one sentence of
   this collection's description; its link https://prooftell.com/integrations?utm_source=postman&utm_medium=integration
   (the docs link stays in the collection's description).
3. Import `prooftell.postman_collection.json` into it; the collection's `api_key` variable stays empty (the public copy
   must hold no key: Postman shows collection variables to every viewer).
4. The team profile made public (Settings, Team profile: the ProofTell name and logo from `design/system/assets/Logos`,
   the link above). A public workspace is the publication: it appears on the Postman API Network once Postman's Secret
   Scanner has passed it.
5. The link back: the workspace's URL (`https://www.postman.com/<team>/workspace/prooftell`) goes into
   `web/src/data/integrations.ts` and `app/src/lib/integrations.ts` as the Postman entry's link, with `available`
   flipped (plan §4, §5, §8.3), and into `RUNBOOK.md` → Integrations.
