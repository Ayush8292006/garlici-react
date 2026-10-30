import { useStore, mutate } from '../lib/store.js';
import { TODAY, addDays, diffDays, range, sum, inr, fmtD, fmtDY } from '../lib/format.js';
import { Header, Kpi, Pill, AddBtn, RowButtons } from '../components/ui.jsx';

const MARKS = [['P', 'P', 'present'], ['H', '½', 'half day'], ['A', 'A', 'absent']];
const tenure = (days) => { const m = Math.floor(days / 30.4); return m >= 12 ? `${Math.floor(m / 12)} yr ${m % 12} mo` : m >= 1 ? `${m} mo` : `${days} days`; };

export default function Labour() {
  const { DB: D } = useStore();
  const att = D.attendance[TODAY] || {}; const days = range(addDays(TODAY, -29), TODAY);
  const cnt = (k) => D.labour.filter((l) => att[l.id] === k).length;
  const mark = (id, v) => mutate((DB) => { const day = (DB.attendance[TODAY] = DB.attendance[TODAY] || {}); if (day[id] === v) delete day[id]; else day[id] = v; });
  return (
    <div className="page">
      <Header eyebrow="Team" title={<>Labour &amp; <em>attendance</em></>} desc="Who joined when, who came in today, and the last 30 days at a glance."><AddBtn kind="labour" label="Add worker" /></Header>
      <div className="kpis">
        <Kpi hero l="Present today" v={`${cnt('P') + cnt('H')} / ${D.labour.length}`} s={`${cnt('H')} half day`} />
        <Kpi l="Absent today" v={cnt('A')} /><Kpi l="Not marked" v={D.labour.length - cnt('P') - cnt('H') - cnt('A')} />
        <Kpi l="Wage bill today" v={inr(sum(D.labour, (l) => (att[l.id] === 'P' ? l.wage : att[l.id] === 'H' ? l.wage / 2 : 0)))} />
      </div>
      <div className="panel reveal">
        <h3>Attendance · {fmtDY(TODAY)} <small>P present · ½ half day · A absent</small></h3>
        {D.labour.length ? (
          <div className="roster">{D.labour.map((l) => {
            const t = diffDays(TODAY, l.joined); const present = days.filter((d) => (D.attendance[d] || {})[l.id] === 'P').length;
            return (
              <div className="rrow" key={l.id}>
                <div style={{ minWidth: 0 }}>
                  <b>{l.name} {t < 45 && <Pill k="brown">New joiner</Pill>}</b>
                  <small>{l.role} · joined {fmtDY(l.joined)} ({tenure(t)}) · {inr(l.wage)}/day · {present} days present in last 30</small>
                  <div className="heat" aria-label="Last 30 days">{days.map((d) => { const a = (D.attendance[d] || {})[l.id] || ''; return <i key={d} className={a} title={`${fmtD(d)}: ${a || '—'}`} />; })}</div>
                </div>
                <div className="rr-act">
                  <div className="seg att">{MARKS.map(([k, lb, word]) => <button key={k} type="button" className={att[l.id] === k ? `on ${k}` : ''} aria-label={`${l.name} ${word}`} onClick={() => mark(l.id, k)}>{lb}</button>)}</div>
                  <div><RowButtons id={l.id} kind="labour" /></div>
                </div>
              </div>
            );
          })}</div>
        ) : <div className="empty">No workers added yet. Use “Add worker” above.</div>}
      </div>
    </div>
  );
}
