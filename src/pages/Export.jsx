import { useState } from 'react';
import { useStore, canDownload } from '../lib/store.js';
import { TODAY, fmtDY } from '../lib/format.js';
import { REPORTS, PERIODS, periodRange, downloadReport } from '../lib/excel.js';
import { CFG } from '../config/records.jsx';
import { Header, Seg, Icon } from '../components/ui.jsx';

export default function Export() {
  const st = useStore(); const D = st.DB;
  const [key, setKey] = useState('sales'); const [p, setP] = useState('month');
  const [from, setFrom] = useState(TODAY.slice(0, 8) + '01'); const [to, setTo] = useState(TODAY);
  const [busy, setBusy] = useState(false);
  const rep = REPORTS[key]; const R = rep.period ? periodRange(p, from, to, D) : [TODAY, TODAY];
  const n = rep.count(D, R);
  const go = async () => { setBusy(true); try { await downloadReport(D, key, R, CFG); } finally { setBusy(false); } };
  return (
    <div className="page">
      <Header eyebrow="Excel" title={<>Download <em>reports</em></>} desc="Choose what you need. The file opens in Excel, Google Sheets or Numbers, with real numbers you can sort, filter and add up." />
      <div className="radio-cards" role="radiogroup" aria-label="Report">
        {Object.entries(REPORTS).map(([k, r]) => (
          <button key={k} type="button" role="radio" aria-checked={k === key} className={`rc ${k === key ? 'on' : ''}`} onClick={() => setKey(k)}>
            <span className="ic"><Icon n={r.icon} /></span><span><b>{r.label}</b><small>{r.desc}</small></span><span className="tick" />
          </button>
        ))}
      </div>
      {rep.period ? (
        <div className="panel">
          <h3>Period</h3>
          <Seg options={PERIODS} value={p} onChange={setP} />
          {p === 'custom' && (
            <div className="two" style={{ marginTop: 12 }}>
              <div className="fld"><label htmlFor="xFrom">From</label><input id="xFrom" type="date" value={from} max={TODAY} onChange={(e) => setFrom(e.target.value)} /></div>
              <div className="fld"><label htmlFor="xTo">To</label><input id="xTo" type="date" value={to} max={TODAY} onChange={(e) => setTo(e.target.value)} /></div>
            </div>
          )}
          <p className="hint" style={{ marginTop: 12 }}>{fmtDY(R[0])} to {fmtDY(R[1])} · {n.toLocaleString('en-IN')} {rep.unit}</p>
        </div>
      ) : <p className="hint">Stock is a snapshot of today, {fmtDY(TODAY)} · {n} items.</p>}
      {canDownload(st)
        ? <button type="button" className="xl" style={{ justifyContent: 'center', padding: '15px', fontSize: 15, borderRadius: 16 }} onClick={go} disabled={busy}><Icon n="sheet" />{busy ? 'Preparing…' : `Download ${rep.label} (.xlsx)`}</button>
        : <p className="hint">Downloads aren’t available in this view.</p>}
      <div className="panel">
        <h3>What’s inside</h3>
        <div className="dl">
          {(key === 'sales' ? [['Sales', 'Every bill'], ['Sales by product', 'Bills, kg and revenue per product'], ['Sales by client', 'Revenue and balance due per client']]
            : key === 'stock' ? [['Stock - products', 'kg on hand, reorder level, value, days of cover'], ['Stock - raw & packing', 'Raw garlic, pouches, jars and their value'], ['Batches & expiry', 'Every batch still in stock, soonest expiry first']]
              : key === 'revenue' ? [['Summary', 'Profit & loss for the period'], ['Revenue by day', 'Sales, cash, UPI, credit, each cost and profit'], ['Revenue by month', 'The same, month by month, with margin']]
                : [['Summary, revenue, sales', '6 sheets'], ['Stock & batches', '3 sheets'], ['Purchases, expenses, payments, credit', '4 sheets'], ['Electricity, salary, deliveries', '3 sheets'], ['Attendance & clients', '2 sheets']]
          ).map(([a, b]) => <div key={a}><b style={{ textAlign: 'left' }}>{a}</b><span className="muted" style={{ textAlign: 'right' }}>{b}</span></div>)}
        </div>
      </div>
    </div>
  );
}
