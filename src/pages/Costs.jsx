import { useState } from 'react';
import { useStore, mutate, toast } from '../lib/store.js';
import { TODAY, addDays, addMonths, diffDays, ym, range, sum, inr, kshort, fmtD, monthName, monthShort } from '../lib/format.js';
import { ops } from '../config/records.jsx';
import { Header, Kpi, Delta, RecordList, Seg, Pill, HBars, ColChart, AddBtn, RowButtons, sumInr } from '../components/ui.jsx';
import { LI } from '../config/listItems.jsx';

const expCols = [['date', 'Date', 'date'], ['category', 'Category'], ['note', 'Note'], ['type', 'Type', (r) => <Pill k={r.type === 'Yearly' ? 'ink' : r.type === 'Monthly' ? 'brown' : ''}>{r.type}</Pill>], ['amount', 'Amount', 'inr']];
const ExpTable = ({ rows }) => <RecordList kind="expenses" cols={expCols} item={LI.expenses} group="date" groupSum={sumInr('amount')} rows={[...rows].sort((a, b) => b.date.localeCompare(a.date))} />;
const byCat = (rows) => { const by = {}; rows.forEach((e) => (by[e.category] = (by[e.category] || 0) + e.amount)); return Object.entries(by).map(([l, v]) => ({ l, v })).sort((a, b) => b.v - a.v); };

export function Expenses() {
  const { DB: D } = useStore();
  const [seg, setSeg] = useState('Daily'); const [day, setDay] = useState(TODAY);
  let kpis, body;
  if (seg === 'Daily') {
    const rows = D.expenses.filter((e) => e.date === day);
    const last = range(addDays(TODAY, -29), TODAY).map((x) => ({ l: x, v: sum(D.expenses.filter((e) => e.date === x), (e) => e.amount) }));
    kpis = [<Kpi key="1" hero l={day === TODAY ? 'Spent today' : 'Spent on ' + fmtD(day)} v={inr(sum(rows, (e) => e.amount))} s={`${rows.length} entries`} />,
      <Kpi key="2" l="Yesterday" v={inr(sum(D.expenses.filter((e) => e.date === addDays(TODAY, -1)), (e) => e.amount))} />, <Kpi key="3" l="30-day daily average" v={inr(sum(last, (x) => x.v) / 30)} />];
    body = <>
      <div className="panel reveal"><h3>Spend per day, last 30 days <small>selected day in black</small></h3><ColChart rows={last} xfmt={(x) => x.slice(8)} hi={last.findIndex((x) => x.l === day)} /></div>
      <div className="trow"><div className="fld inline" style={{ flex: 1 }}><label htmlFor="expDay">Show date</label><input id="expDay" type="date" value={day} max={TODAY} onChange={(e) => setDay(e.target.value || TODAY)} /></div></div>
      <ExpTable rows={rows} />
    </>;
  } else if (seg === 'Monthly') {
    const m = ym(TODAY); const rows = D.expenses.filter((e) => ym(e.date) === m); const pm = D.expenses.filter((e) => ym(e.date) === ym(addMonths(TODAY, -1)));
    kpis = [<Kpi key="1" hero l="This month" v={inr(sum(rows, (e) => e.amount))} s={<Delta now={sum(rows, (e) => e.amount)} prev={sum(pm, (e) => e.amount)} suffix="vs last month" />} />,
      <Kpi key="2" l="Fixed (rent, bills, EMI)" v={inr(sum(rows.filter((e) => e.type === 'Monthly'), (e) => e.amount))} />, <Kpi key="3" l="Day-to-day" v={inr(sum(rows.filter((e) => e.type === 'Daily'), (e) => e.amount))} />];
    body = <><div className="panel reveal"><h3>By category · {monthName(m)}</h3><HBars items={byCat(rows)} /></div><ExpTable rows={rows} /></>;
  } else {
    const months = []; for (let i = 11; i >= 0; i--) months.push(ym(addMonths(TODAY.slice(0, 7) + '-01', -i)));
    const mv = months.map((m) => ({ l: m, v: sum(D.expenses.filter((e) => ym(e.date) === m), (e) => e.amount) }));
    const rows = D.expenses.filter((e) => diffDays(TODAY, e.date) < 365);
    kpis = [<Kpi key="1" hero l="Last 12 months" v={kshort(sum(rows, (e) => e.amount))} />, <Kpi key="2" l="Monthly average" v={kshort(sum(rows, (e) => e.amount) / 12)} />,
      <Kpi key="3" l="Yearly payments" v={inr(sum(rows.filter((e) => e.type === 'Yearly'), (e) => e.amount))} s="licences, insurance, AMC" />];
    body = <>
      <div className="grid"><div className="panel reveal"><h3>Month by month</h3><ColChart rows={mv} xfmt={monthShort} hi={11} /></div><div className="panel reveal"><h3>By category, 12 months</h3><HBars items={byCat(rows)} fmt={kshort} /></div></div>
      <h2 className="h2">Yearly and monthly bills</h2><ExpTable rows={rows.filter((e) => e.type !== 'Daily')} />
    </>;
  }
  return (
    <div className="page">
      <Header eyebrow="Costs" title="Expenses" desc="Daily spending, monthly bills and once-a-year payments in one place."><AddBtn kind="expenses" label="Expense" /></Header>
      <Seg options={['Daily', 'Monthly', 'Yearly']} value={seg} onChange={setSeg} />
      <div className="kpis">{kpis}</div>{body}
    </div>
  );
}

export function Dues() {
  const { DB: D } = useStore();
  const left = (x) => x.emi * (x.count - x.paid);
  const nx = D.dues.filter((x) => +x.paid < +x.count).sort((a, b) => a.next.localeCompare(b.next))[0];
  const payEmi = (id) => {
    let msg;
    mutate((DB) => {
      const d = DB.dues.find((x) => String(x.id) === String(id)); if (!d) return;
      d.paid = +d.paid + 1; d.next = addMonths(d.next, 1);
      ops.addRow(DB, 'expenses', { date: TODAY, type: 'Monthly', category: 'Loan EMI', note: d.purpose, amount: +d.emi });
      msg = `${d.purpose}: ${d.count - d.paid} left`;
    });
    if (msg) toast(msg);
  };
  return (
    <div className="page">
      <Header eyebrow="Costs" title={<>My dues &amp; <em>EMI</em></>} desc="Loans, EMIs and supplier money you still owe, and how many instalments are left. Paying an EMI also records it as an expense."><AddBtn kind="dues" label="Loan or due" /></Header>
      <div className="kpis">
        <Kpi hero l="Total still owed" v={inr(sum(D.dues, left))} />
        <Kpi l="Due this month" v={inr(sum(D.dues.filter((x) => +x.paid < +x.count && ym(x.next) === ym(TODAY)), (x) => x.emi))} />
        <Kpi l="Next due" v={nx ? fmtD(nx.next) : '—'} s={nx ? nx.purpose : ''} />
      </div>
      {D.dues.length ? (
        <div className="cards">{D.dues.map((x) => {
          const done = +x.paid >= +x.count, dd = diffDays(x.next, TODAY);
          return (
            <div className="card reveal" key={x.id}>
              <div className="t"><div><h4>{x.purpose}</h4><small>{x.lender}</small></div>
                {done ? <Pill k="good">Closed</Pill> : dd < 0 ? <Pill k="bad">Overdue</Pill> : dd <= 7 ? <Pill k="warn">Due in {dd}d</Pill> : <Pill>{fmtD(x.next)}</Pill>}</div>
              <div><div className="big num">{inr(left(x))}</div><small>left of {inr(x.total)}</small></div>
              <div className="meter"><i className="good" style={{ width: `${((x.paid / x.count) * 100).toFixed(0)}%` }} /></div>
              <div className="row"><span>{x.count > 1 ? `${x.paid} of ${x.count} EMIs paid · ${x.count - x.paid} left` : 'One-time payment'}</span><span className="num">{inr(x.emi)}{x.count > 1 ? '/mo' : ''}</span></div>
              <div className="cact">{!done && <button type="button" className="btn sm pri" onClick={() => payEmi(x.id)}>{x.count > 1 ? 'Mark EMI paid' : 'Mark paid'}</button>}<RowButtons id={x.id} kind="dues" /></div>
            </div>
          );
        })}</div>
      ) : <div className="tw"><div className="empty">No loans or dues added. Use the button above to add one.</div></div>}
    </div>
  );
}
