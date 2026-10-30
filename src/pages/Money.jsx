import { useStore } from '../lib/store.js';
import { TODAY, addDays, range, sum, inr, kshort, fmtD, weekday } from '../lib/format.js';
import { dayStats, overheadPerDay } from '../lib/model.js';
import { Header, Kpi, Delta, LineChart, Table, AddBtn, ModePill } from '../components/ui.jsx';

export function Income() {
  const { DB: D } = useStore(); const oh = overheadPerDay(D);
  const days = range(addDays(TODAY, -29), TODAY).reverse().map((d) => dayStats(D, d, oh)); const t = days[0];
  const oi = [...D.income].sort((a, b) => b.date.localeCompare(a.date));
  return (
    <div className="page">
      <Header eyebrow="Sales & Money" title={<>Daily <em>income</em></>} desc="Money that actually came in each day, split by cash and UPI, including income from outside sales."><AddBtn kind="income" label="Add other income" /></Header>
      <div className="kpis">
        <Kpi hero l="Income today" v={inr(t.cash + t.upi)} s={t.other ? `incl. ${inr(t.other)} other income` : ''} />
        <Kpi l="Cash" v={inr(t.cash)} /><Kpi l="UPI & bank" v={inr(t.upi)} /><Kpi l="30-day average" v={inr(sum(days, (d) => d.cash + d.upi) / 30)} s="per day" />
      </div>
      <div className="panel reveal" style={{ marginBottom: 16 }}>
        <h3>Cash vs UPI, last 30 days <span className="legend"><span><i style={{ background: 'var(--ink)' }} />UPI &amp; bank</span><span><i style={{ background: 'var(--brown-2)' }} />Cash</span></span></h3>
        <LineChart h={200} rows={[...days].reverse().map((d) => ({ label: d.date, upi: d.upi, cash: d.cash }))} series={[{ k: 'upi', c: 'var(--ink)' }, { k: 'cash', c: 'var(--brown-2)' }]} />
      </div>
      <div className="tw reveal" style={{ marginBottom: 24 }}><table>
        <thead><tr><th>Date</th><th className="n">Sales</th><th className="n">Cash in</th><th className="n">UPI in</th><th className="n">Other income</th><th className="n">Given on credit</th><th className="n">Total income</th></tr></thead>
        <tbody>{days.map((d) => (
          <tr key={d.date}><td>{fmtD(d.date)} <span className="muted">{weekday(d.date)}</span></td><td className="n">{inr(d.revenue)}</td><td className="n">{inr(d.cash)}</td><td className="n">{inr(d.upi)}</td>
            <td className="n">{d.other ? inr(d.other) : '—'}</td><td className="n">{d.credit ? inr(d.credit) : '—'}</td><td className="n"><b>{inr(d.cash + d.upi)}</b></td></tr>
        ))}</tbody>
      </table></div>
      <h2 className="h2">Other income</h2>
      <Table rows={oi} kind="income" cols={[['date', 'Date', 'date'], ['source', 'Source'], ['from', 'From'], ['mode', 'Mode', (r) => <ModePill m={r.mode} />], ['amount', 'Amount', 'inr']]} />
    </div>
  );
}

export function Profit() {
  const { DB: D } = useStore(); const oh = overheadPerDay(D);
  const days = range(addDays(TODAY, -29), TODAY).map((d) => dayStats(D, d, oh)); const t = days[days.length - 1], w = days.slice(-7), pw = days.slice(-14, -7);
  const best = [...days].sort((a, b) => b.profit - a.profit)[0];
  return (
    <div className="page">
      <Header eyebrow="Sales & Money" title={<>Profit <em>every day</em></>} desc="Sales and other income, minus cost of goods, expenses, wages, electricity and a daily share of rent and fixed costs." />
      <div className="kpis">
        <Kpi hero l="Profit today" v={inr(t.profit)} s={t.revenue ? `${((t.profit / t.revenue) * 100).toFixed(1)}% margin` : ''} />
        <Kpi l="Last 7 days" v={kshort(sum(w, (d) => d.profit))} s={<Delta now={sum(w, (d) => d.profit)} prev={sum(pw, (d) => d.profit)} suffix="vs week before" />} />
        <Kpi l="Last 30 days" v={kshort(sum(days, (d) => d.profit))} /><Kpi l="Best day" v={inr(best.profit)} s={fmtD(best.date)} />
      </div>
      <div className="panel reveal" style={{ marginBottom: 16 }}><h3>Daily profit, last 30 days</h3><LineChart rows={days.map((d) => ({ label: d.date, p: d.profit }))} series={[{ k: 'p', c: 'var(--ink)' }]} /></div>
      <div className="tw reveal"><table>
        <thead><tr><th>Date</th><th className="n">Sales</th><th className="n">Other income</th><th className="n">Goods cost</th><th className="n">Expenses</th><th className="n">Wages</th><th className="n">Electricity</th><th className="n">Fixed share</th><th className="n">Profit</th></tr></thead>
        <tbody>{[...days].reverse().map((d) => (
          <tr key={d.date}><td>{fmtD(d.date)}</td><td className="n">{inr(d.revenue)}</td><td className="n">{d.other ? inr(d.other) : '—'}</td><td className="n">{inr(d.cogs)}</td><td className="n">{inr(d.expenses)}</td>
            <td className="n">{inr(d.wages)}</td><td className="n">{inr(d.elec)}</td><td className="n">{inr(d.overhead)}</td><td className="n"><b className={d.profit >= 0 ? 'up' : 'down'}>{inr(d.profit)}</b></td></tr>
        ))}</tbody>
      </table></div>
    </div>
  );
}
