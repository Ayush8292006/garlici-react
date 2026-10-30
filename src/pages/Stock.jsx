import { useState } from 'react';
import { useStore } from '../lib/store.js';
import { TODAY, diffDays, sum, inr, kshort, kg, qtyU } from '../lib/format.js';
import { prod, packKg } from '../lib/model.js';
import { opts } from '../config/records.jsx';
import { Header, Kpi, Table, Seg, Pill, Icon, AddBtn, useApp } from '../components/ui.jsx';

const Meter = ({ q }) => <div className="meter"><i className={q <= 1 ? 'bad' : q <= 1.25 ? 'warn' : 'good'} style={{ width: `${Math.min(100, (q / 3) * 100)}%` }} /></div>;

export function Inventory() {
  const { DB: D } = useStore(); const app = useApp();
  const [seg, setSeg] = useState('Finished products');
  const adjust = (isM) => app.openCustom({
    title: 'Stock adjustment', sub: isM ? 'Raw & packing material' : 'Finished product',
    fields: [['product', isM ? 'Material' : 'Product', 'select', isM ? opts.materials : opts.products], ['change', isM ? 'Change (use minus to reduce)' : 'Change in kg (use minus to reduce)', 'number'], ['reason', 'Reason', 'select', ['Stock count correction', 'Damaged / spoiled', 'Free sample', 'Returned by client', 'Fresh production', 'Other']]],
    kind: 'stockLog', prep: (r) => { r.change = +r.change || 0; r.date = TODAY; r.target = isM ? 'material' : 'product'; },
  });
  const bar = <div className="toolbar"><Seg options={['Finished products', 'Raw & packing material', 'Adjustments']} value={seg} onChange={setSeg} /></div>;

  if (seg === 'Raw & packing material') {
    const m = D.materials;
    const used = (r) => { let u = 0; D.packaging.filter((p) => diffDays(TODAY, p.date) < 30).forEach((p) => { const pr = prod(D, p.product); if (pr.material === r.name) u += packKg(p) * pr.ratio; if (pr.pack === r.name) u += p.packs; }); return qtyU(u, r.unit); };
    return (
      <div className="page">
        <Header eyebrow="Stock" title="Inventory" desc="Raw garlic and packing material in the godown. Received purchases add to it; packaging uses it up.">
          <button type="button" className="btn" onClick={() => adjust(true)}>Adjust stock</button><AddBtn kind="materials" label="Add material" />
        </Header>{bar}
        <div className="kpis"><Kpi hero l="Raw stock value" v={inr(sum(m, (x) => x.stock * x.cost))} />
          {m.slice(0, 3).map((x) => <Kpi key={x.id} l={x.name} v={qtyU(x.stock, x.unit)} s={+x.stock <= +x.reorder ? <span className="down">Below reorder level</span> : `reorder at ${qtyU(x.reorder, x.unit)}`} />)}</div>
        <Table kind="materials" rows={[...m].sort((a, b) => a.name.localeCompare(b.name))} cols={[
          ['name', 'Material', (r) => <b>{r.name}</b>], ['stock', 'In stock', (r) => qtyU(r.stock, r.unit), 'n'], ['lvl', 'Stock vs reorder level', (r) => <Meter q={r.stock / (r.reorder || 1)} />],
          ['reorder', 'Reorder at', (r) => qtyU(r.reorder, r.unit), 'n'], ['cost', 'Cost / unit', 'inr'], ['v', 'Value', (r) => inr(r.stock * r.cost), 'n'], ['used', 'Used last 30 days', used, 'n']]} />
      </div>
    );
  }
  if (seg === 'Adjustments') {
    return (
      <div className="page">
        <Header eyebrow="Stock" title="Inventory" desc="Manual stock changes: damage, samples, recounts and written-off batches."><button type="button" className="btn pri" onClick={() => adjust(false)}><Icon n="plus" />Adjust stock</button></Header>{bar}
        <Table kind="stockLog" rows={[...D.stockLog].sort((a, b) => b.date.localeCompare(a.date))} cols={[['date', 'Date', 'date'], ['product', 'Item'], ['target', 'Type', (r) => (r.target === 'material' ? 'Raw / packing' : 'Finished product')], ['change', 'Change', (r) => <span className={r.change >= 0 ? 'up' : 'down'}>{r.change >= 0 ? '+' : ''}{r.change}</span>, 'n'], ['reason', 'Reason']]} />
      </div>
    );
  }
  const p = [...D.products].sort((a, b) => a.stock / (a.reorder || 1) - b.stock / (b.reorder || 1));
  return (
    <div className="page">
      <Header eyebrow="Stock" title="Inventory" desc="Finished goods on hand, valued at cost. Sales take stock out; packaging puts it in."><button type="button" className="btn pri" onClick={() => adjust(false)}><Icon n="plus" />Adjust stock</button></Header>{bar}
      <div className="kpis"><Kpi hero l="Stock value at cost" v={inr(sum(p, (x) => x.stock * x.cost))} /><Kpi l="Total on hand" v={kg(sum(p, (x) => x.stock))} />
        <Kpi l="Value at selling price" v={kshort(sum(p, (x) => x.stock * x.price))} /><Kpi l="Below reorder" v={p.filter((x) => +x.stock <= +x.reorder).length} s="products" /></div>
      {p.length ? (
        <div className="tw reveal"><table>
          <thead><tr><th>Product</th><th>Category</th><th className="n">On hand</th><th>Stock vs reorder level</th><th className="n">Value</th><th className="n">Sold last 30 days</th><th className="n">Days of cover</th></tr></thead>
          <tbody>{p.map((x) => {
            const r = x.stock / (x.reorder || 1); const sold = sum(D.sales.filter((s) => s.product === x.name && diffDays(TODAY, s.date) < 30), (s) => s.qty); const cover = sold ? Math.round(x.stock / (sold / 30)) + ' d' : '—';
            return <tr key={x.id}><td><b>{x.name}</b></td><td>{x.category}</td><td className="n">{kg(x.stock)}</td><td><div className="lvl"><Meter q={r} />{r <= 1 && <Pill k="bad">Reorder</Pill>}</div></td><td className="n">{inr(x.stock * x.cost)}</td><td className="n">{kg(sold)}</td><td className="n">{cover}</td></tr>;
          })}</tbody>
        </table></div>
      ) : <div className="tw"><div className="empty">No products yet. <a href="#products">Add your products</a> first.</div></div>}
    </div>
  );
}
