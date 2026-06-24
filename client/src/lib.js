/** SHA-256 of a File, as lowercase hex (matches the on-chain fileHash). */
export async function sha256File(file) {
  const buf = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const shorten = (s, a = 6, b = 4) =>
  !s ? "" : s.length <= a + b + 1 ? s : `${s.slice(0, a)}…${s.slice(-b)}`;

export function formatDate(unixSeconds) {
  if (!unixSeconds) return "—";
  return new Date(unixSeconds * 1000).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export async function copy(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
