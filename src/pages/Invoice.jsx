import { useState } from 'react';
import { useStore, mutate, toast, canDownload } from '../lib/store.js';
import { TODAY, addDays, fmtDY, inr, kg } from '../lib/format.js';
import { prod } from '../lib/model.js';
import { ops } from '../config/records.jsx';
import { invNo, invTotals, invText, invoicePDF } from '../lib/pdf.js';
import { Header, Icon, Table, ModePill, GarlicPaths } from '../components/ui.jsx';

const ACCENTS = [['#111111', 'Black'], ['#8C7650', 'Beige gold'], ['#555049', 'Charcoal']];
const freshBill = (D) => ({ client: D.clients[0].name, items: [{ product: D.products[0].name, qty: 10, rate: D.products[0].price }], gst: 5, disc: 0, tpl: 'Classic', accent: '#111111', record: true, mode: 'UPI' });

function copy(txt) {
  const done = () => toast('Invoice text copied');
  const fallback = () => { const t = document.createElement('textarea'); t.value = txt; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); done(); } catch { toast('Select and copy the text manually'); } t.remove(); };
  try { navigator.clipboard.writeText(txt).then(done, fallback); } catch { fallback(); }
}

export default function Invoice() {
  const st = useStore(); const D = st.DB;
  const [v, setV] = useState(null);
  if (!D.clients.length || !D.products.length) {
    return <div className="page"><Header eyebrow="Sales & Money" title={<>Billing &amp; <em>invoices</em></>} desc="Build a bill, pick a look, and save it as PDF or send it on WhatsApp." />
      <div className="tw"><div className="empty">Add at least one <a href="#clients">client</a> and one <a href="#products">product</a> to make an invoice.</div></div></div>;
  }
  const bill = v || freshBill(D);
  const set = (patch) => setV({ ...bill, ...patch });
  const setItem = (i, patch) => set({ items: bill.items.map((it, k) => (k === i ? { ...it, ...patch } : it)) });
  const no = bill.no || invNo(D); const { sub, disc, tax, grand } = invTotals(bill);
  const cl = D.clients.find((c) => c.name === bill.client) || {}; const b = D.biz;
  const ph = String(cl.phone || '').replace(/\D/g, ''); const wa = `https://wa.me/${ph.length === 10 ? '91' + ph : ph}?text=${encodeURIComponent(invText(D, bill))}`;

  const save = () => {
    let msg;
    const ok = mutate((DB) => {
      if (bill.no) {
        const r = DB.invoices.find((x) => x.no === bill.no);
        if (r) Object.assign(r, { client: bill.client, items: bill.items.map((i) => ({ ...i })), gst: +bill.gst, disc: +bill.disc, mode: bill.mode, tpl: bill.tpl, accent: bill.accent, total: grand });
        msg = `${bill.no} updated`;
      } else {
        const n = invNo(DB);
        ops.addRow(DB, 'invoices', { no: n, date: TODAY, client: bill.client, items: bill.items.map((i) => ({ ...i })), gst: +bill.gst, disc: +bill.disc, mode: bill.mode, tpl: bill.tpl, accent: bill.accent, total: grand });
        if (bill.record) bill.items.forEach((it) => ops.addRow(DB, 'sales', { date: TODAY, client: bill.client, product: it.product, qty: +it.qty, rate: +it.rate, mode: bill.mode }));
        msg = `${n} saved${bill.record ? ' · sales recorded' : ''}`;
      }
    });
    if (ok) { toast(msg); setV(null); }
  };

  return (
    <div className="page">
      <Header eyebrow="Sales & Money" title={<>Billing &amp; <em>invoices</em></>} desc="Build a bill, pick a look, and save it as PDF or send it on WhatsApp." />
      <div className="inv-wrap">
        <div className="panel reveal"><h3>{bill.no ? `Editing ${bill.no}` : 'Bill details'}</h3><div className="form-stack">
          <div className="fld"><label htmlFor="iv_client">Bill to</label><select id="iv_client" value={bill.client} onChange={(e) => set({ client: e.target.value })}>{D.clients.map((c) => <option key={c.id}>{c.name}</option>)}</select></div>
          <div className="fld"><label>Items <small>product · kg · rate per kg</small></label>
            <div className="lines">{bill.items.map((it, i) => (
              <div className="line" key={i}>
                <select aria-label="Product" value={it.product} onChange={(e) => setItem(i, { product: e.target.value, rate: prod(D, e.target.value).price })}>{D.products.map((p) => <option key={p.id}>{p.name}</option>)}</select>
                <input aria-label="Kg" type="number" min="0" step="0.5" value={it.qty} onChange={(e) => setItem(i, { qty: +e.target.value || 0 })} />
                <input aria-label="Rate" type="number" min="0" value={it.rate} onChange={(e) => setItem(i, { rate: +e.target.value || 0 })} />
                <button type="button" className="x sm" aria-label="Remove line" onClick={() => set({ items: bill.items.length > 1 ? bill.items.filter((_, k) => k !== i) : bill.items })}>×</button>
              </div>
            ))}</div>
            <button type="button" className="btn sm" style={{ justifySelf: 'start' }} onClick={() => set({ items: [...bill.items, { product: D.products[0].name, qty: 1, rate: D.products[0].price }] })}><Icon n="plus" />Add item</button>
          </div>
          <div className="two">
            <div className="fld"><label htmlFor="iv_gst">GST</label><select id="iv_gst" value={bill.gst} onChange={(e) => set({ gst: +e.target.value })}>{[0, 5, 12, 18].map((g) => <option key={g} value={g}>{g}%</option>)}</select></div>
            <div className="fld"><label htmlFor="iv_disc">Discount (₹)</label><input id="iv_disc" type="number" min="0" value={bill.disc} onChange={(e) => set({ disc: +e.target.value || 0 })} /></div>
          </div>
          <div className="two">
            <div className="fld"><label htmlFor="iv_tpl">Look</label><select id="iv_tpl" value={bill.tpl} onChange={(e) => set({ tpl: e.target.value })}><option>Classic</option><option>Minimal</option></select></div>
            <div className="fld"><label htmlFor="iv_acc">Accent</label><select id="iv_acc" value={bill.accent} onChange={(e) => set({ accent: e.target.value })}>{ACCENTS.map(([c, n]) => <option key={c} value={c}>{n}</option>)}</select></div>
          </div>
          <div className="two" style={{ alignItems: 'end' }}>
            <label className="chk"><input type="checkbox" checked={!!bill.record} disabled={!!bill.no} onChange={(e) => set({ record: e.target.checked })} /> Also record as sales</label>
            <div className="fld"><label htmlFor="iv_mode">Paid by</label><select id="iv_mode" value={bill.mode} onChange={(e) => set({ mode: e.target.value })}>{['Cash', 'UPI', 'Credit'].map((g) => <option key={g}>{g}</option>)}</select></div>
          </div>
          <div className="btnrow">
            <button type="button" className="btn pri" onClick={save}>{bill.no ? 'Save changes' : 'Save invoice'}</button>
            {canDownload(st) && <button type="button" className="btn" onClick={() => invoicePDF(D, bill)}><Icon n="down" />Download PDF</button>}
            <a className="btn" href={wa} target="_blank" rel="noopener noreferrer">WhatsApp</a>
            <button type="button" className="btn ghost" onClick={() => copy(invText(D, bill))}>Copy text</button>
            <button type="button" className="btn ghost" onClick={() => setV(null)}>New bill</button>
          </div>
          {(!b.address || !b.gstin) && <p className="hint">Add your address, GSTIN and UPI ID in <a href="#settings">Settings</a> so they print on every bill.</p>}
        </div></div>

        <div className={`paper ${bill.tpl === 'Minimal' ? 'minimal' : ''} reveal`} style={{ '--inv-accent': bill.accent }}>
          <div className="ptop">
            <div className="pbrand"><svg viewBox="0 0 96 96" width="46" height="46" stroke={bill.accent} strokeWidth="3" aria-hidden="true"><circle cx="48" cy="48" r="45" fill="none" /><GarlicPaths /></svg>
              <div><div className="pname">{b.name}</div><div className="pmeta">{b.address}{b.address && <br />}{b.gstin && 'GSTIN ' + b.gstin}{b.gstin && b.phone && ' · '}{b.phone}</div></div></div>
            <div className="pinv"><b>INVOICE</b><div className="pmeta mono">{no}<br />{fmtDY(bill.date || TODAY)}</div></div>
          </div>
          <div className="pparty">
            <div className="pmeta"><b className="plab">BILL TO</b><br /><span className="pcl">{bill.client}</span><br />{cl.city} {cl.phone && '· ' + cl.phone}{cl.gstin && <><br />GSTIN {cl.gstin}</>}</div>
            <div className="pmeta" style={{ textAlign: 'right' }}><b className="plab">PAYMENT</b><br />{bill.mode === 'Credit' ? 'Due ' + fmtDY(addDays(bill.date || TODAY, 15)) : bill.mode}{b.upi && <><br />UPI {b.upi}</>}</div>
          </div>
          <div style={{ overflowX: 'auto' }}><table>
            <thead><tr><th>#</th><th>Item</th><th className="n">Weight</th><th className="n">Rate / kg</th><th className="n">Amount</th></tr></thead>
            <tbody>{bill.items.map((it, i) => <tr key={i}><td>{i + 1}</td><td>{it.product}<br /><span className="phsn">HSN 0712</span></td><td className="n">{kg(+it.qty)}</td><td className="n">{inr(+it.rate)}</td><td className="n">{inr(it.qty * it.rate)}</td></tr>)}</tbody>
          </table></div>
          <div className="ptot">
            <div><span>Subtotal</span><span className="num">{inr(sub)}</span></div>
            {disc > 0 && <div><span>Discount</span><span className="num">−{inr(disc)}</span></div>}
            {+bill.gst > 0 && <><div><span>CGST {bill.gst / 2}%</span><span className="num">{inr(tax / 2)}</span></div><div><span>SGST {bill.gst / 2}%</span><span className="num">{inr(tax / 2)}</span></div></>}
            <div className="g"><span>Total</span><span>{inr(grand)}</span></div>
          </div>
          <div className="pfoot"><div style={{ maxWidth: '46ch' }}>{b.terms}</div>{bill.mode !== 'Credit' && <div className="stamp">PAID</div>}<div className="sig">Authorised signatory</div></div>
        </div>
      </div>

      <h2 className="h2">Saved invoices</h2>
      <Table kind="invoices" noEdit rows={[...D.invoices].sort((a, c) => (c.date + c.no).localeCompare(a.date + a.no))}
        cols={[['no', 'Invoice', (r) => <span className="mono">{r.no}</span>], ['date', 'Date', 'date'], ['client', 'Client'], ['items', 'Items', (r) => r.items.length + ' lines'], ['mode', 'Mode', (r) => <ModePill m={r.mode} />], ['total', 'Total', 'inr']]}
        actions={() => [['open', 'Open']]} onAction={(a, r) => { setV({ ...JSON.parse(JSON.stringify(r)), record: false }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
    </div>
  );
}
