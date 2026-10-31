import { useState } from 'react';
import { useStore, canDownload } from '../lib/store.js';
import { TODAY, diffDays, sum, inr, kshort, kg, qtyU } from '../lib/format.js';
import { prod, packKg } from '../lib/model.js';
import { downloadReport } from '../lib/excel.js';
import { opts, CFG } from '../config/records.jsx';
import { LI } from '../config/listItems.jsx';
import { Header, Kpi, RecordList, Seg, Meter, XlBtn, useApp, Icon } from '../components/ui.jsx';

export function Inventory() {
  const st = useStore(); const D = st.DB; const app = useApp();
  const [seg, setSeg] = useState('Finished');
  const adjust = (isM) => app.openCustom({
    title: 'Stock adjustment', sub: isM ? 'Raw & packing material' : 'Finished product',
    fields: [['product', isM ? 'Material' : 'Product', 'select', isM ? opts.materials : opts.products], ['change', isM ? 'Change (use minus to reduce)' : 'Change in kg (use minus to reduce)', 'number'], ['reason', 'Reason', 'select', ['Stock count correction', 'Damaged / spoiled', 'Free sample', 'Returned by client', 'Fresh production', 'Other']]],
    kind: 'stockLog', prep: (r) => { r.change = +r.change || 0; r.date = TODAY; r.target = isM ? 'material' : 'product'; },
  });
  const xl = canDownload(st) && <XlBtn label="Stock Excel" onClick={() => downloadReport(D, 'stock', [TODAY, TODAY], CFG)} />;
  const bar = <div className="trow"><Seg options={[['Finished', 'Finished goods'], ['Raw', 'Raw & packing'], ['Adjust', 'Adjustments']]} value={seg} onChange={setSeg} />{xl}</div>;

  if (seg === 'Raw') {
    const m = D.materials;
    const used = (r) => { let u = 0; D.packaging.filter((p) => diffDays(TODAY, p.date) < 30).forEach((p) => { const pr = prod(D, p.product); if (pr.material === r.name) u += packKg(p) * pr.ratio; if (pr.pack === r.name) u += p.packs; }); return qtyU(u, r.unit); };
    return (
      <div className="page">
        <Header eyebrow="Stock" title={<>Raw &amp; <em>packing</em></>} desc="Received purchases add to it; packaging uses it up.">
          <button type="button" className="btn sm" onClick={() => adjust(true)}>Adjust</button><button type="button" className="btn pri sm" onClick={() => app.openAdd('materials')}><Icon n="plus" />Material</button>
        </Header>{bar}
        <div className="kpis"><Kpi hero l="Raw stock value" v={inr(sum(m, (x) => x.stock * x.cost))} s={`${m.filter((x) => +x.stock <= +x.reorder).length} below reorder level`} />
          {m.slice(0, 2).map((x) => <Kpi key={x.id} l={x.name} v={qtyU(x.stock, x.unit)} s={+x.stock <= +x.reorder ? <span className="down">Below reorder level</span> : `reorder at ${qtyU(x.reorder, x.unit)}`} />)}</div>
        <RecordList kind="materials" item={LI.materials} rows={[...m].sort((a, b) => a.name.localeCompare(b.name))} cols={[
          ['name', 'Material'], ['stock', 'In stock', (r) => qtyU(r.stock, r.unit), 'n'], ['reorder', 'Reorder at', (r) => qtyU(r.reorder, r.unit), 'n'], ['cost', 'Cost / unit', 'inr'], ['v', 'Value', (r) => inr(r.stock * r.cost), 'n'], ['used', 'Used last 30 days', used, 'n']]} />
      </div>
    );
  }
  if (seg === 'Adjust') {
    return (
      <div className="page">
        <Header eyebrow="Stock" title={<>Stock <em>adjustments</em></>} desc="Damage, samples, recounts and written-off batches."><button type="button" className="btn pri sm" onClick={() => adjust(false)}><Icon n="plus" />Adjust stock</button></Header>{bar}
        <RecordList kind="stockLog" item={LI.stockLog} group="date" rows={[...D.stockLog].sort((a, b) => b.date.localeCompare(a.date))} cols={[['date', 'Date', 'date'], ['product', 'Item'], ['target', 'Type', (r) => (r.target === 'material' ? 'Raw / packing' : 'Finished product')], ['change', 'Change', (r) => `${r.change >= 0 ? '+' : ''}${r.change}`, 'n'], ['reason', 'Reason']]} />
      </div>
    );
  }
  const p = [...D.products].sort((a, b) => a.stock / (a.reorder || 1) - b.stock / (b.reorder || 1));
  const soldOf = (x) => sum(D.sales.filter((s) => s.product === x.name && diffDays(TODAY, s.date) < 30), (s) => s.qty);
  return (
    <div className="page">
      <Header eyebrow="Stock" title={<>Finished <em>goods</em></>} desc="Sales take stock out; packaging puts it in."><button type="button" className="btn pri sm" onClick={() => adjust(false)}><Icon n="plus" />Adjust stock</button></Header>{bar}
      <div className="kpis"><Kpi hero l="Stock value at cost" v={inr(sum(p, (x) => x.stock * x.cost))} s={`${kshort(sum(p, (x) => x.stock * x.price))} at selling price`} /><Kpi l="Total on hand" v={kg(sum(p, (x) => x.stock))} />
        <Kpi l="Below reorder" v={p.filter((x) => +x.stock <= +x.reorder).length} s="products" /></div>
      {p.length ? (
        <RecordList kind="products" rows={p}
          item={(x) => { const sold = soldOf(x); const cover = sold ? Math.round(x.stock / (sold / 30)) : null; return { t: x.name, s: `${cover != null ? cover + ' days of cover' : 'No sales in 30 days'} · ${inr(x.stock * x.cost)}`, v: kg(x.stock), tag: +x.stock <= +x.reorder ? ['Reorder', 'bad'] : null, ic: 'box', avk: +x.stock <= +x.reorder ? 'bad' : 'dark', meter: <Meter q={x.stock / (x.reorder || 1)} /> }; }}
          cols={[['name', 'Product'], ['category', 'Category'], ['stock', 'On hand', 'kg'], ['reorder', 'Reorder level', 'kg'], ['v', 'Value at cost', (x) => inr(x.stock * x.cost), 'n'], ['sold', 'Sold last 30 days', (x) => kg(soldOf(x)), 'n'], ['cover', 'Days of cover', (x) => { const s = soldOf(x); return s ? Math.round(x.stock / (s / 30)) + ' days' : '—'; }, 'n']]} />
      ) : <div className="empty">No products yet. <a href="#products">Add your products</a> first.</div>}
    </div>
  );
}
