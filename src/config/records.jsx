// Every record type: its list page (columns, filters, summary tiles), its form fields, and how a saved entry is cleaned up.
import { Kpi, Pill, ModePill, Delta, HBars, ColChart } from '../components/ui.jsx';
import { TODAY, addDays, addMonths, diffDays, ym, range, sum, inr, kshort, kg, qtyU, fmtD, monthName } from '../lib/format.js';
import { prod, mat, packKg, dayStats, monthStats, openCredit, creditStatus, batchStatus, makeOps } from '../lib/model.js';

const segDate = (r, s) => (s === 'Today' ? r.date === TODAY : s === 'This month' ? ym(r.date) === ym(TODAY) : true);
const opts = {
  clients: (D) => D.clients.map((c) => c.name), products: (D) => D.products.map((p) => p.name),
  labour: (D) => D.labour.map((l) => l.name), materials: (D) => D.materials.map((m) => m.name),
};
const mono = (v) => <span className="mono">{v}</span>;
const bold = (v) => <b>{v}</b>;

export const CFG = {
  sales: {
    eyebrow: 'Sales & Money', title: <>Sales <em>done</em></>, name: 'Sales', key: 'sales',
    desc: 'Daily and monthly sales with the weight that left the godown. Each sale reduces stock and records the payment or credit for you.',
    cols: [['date', 'Date', 'date'], ['client', 'Client'], ['product', 'Product'], ['qty', 'Weight', 'kg'], ['rate', 'Rate / kg', 'inr'], ['amount', 'Amount', 'inr'], ['mode', 'Mode', (r) => <ModePill m={r.mode} />]],
    fields: [['date', 'Date', 'date'], ['client', 'Client', 'select', opts.clients], ['product', 'Product', 'select', opts.products], ['qty', 'Weight sold (kg)', 'number'], ['rate', 'Rate per kg (₹)', 'number', null, 'Leave empty to use the product price'], ['mode', 'Payment mode', 'select', ['Cash', 'UPI', 'Credit']]],
    norm(r, D) { r.qty = +r.qty || 0; r.rate = +r.rate || prod(D, r.product).price; r.amount = Math.round(r.qty * r.rate); },
    seg: ['Today', 'This month', 'All'], segFilter: segDate,
    kpis(D) {
      const t = dayStats(D, TODAY), m = monthStats(D, ym(TODAY)), y = dayStats(D, addDays(TODAY, -1));
      return [<Kpi key="1" hero l="Sales today" v={inr(t.revenue)} s={<Delta now={t.revenue} prev={y.revenue} suffix="vs yesterday" />} />, <Kpi key="2" l="Weight sold today" v={kg(t.weight)} s={`${t.count} bills`} />,
        <Kpi key="3" l="Sales this month" v={kshort(m.revenue)} s={`${m.sales.length} bills`} />, <Kpi key="4" l="Weight this month" v={kg(m.weight)} s={`avg ${kg(m.weight / Math.max(1, m.days.length))} / day`} />];
    },
    top(D) {
      const s = D.sales.filter((x) => x.date === TODAY); const by = {}; s.forEach((x) => (by[x.product] = (by[x.product] || 0) + x.qty));
      return <div className="panel reveal" style={{ marginBottom: 16 }}><h3>Weight sold today, by product <small>{kg(sum(s, (x) => x.qty))} total</small></h3>
        <HBars items={Object.entries(by).map(([l, v]) => ({ l, v })).sort((a, b) => b.v - a.v)} fmt={kg} /></div>;
    },
  },
  payments: {
    eyebrow: 'Sales & Money', title: <>Payments <em>received</em></>, name: 'Payment received', key: 'payments',
    desc: 'Who paid you, how much, and whether it came by cash or UPI. Cash and UPI sales appear here on their own.',
    cols: [['date', 'Date', 'date'], ['from', 'Received from'], ['against', 'Against'], ['mode', 'Mode', (r) => <ModePill m={r.mode} />], ['amount', 'Amount', 'inr']],
    fields: [['date', 'Date', 'date'], ['from', 'Received from', 'select', opts.clients], ['mode', 'Mode', 'select', ['Cash', 'UPI', 'Bank transfer', 'Cheque']], ['amount', 'Amount (₹)', 'number'], ['against', 'Against', 'select', ['Credit recovery', 'Advance', 'Sale', 'Other']]],
    norm(r) { r.amount = +r.amount || 0; }, seg: ['Today', 'This month', 'All'], segFilter: segDate,
    kpis(D) {
      const t = D.payments.filter((p) => p.date === TODAY), m = D.payments.filter((p) => ym(p.date) === ym(TODAY));
      const c = (a) => sum(a.filter((p) => p.mode === 'Cash'), (p) => p.amount), u = (a) => sum(a.filter((p) => p.mode !== 'Cash'), (p) => p.amount);
      return [<Kpi key="1" hero l="Received today" v={inr(sum(t, (p) => p.amount))} s={`${t.length} payments`} />, <Kpi key="2" l="Cash today" v={inr(c(t))} />, <Kpi key="3" l="UPI & bank today" v={inr(u(t))} />,
        <Kpi key="4" l="This month" v={kshort(sum(m, (p) => p.amount))} s={`Cash ${kshort(c(m))} · UPI ${kshort(u(m))}`} />];
    },
  },
  credit: {
    eyebrow: 'Sales & Money', title: <>Credit <em>given</em></>, name: 'Credit', key: 'credits',
    desc: 'Udhaar given to clients, with due dates. Sales on credit appear here on their own. Mark settled when the money comes in.',
    cols: [['date', 'Given on', 'date'], ['client', 'Client'], ['note', 'Note'], ['due', 'Due', 'date'], ['amount', 'Amount', 'inr'], ['status', 'Status', (r) => { const s = creditStatus(r); return <Pill k={s === 'Settled' ? 'good' : s === 'Overdue' ? 'bad' : 'warn'}>{s}</Pill>; }]],
    fields: [['date', 'Date', 'date'], ['client', 'Client', 'select', opts.clients], ['amount', 'Amount (₹)', 'number'], ['due', 'Due date', 'date', null, 'Defaults to 15 days'], ['note', 'Note', 'text']],
    norm(r) { r.amount = +r.amount || 0; r.due = r.due || addDays(r.date, 15); r.status = r.status || 'Open'; },
    seg: ['Open', 'Overdue', 'Settled', 'All'], segFilter: (r, s) => (s === 'All' ? true : s === 'Open' ? r.status !== 'Settled' : creditStatus(r) === s),
    actions: (r) => (r.status !== 'Settled' ? [['settle', 'Mark settled']] : []),
    act: { settle(D, r) { r.status = 'Settled'; ops.addRow(D, 'payments', { date: TODAY, from: r.client, mode: 'UPI', amount: r.amount, against: 'Credit recovery' }); return `${r.client} settled · payment recorded`; } },
    kpis(D) {
      const o = openCredit(D), od = o.filter((c) => c.due < TODAY), by = {}; o.forEach((c) => (by[c.client] = (by[c.client] || 0) + c.amount));
      const top = Object.entries(by).sort((a, b) => b[1] - a[1])[0];
      return [<Kpi key="1" hero l="Outstanding" v={inr(sum(o, (c) => c.amount))} s={`${o.length} open entries`} />, <Kpi key="2" l="Overdue" v={inr(sum(od, (c) => c.amount))} s={`${od.length} past due date`} />,
        <Kpi key="3" l="Given this month" v={kshort(sum(D.credits.filter((c) => ym(c.date) === ym(TODAY)), (c) => c.amount))} />, <Kpi key="4" l="Largest balance" v={top ? kshort(top[1]) : '—'} s={top ? top[0] : ''} />];
    },
  },
  products: {
    eyebrow: 'Stock', title: 'Products', name: 'Product', key: 'products', sort: 'name',
    desc: 'Your catalogue with price, cost and margin per kg, and the raw material each product uses.',
    cols: [['name', 'Product', (r) => bold(r.name)], ['sku', 'SKU', (r) => mono(r.sku)], ['category', 'Category'], ['price', 'Price / kg', 'inr'], ['cost', 'Cost / kg', 'inr'],
      ['m', 'Margin', (r) => { const m = r.price ? ((r.price - r.cost) / r.price) * 100 : 0; return <span className={m > 30 ? 'up' : ''}>{m.toFixed(0)}%</span>; }, 'n'],
      ['material', 'Made from', (r) => (r.material ? <>{r.material} <span className="muted">× {r.ratio}</span></> : '—')], ['shelf', 'Shelf life', (r) => r.shelf + ' days'], ['stock', 'In stock', 'kg']],
    fields: [['name', 'Product name', 'text'], ['sku', 'SKU code', 'text'], ['category', 'Category', 'select', ['Powder & granules', 'Flakes', 'Paste & pickle', 'Fresh', 'Specialty']], ['price', 'Selling price per kg (₹)', 'number'], ['cost', 'Cost per kg (₹)', 'number'], ['stock', 'Stock now (kg)', 'number'], ['reorder', 'Reorder level (kg)', 'number'], ['shelf', 'Shelf life (days)', 'number'],
      ['material', 'Main raw material', 'select', (D) => ['None', ...opts.materials(D)]], ['ratio', 'Raw material used per kg of product', 'number', null, 'e.g. 4.5 kg raw garlic for 1 kg powder'], ['pack', 'Packing material per pack', 'select', (D) => ['None', ...opts.materials(D)]]],
    norm(r) { ['price', 'cost', 'stock', 'reorder', 'shelf', 'ratio'].forEach((k) => (r[k] = +r[k] || 0)); if (r.material === 'None') r.material = ''; if (r.pack === 'None') r.pack = ''; },
    kpis(D) {
      const p = D.products; const mg = (x) => (x.price ? (x.price - x.cost) / x.price : 0); const best = [...p].sort((a, b) => mg(b) - mg(a))[0];
      return [<Kpi key="1" hero l="Products" v={p.length} s={`${new Set(p.map((x) => x.category)).size} categories`} />, <Kpi key="2" l="Avg margin" v={p.length ? ((sum(p, mg) / p.length) * 100).toFixed(0) + '%' : '—'} />, <Kpi key="3" l="Best margin" v={best ? best.name : '—'} />];
    },
  },
  purchases: {
    eyebrow: 'Stock', title: 'Purchases', name: 'Purchase', key: 'purchases',
    desc: 'Raw material and packing material bought. When a purchase is received, it is added to raw-material stock.',
    cols: [['date', 'Date', 'date'], ['supplier', 'Supplier'], ['item', 'Item'], ['qty', 'Qty', (r) => qtyU(r.qty, r.unit), 'n'], ['rate', 'Rate', 'inr'], ['amount', 'Amount', 'inr'], ['status', 'Status', (r) => <Pill k={r.status === 'Received' ? 'good' : 'warn'}>{r.status}</Pill>]],
    fields: [['date', 'Date', 'date'], ['supplier', 'Supplier', 'text'], ['item', 'Item', 'select', (D) => [...opts.materials(D), 'Other']], ['qty', 'Quantity', 'number'], ['rate', 'Rate per unit (₹)', 'number'], ['status', 'Status', 'select', ['Received', 'Pending']]],
    norm(r, D) { r.qty = +r.qty || 0; r.rate = +r.rate || 0; r.amount = Math.round(r.qty * r.rate); r.unit = mat(D, r.item)?.unit || 'kg'; },
    actions: (r) => (r.status === 'Pending' ? [['recv', 'Mark received']] : []),
    act: { recv(D, r) { ops.editRow(D, 'purchases', r, { status: 'Received' }); return 'Received · added to stock'; } },
    seg: ['This month', 'Pending', 'All'], segFilter: (r, s) => (s === 'Pending' ? r.status === 'Pending' : s === 'This month' ? ym(r.date) === ym(TODAY) : true),
    kpis(D) {
      const m = D.purchases.filter((p) => ym(p.date) === ym(TODAY)), pend = D.purchases.filter((p) => p.status === 'Pending');
      return [<Kpi key="1" hero l="Bought this month" v={inr(sum(m, (p) => p.amount))} s={`${m.length} purchases`} />, <Kpi key="2" l="Awaiting delivery" v={pend.length} s={inr(sum(pend, (p) => p.amount))} />,
        <Kpi key="3" l="Last 90 days" v={kshort(sum(D.purchases.filter((p) => diffDays(TODAY, p.date) < 90), (p) => p.amount))} />];
    },
  },
  batches: {
    eyebrow: 'Stock', title: <>Batch &amp; <em>expiry</em></>, name: 'Batch', key: 'batches', sort: 'expiry', asc: true,
    desc: 'Every packed batch with its packaging date and best-before date. Packaging entries create batches on their own.',
    cols: [['batch', 'Batch', (r) => mono(r.batch)], ['product', 'Product'], ['packed', 'Packed on', 'date'], ['expiry', 'Best before', 'date'], ['qty', 'Qty left', 'kg'], ['st', 'Status', (r) => { const [s, k] = batchStatus(r); return <Pill k={k}>{s}</Pill>; }]],
    fields: [['product', 'Product', 'select', opts.products], ['packed', 'Packaging date', 'date'], ['qty', 'Quantity left (kg)', 'number'], ['batch', 'Batch number', 'text', null, 'Leave empty to auto-generate'], ['expiry', 'Best before', 'date', null, 'Leave empty to use the product shelf life']],
    norm(r, D) {
      const p = prod(D, r.product); r.packed = r.packed || TODAY; r.qty = +r.qty || 0; r.expiry = r.expiry || addDays(r.packed, +p.shelf || 180);
      r.batch = r.batch || `${(p.sku || 'GAR').slice(0, 3).toUpperCase()}-${r.packed.slice(2, 4)}${r.packed.slice(5, 7)}${r.packed.slice(8)}-${D.batches.filter((b) => b.product === r.product).length + 1}`;
    },
    seg: ['Needs attention', 'All'], segFilter: (r, s) => s === 'All' || (diffDays(r.expiry, TODAY) <= 60 && +r.qty > 0),
    actions: (r) => (diffDays(r.expiry, TODAY) < 0 && +r.qty > 0 ? [['clear', 'Write off']] : []),
    act: { clear(D, r) { ops.addRow(D, 'stockLog', { date: TODAY, product: r.product, change: -r.qty, reason: `Expired batch ${r.batch}`, target: 'product' }); r.qty = 0; return 'Batch written off · stock reduced'; } },
    kpis(D) {
      const b = D.batches, ex = b.filter((x) => diffDays(x.expiry, TODAY) < 0 && x.qty > 0), soon = b.filter((x) => { const d = diffDays(x.expiry, TODAY); return d >= 0 && d <= 30 && x.qty > 0; });
      return [<Kpi key="1" l="Active batches" v={b.filter((x) => x.qty > 0).length} />, <Kpi key="2" hero l="Expiring in 30 days" v={soon.length} s={kg(sum(soon, (x) => x.qty))} />, <Kpi key="3" l="Expired, still in stock" v={ex.length} s={kg(sum(ex, (x) => x.qty))} />];
    },
  },
  packaging: {
    eyebrow: 'Stock', title: 'Packaging', name: 'Packaging', key: 'packaging',
    desc: 'What was packed, on which date, in which pack size and by whom. Packing adds finished stock, uses up raw garlic and pouches, and creates a batch.',
    cols: [['date', 'Packaging date', 'date'], ['product', 'Product'], ['batch', 'Batch', (r) => mono(r.batch)], ['size', 'Pack size'], ['packs', 'Packs', 'n'], ['w', 'Total weight', (r) => kg(packKg(r)), 'n'], ['packedBy', 'Packed by']],
    fields: [['date', 'Packaging date', 'date'], ['product', 'Product', 'select', opts.products], ['size', 'Pack size', 'select', ['100 g', '200 g', '250 g', '500 g', '1 kg', '5 kg']], ['packs', 'Number of packs', 'number'], ['packedBy', 'Packed by', 'select', opts.labour], ['batch', 'Batch number', 'text', null, 'Leave empty to create a new batch automatically']],
    norm(r) { r.packs = +r.packs || 0; }, seg: ['Today', 'This month', 'All'], segFilter: segDate,
    kpis(D) {
      const t = D.packaging.filter((p) => p.date === TODAY), m = D.packaging.filter((p) => ym(p.date) === ym(TODAY)); const c = {}; m.forEach((p) => (c[p.size] = (c[p.size] || 0) + p.packs));
      return [<Kpi key="1" hero l="Packed today" v={sum(t, (p) => p.packs).toLocaleString('en-IN') + ' packs'} s={kg(sum(t, packKg))} />, <Kpi key="2" l="This month" v={sum(m, (p) => p.packs).toLocaleString('en-IN') + ' packs'} s={kg(sum(m, packKg))} />,
        <Kpi key="3" l="Most packed size" v={Object.entries(c).sort((a, b) => b[1] - a[1])[0]?.[0] || '—'} />];
    },
  },
  clients: {
    eyebrow: 'Customers', title: 'Clients', name: 'Client', key: 'clients', sort: 'name', desc: 'Everyone who buys from you, with their balance and last order.',
    cols: [['name', 'Client', (r) => bold(r.name)], ['type', 'Type', (r) => <Pill k="brown">{r.type}</Pill>], ['city', 'City'], ['phone', 'Phone', (r) => mono(r.phone)],
      ['bal', 'Balance due', (r, D) => { const b = sum(openCredit(D).filter((c) => c.client === r.name), (c) => c.amount); return b ? <span className="down">{inr(b)}</span> : '—'; }, 'n'],
      ['m', 'This month', (r, D) => inr(sum(D.sales.filter((s) => s.client === r.name && ym(s.date) === ym(TODAY)), (s) => s.amount)), 'n'],
      ['last', 'Last order', (r, D) => { const l = D.sales.filter((s) => s.client === r.name).map((s) => s.date).sort().pop(); return l ? fmtD(l) : '—'; }]],
    fields: [['name', 'Client / shop name', 'text'], ['type', 'Type', 'select', ['Retailer', 'Wholesaler', 'Hotel', 'Caterer', 'Distributor', 'Exporter']], ['city', 'City', 'text'], ['phone', 'Phone', 'text'], ['gstin', 'GSTIN', 'text', null, 'Optional']],
    norm(r) { r.since = r.since || TODAY; },
    kpis(D) {
      const by = {}; D.sales.filter((s) => ym(s.date) === ym(TODAY)).forEach((s) => (by[s.client] = (by[s.client] || 0) + s.amount)); const top = Object.entries(by).sort((a, b) => b[1] - a[1])[0];
      return [<Kpi key="1" hero l="Clients" v={D.clients.length} s={`${D.clients.filter((c) => c.type === 'Wholesaler').length} wholesalers`} />, <Kpi key="2" l="Top client this month" v={top ? top[0] : '—'} s={top ? inr(top[1]) : ''} />,
        <Kpi key="3" l="With balance due" v={new Set(openCredit(D).map((c) => c.client)).size} />];
    },
  },
  leads: {
    eyebrow: 'Customers', title: 'Leads', name: 'Lead', key: 'leads', sort: 'next', asc: true, desc: 'New business you are chasing. Move each lead forward as it progresses.',
    cols: [['name', 'Lead', (r) => bold(r.name)], ['source', 'Source'], ['interest', 'Interested in'], ['value', 'Est. monthly value', 'inr'], ['stage', 'Stage', (r) => <Pill k={{ Won: 'good', Lost: 'bad', Negotiation: 'warn', 'Sample sent': 'brown' }[r.stage] || ''}>{r.stage}</Pill>], ['next', 'Next touch', 'date']],
    fields: [['name', 'Name', 'text'], ['source', 'Source', 'select', ['Walk-in', 'Referral', 'IndiaMART', 'WhatsApp', 'Trade fair', 'Instagram']], ['interest', 'Interested in', 'text'], ['value', 'Estimated monthly value (₹)', 'number'], ['stage', 'Stage', 'select', ['New', 'Contacted', 'Sample sent', 'Negotiation', 'Won', 'Lost']], ['next', 'Next follow-up', 'date', null, 'Optional']],
    norm(r) { r.value = +r.value || 0; },
    actions: (r, D) => (!['Won', 'Lost'].includes(r.stage) ? [['adv', 'Next stage →']] : r.stage === 'Won' && !D.clients.some((c) => c.name === r.name) ? [['conv', 'Make client']] : []),
    act: {
      adv(D, r) { const st = ['New', 'Contacted', 'Sample sent', 'Negotiation', 'Won']; r.stage = st[Math.min(st.indexOf(r.stage) + 1, 4)]; return `${r.name} → ${r.stage}`; },
      conv(D, r) { ops.addRow(D, 'clients', { name: r.name, type: 'Retailer', city: '', phone: '' }); return `${r.name} added to clients`; },
    },
    kpis(D) {
      const open = D.leads.filter((l) => !['Won', 'Lost'].includes(l.stage)), won = D.leads.filter((l) => l.stage === 'Won').length, lost = D.leads.filter((l) => l.stage === 'Lost').length;
      return [<Kpi key="1" l="Open leads" v={open.length} s="in pipeline" />, <Kpi key="2" hero l="Pipeline value" v={kshort(sum(open, (l) => l.value))} s="per month if won" />, <Kpi key="3" l="Win rate" v={won + lost ? Math.round((won / (won + lost)) * 100) + '%' : '—'} s={`${won} won · ${lost} lost`} />];
    },
  },
  followups: {
    eyebrow: 'Customers', title: 'Follow-ups', name: 'Follow-up', key: 'followups', sort: 'date', asc: true, desc: 'Calls, visits and reminders. Tick them off as you go.',
    cols: [['date', 'When', (r) => <>{fmtD(r.date)} {r.status === 'Pending' && r.date < TODAY ? <Pill k="bad">Missed</Pill> : r.date === TODAY && r.status === 'Pending' ? <Pill k="warn">Today</Pill> : null}</>], ['who', 'With'], ['purpose', 'Purpose'], ['mode', 'How'], ['status', 'Status', (r) => <Pill k={r.status === 'Done' ? 'good' : ''}>{r.status}</Pill>]],
    fields: [['date', 'Date', 'date'], ['who', 'With whom', 'text'], ['purpose', 'Purpose', 'text'], ['mode', 'How', 'select', ['Call', 'Visit', 'WhatsApp']]],
    norm(r) { r.status = r.status || 'Pending'; }, seg: ['Pending', 'Done', 'All'], segFilter: (r, s) => s === 'All' || r.status === s,
    actions: (r) => (r.status === 'Pending' ? [['done', 'Done ✓']] : []), act: { done(D, r) { r.status = 'Done'; return 'Follow-up done'; } },
    kpis(D) {
      const p = D.followups.filter((f) => f.status === 'Pending');
      return [<Kpi key="1" hero l="Due today" v={p.filter((f) => f.date === TODAY).length} />, <Kpi key="2" l="Missed" v={p.filter((f) => f.date < TODAY).length} />, <Kpi key="3" l="Upcoming 7 days" v={p.filter((f) => f.date > TODAY && diffDays(f.date, TODAY) <= 7).length} />];
    },
  },
  recurring: {
    eyebrow: 'Customers', title: <>Recurring <em>orders</em></>, name: 'Recurring order', key: 'recurring', sort: 'next', asc: true,
    desc: 'Standing orders that repeat. Marking one sent adds today’s delivery and rolls the next date forward.',
    cols: [['client', 'Client', (r) => bold(r.client)], ['product', 'Product'], ['qty', 'Qty', 'kg'], ['every', 'Repeats'], ['next', 'Next due', (r) => <>{fmtD(r.next)} {r.next < TODAY ? <Pill k="bad">Overdue</Pill> : r.next === TODAY ? <Pill k="warn">Today</Pill> : null}</>], ['active', 'Status', (r) => <Pill k={r.active === 'Active' ? 'good' : ''}>{r.active}</Pill>]],
    fields: [['client', 'Client', 'select', opts.clients], ['product', 'Product', 'select', opts.products], ['qty', 'Quantity (kg)', 'number'], ['every', 'Repeats', 'select', ['Weekly', 'Fortnightly', 'Monthly']], ['next', 'Next due date', 'date']],
    norm(r) { r.qty = +r.qty || 0; r.active = r.active || 'Active'; r.next = r.next || TODAY; },
    actions: (r) => (r.active === 'Active' ? [['sent', 'Mark sent'], ['pause', 'Pause']] : [['pause', 'Resume']]),
    act: {
      sent(D, r) {
        ops.addRow(D, 'deliveries', { date: TODAY, client: r.client, items: `${r.product} ${r.qty} kg`, kgs: r.qty, vehicle: 'Own vehicle', status: 'Pending' });
        r.next = r.every === 'Weekly' ? addDays(r.next, 7) : r.every === 'Fortnightly' ? addDays(r.next, 14) : addMonths(r.next, 1);
        return `Delivery added · next due ${fmtD(r.next)}`;
      },
      pause(D, r) { r.active = r.active === 'Active' ? 'Paused' : 'Active'; return r.active === 'Active' ? 'Resumed' : 'Paused'; },
    },
    kpis(D) {
      const a = D.recurring.filter((o) => o.active === 'Active');
      const perMonth = sum(a, (o) => o.qty * prod(D, o.product).price * (o.every === 'Weekly' ? 4.3 : o.every === 'Fortnightly' ? 2.15 : 1));
      return [<Kpi key="1" l="Active standing orders" v={a.length} />, <Kpi key="2" hero l="Due in next 3 days" v={a.filter((o) => diffDays(o.next, TODAY) <= 3).length} />, <Kpi key="3" l="Assured monthly revenue" v={kshort(perMonth)} />];
    },
  },
  deliveries: {
    eyebrow: 'Customers', title: <>Daily <em>delivery</em></>, name: 'Delivery', key: 'deliveries', desc: 'Today’s dispatch sheet. Tap the status button to move a delivery along.',
    cols: [['date', 'Date', 'date'], ['client', 'Client', (r) => bold(r.client)], ['items', 'Items'], ['kgs', 'Weight', 'kg'], ['vehicle', 'Vehicle'], ['status', 'Status', (r) => <Pill k={r.status === 'Delivered' ? 'good' : r.status === 'Out for delivery' ? 'warn' : ''}>{r.status}</Pill>]],
    fields: [['date', 'Date', 'date'], ['client', 'Client', 'select', opts.clients], ['items', 'Items', 'text'], ['kgs', 'Total weight (kg)', 'number'], ['vehicle', 'Vehicle', 'text'], ['status', 'Status', 'select', ['Pending', 'Out for delivery', 'Delivered']]],
    norm(r) { r.kgs = +r.kgs || 0; r.status = r.status || 'Pending'; },
    seg: ['Today', 'Upcoming', 'All'], segFilter: (r, s) => (s === 'Today' ? r.date === TODAY : s === 'Upcoming' ? r.date > TODAY : true),
    actions: (r) => (r.status !== 'Delivered' ? [['next', r.status === 'Pending' ? 'Dispatch' : 'Delivered ✓']] : []),
    act: { next(D, r) { r.status = r.status === 'Pending' ? 'Out for delivery' : 'Delivered'; return `${r.client}: ${r.status}`; } },
    kpis(D) {
      const t = D.deliveries.filter((d) => d.date === TODAY);
      return [<Kpi key="1" hero l="Deliveries today" v={t.length} s={kg(sum(t, (d) => d.kgs))} />, <Kpi key="2" l="Delivered" v={t.filter((d) => d.status === 'Delivered').length} />,
        <Kpi key="3" l="Out now" v={t.filter((d) => d.status === 'Out for delivery').length} />, <Kpi key="4" l="Not dispatched" v={t.filter((d) => d.status === 'Pending').length} />];
    },
  },
  electricity: {
    eyebrow: 'Costs', title: 'Electricity', name: 'Electricity reading', key: 'electricity', desc: 'Units used every day by the dryers, grinders and sealers, and what it costs.',
    cols: [['date', 'Date', 'date'], ['units', 'Units (kWh)', 'n'], ['rate', 'Rate / unit', (r) => '₹' + r.rate, 'n'], ['cost', 'Cost', 'inr'], ['per', 'Units per kg sold', (r, D) => { const w = dayStats(D, r.date).weight; return w ? (r.units / w).toFixed(2) : '—'; }, 'n']],
    fields: [['date', 'Date', 'date'], ['units', 'Units used (kWh)', 'number', null, 'Today’s meter reading minus yesterday’s'], ['rate', 'Rate per unit (₹)', 'number', null, 'Leave empty to use 8.6']],
    norm(r) { r.units = +r.units || 0; r.rate = +r.rate || 8.6; r.cost = Math.round(r.units * r.rate); },
    seg: ['This month', 'All'], segFilter: (r, s) => s === 'All' || ym(r.date) === ym(TODAY),
    kpis(D) {
      const t = D.electricity.find((e) => e.date === TODAY), y = D.electricity.find((e) => e.date === addDays(TODAY, -1));
      const m = D.electricity.filter((e) => ym(e.date) === ym(TODAY)), pm = D.electricity.filter((e) => ym(e.date) === ym(addMonths(TODAY, -1)));
      return [<Kpi key="1" hero l="Today" v={t ? t.units + ' kWh' : 'Not entered'} s={t ? <>{inr(t.cost)}{y ? <> · <Delta now={t.units} prev={y.units} suffix="vs yesterday" /></> : null}</> : 'Add today’s reading'} />,
        <Kpi key="2" l="This month" v={sum(m, (e) => e.units).toLocaleString('en-IN') + ' kWh'} s={inr(sum(m, (e) => e.cost))} />, <Kpi key="3" l="Last month" v={sum(pm, (e) => e.units).toLocaleString('en-IN') + ' kWh'} s={inr(sum(pm, (e) => e.cost))} />,
        <Kpi key="4" l="Daily average" v={(sum(m, (e) => e.units) / Math.max(1, m.length)).toFixed(0) + ' kWh'} />];
    },
    top(D) {
      const m = ym(TODAY); const rows = range(m + '-01', TODAY).map((d) => ({ l: d, v: (D.electricity.find((e) => e.date === d) || {}).units || 0 }));
      return <div className="panel reveal" style={{ marginBottom: 16 }}><h3>Units per day · {monthName(m)} <small>today in black</small></h3><ColChart rows={rows} fmt={(v) => Math.round(v) + ''} xfmt={(d) => d.slice(8)} hi={rows.length - 1} /></div>;
    },
  },
  salary: {
    eyebrow: 'Team', title: <>Salary <em>paid</em></>, name: 'Salary payment', key: 'salaries', desc: 'Wages and salary settled with your team.',
    cols: [['date', 'Paid on', 'date'], ['name', 'Name', (r) => bold(r.name)], ['period', 'For'], ['mode', 'Mode', (r) => <ModePill m={r.mode} />], ['amount', 'Amount', 'inr']],
    fields: [['date', 'Date', 'date'], ['name', 'Worker', 'select', opts.labour], ['period', 'For period', 'text', null, 'e.g. October 2026'], ['mode', 'Mode', 'select', ['Cash', 'UPI', 'Bank transfer']], ['amount', 'Amount (₹)', 'number']],
    norm(r) { r.amount = +r.amount || 0; },
    kpis(D) {
      const m = D.salaries.filter((s) => ym(s.date) === ym(TODAY)), pm = D.salaries.filter((s) => ym(s.date) === ym(addMonths(TODAY, -1))); let earned = 0;
      Object.keys(D.attendance).filter((d) => ym(d) === ym(TODAY)).forEach((d) => D.labour.forEach((l) => { const a = D.attendance[d][l.id]; earned += a === 'P' ? +l.wage : a === 'H' ? l.wage / 2 : 0; }));
      return [<Kpi key="1" hero l="Paid this month" v={inr(sum(m, (s) => s.amount))} s={`${m.length} payments`} />, <Kpi key="2" l="Paid last month" v={inr(sum(pm, (s) => s.amount))} />, <Kpi key="3" l="Wages earned this month" v={inr(earned)} s="from attendance, to settle" />];
    },
  },
};

/** Forms for every editable kind (list pages above plus the custom pages). */
export const REG = {};
Object.entries(CFG).forEach(([, c]) => { if (c && c.key) REG[c.key] = { fields: c.fields, norm: c.norm, title: c.name }; });
REG.expenses = { title: 'Expense', fields: [['date', 'Date', 'date'], ['type', 'Type', 'select', ['Daily', 'Monthly', 'Yearly']], ['category', 'Category', 'select', ['Raw garlic (petty)', 'Tea & refreshments', 'Transport', 'Packaging material', 'Repairs', 'Rent', 'Internet & phone', 'Accountant', 'Loan EMI', 'Licences', 'Insurance', 'Maintenance', 'Other']], ['note', 'Note', 'text'], ['amount', 'Amount (₹)', 'number']], norm(r) { r.amount = +r.amount || 0; } };
REG.income = { title: 'Other income', fields: [['date', 'Date', 'date'], ['source', 'Source', 'select', ['Scrap / husk sale', 'Job work', 'Rent received', 'Interest', 'Subsidy', 'Other']], ['from', 'From', 'text', null, 'Optional'], ['mode', 'Mode', 'select', ['Cash', 'UPI', 'Bank transfer']], ['amount', 'Amount (₹)', 'number']], norm(r) { r.amount = +r.amount || 0; } };
REG.dues = { title: 'Loan or due', fields: [['lender', 'Lender / supplier', 'text'], ['purpose', 'What for', 'text'], ['total', 'Total amount (₹)', 'number'], ['emi', 'EMI amount (₹)', 'number', null, 'For a one-time due, enter the full amount'], ['count', 'Number of EMIs', 'number', null, '1 for a one-time due'], ['paid', 'EMIs already paid', 'number', null, '0 if new'], ['next', 'Next due date', 'date']], norm(r) { ['total', 'emi', 'count', 'paid'].forEach((k) => (r[k] = +r[k] || 0)); r.count = r.count || 1; r.next = r.next || TODAY; } };
REG.labour = { title: 'Worker', fields: [['name', 'Full name', 'text'], ['role', 'Work', 'select', ['Peeling', 'Drying & grinding', 'Packing', 'Loading & delivery', 'Cleaning & sorting', 'Supervisor']], ['wage', 'Daily wage (₹)', 'number'], ['joined', 'Joining date', 'date'], ['phone', 'Phone', 'text', null, 'Optional']], norm(r) { r.wage = +r.wage || 0; r.joined = r.joined || TODAY; } };
REG.materials = { title: 'Raw or packing material', fields: [['name', 'Material name', 'text'], ['unit', 'Unit', 'select', ['kg', 'pcs', 'litre']], ['stock', 'Stock now', 'number'], ['reorder', 'Reorder level', 'number'], ['cost', 'Cost per unit (₹)', 'number']], norm(r) { ['stock', 'reorder', 'cost'].forEach((k) => (r[k] = +r[k] || 0)); } };

export const ops = makeOps(REG);
export { opts };
