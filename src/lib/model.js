// Data model: record kinds, storage documents, business calculations and stock effects.
import { TODAY, addDays, addMonths, diffDays, ym, range, sum, kg, qtyU, inr, fmtD, nid } from './format.js';

export const KINDS = ['products', 'materials', 'clients', 'sales', 'payments', 'income', 'credits', 'expenses', 'electricity', 'labour', 'salaries', 'purchases', 'batches', 'packaging', 'recurring', 'followups', 'leads', 'deliveries', 'dues', 'invoices', 'stockLog'];
// Dated kinds are stored one document per month; the rest in a single document.
export const DATED = new Set(['sales', 'payments', 'income', 'credits', 'expenses', 'electricity', 'salaries', 'purchases', 'packaging', 'deliveries', 'invoices', 'stockLog', 'followups']);
export const DEFAULT_BIZ = { name: 'Garlici', address: '', gstin: '', phone: '', upi: '', terms: 'Goods once sold will not be taken back. Payment due within 15 days.', pin: '', example: false };

export function emptyDB() { const d = { biz: { ...DEFAULT_BIZ }, attendance: {} }; KINDS.forEach((k) => (d[k] = [])); return d; }

/** Group the whole database into storage documents keyed `${kind}~${bucket}`. */
export function toDocs(D) {
  const out = {};
  KINDS.forEach((k) => D[k].forEach((r) => {
    const b = DATED.has(k) ? ym(r.date) : 'all'; const id = `${k}~${b}`;
    (out[id] = out[id] || { kind: k, bucket: b, rows: [] }).rows.push(r);
  }));
  const am = {};
  Object.entries(D.attendance).forEach(([d, v]) => { if (v && Object.keys(v).length) (am[ym(d)] = am[ym(d)] || {})[d] = v; });
  Object.entries(am).forEach(([m, days]) => (out['attendance~' + m] = { kind: 'attendance', bucket: m, days }));
  out['meta~biz'] = { kind: 'meta', bucket: 'biz', biz: D.biz };
  return out;
}
export const normDoc = (x) => (x.kind === 'meta' ? { kind: x.kind, bucket: x.bucket, biz: x.biz } : x.kind === 'attendance' ? { kind: x.kind, bucket: x.bucket, days: x.days } : { kind: x.kind, bucket: x.bucket, rows: x.rows || [] });
const clone = (x) => JSON.parse(JSON.stringify(x));
export function fromDocs(docs) {
  const D = emptyDB();
  (docs || []).forEach((x) => {
    if (!x) return;
    if (x.kind === 'meta') D.biz = { ...D.biz, ...clone(x.biz || {}) };
    else if (x.kind === 'attendance') Object.assign(D.attendance, clone(x.days || {}));
    else if (D[x.kind]) D[x.kind].push(...clone(x.rows || []));
  });
  return D;
}

/* ---------- lookups ---------- */
export const prod = (D, n) => D.products.find((p) => p.name === n) || { cost: 0, price: 0, shelf: 300, stock: 0 };
export const mat = (D, n) => D.materials.find((m) => m.name === n);
export const PACK_KG = { '100 g': 0.1, '200 g': 0.2, '250 g': 0.25, '500 g': 0.5, '1 kg': 1, '5 kg': 5 };
export const packKg = (r) => (PACK_KG[r.size] || 0) * (+r.packs || 0);
const round2 = (n) => Math.round(n * 100) / 100;

/* ---------- money & weight per day / month ---------- */
export function overheadPerDay(D) {
  const recent = (e, days) => diffDays(TODAY, e.date) < days && diffDays(TODAY, e.date) >= 0;
  const m = sum(D.expenses.filter((e) => e.type === 'Monthly' && recent(e, 30)), (e) => e.amount);
  const y = sum(D.expenses.filter((e) => e.type === 'Yearly' && recent(e, 365)), (e) => e.amount);
  return m / 30 + y / 365;
}
export function dayStats(D, date, oh) {
  const s = D.sales.filter((x) => x.date === date);
  const revenue = sum(s, (x) => x.amount), weight = sum(s, (x) => x.qty), cogs = sum(s, (x) => x.qty * prod(D, x.product).cost);
  const expenses = sum(D.expenses.filter((e) => e.date === date && e.type === 'Daily'), (e) => e.amount);
  const el = D.electricity.find((e) => e.date === date); const elec = el ? el.cost : 0;
  const att = D.attendance[date] || {}; let wages = 0;
  D.labour.forEach((l) => { const a = att[l.id]; if (a === 'P') wages += +l.wage; else if (a === 'H') wages += l.wage / 2; });
  const pay = D.payments.filter((p) => p.date === date), oi = D.income.filter((p) => p.date === date);
  const cash = sum(pay.filter((p) => p.mode === 'Cash'), (p) => p.amount) + sum(oi.filter((p) => p.mode === 'Cash'), (p) => p.amount);
  const upi = sum(pay.filter((p) => p.mode !== 'Cash'), (p) => p.amount) + sum(oi.filter((p) => p.mode !== 'Cash'), (p) => p.amount);
  const other = sum(oi, (p) => p.amount);
  const credit = sum(s.filter((x) => x.mode === 'Credit'), (x) => x.amount);
  const overhead = revenue || expenses ? oh ?? overheadPerDay(D) : 0;
  const profit = revenue + other - cogs - expenses - elec - wages - overhead;
  return { date, revenue, other, weight, cogs, expenses, elec, units: el ? el.units : 0, wages, overhead, profit, cash, upi, credit, count: s.length };
}
const STAT_KEYS = ['revenue', 'other', 'weight', 'cogs', 'expenses', 'elec', 'units', 'wages', 'overhead', 'profit', 'cash', 'upi', 'credit', 'count'];
export function monthStats(D, m, uptoDay) {
  const oh = overheadPerDay(D);
  const inRange = (d) => !uptoDay || +d.slice(8) <= uptoDay;
  const days = range(m + '-01', addDays(addMonths(m + '-01', 1), -1)).filter((d) => d <= TODAY && inRange(d));
  const ds = days.map((d) => dayStats(D, d, oh));
  const t = { days: ds };
  STAT_KEYS.forEach((k) => (t[k] = sum(ds, (x) => x[k])));
  t.sales = D.sales.filter((s) => ym(s.date) === m && inRange(s.date));
  t.allExp = D.expenses.filter((e) => ym(e.date) === m && inRange(e.date));
  return t;
}
export const openCredit = (D) => D.credits.filter((c) => c.status !== 'Settled');
export const creditStatus = (c) => (c.status === 'Settled' ? 'Settled' : c.due < TODAY ? 'Overdue' : 'Open');
export const batchStatus = (b) => {
  const d = diffDays(b.expiry, TODAY);
  if (+b.qty <= 0) return ['Cleared', ''];
  if (d < 0) return ['Expired', 'bad'];
  if (d <= 30) return [`Expires in ${d}d`, 'warn'];
  if (d <= 60) return [`${d} days left`, 'brown'];
  return ['Fresh', 'good'];
};

export function alerts(D) {
  const A = [];
  D.products.filter((p) => +p.stock <= +p.reorder).forEach((p) => A.push({ k: 'bad', t: `${p.name} is low`, s: `${kg(p.stock)} left · reorder level ${kg(p.reorder)}`, go: 'alerts' }));
  D.materials.filter((m) => +m.stock <= +m.reorder).forEach((m) => A.push({ k: 'bad', t: `${m.name} is low`, s: `${qtyU(m.stock, m.unit)} left · reorder level ${qtyU(m.reorder, m.unit)}`, go: 'alerts' }));
  D.batches.forEach((b) => { const d = diffDays(b.expiry, TODAY); if (d <= 30 && +b.qty > 0) A.push({ k: d < 0 ? 'bad' : 'warn', t: `Batch ${b.batch} ${d < 0 ? 'expired' : 'expiring'}`, s: `${b.product} · ${kg(b.qty)} · ${d < 0 ? 'expired ' : 'expires '}${fmtD(b.expiry)}`, go: 'batches' }); });
  D.credits.filter((c) => creditStatus(c) === 'Overdue').forEach((c) => A.push({ k: 'warn', t: `${c.client} owes ${inr(c.amount)}`, s: `Credit overdue since ${fmtD(c.due)}`, go: 'credit' }));
  D.followups.filter((f) => f.status === 'Pending' && f.date <= TODAY).forEach((f) => A.push({ k: 'ink', t: `Follow up: ${f.who}`, s: `${f.purpose} · ${f.date < TODAY ? 'missed ' + fmtD(f.date) : 'today'}`, go: 'followups' }));
  D.dues.filter((d) => +d.paid < +d.count && diffDays(d.next, TODAY) <= 7).forEach((d) => A.push({ k: 'warn', t: `${d.purpose} due ${fmtD(d.next)}`, s: `${inr(d.emi)} to ${d.lender}`, go: 'dues' }));
  D.recurring.filter((o) => o.active === 'Active' && diffDays(o.next, TODAY) <= 1).forEach((o) => A.push({ k: 'ink', t: `Recurring order: ${o.client}`, s: `${o.product} ${kg(o.qty)} · ${o.next < TODAY ? 'overdue' : fmtD(o.next)}`, go: 'recurring' }));
  return A;
}

/* ---------- effects: how a record changes stock and linked records (s = +1 apply, -1 revert) ---------- */
export const FX = {
  sales(D, r, s) {
    const p = D.products.find((x) => x.name === r.product);
    if (p) p.stock = round2(+p.stock - s * r.qty);
    if (s < 0) {
      const c = D.credits.find((c) => c.src === r.id); r._cst = c ? c.status : undefined;
      D.payments = D.payments.filter((x) => x.src !== r.id); D.credits = D.credits.filter((x) => x.src !== r.id);
    } else {
      if (r.mode === 'Credit') D.credits.push({ id: r.id + 'c', src: r.id, date: r.date, client: r.client, amount: r.amount, due: addDays(r.date, 15), status: r._cst || 'Open', note: `Sale · ${r.product}` });
      else D.payments.push({ id: r.id + 'p', src: r.id, date: r.date, from: r.client, mode: r.mode, amount: r.amount, against: 'Sale' });
      delete r._cst;
    }
  },
  purchases(D, r, s) { if (r.status !== 'Received') return; const m = mat(D, r.item); if (m) m.stock = round2(+m.stock + s * r.qty); },
  packaging(D, r, s) {
    const p = D.products.find((x) => x.name === r.product); const w = packKg(r);
    if (p) {
      p.stock = round2(+p.stock + s * w);
      const raw = mat(D, p.material); if (raw && +p.ratio) raw.stock = round2(+raw.stock - s * w * p.ratio);
      const pk = mat(D, p.pack); if (pk) pk.stock = +pk.stock - s * r.packs;
    }
    if (s < 0 && r.autoBatch) { D.batches = D.batches.filter((b) => b.src !== r.id); r.batch = ''; delete r.autoBatch; }
    else if (s > 0 && !r.batch && p) {
      const n = D.batches.filter((b) => b.product === r.product).length + 1;
      r.batch = `${(p.sku || 'GAR').slice(0, 3).toUpperCase()}-${r.date.slice(2, 4)}${r.date.slice(5, 7)}${r.date.slice(8)}-${n}`; r.autoBatch = true;
      D.batches.push({ id: r.id + 'b', src: r.id, batch: r.batch, product: r.product, packed: r.date, expiry: addDays(r.date, +p.shelf || 180), qty: round2(w) });
    }
  },
  stockLog(D, r, s) { const t = r.target === 'material' ? mat(D, r.product) : D.products.find((x) => x.name === r.product); if (t) t.stock = round2(+t.stock + s * r.change); },
};

export function findRow(D, id) { for (const k of KINDS) { const i = D[k].findIndex((r) => String(r.id) === String(id)); if (i > -1) return [k, i]; } return null; }
export function makeOps(REG) {
  return {
    addRow(D, kind, r) { r.id = r.id || nid(); REG[kind]?.norm?.(r, D); D[kind].push(r); FX[kind]?.(D, r, 1); return r; },
    editRow(D, kind, r, vals) { FX[kind]?.(D, r, -1); Object.assign(r, vals); REG[kind]?.norm?.(r, D); FX[kind]?.(D, r, 1); },
    delRow(D, kind, id) { const i = D[kind].findIndex((x) => String(x.id) === String(id)); if (i < 0) return; const r = D[kind][i]; FX[kind]?.(D, r, -1); D[kind].splice(i, 1); },
  };
}
