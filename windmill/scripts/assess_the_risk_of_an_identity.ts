// Assess the risk of an identity with ProofTell: a score from 0 to 100, a verdict (allow, review or deny) and the
// reasons that added to the score, from any mix of phone number, email address and IP address (one at least), each
// checked in parallel. Charged per signal from your balance; a pt_test_ key is the free sandbox.
// https://prooftell.com/docs

/** A ProofTell API key: create one in the ProofTell dashboard (Developers → Integrations), named Windmill. */
type Prooftell = {
  api_key: string
}

export async function main(
  prooftell: Prooftell,
  phone?: string,
  email?: string,
  ip?: string,
  country?: string,
  reference?: string,
) {
  if (![phone, email, ip].some((v) => v && v.trim() !== "")) {
    throw new Error("Give at least one of a phone number, an email address and an IP address.")
  }
  return await call(prooftell, "/v1/assess", { phone, email, ip, country, reference })
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
