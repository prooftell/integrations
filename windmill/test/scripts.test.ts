// The four scripts as Windmill runs them, a main() with the resource and the inputs. A local server stands in for the
// api (PROOFTELL_BASE_URL) to prove each request; with PROOFTELL_TEST_KEY set (a sandbox key, read into the command,
// never written down) they also run against staging and must give the sandbox's documented answers.
// Run with `bun test` from this folder.
import { afterAll, beforeAll, describe, expect, test } from "bun:test"
import { main as phone } from "../scripts/look_up_a_phone_number"
import { main as email } from "../scripts/verify_an_email_address"
import { main as ip } from "../scripts/look_up_an_ip_address"
import { main as assess } from "../scripts/assess_the_risk_of_an_identity"

describe("against a local api", () => {
  const requests: { path: string; auth: string | null; agent: string | null; body: unknown }[] = []
  let server: ReturnType<typeof Bun.serve>
  beforeAll(() => {
    server = Bun.serve({
      port: 0,
      async fetch(req) {
        const path = new URL(req.url).pathname
        requests.push({ path, auth: req.headers.get("authorization"), agent: req.headers.get("user-agent"), body: await req.json() })
        if (path === "/v1/email") {
          return Response.json({ error: { code: "insufficient_balance", message: "Top up $0.0030 or more." } }, { status: 402 })
        }
        return Response.json({ ok: path })
      },
    })
    process.env.PROOFTELL_BASE_URL = `http://127.0.0.1:${server.port}`
  })
  afterAll(() => {
    delete process.env.PROOFTELL_BASE_URL
    server.stop()
  })

  test("each script posts its inputs, blanks dropped, with the key and the user agent", async () => {
    const key = { api_key: " pt_test_local " }
    expect(await phone(key, " +447700900123 ", "", "current_carrier")).toEqual({ ok: "/v1/phone" })
    expect(await ip(key, "203.0.113.66")).toEqual({ ok: "/v1/ip" })
    expect(await assess(key, undefined, "jane@example.com", "203.0.113.1", "", "signup-42")).toEqual({ ok: "/v1/assess" })
    expect(requests.map((r) => r.body)).toEqual([
      { phone: "+447700900123", level: "current_carrier" },
      { ip: "203.0.113.66" },
      { email: "jane@example.com", ip: "203.0.113.1", reference: "signup-42" },
    ])
    expect(requests[0].auth).toBe("Bearer pt_test_local")
    expect(requests[0].agent).toBe("prooftell-windmill/1.0.0")
  })

  test("the phone level defaults to line type", async () => {
    requests.length = 0
    await phone({ api_key: "k" }, "+447700900123")
    expect(requests[0].body).toEqual({ phone: "+447700900123", level: "line_type" })
  })

  test("an api error is thrown with the api's message and code", async () => {
    await expect(email({ api_key: "k" }, "jane@example.com", 5000)).rejects.toThrow("Top up $0.0030 or more. (insufficient_balance, HTTP 402)")
  })

  test("an assessment of nothing is refused before any request", async () => {
    requests.length = 0
    await expect(assess({ api_key: "k" }, "", " ", undefined, "GB")).rejects.toThrow("at least one of")
    expect(requests.length).toBe(0)
  })
})

const KEY = process.env.PROOFTELL_TEST_KEY

describe.skipIf(!KEY)("against staging, with the sandbox key", () => {
  const key = { api_key: KEY ?? "" }
  beforeAll(() => {
    process.env.PROOFTELL_BASE_URL = "https://api.prooftell.dev"
  })
  afterAll(() => {
    delete process.env.PROOFTELL_BASE_URL
  })

  test("Look up a phone number: a GB mobile", async () => {
    const answer = await phone(key, "+447700900123")
    expect(answer.valid).toBe(true)
    expect(answer.line_type).toBe("mobile")
  })

  test("Verify an email address: deliverable", async () => {
    expect((await email(key, "jane@example.com")).verdict).toBe("deliverable")
  })

  test("Look up an IP address: Tor", async () => {
    expect((await ip(key, "203.0.113.66")).is_tor).toBe(true)
  })

  test("Assess the risk of an identity: allow, with a geo mismatch", async () => {
    const answer = await assess(key, "+447700900123", undefined, "203.0.113.1")
    expect(answer.verdict).toBe("allow")
    expect(answer.reasons.map((r: { code: string }) => r.code)).toContain("geo_mismatch")
  })

  test("a wrong key is refused with the api's message", async () => {
    await expect(ip({ api_key: "pt_test_wrong" }, "203.0.113.1")).rejects.toThrow("(invalid_api_key, HTTP 401)")
  })
})
