// Verify an email address with ProofTell: deliverable, undeliverable, risky or unknown, with the reason, the flags and
// a likely correction of a misspelt domain. The timeout (1000 to 45000 ms) is how long the mail server may take; past
// it the address comes back unknown, free. Charged per check from your balance; a pt_test_ key is the free sandbox.
// https://prooftell.com/docs

/** A ProofTell API key: create one in the ProofTell dashboard (Developers → Integrations), named Windmill. */
type Prooftell = {
  api_key: string
}

export async function main(prooftell: Prooftell, email: string, timeout?: number) {
  return await call(prooftell, "/v1/email", { email, timeout })
}

/** One request to ProofTell's public API: the answer unchanged, or an error carrying the API's own message. */
async function call(prooftell: Prooftell, path: string, body: Record<string, unknown>) {
  for (const key of Object.keys(body)) {
    const value = body[key]
    if (value === undefined || value === null || (typeof value === "string" && value.trim() === "")) delete body[key]
    else if (typeof value === "string") body[key] = value.trim()
  }
  const base = process.env.PROOFTELL_BASE_URL || "https://api.prooftell.com"
  const res = await fetch(base + path, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${prooftell.api_key.trim()}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": "prooftell-windmill/1.0.0",
    },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  let answer: any
  try {
    answer = text ? JSON.parse(text) : {}
  } catch {
    answer = undefined
  }
  if (!res.ok) {
    const error = answer?.error
    throw new Error(error?.message ? `${error.message} (${error.code}, HTTP ${res.status})` : `The ProofTell API answered ${res.status}.`)
  }
  if (answer === undefined) throw new Error("The ProofTell API answered something other than JSON.")
  return answer
}
