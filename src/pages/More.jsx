import { useStore } from '../lib/store.js';
import { TODAY, ym, sum, kshort, kg, inr } from '../lib/format.js';
import { alerts, openCredit, dayStats, monthStats } from '../lib/model.js';
import { NAV } from '../config/nav.js';
import { Icon, Logo } from '../components/ui.jsx';

/** A short live figure under each tile. */
const METRIC = {
  dashboard: (D) => kshort(dayStats(D, TODAY).profit) + ' today',
  reports: (D) => kshort(monthStats(D, ym(TODAY)).revenue) + ' month',
  alerts: (D) => alerts(D).length + ' open',
  sales: (D) => kg(dayStats(D, TODAY).weight) + ' today',
  income: (D) => { const t = dayStats(D, TODAY); return kshort(t.cash + t.upi) + ' today'; },
  payments: (D) => D.payments.filter((p) => p.date === TODAY).length + ' today',
  credit: (D) => kshort(sum(openCredit(D), (c) => c.amount)) + ' due',
  invoice: (D) => D.invoices.length + ' saved',
  profit: (D) => kshort(dayStats(D, TODAY).profit),
  products: (D) => D.products.length + ' items',
  inventory: (D) => kg(sum(D.products, (p) => p.stock)),
  purchases: (D) => D.purchases.filter((p) => p.status === 'Pending').length + ' pending',
  batches: (D) => D.batches.filter((b) => +b.qty > 0).length + ' active',
  packaging: (D) => sum(D.packaging.filter((p) => p.date === TODAY), (p) => p.packs) + ' packs today',
  clients: (D) => D.clients.length + ' clients',
  leads: (D) => D.leads.filter((l) => !['Won', 'Lost'].includes(l.stage)).length + ' open',
  followups: (D) => D.followups.filter((f) => f.status === 'Pending' && f.date <= TODAY).length + ' due',
  recurring: (D) => D.recurring.filter((o) => o.active === 'Active').length + ' active',
  deliveries: (D) => D.deliveries.filter((d) => d.date === TODAY).length + ' today',
  expenses: (D) => inr(sum(D.expenses.filter((e) => e.date === TODAY), (e) => e.amount)) + ' today',
  electricity: (D) => ((D.electricity.find((e) => e.date === TODAY) || {}).units || 0) + ' kWh today',
  dues: (D) => kshort(sum(D.dues, (d) => d.emi * (d.count - d.paid))) + ' left',
  labour: (D) => { const a = D.attendance[TODAY] || {}; return D.labour.filter((l) => a[l.id] === 'P' || a[l.id] === 'H').length + '/' + D.labour.length + ' in'; },
  salary: (D) => kshort(sum(D.salaries.filter((s) => ym(s.date) === ym(TODAY)), (s) => s.amount)) + ' month',
};

export default function More() {
  const st = useStore(); const D = st.DB; const nA = alerts(D).length;
  const sync = st.mode === 'cloud' ? (st.pending ? 'Saving…' : 'Synced to all your devices') : st.mode === 'local' ? 'Saved on this device only' : st.mode === 'error' ? 'Sync stopped · reload' : 'Connecting…';
  return (
    <div className="page">
      <header className="ph"><div className="eyebrow">Everything</div><h1>All <em>features</em></h1></header>
      <a className="biz-card" href="#business">
        <span className="mk"><Logo size={30} stroke="#F3EEE5" /></span>
        <span style={{ minWidth: 0 }}><b>{D.biz.name}</b><small><span className={`dot ${st.mode === 'cloud' ? 'good' : st.mode === 'error' ? 'bad' : 'warn'}`} />{sync}</small></span>
        <Icon n="cog" size={20} />
      </a>
      <a className="teaser reveal" href="#export"><span><small>Excel</small><b>Download reports</b><small>Stock, sales, revenue or everything</small></span><span className="arrow" style={{ background: '#1D6F42' }}><Icon n="sheet" size={18} /></span></a>
      {NAV.map(([g, items]) => (
        <section key={g} className="stack">
          <div className="grp-t">{g}</div>
          <div className="tiles">
            {items.map(([id, l, i]) => (
              <a key={id} className="tile reveal" href={`#${id}`}>
                {id === 'alerts' && nA > 0 && <span className="bdg">{nA}</span>}
                <span className="ti"><Icon n={i} /></span><b>{l}</b><small>{METRIC[id] ? METRIC[id](D) : ''}</small>
              </a>
            ))}
          </div>
        </section>
      ))}
      <p className="note" style={{ justifyContent: 'center' }}>Garlici · {new Date(TODAY + 'T00:00').getFullYear()}</p>
    </div>
  );
}
