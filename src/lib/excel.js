// Excel reports: what goes into each downloadable workbook.
import { buildXlsx, XLSX_MIME } from './xlsx.js';
import { saveFile } from './store.js';
import { TODAY, addDays, addMonths, diffDays, ym, range, sum, fmtDY, monthName } from './format.js';
import { dayStats, overheadPerDay, prod, packKg, openCredit, creditStatus, batchStatus } from './model.js';
import { cell, nodeText } from '../components/ui.jsx';

export const PERIODS = [['month', 'This month'], ['last', 'Last month'], ['3m', 'Last 3 months'], ['year', 'This year'], ['all', 'All time'], ['custom', 'Custom']];
export function periodRange(p, from, to, D) {
  const m0 = ym(TODAY) + '-01';
  const earliest = () => { const ds = [...D.sales, ...D.expenses, ...D.payments, ...D.purchases].map((r) => r.date).filter(Boolean).sort(); return ds[0] || m0; };
  if (p === 'month') return [m0, TODAY];
  if (p === 'last') { const s = addMonths(m0, -1); return [s, addDays(m0, -1)]; }
  if (p === '3m') return [addMonths(m0, -2), TODAY];
  if (p === 'year') return [TODAY.slice(0, 4) + '-01-01', TODAY];
  if (p === 'all') return [earliest(), TODAY];
  const f = from || m0, t = to || TODAY; return f <= t ? [f, t] : [t, f];
}
const inR = (d, [f, t]) => d >= f && d <= t;
const periodLabel = ([f, t]) => `${fmtDY(f)} to ${fmtDY(t)}`;
const stamp = () => `Generated ${fmtDY(TODAY)}`;

/* ---------- sheet builders ---------- */
const salesSheet = (D, R) => ({
  name: 'Sales', title: `${D.biz.name} · Sales`, subtitle: `${periodLabel(R)} · ${stamp()}`,
  columns: [{ h: 'Date', t: 'date', w: 13 }, { h: 'Client', w: 26 }, { h: 'Product', w: 22 }, { h: 'Weight', t: 'kg', w: 12, total: true }, { h: 'Rate per kg', t: 'inr', w: 12 }, { h: 'Amount', t: 'inr', w: 14, total: true }, { h: 'Payment mode', w: 14 }],
  rows: D.sales.filter((s) => inR(s.date, R)).sort((a, b) => a.date.localeCompare(b.date)).map((s) => [s.date, s.client, s.product, +s.qty, +s.rate, +s.amount, s.mode]),
});
const salesByProductSheet = (D, R) => {
  const by = {}; D.sales.filter((s) => inR(s.date, R)).forEach((s) => { const x = (by[s.product] = by[s.product] || { kg: 0, amt: 0, n: 0 }); x.kg += +s.qty; x.amt += +s.amount; x.n++; });
  return { name: 'Sales by product', title: `${D.biz.name} · Sales by product`, subtitle: periodLabel(R),
    columns: [{ h: 'Product', w: 24 }, { h: 'Bills', t: 'int', w: 9, total: true }, { h: 'Weight sold', t: 'kg', w: 14, total: true }, { h: 'Revenue', t: 'inr', w: 15, total: true }, { h: 'Avg rate per kg', t: 'inr', w: 15 }],
    rows: Object.entries(by).sort((a, b) => b[1].amt - a[1].amt).map(([p, x]) => [p, x.n, x.kg, x.amt, x.kg ? x.amt / x.kg : 0]) };
};
const salesByClientSheet = (D, R) => {
  const by = {}; D.sales.filter((s) => inR(s.date, R)).forEach((s) => { const x = (by[s.client] = by[s.client] || { kg: 0, amt: 0, n: 0 }); x.kg += +s.qty; x.amt += +s.amount; x.n++; });
  const bal = (c) => sum(openCredit(D).filter((x) => x.client === c), (x) => x.amount);
  return { name: 'Sales by client', title: `${D.biz.name} · Sales by client`, subtitle: periodLabel(R),
    columns: [{ h: 'Client', w: 26 }, { h: 'Bills', t: 'int', w: 9, total: true }, { h: 'Weight bought', t: 'kg', w: 14, total: true }, { h: 'Revenue', t: 'inr', w: 15, total: true }, { h: 'Balance due today', t: 'inr', w: 17, total: true }],
    rows: Object.entries(by).sort((a, b) => b[1].amt - a[1].amt).map(([c, x]) => [c, x.n, x.kg, x.amt, bal(c)]) };
};
const productsStockSheet = (D) => ({
  name: 'Stock - products', title: `${D.biz.name} · Finished stock`, subtitle: `As of ${fmtDY(TODAY)}`,
  columns: [{ h: 'Product', w: 24 }, { h: 'SKU', w: 9 }, { h: 'Category', w: 18 }, { h: 'In stock', t: 'kg', w: 12, total: true }, { h: 'Reorder level', t: 'kg', w: 13 }, { h: 'Status', w: 12 }, { h: 'Cost per kg', t: 'inr', w: 12 }, { h: 'Price per kg', t: 'inr', w: 12 }, { h: 'Value at cost', t: 'inr', w: 14, total: true }, { h: 'Value at price', t: 'inr', w: 14, total: true }, { h: 'Sold last 30 days', t: 'kg', w: 16, total: true }, { h: 'Days of cover', t: 'int', w: 13 }],
  rows: [...D.products].sort((a, b) => a.name.localeCompare(b.name)).map((p) => {
    const sold = sum(D.sales.filter((s) => s.product === p.name && diffDays(TODAY, s.date) < 30), (s) => s.qty);
    const st = +p.stock <= +p.reorder ? 'Reorder now' : +p.stock <= p.reorder * 1.25 ? 'Low' : 'OK';
    return [p.name, p.sku, p.category, +p.stock, +p.reorder, st, +p.cost, +p.price, p.stock * p.cost, p.stock * p.price, sold, sold ? Math.round(p.stock / (sold / 30)) : ''];
  }),
});
const materialsSheet = (D) => ({
  name: 'Stock - raw & packing', title: `${D.biz.name} · Raw & packing material`, subtitle: `As of ${fmtDY(TODAY)}`,
  columns: [{ h: 'Material', w: 24 }, { h: 'Unit', w: 8 }, { h: 'In stock', t: 'num', w: 12 }, { h: 'Reorder level', t: 'num', w: 13 }, { h: 'Status', w: 12 }, { h: 'Cost per unit', t: 'inr', w: 13 }, { h: 'Value', t: 'inr', w: 14, total: true }, { h: 'Used last 30 days', t: 'num', w: 16 }],
  rows: [...D.materials].sort((a, b) => a.name.localeCompare(b.name)).map((m) => {
    let u = 0; D.packaging.filter((p) => diffDays(TODAY, p.date) < 30).forEach((p) => { const pr = prod(D, p.product); if (pr.material === m.name) u += packKg(p) * pr.ratio; if (pr.pack === m.name) u += p.packs; });
    return [m.name, m.unit, +m.stock, +m.reorder, +m.stock <= +m.reorder ? 'Reorder now' : 'OK', +m.cost, m.stock * m.cost, Math.round(u * 10) / 10];
  }),
});
const batchesSheet = (D) => ({
  name: 'Batches & expiry', title: `${D.biz.name} · Batches & expiry`, subtitle: `As of ${fmtDY(TODAY)}`,
  columns: [{ h: 'Batch', w: 18 }, { h: 'Product', w: 22 }, { h: 'Packed on', t: 'date', w: 13 }, { h: 'Best before', t: 'date', w: 13 }, { h: 'Days left', t: 'int', w: 10 }, { h: 'Qty left', t: 'kg', w: 12, total: true }, { h: 'Status', w: 16 }],
  rows: D.batches.filter((b) => +b.qty > 0).sort((a, b) => a.expiry.localeCompare(b.expiry)).map((b) => [b.batch, b.product, b.packed, b.expiry, diffDays(b.expiry, TODAY), +b.qty, batchStatus(b)[0]]),
});
const REV_COLS = [{ h: 'Sales', t: 'inr', w: 13, total: true }, { h: 'Other income', t: 'inr', w: 13, total: true }, { h: 'Cash in', t: 'inr', w: 12, total: true }, { h: 'UPI & bank in', t: 'inr', w: 13, total: true }, { h: 'Credit given', t: 'inr', w: 13, total: true }, { h: 'Goods cost', t: 'inr', w: 13, total: true }, { h: 'Expenses', t: 'inr', w: 12, total: true }, { h: 'Wages', t: 'inr', w: 11, total: true }, { h: 'Electricity', t: 'inr', w: 12, total: true }, { h: 'Fixed costs share', t: 'inr', w: 15, total: true }, { h: 'Profit', t: 'inr', w: 13, total: true }, { h: 'Weight sold', t: 'kg', w: 12, total: true }, { h: 'Bills', t: 'int', w: 8, total: true }];
const revVals = (s) => [s.revenue, s.other, s.cash, s.upi, s.credit, s.cogs, s.expenses, s.wages, s.elec, s.overhead, s.profit, s.weight, s.count];
const days = (D, R) => { const oh = overheadPerDay(D); return range(R[0], R[1] > TODAY ? TODAY : R[1]).map((d) => dayStats(D, d, oh)); };
const dailySheet = (D, R) => ({
  name: 'Revenue by day', title: `${D.biz.name} · Revenue & profit by day`, subtitle: `${periodLabel(R)} · ${stamp()}`,
  columns: [{ h: 'Date', t: 'date', w: 13 }, { h: 'Day', w: 6 }, ...REV_COLS],
  rows: days(D, R).map((s) => [s.date, new Date(s.date + 'T00:00').toLocaleDateString('en-IN', { weekday: 'short' }), ...revVals(s)]),
});
const monthlySheet = (D, R) => {
  const by = {}; days(D, R).forEach((s) => { const m = ym(s.date); const x = (by[m] = by[m] || {}); Object.keys(s).forEach((k) => { if (typeof s[k] === 'number') x[k] = (x[k] || 0) + s[k]; }); });
  return { name: 'Revenue by month', title: `${D.biz.name} · Revenue & profit by month`, subtitle: periodLabel(R),
    columns: [{ h: 'Month', w: 16 }, ...REV_COLS, { h: 'Margin', t: 'pct', w: 9 }],
    rows: Object.keys(by).sort().map((m) => { const x = by[m]; return [monthName(m), ...revVals(x), x.revenue ? x.profit / x.revenue : 0]; }) };
};
function summarySheet(D, R) {
  const ds = days(D, R); const t = (k) => sum(ds, (s) => s[k]);
  const rows = [['Sales', t('revenue'), 'inr'], ['Other income', t('other'), 'inr'], ['Cost of goods sold', -t('cogs'), 'inr'], ['Daily expenses', -t('expenses'), 'inr'], ['Rent, licences & fixed costs', -t('overhead'), 'inr'], ['Wages (from attendance)', -t('wages'), 'inr'], ['Electricity', -t('elec'), 'inr'], ['Net profit', t('profit'), 'inr'], ['Margin', t('revenue') ? t('profit') / t('revenue') : 0, 'pct'],
    ['Weight sold (kg)', t('weight'), 'num'], ['Bills', t('count'), 'num'], ['Cash received', t('cash'), 'inr'], ['UPI & bank received', t('upi'), 'inr'], ['Sold on credit', t('credit'), 'inr'],
    ['Credit outstanding today', sum(openCredit(D), (c) => c.amount), 'inr'], ['Stock value at cost today', sum(D.products, (p) => p.stock * p.cost) + sum(D.materials, (m) => m.stock * m.cost), 'inr']];
  return { name: 'Summary', title: `${D.biz.name} · Summary`, subtitle: `${periodLabel(R)} · ${stamp()}`,
    columns: [{ h: 'Item', w: 30 }, { h: 'Amount', t: 'inr', w: 16 }, { h: 'Value', t: 'num', w: 12 }],
    rows: rows.map(([l, v, ty]) => (ty === 'inr' ? [l, Math.round(v), ''] : ty === 'pct' ? [l, '', Math.round(v * 1000) / 10 + '%'] : [l, '', Math.round(v * 10) / 10])) };
}
/** Any record type, using its list columns. */
export function recordSheet(D, c, rows, R, name) {
  const T = { date: 'date', inr: 'inr', kg: 'kg', n: 'num' };
  const columns = c.cols.map(([, h, f, n]) => ({ h, t: T[f] || (n === 'n' ? 'text' : 'text'), w: Math.max(10, Math.min(30, h.length + 6)), total: f === 'inr' || f === 'kg' }));
  return { name: name || c.name, title: `${D.biz.name} · ${name || c.name}`, subtitle: `${R ? periodLabel(R) + ' · ' : ''}${stamp()}`, columns,
    rows: rows.map((r) => c.cols.map((col) => { const [k, , f] = col; if (f === 'date') return r[k] || ''; if (T[f]) return +r[k] || 0; return nodeText(cell(r, col)); })) };
}
function attendanceSheet(D, R) {
  const ds = range(R[0], R[1] > TODAY ? TODAY : R[1]);
  return { name: 'Attendance', title: `${D.biz.name} · Attendance`, subtitle: `${periodLabel(R)} · P present, H half day, A absent`,
    columns: [{ h: 'Date', t: 'date', w: 13 }, ...D.labour.map((l) => ({ h: l.name, w: Math.max(10, l.name.length + 2) }))],
    rows: ds.map((d) => [d, ...D.labour.map((l) => (D.attendance[d] || {})[l.id] || '')]) };
}

export const REPORTS = {
  sales: { label: 'Sales', desc: 'Every bill with client, product, kg, rate, amount and mode, plus totals by product and by client.', icon: 'bag', period: true,
    sheets: (D, R) => [salesSheet(D, R), salesByProductSheet(D, R), salesByClientSheet(D, R)], count: (D, R) => D.sales.filter((s) => inR(s.date, R)).length, unit: 'bills' },
  stock: { label: 'Stock', desc: 'Finished products, raw & packing material and every batch with its expiry, as of today.', icon: 'layers', period: false,
    sheets: (D) => [productsStockSheet(D), materialsSheet(D), batchesSheet(D)], count: (D) => D.products.length + D.materials.length, unit: 'items' },
  revenue: { label: 'Revenue & profit', desc: 'A summary, then sales, cash, UPI, credit, costs and profit for each day and each month.', icon: 'trend', period: true,
    sheets: (D, R) => [summarySheet(D, R), dailySheet(D, R), monthlySheet(D, R)], count: (D, R) => range(R[0], R[1] > TODAY ? TODAY : R[1]).length, unit: 'days' },
  all: { label: 'Full workbook', desc: 'Everything: summary, revenue, sales, stock, purchases, expenses, payments, credit, electricity, salary, deliveries, attendance and clients.', icon: 'doc', period: true, count: () => 18, unit: 'sheets' },
};

/** Build and download one report. CFG is passed in to avoid a circular import. */
export async function downloadReport(D, key, R, CFG) {
  let sheets;
  if (key === 'all') {
    const dated = (k) => D[CFG[k].key].filter((r) => inR(r.date, R)).sort((a, b) => a.date.localeCompare(b.date));
    sheets = [summarySheet(D, R), dailySheet(D, R), monthlySheet(D, R), salesSheet(D, R), salesByProductSheet(D, R), salesByClientSheet(D, R), productsStockSheet(D), materialsSheet(D), batchesSheet(D),
      recordSheet(D, CFG.purchases, dated('purchases'), R, 'Purchases'),
      { ...recordSheet(D, { name: 'Expenses', cols: [['date', 'Date', 'date'], ['type', 'Type'], ['category', 'Category'], ['note', 'Note'], ['amount', 'Amount', 'inr']] }, D.expenses.filter((r) => inR(r.date, R)).sort((a, b) => a.date.localeCompare(b.date)), R, 'Expenses') },
      recordSheet(D, CFG.payments, dated('payments'), R, 'Payments received'),
      { ...recordSheet(D, CFG.credit, D.credits.filter((r) => inR(r.date, R)).sort((a, b) => a.date.localeCompare(b.date)), R, 'Credit given'), rows: D.credits.filter((r) => inR(r.date, R)).sort((a, b) => a.date.localeCompare(b.date)).map((r) => [r.date, r.client, r.note, r.due, +r.amount, creditStatus(r)]) },
      recordSheet(D, CFG.electricity, dated('electricity'), R, 'Electricity'),
      recordSheet(D, CFG.salary, dated('salary'), R, 'Salary paid'),
      recordSheet(D, CFG.deliveries, dated('deliveries'), R, 'Deliveries'),
      attendanceSheet(D, R),
      recordSheet(D, CFG.clients, [...D.clients].sort((a, b) => a.name.localeCompare(b.name)), null, 'Clients')];
  } else sheets = REPORTS[key].sheets(D, R);
  const file = `Garlici ${REPORTS[key].label.replace('&', 'and').replace(/[^\w ]/g, '')} ${REPORTS[key].period ? R[0] + ' to ' + R[1] : TODAY}.xlsx`;
  await saveFile(file, buildXlsx(sheets), XLSX_MIME, 'Excel file saved');
}
/** One list page, exactly as filtered on screen. */
export async function downloadList(D, c, rows, id) {
  await saveFile(`Garlici ${c.name} ${TODAY}.xlsx`, buildXlsx([recordSheet(D, c, rows, null)]), XLSX_MIME, 'Excel file saved');
}
