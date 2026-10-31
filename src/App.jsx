import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useStore, mutate, toast, canWrite } from './lib/store.js';
import { findRow, alerts } from './lib/model.js';
import { nid } from './lib/format.js';
import { CFG, REG, ops } from './config/records.jsx';
import { TITLES, TABS } from './config/nav.js';
import { AppCtx, Icon, GarlicPaths, Logo } from './components/ui.jsx';
import Sheet from './components/Sheet.jsx';
import Lock, { isUnlocked } from './components/Lock.jsx';
import ListPage from './pages/ListPage.jsx';
import { Dashboard, Reports, Alerts } from './pages/Overview.jsx';
import { Income, Profit } from './pages/Money.jsx';
import { Inventory } from './pages/Stock.jsx';
import { Expenses, Dues } from './pages/Costs.jsx';
import Labour from './pages/Labour.jsx';
import Invoice from './pages/Invoice.jsx';
import Settings from './pages/Settings.jsx';
import Export from './pages/Export.jsx';
import More from './pages/More.jsx';

// "settings" is reserved by claude.ai links, so the settings screen lives at #business.
const PAGES = { dashboard: Dashboard, reports: Reports, alerts: Alerts, income: Income, profit: Profit, invoice: Invoice, inventory: Inventory, expenses: Expenses, dues: Dues, labour: Labour, business: Settings, export: Export, more: More };
const VALID = new Set([...Object.keys(PAGES), ...Object.keys(CFG)]);
const ROOTS = new Set(TABS.filter(Boolean).map((t) => t[0]));
const readHash = () => { const h = location.hash.slice(1); return h === 'settings' ? 'business' : VALID.has(h) ? h : 'dashboard'; };
const titleOf = (p) => (p === 'business' ? 'Settings' : TITLES[p] || 'Garlici');

/** Hash router that remembers where you came from, so Back works like an app. */
function useRouter() {
  const [page, setPage] = useState(readHash); const stack = useRef([readHash()]);
  useEffect(() => {
    const f = () => { const p = readHash(); const s = stack.current; if (s.length > 1 && s[s.length - 2] === p) s.pop(); else if (s[s.length - 1] !== p) s.push(p); setPage(p); };
    addEventListener('hashchange', f); return () => removeEventListener('hashchange', f);
  }, []);
  const back = () => { if (stack.current.length > 1) history.back(); else { stack.current = ['more']; location.hash = 'more'; } };
  return [page, back];
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
function StatusBar() {
  const fmt = () => new Date().toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: false });
  const [t, setT] = useState(fmt);
  useEffect(() => { const i = setInterval(() => setT(fmt()), 20000); return () => clearInterval(i); }, []);
  return (
    <div className="statusbar" aria-hidden="true"><span>{t}</span>
      <span className="sb-ic">
        <svg width="18" height="12" viewBox="0 0 18 12"><rect x="0" y="8" width="3" height="4" rx="1" /><rect x="5" y="5" width="3" height="7" rx="1" /><rect x="10" y="2.5" width="3" height="9.5" rx="1" /><rect x="15" y="0" width="3" height="12" rx="1" /></svg>
        <svg width="26" height="12" viewBox="0 0 26 12" fill="none" stroke="currentColor"><rect x=".5" y=".5" width="22" height="11" rx="3" /><rect x="2.5" y="2.5" width="16" height="7" rx="1.5" fill="currentColor" stroke="none" /><path d="M24.5 4v4" strokeLinecap="round" /></svg>
      </span>
    </div>
  );
}
function StageNote() {
  return (
    <aside className="stage-note">
      <div className="brandline"><Logo size={40} ring /><b>GARLICI</b></div>
      <h1>Your business, in your <em>pocket</em>.</h1>
      <p>The Garlici app prototype. Tap around, add entries and download Excel, just as you would on your phone.</p>
      <ul>
        <li>All 26 features: sales, stock, money, team</li>
        <li>Syncs between your phone and laptop</li>
        <li>Excel download for stock, sales and revenue</li>
        <li>Open this link on your phone for full screen</li>
      </ul>
    </aside>
  );
}

export default function App() {
  const st = useStore(); const D = st.DB;
  const [page, back] = useRouter();
  const [sheet, setSheet] = useState(null);
  const [scrolled, setScrolled] = useState(false);
  const [, setUnlockTick] = useState(0);
  const scroller = useRef(null); const lastToast = useRef('');
  if (st.toast) lastToast.current = st.toast.msg;

  useEffect(() => { scroller.current?.scrollTo(0, 0); setScrolled(false); setSheet(null); }, [page]);
  const close = useCallback(() => setSheet(null), []);
  const open = (s) => setSheet({ ...s, key: nid(), onError: toast });
  const openForm = (s) => { if (canWrite()) open({ mode: 'form', ...s }); };

  const app = useMemo(() => {
    const done = (fn, msg) => (r) => { if (mutate((DB) => fn(DB, r))) { setSheet(null); toast(msg); } };
    const addFn = (kind, prep) => done((DB, r) => { prep?.(r); if (kind === 'labour') r.id = 'L' + nid(); ops.addRow(DB, kind, r); }, 'Saved');
    return {
      canEdit: (kind) => !!REG[kind],
      openAdd(kind) { const R = REG[kind]; if (R) openForm({ eyebrow: 'New entry', title: R.title, fields: R.fields, onSubmit: addFn(kind) }); },
      openForm(kind, { sub, vals }) { const R = REG[kind]; if (R) openForm({ eyebrow: sub, title: R.title, vals, fields: R.fields, onSubmit: addFn(kind) }); },
      openCustom({ title, sub, fields, kind, prep }) { openForm({ eyebrow: sub, title, fields, onSubmit: addFn(kind, prep) }); },
      openEdit(id) {
        const f = findRow(D, id); if (!f) return; const [kind, i] = f; const R = REG[kind]; if (!R || !canWrite()) return;
        open({ mode: 'form', eyebrow: 'Edit entry', title: R.title, vals: D[kind][i], fields: R.fields, submitLabel: 'Save changes',
          onSubmit: done((DB, vals) => { const g = findRow(DB, id); if (g) ops.editRow(DB, g[0], DB[g[0]][g[1]], vals); }, 'Changes saved') });
      },
      openDetail(d) { open({ mode: 'detail', ...d }); },
      remove(id) { if (mutate((DB) => { const f = findRow(DB, id); if (f) ops.delRow(DB, f[0], id); })) { setSheet(null); toast('Deleted'); } },
      go(p, addKind) { location.hash = p; if (addKind) setTimeout(() => this.openAdd(addKind), 250); },
    };
  }, [D]); // eslint-disable-line react-hooks/exhaustive-deps

  const nAlerts = alerts(D).length;
  const locked = D.biz.pin && !isUnlocked(D.biz.pin);
  const Page = PAGES[page]; const isRoot = ROOTS.has(page);
  const syncC = st.mode === 'cloud' ? (st.pending ? 'var(--warn)' : 'var(--good)') : st.mode === 'error' ? 'var(--bad)' : 'var(--warn)';

  return (
    <AppCtx.Provider value={app}>
      <div className="stage">
        <StageNote />
        <div className="device">
          <span className="island" aria-hidden="true" />
          <StatusBar />
          <header className={`appbar ${scrolled ? 'scrolled' : ''}`}>
            {isRoot
              ? <a className="ib" href="#more" aria-label="All features"><Logo size={26} /></a>
              : <button type="button" className="ib" aria-label="Back" onClick={back}><Icon n="back" /></button>}
            <div className="ab-title">{titleOf(page)}</div>
            {page === 'dashboard'
              ? <a className="ib sync-dot" href="#alerts" aria-label={`${nAlerts} alerts`} style={{ '--sd': nAlerts ? 'var(--bad)' : 'var(--good)' }}><Icon n="bell" /></a>
              : <a className="ib sync-dot" href="#business" aria-label="Settings and sync" style={{ '--sd': syncC }}><Icon n="cog" /></a>}
          </header>
          <main className="scroll" ref={scroller} onScroll={(e) => { const s = e.currentTarget.scrollTop > 40; if (s !== scrolled) setScrolled(s); }}>
            {Page ? <Page key={page} /> : <ListPage key={page} id={page} />}
          </main>
          <nav className="tabbar" aria-label="Main">
            {TABS.map((t) => (t
              ? <a key={t[0]} className={`tab ${page === t[0] ? 'on' : ''}`} href={`#${t[0]}`} aria-current={page === t[0] ? 'page' : undefined}><Icon n={t[2]} /><span>{t[1]}</span>{t[0] === 'more' && nAlerts > 0 && <span className="bdg">{nAlerts}</span>}</a>
              : <button key="fab" type="button" className={`fab ${sheet?.mode === 'quick' ? 'open' : ''}`} aria-label="Quick add" onClick={() => (sheet?.mode === 'quick' ? close() : canWrite() && open({ mode: 'quick', eyebrow: 'Quick add', title: 'What happened?' }))}><Icon n="plus" /></button>))}
          </nav>
          <Sheet sheet={sheet} D={D} onClose={close} />
          <div className={`toast ${st.toast ? 'show' : ''}`} role="status">{lastToast.current}</div>
          {locked && <Lock pinHash={D.biz.pin} onUnlock={() => setUnlockTick((x) => x + 1)} />}
          <Splash />
        </div>
      </div>
    </AppCtx.Provider>
  );
}
