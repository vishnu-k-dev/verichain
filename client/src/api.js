// Thin fetch wrapper around the relayer API.
async function req(method, path, body) {
  const res = await fetch(`/api${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);
  return data;
}

export const api = {
  health: () => req("GET", "/health"),
  list: () => req("GET", "/transcripts"),
  get: (id) => req("GET", `/transcripts/${encodeURIComponent(id)}`),
  issue: (payload) => req("POST", "/transcripts", payload),
  revoke: (id) => req("POST", `/transcripts/${encodeURIComponent(id)}/revoke`),
  verify: (payload) => req("POST", "/verify", payload),
};
