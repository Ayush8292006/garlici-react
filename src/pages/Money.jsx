import { useStore } from '../lib/store.js';
import { TODAY, addDays, range, sum, inr, kshort, kg, fmtD } from '../lib/format.js';
import { dayStats, overheadPerDay } from '../lib/model.js';
import { LI } from '../config/listItems.jsx';
import { Header, Kpi, Delta, LineChart, RecordList, AddBtn, ModePill, dayLabel, useApp } from '../components/ui.jsx';

/** One row per day; tapping opens the day's breakdown. */
function DayList({ days, value, sub, tag }) {
  const app = useApp();
  const open = (d) => app.openDetail({
    title: dayLabel(d.date), sub: fmtD(d.date),
    rows: [['Sales', inr(d.revenue)], ['Other income', inr(d.other)], ['Cash in', inr(d.cash)], ['UPI & bank in', inr(d.upi)], ['Sold on credit', inr(d.credit)], ['Goods cost', inr(d.cogs)], ['Expenses', inr(d.expenses)], ['Wages', inr(d.wages)], ['Electricity', inr(d.elec)], ['Fixed costs share', inr(d.overhead)], ['Profit', <b className={d.profit >= 0 ? 'up' : 'down'}>{inr(d.profit)}</b>], ['Weight sold', kg(d.weight)], ['Bills', d.count]],
  });
  return (
    <div className="list reveal">{days.map((d) => (
      <button type="button" className="li" key={d.date} onClick={() => open(d)}>
        <span className="av">{d.date.slice(8)}</span>
        <span style={{ minWidth: 0 }}><span className="t" style={{ display: 'block' }}>{dayLabel(d.date)}</span><span className="s" style={{ display: 'block' }}>{sub(d)}</span></span>
        <span className="r"><span className="v">{value(d)}</span>{tag && tag(d)}</span>
      </button>
    ))}</div>
  );
}

export function Income() {
  const { DB: D } = useStore(); const oh = overheadPerDay(D);
  const days = range(addDays(TODAY, -29), TODAY).reverse().map((d) => dayStats(D, d, oh)); const t = days[0];
  const oi = [...D.income].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <div className="page">
      <Header eyebrow="Sales & Money" title={<>Daily <em>income</em></>} desc="Money that actually came in each day, by cash and UPI."><AddBtn kind="income" label="Other income" /></Header>
      <div className="kpis">
        <Kpi hero l="Income today" v={inr(t.cash + t.upi)} s={t.other ? `incl. ${inr(t.other)} other income` : `Cash ${kshort(t.cash)} · UPI ${kshort(t.upi)}`} />
        <Kpi l="Cash today" v={inr(t.cash)} /><Kpi l="UPI & bank today" v={inr(t.upi)} />
        <Kpi l="30-day average" v={inr(sum(days, (d) => d.cash + d.upi) / 30)} s="per day" /><Kpi l="Last 30 days" v={kshort(sum(days, (d) => d.cash + d.upi))} />
      </div>
      <div className="panel reveal">
        <h3>Cash vs UPI <span className="legend"><span><i style={{ background: 'var(--ink)' }} />UPI</span><span><i style={{ background: 'var(--brown-2)' }} />Cash</span></span></h3>
        <LineChart h={170} rows={[...days].reverse().map((d) => ({ label: d.date, upi: d.upi, cash: d.cash }))} series={[{ k: 'upi', c: 'var(--ink)' }, { k: 'cash', c: 'var(--brown-2)' }]} />
      </div>
      <h2 className="h2">Day by day</h2>
      <DayList days={days} value={(d) => inr(d.cash + d.upi)} sub={(d) => `Cash ${kshort(d.cash)} · UPI ${kshort(d.upi)}${d.credit ? ` · credit ${kshort(d.credit)}` : ''}`} />
      <h2 className="h2">Other income</h2>
      <RecordList rows={oi} kind="income" item={LI.income} group="date" cols={[['date', 'Date', 'date'], ['source', 'Source'], ['from', 'From'], ['mode', 'Mode', (r) => <ModePill m={r.mode} />], ['amount', 'Amount', 'inr']]} />
    </div>
  );
}

export function Profit() {
  const { DB: D } = useStore(); const oh = overheadPerDay(D);
  const days = range(addDays(TODAY, -29), TODAY).map((d) => dayStats(D, d, oh)); const t = days[days.length - 1], w = days.slice(-7), pw = days.slice(-14, -7);
  const best = [...days].sort((a, b) => b.profit - a.profit)[0];
  return (
    <div className="page">
      <Header eyebrow="Sales & Money" title={<>Profit <em>every day</em></>} desc="Sales and other income, minus goods, expenses, wages, electricity and a share of fixed costs. Tap a day for the breakdown." />
      <div className="kpis">
        <Kpi hero l="Profit today" v={inr(t.profit)} s={t.revenue ? `${((t.profit / t.revenue) * 100).toFixed(1)}% margin` : 'No sales yet today'} />
        <Kpi l="Last 7 days" v={kshort(sum(w, (d) => d.profit))} s={<Delta now={sum(w, (d) => d.profit)} prev={sum(pw, (d) => d.profit)} suffix="vs week before" />} />
        <Kpi l="Last 30 days" v={kshort(sum(days, (d) => d.profit))} /><Kpi l="Best day" v={kshort(best.profit)} s={fmtD(best.date)} />
      </div>
      <div className="panel reveal"><h3>Daily profit, last 30 days</h3><LineChart rows={days.map((d) => ({ label: d.date, p: d.profit }))} series={[{ k: 'p', c: 'var(--ink)' }]} /></div>
      <DayList days={[...days].reverse()} value={(d) => <span className={d.profit >= 0 ? 'up' : 'down'}>{inr(d.profit)}</span>} sub={(d) => `Sales ${kshort(d.revenue)} · costs ${kshort(d.cogs + d.expenses + d.wages + d.elec + d.overhead)}`} />
    </div>
  );
}
