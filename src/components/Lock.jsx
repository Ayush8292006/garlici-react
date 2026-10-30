import { useEffect, useState } from 'react';
import { ss } from '../lib/format.js';
import { GarlicPaths } from './ui.jsx';

/** SHA-256 of the PIN; only the hash is stored. */
export async function sha(s) {
  try { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('garlici:' + s)); return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join(''); }
  catch { return 'p' + s.split('').reverse().join(''); }
}
export const isUnlocked = (pinHash) => !pinHash || ss.get('garlici.unlocked') === pinHash;

export default function Lock({ pinHash, onUnlock }) {
  const [buf, setBuf] = useState(''); const [msg, setMsg] = useState('');
  const press = async (k) => {
    if (k === '⌫') { setBuf((b) => b.slice(0, -1)); return; }
    const next = (buf + k).slice(0, 4); setBuf(next);
    if (next.length === 4) {
      const h = await sha(next);
      if (h === pinHash) { ss.set('garlici.unlocked', h); onUnlock(); } else { setBuf(''); setMsg('Wrong PIN. Try again.'); }
    }
  };
  useEffect(() => {
    const onKey = (e) => { if (/^\d$/.test(e.key)) press(e.key); else if (e.key === 'Backspace') press('⌫'); };
    addEventListener('keydown', onKey); return () => removeEventListener('keydown', onKey);
  });
  return (
    <div id="lock">
      <div className="lk">
        <svg viewBox="0 0 96 96" width="64" height="64" stroke="#F3EEE5" strokeWidth="2.4" aria-hidden="true"><circle cx="48" cy="48" r="45" fill="none" stroke="#D8C8A8" /><GarlicPaths /></svg>
        <b>Enter PIN</b>
        <div className="pd">{[0, 1, 2, 3].map((i) => <i key={i} className={i < buf.length ? 'on' : ''} />)}</div>
        <small>{msg || ' '}</small>
        <div className="kp">{[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '⌫'].map((k, i) => (k === '' ? <span key={i} /> : <button key={i} type="button" aria-label={k === '⌫' ? 'Delete digit' : String(k)} onClick={() => press(String(k))}>{k}</button>))}</div>
      </div>
    </div>
  );
}
