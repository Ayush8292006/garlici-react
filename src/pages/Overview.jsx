import { useState } from 'react';
import { useStore, canDownload } from '../lib/store.js';
import { TODAY, addDays, addMonths, ym, range, sum, inr, kshort, kg, qtyU, monthName, weekday, pct } from '../lib/format.js';
import { dayStats, monthStats, overheadPerDay, openCredit, alerts } from '../lib/model.js';
import { downloadReport } from '../lib/excel.js';
import { CFG } from '../config/records.jsx';
import { Header, Kpi, Delta, LineChart, HBars, AlertList, Icon, Meter, XlBtn, CountUp, useApp } from '../components/ui.jsx';

const topOf = (o) => Object.entries(o).sort((x, y) => y[1] - x[1]);
const Legend = ({ a = 'Sales', b = 'Profit' }) => <span className="legend"><span><i style={{ background: 'var(--ink)' }} />{a}</span><span><i style={{ background: 'var(--brown-2)' }} />{b}</span></span>;

export function Dashboard() {
  const st = useStore(); const D = st.DB; const app = useApp();
  const empty = !D.products.length && !D.sales.length;
  const t = dayStats(D, TODAY), y = dayStats(D, addDays(TODAY, -1)), m = monthStats(D, ym(TODAY));
  const oh = overheadPerDay(D);
  const last30 = range(addDays(TODAY, -29), TODAY).map((d) => { const s = dayStats(D, d, oh); return { label: d, rev: s.revenue, profit: s.profit }; });
  const A = alerts(D); const att = D.attendance[TODAY] || {};
  const present = D.labour.filter((l) => att[l.id] === 'P' || att[l.id] === 'H').length;
  const out = sum(openCredit(D), (c) => c.amount); const del = D.deliveries.filter((d) => d.date === TODAY);
  const dues = D.dues.filter((d) => +d.paid < +d.count); const raw = D.materials[0];
  const hr = new Date().getHours(); const greet = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';
  const sb = {}; m.sales.forEach((s) => (sb[s.product] = (sb[s.product] || 0) + s.amount));
  const money = [['Sales', m.revenue], ['Cost of goods', m.cogs], ['Expenses', m.expenses + m.overhead], ['Wages', m.wages], ['Electricity', m.elec]];
  return (
    <div className="page">
      <Header eyebrow={new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })} title={<>{greet}<em>.</em></>} />
      {empty && (
        <div className="welcome reveal">
          <div><div className="eyebrow">{st.mode === 'loading' ? 'Loading your books…' : 'Your books are empty'}</div><h2>{st.mode === 'loading' ? 'Fetching your latest entries.' : 'Set up Garlici in five steps.'}</h2></div>
          {st.mode !== 'loading' && (
            <ol className="steps">
              <li><a href="#business">Add your business details</a><small>Name, address, GSTIN and UPI for invoices</small></li>
              <li><a href="#inventory">Add raw and packing materials</a><small>Raw garlic, pouches, jars</small></li>
              <li><a href="#products">Add your products</a><small>Price, cost, shelf life, raw material used</small></li>
              <li><a href="#clients">Add your clients</a><small>Shops, wholesalers, hotels</small></li>
              <li><a href="#sales">Record your first sale</a><small>Stock and payments update on their own</small></li>
            </ol>
          )}
        </div>
      )}
      <section className="hero" aria-label="Today">
        <div><div className="l">Profit today</div><div className="big"><CountUp text={inr(t.profit)} /></div><div className="s"><Delta now={t.profit} prev={y.profit} suffix="vs yesterday" /></div></div>
        <div className="hero-stats">
          <div><b>{kshort(t.revenue)}</b><small>Sales · {t.count} bills</small></div>
          <div><b>{kg(t.weight)}</b><small>Weight sold</small></div>
          <div><b>{kshort(t.cash + t.upi)}</b><small>Received</small></div>
        </div>
      </section>
      <div className="chips">
        <button type="button" className="chip dark" onClick={() => app.openAdd('sales')}><Icon n="plus" />Record sale</button>
        <a className="chip" href="#invoice"><Icon n="doc" />New invoice</a>
        <a className="chip" href="#labour"><Icon n="user" />Attendance</a>
        <a className="chip" href="#export"><Icon n="sheet" />Excel</a>
        <a className="chip" href="#deliveries"><Icon n="truck" />Deliveries</a>
      </div>
      <a className="teaser reveal" href="#reports"><span><small>Smart report</small><b>{monthName(ym(TODAY))}</b><small>{kshort(m.revenue)} sales · {kshort(m.profit)} profit · {m.revenue ? ((m.profit / m.revenue) * 100).toFixed(1) : 0}% margin</small></span><span className="arrow"><Icon n="chev" size={18} /></span></a>
      <div className="panel reveal"><h3>Needs attention <small>{A.length}</small></h3><AlertList items={A} max={4} />{A.length > 4 && <a href="#alerts" className="btn sm block" style={{ marginTop: 8 }}>See all {A.length}</a>}</div>
      <div className="kpis">
        <Kpi l="Credit outstanding" v={kshort(out)} s={`${openCredit(D).filter((c) => c.due < TODAY).length} overdue`} />
        <Kpi l="Sales this month" v={kshort(m.revenue)} s={<Delta now={m.revenue} prev={monthStats(D, ym(addMonths(TODAY, -1)), +TODAY.slice(8)).revenue} suffix="vs last month" />} />
      </div>
      <div className="panel reveal"><h3>Last 30 days <Legend /></h3><LineChart rows={last30} series={[{ k: 'rev', c: 'var(--ink)' }, { k: 'profit', c: 'var(--brown-2)' }]} /></div>
      <div className="panel reveal"><h3>This month so far</h3>
        <HBars items={money.map(([l, v]) => ({ l, v, c: l === 'Sales' ? undefined : 'var(--brown-2)' }))} fmt={kshort} />
        <div className="totline"><b>Net profit</b><b className={`num ${m.profit >= 0 ? 'up' : 'down'}`}>{inr(m.profit)}</b></div></div>
      <div className="panel reveal"><h3>Today on the floor</h3><div className="alist">
        <a className="aitem" href="#labour"><span className="dot good" /><span><b>{present} of {D.labour.length} workers present</b><small>Mark attendance</small></span><Icon n="chev" size={16} /></a>
        <a className="aitem" href="#deliveries"><span className="dot ink" /><span><b>{del.length} deliveries · {kg(sum(del, (d) => d.kgs))}</b><small>{del.filter((d) => d.status === 'Delivered').length} delivered</small></span><Icon n="chev" size={16} /></a>
        <a className="aitem" href="#inventory"><span className={`dot ${raw && +raw.stock <= +raw.reorder ? 'bad' : 'good'}`} /><span><b>{raw ? `${qtyU(raw.stock, raw.unit)} ${raw.name.toLowerCase()}` : 'No raw material added'}</b><small>Raw stock in godown</small></span><Icon n="chev" size={16} /></a>
        <a className="aitem" href="#electricity"><span className="dot warn" /><span><b>{t.units} kWh used</b><small>{inr(t.elec)} electricity today</small></span><Icon n="chev" size={16} /></a>
        <a className="aitem" href="#dues"><span className="dot bad" /><span><b>{kshort(sum(dues, (d) => d.emi * (d.count - d.paid)))} still owed</b><small>{dues.length} loans &amp; dues running</small></span><Icon n="chev" size={16} /></a>
      </div></div>
      <div className="panel reveal"><h3>Top products this month</h3><HBars items={topOf(sb).slice(0, 5).map(([l, v]) => ({ l, v }))} fmt={kshort} /></div>
      {D.biz.example && <p className="note"><span className="sample">Example data</span> These entries are examples. Clear them in <a href="#business">Settings</a> when you are ready.</p>}
    </div>
  );
}

export function Reports() {
  const st = useStore(); const D = st.DB;
  const months = [...Array(12)].map((_, i) => ym(addMonths(TODAY.slice(0, 7) + '-01', -i)));
  const [m, setM] = useState(months[0]);
  const cur = m === ym(TODAY), day = cur ? +TODAY.slice(8) : 0;
  const a = monthStats(D, m), pm = ym(addMonths(m + '-01', -1)), b = monthStats(D, pm, day || undefined);
  const margin = a.revenue ? (a.profit / a.revenue) * 100 : 0;
  const byP = {}, byC = {}, byE = {}, byW = {}, byPk = {};
  a.sales.forEach((s) => { byP[s.product] = (byP[s.product] || 0) + s.amount; byPk[s.product] = (byPk[s.product] || 0) + s.qty; byC[s.client] = (byC[s.client] || 0) + s.amount; const w = weekday(s.date, 'long'); byW[w] = (byW[w] || 0) + s.amount; });
  a.allExp.forEach((e) => (byE[e.category] = (byE[e.category] || 0) + e.amount)); if (a.elec) byE.Electricity = a.elec; if (a.wages) byE.Wages = a.wages;
  const [tp, tc, te, tw] = [topOf(byP)[0], topOf(byC)[0], topOf(byE)[0], topOf(byW)[0]];
  const cmp = cur ? `same ${day} days of ${monthName(pm).split(' ')[0]}` : monthName(pm).split(' ')[0];
  const newC = D.clients.filter((c) => ym(c.since) === m).length;
  const ins = a.revenue ? [
    <>Sales are <b>{inr(a.revenue)}</b>{b.revenue ? <>, {pct(a.revenue, b.revenue) >= 0 ? 'up' : 'down'} <b>{Math.abs(pct(a.revenue, b.revenue)).toFixed(0)}%</b> on the {cmp}</> : null}.</>,
    <>Net profit is <b>{inr(a.profit)}</b> at a <b>{margin.toFixed(1)}%</b> margin{b.revenue ? `, against ${((b.profit / b.revenue) * 100).toFixed(1)}% before` : ''}.</>,
    tp && <><b>{tp[0]}</b> is your best seller with {inr(tp[1])} ({((tp[1] / a.revenue) * 100).toFixed(0)}% of sales, {kg(byPk[tp[0]])}).</>,
    tc && <><b>{tc[0]}</b> bought the most: {inr(tc[1])}.</>,
    te && <>Your biggest cost after goods is <b>{te[0]}</b> at {inr(te[1])}.</>,
    a.weight && a.units ? <>The unit used <b>{(a.units / a.weight).toFixed(2)} kWh per kg</b> sold.</> : null,
    tw && <><b>{tw[0]}</b> is your strongest sales day.</>,
    a.other ? <>Other income added <b>{inr(a.other)}</b>.</> : null,
    newC ? <>You added <b>{newC} new client{newC > 1 ? 's' : ''}</b>.</> : null,
    <>{a.credit ? `${inr(a.credit)} of sales went on credit (${((a.credit / a.revenue) * 100).toFixed(0)}%). ` : ''}Cash {kshort(a.cash)} · UPI {kshort(a.upi)} collected.</>,
  ].filter(Boolean) : ['No sales recorded in this month yet.'];
  const pl = [['Sales', a.revenue], ['Other income', a.other], ['Cost of goods sold', -a.cogs], ['Daily expenses', -a.expenses], ['Rent, licences & fixed', -a.overhead], ['Wages', -a.wages], ['Electricity', -a.elec]];
  const R = [m + '-01', cur ? TODAY : addDays(addMonths(m + '-01', 1), -1)];
  return (
    <div className="page">
      <Header eyebrow="Smart report" title={<>{monthName(m).split(' ')[0]} <em>{m.slice(0, 4)}</em></>} desc="Your month, written out in plain words." />
      <div className="trow">
        <div className="fld inline" style={{ flex: 1 }}><label htmlFor="repMonth" className="muted">Month</label><select id="repMonth" value={m} onChange={(e) => setM(e.target.value)}>{months.map((x) => <option key={x} value={x}>{monthName(x)}</option>)}</select></div>
        {canDownload(st) && <XlBtn onClick={() => downloadReport(D, 'all', R, CFG)} label="Excel" />}
      </div>
      <div className="kpis">
        <Kpi hero l="Sales" v={kshort(a.revenue)} s={<Delta now={a.revenue} prev={b.revenue} suffix={'vs ' + (cur ? 'same days last month' : 'previous month')} />} />
        <Kpi l="Net profit" v={kshort(a.profit)} s={<Delta now={a.profit} prev={b.profit} />} /><Kpi l="Margin" v={margin.toFixed(1) + '%'} />
        <Kpi l="Weight sold" v={kg(a.weight)} s={<Delta now={a.weight} prev={b.weight} />} /><Kpi l="Electricity" v={a.units.toLocaleString('en-IN') + ' kWh'} s={inr(a.elec)} />
      </div>
      <div className="panel reveal"><h3>What the numbers say</h3><ol className="ins">{ins.map((i, k) => <li key={k}>{i}</li>)}</ol></div>
      <div className="panel reveal"><h3>Day by day <Legend /></h3><LineChart rows={a.days.map((d) => ({ label: d.date, rev: d.revenue, profit: d.profit }))} series={[{ k: 'rev', c: 'var(--ink)' }, { k: 'profit', c: 'var(--brown-2)' }]} /></div>
      <div className="panel reveal"><h3>Profit &amp; loss</h3><table className="plain"><tbody>
        {pl.map(([l, v]) => <tr key={l}><td>{l}</td><td className="n">{inr(v)}</td></tr>)}
        <tr><td><b>Net profit</b></td><td className="n"><b className={a.profit >= 0 ? 'up' : 'down'}>{inr(a.profit)}</b></td></tr>
      </tbody></table></div>
      <div className="panel reveal"><h3>Sales by product</h3><HBars items={topOf(byP).map(([l, v]) => ({ l, v }))} fmt={kshort} /></div>
      <div className="panel reveal"><h3>Sales by client</h3><HBars items={topOf(byC).slice(0, 8).map(([l, v]) => ({ l, v }))} fmt={kshort} /></div>
      <div className="panel reveal"><h3>Where the money went</h3><HBars items={topOf(byE).slice(0, 8).map(([l, v]) => ({ l, v, c: 'var(--brown-2)' }))} fmt={kshort} /></div>
      <a className="teaser reveal" href="#export"><span><small>Excel</small><b>Download reports</b><small>Sales, stock, revenue or everything, for any period</small></span><span className="arrow"><Icon n="sheet" size={18} /></span></a>
    </div>
  );
}

export function Alerts() {
  const { DB: D } = useStore(); const app = useApp();
  const low = [...D.products.map((p) => ({ ...p, k: 'product', unit: 'kg' })), ...D.materials.map((m) => ({ ...m, k: 'material' }))]
    .filter((p) => +p.stock <= +p.reorder * 1.25).sort((a, b) => a.stock / (a.reorder || 1) - b.stock / (b.reorder || 1));
  const A = alerts(D);
  return (
    <div className="page">
      <Header eyebrow="Overview" title={<>Low stock &amp; <em>alerts</em></>} desc="What needs reordering, and everything else that needs action today." />
      <div className="kpis">
        <Kpi hero l="Below reorder level" v={low.filter((p) => +p.stock <= +p.reorder).length} s="products & materials" />
        <Kpi l="Close to reorder" v={low.filter((p) => +p.stock > +p.reorder).length} s="within 25%" /><Kpi l="Open alerts" v={A.length} />
      </div>
      {low.length ? (
        <div className="cards">{low.map((p) => {
          const r = p.stock / (p.reorder || 1); const sug = Math.max(0, Math.ceil((p.reorder * 2.5 - p.stock) / 10) * 10);
          return (
            <div className="card reveal" key={p.id}>
              <div className="t"><div><h4>{p.name}</h4><small>{p.k === 'product' ? 'Finished product' : 'Raw / packing material'}</small></div><span className={`pill ${r <= 1 ? 'bad' : 'warn'}`}>{r <= 1 ? 'Reorder now' : 'Low'}</span></div>
              <Meter q={r} />
              <div className="row"><span>{qtyU(p.stock, p.unit)} in stock · reorder at {qtyU(p.reorder, p.unit)}</span><span>Suggest {qtyU(sug, p.unit)}</span></div>
              <div className="cact">{p.k === 'material'
                ? <button type="button" className="btn sm pri" onClick={() => app.openForm('purchases', { sub: `Reorder ${p.name}`, vals: { date: TODAY, supplier: '', item: p.name, qty: sug, rate: p.cost, status: 'Pending' } })}>Create purchase</button>
                : <button type="button" className="btn sm pri" onClick={() => app.openAdd('packaging')}>Pack more</button>}</div>
            </div>
          );
        })}</div>
      ) : <div className="empty">Everything is well stocked.</div>}
      <div className="panel reveal"><h3>All alerts</h3><AlertList items={A} /></div>
    </div>
  );
}
