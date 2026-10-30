// App state + persistence.
// Inside a claude.ai artifact the data syncs through the artifact database (window.claude.use('db')).
// Anywhere else it is kept in this browser's localStorage. Swap `connectCloud` for Firebase/Supabase
// if you host the app yourself and want multi-device sync.
import { useSyncExternalStore } from 'react';
import { emptyDB, toDocs, fromDocs, normDoc } from './model.js';
import { ls } from './format.js';

let state = { DB: fromDocs(ls.get('garlici.cache')), mode: 'loading', pending: 0, downloads: null, toast: null, ver: 0 };
const subs = new Set();
const emit = () => { state = { ...state, ver: state.ver + 1 }; subs.forEach((f) => f()); };
export const getState = () => state;
export function useStore() { return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => state); }

let toastTimer;
export function toast(msg) { clearTimeout(toastTimer); state.toast = { msg, at: Date.now() }; emit(); toastTimer = setTimeout(() => { state.toast = null; emit(); }, 2800); }

/* ---------- cloud sync (claude.ai artifact database) ---------- */
let REMOTE = null, last = {}; const queues = {};
function commit() {
  const docs = toDocs(state.DB);
  ls.set(state.mode === 'local' ? 'garlici.local' : 'garlici.cache', Object.values(docs));
  if (state.mode !== 'cloud') return;
  const ids = new Set([...Object.keys(docs), ...Object.keys(last)]);
  ids.forEach((id) => {
    const j = docs[id] ? JSON.stringify(docs[id]) : undefined;
    if (j === last[id]) return;
    if (j === undefined) delete last[id]; else last[id] = j;
    state.pending++;
    queues[id] = (queues[id] || Promise.resolve())
      .then(() => (j === undefined ? REMOTE.doc('store/' + id).delete() : REMOTE.doc('store/' + id).set(JSON.parse(j))))
      .catch((e) => {
        const c = e && e.code;
        toast(c === 'quota_exceeded' ? 'Storage is full. Delete old entries to save new ones.' : c === 'revoked' ? 'Your access to this app changed. Reload the page.' : 'A change could not be saved. Check your connection and that you have edit access.');
      })
      .finally(() => { state.pending--; emit(); if (!state.pending) refresh(); });
  });
}
function applyDocs(docs) {
  if (state.pending) return;
  state.DB = fromDocs(docs); last = {};
  docs.forEach((d) => { const n = normDoc(d); last[`${n.kind}~${n.bucket}`] = JSON.stringify(n); });
  ls.set('garlici.cache', Object.values(toDocs(state.DB)));
  state.mode = 'cloud'; emit();
}
function refresh() { REMOTE?.collection('store').get().then((s) => applyDocs(s.docs.filter((d) => d.exists).map((d) => d.data()))).catch(() => {}); }

export async function connect() {
  const use = window.claude && window.claude.use;
  if (use) use('downloads').then((d) => { state.downloads = d; emit(); }).catch(() => {});
  let db = null;
  try { db = use ? await use('db') : null; } catch { db = null; }
  if (!db) { state.mode = 'local'; state.DB = fromDocs(ls.get('garlici.local')); emit(); return; }
  REMOTE = db;
  db.collection('store').onSnapshot(
    (s) => applyDocs(s.docs.filter((d) => d.exists).map((d) => d.data())),
    () => { state.mode = 'error'; emit(); toast('Sync stopped. Reload the page to reconnect.'); },
  );
}

export function canWrite() {
  if (state.mode === 'loading') { toast('Still connecting to your data. Try again in a moment.'); return false; }
  if (state.mode === 'error') { toast('Sync has stopped. Reload the page to keep saving.'); return false; }
  return true;
}
/** Change data: fn receives the live database, then everything is saved and the UI re-renders. */
export function mutate(fn) { if (!canWrite()) return false; fn(state.DB); commit(); emit(); return true; }
export function replaceDB(D) { if (!canWrite()) return false; state.DB = D; commit(); emit(); return true; }
export function resetDB(keepBiz) { return replaceDB(Object.assign(emptyDB(), { biz: { ...keepBiz } })); }

/* ---------- downloads ---------- */
export async function saveFile(filename, data, mime, okMsg) {
  const dl = state.downloads;
  if (dl) {
    try { await dl.save({ filename, data }); toast(okMsg || 'Downloaded'); }
    catch (e) { if (e && e.code === 'declined') return; toast(e && e.code === 'rate_limited' ? 'A download is already waiting for you to confirm.' : 'The file could not be downloaded here.'); }
    return;
  }
  if (window.claude) { toast('Downloads are not available in this view.'); return; }
  const url = URL.createObjectURL(new Blob([data], { type: mime }));
  const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000); toast(okMsg || 'Downloaded');
}
export const canDownload = (s) => !!s.downloads || !window.claude;
