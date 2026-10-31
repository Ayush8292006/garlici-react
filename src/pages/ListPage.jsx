import { useState } from 'react';
import { CFG } from '../config/records.jsx';
import { LI } from '../config/listItems.jsx';
import { useStore, mutate, toast, canDownload } from '../lib/store.js';
import { findRow, DATED } from '../lib/model.js';
import { downloadList } from '../lib/excel.js';
import { Header, AddBtn, RecordList, Seg, Search, XlBtn, sumInr, sumKg } from '../components/ui.jsx';

export function filterRows(c, D, seg, q) {
  let rows = D[c.key];
  if (c.seg) rows = rows.filter((r) => c.segFilter(r, seg));
  q = (q || '').toLowerCase();
  if (q) rows = rows.filter((r) => Object.values(r).join(' ').toLowerCase().includes(q));
  const sk = c.sort || 'date';
  const asc = c.asc || sk === 'name';
  // Newest entry first within the same date.
  return (asc ? [...rows] : [...rows].reverse()).sort((a, b) => String(a[sk] ?? '').localeCompare(String(b[sk] ?? '')) * (asc ? 1 : -1));
}
/** Run a row action (e.g. "Mark settled") against the live record and show its message. */
export function runAction(c, a, r) {
  let msg;
  mutate((D) => { const f = findRow(D, r.id); if (f) msg = c.act[a](D, D[f[0]][f[1]]); });
  if (msg) toast(msg);
}
const GROUP_SUM = { sales: sumInr('amount'), payments: sumInr('amount'), credits: sumInr('amount'), purchases: sumInr('amount'), salaries: sumInr('amount'), deliveries: sumKg('kgs'), electricity: sumInr('cost') };

export default function ListPage({ id }) {
  const st = useStore(); const D = st.DB; const c = CFG[id];
  const [q, setQ] = useState(''); const [seg, setSeg] = useState(c.seg ? c.seg[0] : null);
  const rows = filterRows(c, D, seg, q);
  const grouped = DATED.has(c.key) && (c.sort || 'date') === 'date';
  return (
    <div className="page">
      <Header eyebrow={c.eyebrow} title={c.title} desc={c.desc}><AddBtn kind={c.key} /></Header>
      <div className="kpis">{c.kpis ? c.kpis(D) : null}</div>
      {c.top ? c.top(D) : null}
      <div className="toolbar">
        <Search value={q} onChange={setQ} placeholder={`Search ${c.name.toLowerCase()}…`} />
        <div className="trow">
          {c.seg ? <Seg options={c.seg} value={seg} onChange={setSeg} /> : <span className="count" style={{ flex: 1 }}>{rows.length} records</span>}
          {canDownload(st) && <XlBtn onClick={() => downloadList(D, c, rows, id)} />}
        </div>
      </div>
      <RecordList rows={rows} cols={c.cols} item={LI[c.key]} actions={c.actions} onAction={(a, r) => runAction(c, a, r)} kind={c.key} group={grouped ? 'date' : null} groupSum={GROUP_SUM[c.key]} />
    </div>
  );
}
