// Date, money and weight helpers shared across the app.
export const pad = (n) => String(n).padStart(2, '0');
export const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const TODAY = iso(new Date());
export const addDays = (s, n) => { const d = new Date(s + 'T00:00'); d.setDate(d.getDate() + n); return iso(d); };
export const addMonths = (s, n) => { const d = new Date(s + 'T00:00'); d.setMonth(d.getMonth() + n); return iso(d); };
export const diffDays = (a, b) => Math.round((new Date(a + 'T00:00') - new Date(b + 'T00:00')) / 864e5);
export const ym = (s) => String(s || TODAY).slice(0, 7);
export const range = (from, to) => { const out = []; let d = from; while (d <= to) { out.push(d); d = addDays(d, 1); } return out; };

export const fmtD = (s) => (s ? new Date(s + 'T00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—');
export const fmtDY = (s) => (s ? new Date(s + 'T00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
export const weekday = (s, style = 'short') => new Date(s + 'T00:00').toLocaleDateString('en-IN', { weekday: style });
export const monthName = (m) => new Date(m + '-01T00:00').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
export const monthShort = (m) => new Date(m + '-01T00:00').toLocaleDateString('en-IN', { month: 'short' });

export const inr = (n) => (n < 0 ? '−' : '') + '₹' + Math.abs(Math.round(n || 0)).toLocaleString('en-IN');
export const kshort = (n) => {
  n = n || 0; const a = Math.abs(n), s = n < 0 ? '−' : '';
  if (a >= 1e7) return s + '₹' + (a / 1e7).toFixed(1) + 'Cr';
  if (a >= 1e5) return s + '₹' + (a / 1e5).toFixed(1) + 'L';
  if (a >= 1e3) return s + '₹' + (a / 1e3).toFixed(a >= 1e4 ? 0 : 1) + 'k';
  return s + '₹' + Math.round(a);
};
export const kg = (n) => (Math.round((n || 0) * 10) / 10).toLocaleString('en-IN') + ' kg';
export const qtyU = (n, u) => (u === 'kg' ? kg(n) : Math.round(n || 0).toLocaleString('en-IN') + ' ' + (u || ''));
export const num = (n) => (+n || 0).toLocaleString('en-IN');
export const sum = (a, f) => a.reduce((t, x) => t + (+f(x) || 0), 0);
export const pct = (a, b) => (b ? ((a - b) / Math.abs(b)) * 100 : 0);
export const nid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export const ls = {
  get(k) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* storage blocked */ } },
};
export const ss = {
  get(k) { try { return sessionStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { sessionStorage.setItem(k, v); } catch { /* storage blocked */ } },
};
