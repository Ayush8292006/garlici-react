import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useStore, mutate, toast, canWrite } from './lib/store.js';
import { findRow, alerts } from './lib/model.js';
import { fmtDY, TODAY, nid } from './lib/format.js';
import { CFG, REG, ops } from './config/records.jsx';
import { AppCtx, Icon, GarlicPaths } from './components/ui.jsx';
import Drawer from './components/Drawer.jsx';
import Lock, { isUnlocked } from './components/Lock.jsx';
import ListPage from './pages/ListPage.jsx';
import { Dashboard, Reports, Alerts } from './pages/Overview.jsx';
import { Income, Profit } from './pages/Money.jsx';
import { Inventory } from './pages/Stock.jsx';
import { Expenses, Dues } from './pages/Costs.jsx';
import Labour from './pages/Labour.jsx';
import Invoice from './pages/Invoice.jsx';
import Settings from './pages/Settings.jsx';

const NAV = [
  ['Overview', [['dashboard', 'Dashboard', 'home'], ['reports', 'Smart Reports', 'chart'], ['alerts', 'Low Stock & Alerts', 'bell']]],
  ['Sales & Money', [['sales', 'Sales', 'bag'], ['income', 'Daily Income', 'wallet'], ['payments', 'Payments Received', 'coin'], ['credit', 'Credit Given', 'clock'], ['invoice', 'Billing & Invoices', 'doc'], ['profit', 'Profit', 'trend']]],
  ['Stock', [['products', 'Products', 'box'], ['inventory', 'Inventory', 'layers'], ['purchases', 'Purchases', 'cart'], ['batches', 'Batch & Expiry', 'tag'], ['packaging', 'Packaging', 'package']]],
  ['Customers', [['clients', 'Clients', 'users'], ['leads', 'Leads', 'spark'], ['followups', 'Follow-ups', 'phone'], ['recurring', 'Recurring Orders', 'repeat'], ['deliveries', 'Daily Delivery', 'truck']]],
  ['Costs', [['expenses', 'Expenses', 'receipt'], ['electricity', 'Electricity', 'bolt'], ['dues', 'My Dues & EMI', 'bank']]],
  ['Team', [['labour', 'Labour & Attendance', 'user'], ['salary', 'Salary Paid', 'cash']]],
];
const PAGES = { dashboard: Dashboard, reports: Reports, alerts: Alerts, income: Income, profit: Profit, invoice: Invoice, inventory: Inventory, expenses: Expenses, dues: Dues, labour: Labour, settings: Settings };
const VALID = new Set([...Object.keys(PAGES), ...Object.keys(CFG)]);
const readHash = () => { const h = location.hash.slice(1); return VALID.has(h) ? h : 'dashboard'; };

function useHashPage() {
  const [page, setPage] = useState(readHash);
  useEffect(() => { const f = () => setPage(readHash()); addEventListener('hashchange', f); return () => removeEventListener('hashchange', f); }, []);
  return page;
}

function Splash() {
  const [phase, setPhase] = useState(() => (matchMedia('(prefers-reduced-motion: reduce)').matches ? 'gone' : 'in'));
  useEffect(() => {
    if (phase === 'in') { const t = setTimeout(() => setPhase('out'), 2300); return () => clearTimeout(t); }
    if (phase === 'out') { const t = setTimeout(() => setPhase('gone'), 950); return () => clearTimeout(t); }
  }, [phase]);
  if (phase === 'gone') return null;
  return (
    <div id="splash" className={phase === 'out' ? 'go' : ''} role="presentation" onClick={() => setPhase('out')}>
      <div className="sp-in">
        <svg className="sp-mark" viewBox="0 0 96 96" aria-hidden="true"><circle cx="48" cy="48" r="46" /><GarlicPaths className="bulb" /></svg>
        <div className="sp-word" aria-label="Garlici">{'GARLICI'.split('').map((c, i) => <span key={i} style={{ animationDelay: `${(0.45 + i * 0.07).toFixed(2)}s` }}>{c}</span>)}</div>
        <div className="sp-bar"><i /></div>
        <div className="sp-tag">Every rupee · every kilo · every day</div>
      </div>
    </div>
  );
}

function SyncStatus({ mode, pending }) {
  const [t, k] = mode === 'loading' ? ['Connecting…', 'warn'] : mode === 'local' ? ['Saved on this device only', 'warn'] : mode === 'error' ? ['Sync stopped · reload', 'bad'] : pending ? ['Saving…', 'warn'] : ['Synced to all your devices', 'good'];
  return <div className="sync" role="status"><span className={`dot ${k}`} />{t}</div>;
}

export default function App() {
  const st = useStore(); const D = st.DB;
  const page = useHashPage();
  const [form, setForm] = useState(null);
  const [navOpen, setNavOpen] = useState(false);
  const [, setUnlockTick] = useState(0);
  const lastToast = useRef('');
  if (st.toast) lastToast.current = st.toast.msg;

  useEffect(() => { window.scrollTo(0, 0); setNavOpen(false); }, [page]);
  useEffect(() => { document.body.classList.toggle('navopen', navOpen); }, [navOpen]);

  const close = useCallback(() => setForm(null), []);
  const open = (f) => { if (!canWrite()) return; setForm({ ...f, key: nid(), onError: toast }); };
  const app = useMemo(() => {
    const done = (fn, msg) => (r) => { if (mutate((DB) => fn(DB, r))) { setForm(null); toast(msg); } };
    const addFn = (kind, prep) => done((DB, r) => { prep?.(r); if (kind === 'labour') r.id = 'L' + nid(); ops.addRow(DB, kind, r); }, 'Saved');
    return {
      canEdit: (kind) => !!REG[kind],
      openAdd(kind) { const R = REG[kind]; if (R) open({ title: R.title, fields: R.fields, onSubmit: addFn(kind) }); },
      openForm(kind, { sub, vals }) { const R = REG[kind]; if (R) open({ title: R.title, sub, vals, fields: R.fields, onSubmit: addFn(kind) }); },
      openCustom({ title, sub, fields, kind, prep }) { open({ title, sub, fields, onSubmit: addFn(kind, prep) }); },
      openEdit(id) {
        const f = findRow(D, id); if (!f) return; const [kind, i] = f; const R = REG[kind]; if (!R) return;
        open({ title: R.title, sub: 'Edit entry', vals: D[kind][i], fields: R.fields, submitLabel: 'Save changes',
          onSubmit: done((DB, vals) => { const g = findRow(DB, id); if (g) ops.editRow(DB, g[0], DB[g[0]][g[1]], vals); }, 'Changes saved') });
      },
      remove(id) { if (mutate((DB) => { const f = findRow(DB, id); if (f) ops.delRow(DB, f[0], id); })) toast('Deleted'); },
      go(p, addKind) { location.hash = p; if (addKind) setTimeout(() => this.openAdd(addKind), 250); },
    };
  }, [D]); // eslint-disable-line react-hooks/exhaustive-deps

  const nAlerts = alerts(D).length;
  const locked = D.biz.pin && !isUnlocked(D.biz.pin);
  const Page = PAGES[page];

  return (
    <AppCtx.Provider value={app}>
      <Splash />
      <div className="topbar">
        <button type="button" aria-label="Open menu" onClick={() => setNavOpen(true)}><Icon n="menu" size={18} /></button>
        <b>GARLICI</b>
      </div>
      <div className="scrim" onClick={() => setNavOpen(false)} />
      <div className="app">
        <aside className="side">
          <div className="brand">
            <div className="mk"><svg viewBox="0 0 96 96" width="30" height="30" stroke="currentColor" strokeWidth="3.4" aria-hidden="true"><GarlicPaths /></svg></div>
            <div><b>GARLICI</b><small>{D.biz.name}</small></div>
          </div>
          <nav style={{ display: 'grid', gap: 18 }}>
            {NAV.map(([g, items]) => (
              <div className="navgrp" key={g}><h4>{g}</h4>
                {items.map(([id, l, i]) => <a key={id} className={`nav ${id === page ? 'on' : ''}`} href={`#${id}`}><Icon n={i} /><span>{l}</span>{id === 'alerts' && nAlerts > 0 && <span className="bdg">{nAlerts}</span>}</a>)}
              </div>
            ))}
          </nav>
          <div className="side-foot">
            <SyncStatus mode={st.mode} pending={st.pending} />
            <a href="#settings"><Icon n="cog" />Settings, PIN &amp; backup</a>
            <span>{fmtDY(TODAY)}</span>
          </div>
        </aside>
        <main className="main">{Page ? <Page /> : <ListPage key={page} id={page} />}</main>
      </div>
      <Drawer form={form} D={D} onClose={close} />
      <div className={`toast ${st.toast ? 'show' : ''}`} role="status">{lastToast.current}</div>
      {locked && <Lock pinHash={D.biz.pin} onUnlock={() => setUnlockTick((t) => t + 1)} />}
    </AppCtx.Provider>
  );
}
