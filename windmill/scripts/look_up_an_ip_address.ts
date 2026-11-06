// Look up an IP address with ProofTell: where it is and what network it is on, and whether it is Tor, a VPN or a
// datacenter. Charged per check from your balance; a pt_test_ key is the free sandbox. https://prooftell.com/docs

/** A ProofTell API key: create one in the ProofTell dashboard (Developers → Integrations), named Windmill. */
type Prooftell = {
  api_key: string
}

export async function main(prooftell: Prooftell, ip: string) {
  return await call(prooftell, "/v1/ip", { ip })
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
