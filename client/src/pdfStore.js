/**
 * Local-only PDF store (IndexedDB). The chain holds just the SHA-256 hash of a
 * transcript PDF — never the file. To let Records *show* the PDF, we keep a copy
 * in the issuing browser, keyed by certificate id. This is per-browser by design
 * (consistent with the app's no-backend model): a record issued elsewhere simply
 * won't have a local copy, and the View button is hidden for it.
 */
const DB_NAME = "ledgr";
const STORE = "pdfs";

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Persist a transcript PDF for `id`. Best-effort — never throws to the caller. */
export async function savePdf(id, file) {
  try {
    const db = await openDb();
    await new Promise((res, rej) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(file, id);
      tx.oncomplete = res;
      tx.onerror = () => rej(tx.error);
    });
    db.close();
  } catch {
    /* storage unavailable / private mode — viewing just won't be offered */
  }
}

/** Return the stored PDF Blob for `id`, or null if none is in this browser. */
export async function loadPdf(id) {
  try {
    const db = await openDb();
    const blob = await new Promise((res, rej) => {
      const tx = db.transaction(STORE, "readonly");
      const r = tx.objectStore(STORE).get(id);
      r.onsuccess = () => res(r.result || null);
      r.onerror = () => rej(r.error);
    });
    db.close();
    return blob || null;
  } catch {
    return null;
  }
}
