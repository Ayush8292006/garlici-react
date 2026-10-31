// How each record type looks as a row in the app's card lists.
import { inr, kg, qtyU, fmtD, sum, diffDays, TODAY } from '../lib/format.js';
import { creditStatus, batchStatus, openCredit, packKg } from '../lib/model.js';
import { Meter } from '../components/ui.jsx';

const modeTag = (m) => [m, m === 'Cash' ? 'brown' : m === 'UPI' ? 'ink' : m === 'Credit' ? 'warn' : ''];

export const LI = {
  sales: (r) => ({ t: r.client, s: `${r.product} · ${kg(r.qty)} × ${inr(r.rate)}`, v: inr(r.amount), tag: modeTag(r.mode) }),
  payments: (r) => ({ t: r.from, s: r.against, v: inr(r.amount), tag: modeTag(r.mode), ic: 'coin', avk: r.mode === 'Cash' ? '' : 'dark' }),
  credits: (r) => { const s = creditStatus(r); return { t: r.client, s: `${r.note || 'Credit'} · due ${fmtD(r.due)}`, v: inr(r.amount), tag: [s, s === 'Settled' ? 'good' : s === 'Overdue' ? 'bad' : 'warn'], avk: s === 'Overdue' ? 'bad' : s === 'Settled' ? 'good' : 'warn' }; },
  products: (r) => { const m = r.price ? ((r.price - r.cost) / r.price) * 100 : 0; return { t: r.name, s: `${inr(r.price)}/kg · ${m.toFixed(0)}% margin · ${r.shelf} days`, v: kg(r.stock), tag: +r.stock <= +r.reorder ? ['Reorder', 'bad'] : null, ic: 'box', avk: 'dark' }; },
  purchases: (r) => ({ t: r.item, s: `${r.supplier} · ${qtyU(r.qty, r.unit)}`, v: inr(r.amount), tag: [r.status, r.status === 'Received' ? 'good' : 'warn'], ic: 'cart' }),
  batches: (r) => { const [s, k] = batchStatus(r); return { t: r.batch, s: `${r.product} · best before ${fmtD(r.expiry)}`, v: kg(r.qty), tag: [s, k], ic: 'tag', avk: k === 'bad' ? 'bad' : k === 'warn' ? 'warn' : '' }; },
  packaging: (r) => ({ t: r.product, s: `${r.packs} × ${r.size} · ${r.packedBy || ''}`, v: kg(packKg(r)), tag: r.batch ? [r.batch, ''] : null, ic: 'package' }),
  clients: (r, D) => { const b = sum(openCredit(D).filter((c) => c.client === r.name), (c) => c.amount); return { t: r.name, s: `${r.type}${r.city ? ' · ' + r.city : ''}`, v: b ? inr(b) : null, tag: b ? ['Owes', 'warn'] : null }; },
  leads: (r) => ({ t: r.name, s: `${r.interest} · ${r.source}`, v: inr(r.value) + '/mo', tag: [r.stage, { Won: 'good', Lost: 'bad', Negotiation: 'warn', 'Sample sent': 'brown' }[r.stage] || ''], ic: 'spark' }),
  followups: (r) => ({ t: r.who, s: `${r.mode} · ${r.purpose}`, v: fmtD(r.date), tag: r.status === 'Done' ? ['Done', 'good'] : r.date < TODAY ? ['Missed', 'bad'] : r.date === TODAY ? ['Today', 'warn'] : ['Pending', ''], ic: 'phone', avk: r.status === 'Done' ? 'good' : r.date < TODAY ? 'bad' : '' }),
  recurring: (r) => ({ t: r.client, s: `${r.product} · ${kg(r.qty)} · ${r.every}`, v: fmtD(r.next), tag: r.active !== 'Active' ? ['Paused', ''] : r.next < TODAY ? ['Overdue', 'bad'] : r.next === TODAY ? ['Today', 'warn'] : ['Active', 'good'], ic: 'repeat' }),
  deliveries: (r) => ({ t: r.client, s: `${r.items} · ${r.vehicle || ''}`, v: kg(r.kgs), tag: [r.status, r.status === 'Delivered' ? 'good' : r.status === 'Out for delivery' ? 'warn' : ''], ic: 'truck', avk: r.status === 'Delivered' ? 'good' : r.status === 'Out for delivery' ? 'warn' : '' }),
  electricity: (r) => ({ t: `${r.units} kWh`, s: `₹${r.rate} per unit`, v: inr(r.cost), ic: 'bolt' }),
  salaries: (r) => ({ t: r.name, s: r.period || 'Salary', v: inr(r.amount), tag: modeTag(r.mode) }),
  expenses: (r) => ({ t: r.category, s: r.note || r.type, v: inr(r.amount), tag: r.type !== 'Daily' ? [r.type, r.type === 'Yearly' ? 'ink' : 'brown'] : null, ic: 'receipt' }),
  income: (r) => ({ t: r.source, s: r.from || 'Other income', v: inr(r.amount), tag: modeTag(r.mode), ic: 'wallet', avk: 'good' }),
  materials: (r) => ({ t: r.name, s: `Reorder at ${qtyU(r.reorder, r.unit)} · ${inr(r.cost)}/${r.unit}`, v: qtyU(r.stock, r.unit), tag: +r.stock <= +r.reorder ? ['Reorder', 'bad'] : null, ic: 'layers', meter: <Meter q={r.stock / (r.reorder || 1)} /> }),
  stockLog: (r) => ({ t: r.product, s: r.reason, v: `${r.change >= 0 ? '+' : ''}${r.change}`, ic: 'edit' }),
  invoices: (r) => ({ t: r.client, s: `${r.no} · ${r.items.length} items`, v: inr(r.total), tag: modeTag(r.mode), ic: 'doc', avk: 'dark' }),
};
export const daysLeft = (d) => diffDays(d, TODAY);
