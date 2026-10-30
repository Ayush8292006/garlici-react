import { useState } from 'react';
import { CFG } from '../config/records.jsx';
import { useStore, mutate, toast, saveFile, canDownload } from '../lib/store.js';
import { findRow } from '../lib/model.js';
import { TODAY } from '../lib/format.js';
import { Header, AddBtn, Table, Seg, Search, Icon, cell, nodeText } from '../components/ui.jsx';

export function filterRows(c, D, seg, q) {
  let rows = D[c.key];
  if (c.seg) rows = rows.filter((r) => c.segFilter(r, seg));
  q = (q || '').toLowerCase();
  if (q) rows = rows.filter((r) => Object.values(r).join(' ').toLowerCase().includes(q));
  const sk = c.sort || 'date';
  return [...rows].sort((a, b) => String(a[sk] ?? '').localeCompare(String(b[sk] ?? '')) * (c.asc || sk === 'name' ? 1 : -1));
}
export function toCSV(cols, rows) {
  const q = (s) => { s = String(s).replace(/\s+/g, ' ').trim(); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return [cols.map((c) => q(c[1])).join(','), ...rows.map((r) => cols.map((c) => q(['inr', 'kg', 'n', 'date'].includes(c[2]) ? r[c[0]] ?? '' : nodeText(cell(r, c)))).join(','))].join('\n');
}
/** Run a row action (e.g. "Mark settled") against the live record and show its message. */
export function runAction(c, a, r) {
  let msg;
  mutate((D) => { const f = findRow(D, r.id); if (f) msg = c.act[a](D, D[f[0]][f[1]]); });
  if (msg) toast(msg);
}

export default function ListPage({ id }) {
  const st = useStore(); const D = st.DB; const c = CFG[id];
  const [q, setQ] = useState(''); const [seg, setSeg] = useState(c.seg ? c.seg[0] : null);
  const rows = filterRows(c, D, seg, q);
  return (
    <div className="page">
      <Header eyebrow={c.eyebrow} title={c.title} desc={c.desc}><AddBtn kind={c.key} /></Header>
      <div className="kpis">{c.kpis ? c.kpis(D) : null}</div>
      {c.top ? c.top(D) : null}
      <div className="toolbar">
        <Search value={q} onChange={setQ} placeholder={`Search ${c.name.toLowerCase()} entries…`} />
        {c.seg && <Seg options={c.seg} value={seg} onChange={setSeg} />}
        <span className="more">{rows.length} records</span>
        {canDownload(st) && <span style={{ marginLeft: 'auto' }}><button type="button" className="btn sm" onClick={() => saveFile(`garlici-${id}-${TODAY}.csv`, toCSV(c.cols, rows), 'text/csv', 'CSV saved')}><Icon n="down" />Export CSV</button></span>}
      </div>
      <Table rows={rows} cols={c.cols} actions={c.actions} onAction={(a, r) => runAction(c, a, r)} kind={c.key} />
    </div>
  );
}
