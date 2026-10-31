import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { fmtD, inr, kg, num, kshort, pct, TODAY, addDays, weekday, sum } from '../lib/format.js';
import { getState } from '../lib/store.js';

/** App-wide actions (sheets, navigation) provided by <App>. */
export const AppCtx = createContext(null);
export const useApp = () => useContext(AppCtx);

const ICONS = {
  home: 'M4 11l8-7 8 7v8a1 1 0 01-1 1h-4v-6H9v6H5a1 1 0 01-1-1z', chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2', bell: 'M6 16V11a6 6 0 1112 0v5l2 2H4zM10 21h4',
  bag: 'M5 8h14l-1 12H6zM9 8V6a3 3 0 016 0v2', wallet: 'M3 7h16a2 2 0 012 2v9a2 2 0 01-2 2H3zM3 7l12-3v3M17 13h.01', coin: 'M12 3a9 9 0 100 18 9 9 0 000-18zM9 9h6M9 12h6M11 9c2 0 2 6-2 6l4 3',
  clock: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 7v5l3 2', doc: 'M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h5', trend: 'M3 17l6-6 4 4 8-8M15 7h6v6',
  box: 'M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10', layers: 'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5', cart: 'M3 4h2l2 11h11l2-8H6M9 20h.01M17 20h.01',
  tag: 'M3 12V3h9l9 9-9 9zM8 8h.01', package: 'M4 8h16v12H4zM2 4h20v4H2zM10 12h4', users: 'M9 11a4 4 0 100-8 4 4 0 000 8zM2 21v-1a6 6 0 0114 0v1M16 3a4 4 0 010 8M22 21v-1a6 6 0 00-4-5.6',
  spark: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6', phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 005 5L15 13l5 2v4a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2',
  repeat: 'M17 2l3 3-3 3M4 11V9a4 4 0 014-4h12M7 22l-3-3 3-3M20 13v2a4 4 0 01-4 4H4', truck: 'M2 6h12v10H2zM14 10h4l3 3v3h-7M6 19a2 2 0 100-4 2 2 0 000 4zM17 19a2 2 0 100-4 2 2 0 000 4z',
  receipt: 'M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2zM9 8h6M9 12h6', bolt: 'M13 2L4 14h7l-1 8 9-12h-7z', bank: 'M3 10l9-6 9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 21h18',
  user: 'M12 11a4 4 0 100-8 4 4 0 000 8zM4 21v-1a8 8 0 0116 0v1', cash: 'M2 6h20v12H2zM12 15a3 3 0 100-6 3 3 0 000 6zM6 9v.01M18 15v.01',
  plus: 'M12 5v14M5 12h14', search: 'M11 4a7 7 0 100 14 7 7 0 000-14zM20 20l-4-4', trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13', edit: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4',
  down: 'M12 4v11M7 10l5 5 5-5M5 20h14', menu: 'M4 7h16M4 12h16M4 17h16', back: 'M15 5l-7 7 7 7', chev: 'M9 5l7 7-7 7', grid: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  cog: 'M12 9a3 3 0 100 6 3 3 0 000-6zM4 12h2M18 12h2M12 4v2M12 18v2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M6.3 17.7l1.4-1.4M16.3 7.7l1.4-1.4',
  sheet: 'M4 4h16v16H4zM4 9h16M4 14h16M10 4v16', check: 'M5 12l5 5 9-10', calendar: 'M4 6h16v14H4zM4 10h16M8 3v5M16 3v5',
};
export function Icon({ n, size }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width={size} height={size} aria-hidden="true"><path d={ICONS[n]} /></svg>;
}
export function GarlicPaths(props) {
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M48 31C31 35 22 52 28 64c5 10 35 10 40 0 6-12-3-29-20-33z" /><path d="M48 31c-1-6 0-12 4-16" />
      <path d="M48 33c-8 11-8 27-2 39M48 33c8 11 8 27 2 39M38 40c-6 9-6 21-1 30M58 40c6 9 6 21 1 30" /><path d="M41 74l-2 4M48 75v4M55 74l2 4" />
    </g>
  );
}
export const GARLIC_SVG = '<g fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M48 31C31 35 22 52 28 64c5 10 35 10 40 0 6-12-3-29-20-33z"/><path d="M48 31c-1-6 0-12 4-16"/><path d="M48 33c-8 11-8 27-2 39M48 33c8 11 8 27 2 39M38 40c-6 9-6 21-1 30M58 40c6 9 6 21 1 30"/><path d="M41 74l-2 4M48 75v4M55 74l2 4"/></g>';
export const Logo = ({ size = 26, stroke = 'currentColor', ring = false }) => (
  <svg viewBox="0 0 96 96" width={size} height={size} stroke={stroke} strokeWidth="3.4" aria-hidden="true">{ring && <circle cx="48" cy="48" r="45" fill="none" strokeWidth="2.4" />}<GarlicPaths /></svg>
);

export const Pill = ({ k = '', children }) => <span className={`pill ${k}`}>{children}</span>;
export const modeKind = (m) => (m === 'Cash' ? 'brown' : m === 'UPI' ? 'ink' : m === 'Credit' ? 'warn' : '');
export const ModePill = ({ m }) => <Pill k={modeKind(m)}>{m}</Pill>;

export function Delta({ now, prev, suffix = '' }) {
  if (!prev) return null; const p = pct(now, prev);
  return <><span className={p >= 0 ? 'up' : 'down'}>{p >= 0 ? '▲' : '▼'} {Math.abs(p).toFixed(0)}%</span> {suffix}</>;
}

/** Number that counts up once when it first appears. */
export function CountUp({ text }) {
  const [shown, setShown] = useState(text);
  const done = useRef(false);
  useEffect(() => {
    if (done.current || typeof text !== 'string' || matchMedia('(prefers-reduced-motion: reduce)').matches) { setShown(text); return; }
    done.current = true;
    const m = text.match(/^([^\d−-]*)([−-]?)([\d,]+(?:\.\d+)?)(.*)$/); if (!m) { setShown(text); return; }
    const target = parseFloat(m[3].replace(/,/g, '')); const dec = (m[3].split('.')[1] || '').length; const t0 = performance.now(); let raf;
    const step = (t) => { const p = Math.min(1, (t - t0) / 900), e = 1 - Math.pow(1 - p, 3); const v = target * e;
      setShown(p < 1 ? m[1] + m[2] + (dec ? v.toFixed(dec) : Math.round(v).toLocaleString('en-IN')) + m[4] : text); if (p < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step); return () => cancelAnimationFrame(raf);
  }, [text]);
  return shown;
}
export function Kpi({ l, v, s, hero }) {
  return (
    <div className={`kpi ${hero ? 'hero' : ''}`}>
      <div className="l">{l}</div><div className="v"><CountUp text={String(v)} /></div>{s ? <div className="s">{s}</div> : null}
    </div>
  );
}
export function Header({ eyebrow, title, desc, children }) {
  return (
    <header className="ph">
      {eyebrow && <div className="eyebrow">{eyebrow}</div>}<h1>{title}</h1>{desc ? <p>{desc}</p> : null}
      <div className="ph-act">{children}</div>
    </header>
  );
}
export function AddBtn({ label = 'Add', kind }) {
  const app = useApp();
  return <button type="button" className="btn pri sm" onClick={() => app.openAdd(kind)}><Icon n="plus" />{label}</button>;
}
export function XlBtn({ onClick, label = 'Excel' }) {
  return <button type="button" className="xl" onClick={onClick} aria-label={`Download ${label} file`}><Icon n="sheet" />{label}</button>;
}
export function Seg({ options, value, onChange, className = '' }) {
  return (
    <div className={`seg ${className}`} role="tablist">
      {options.map((o) => { const [v, l] = Array.isArray(o) ? o : [o, o];
        return <button key={v} type="button" role="tab" aria-selected={v === value} className={v === value ? 'on' : ''} onClick={() => onChange(v)}>{l}</button>; })}
    </div>
  );
}
export function HBars({ items, fmt = inr }) {
  if (!items.length) return <div className="empty sm">Nothing recorded yet.</div>;
  const mx = Math.max(1, ...items.map((i) => i.v));
  return (
    <div className="hb">
      {items.map((i) => (
        <div className="hb-row" key={i.l}>
          <span title={i.l}>{i.l}</span>
          <div className="hb-track"><div className="hb-fill" style={{ width: `${Math.max(0, (i.v / mx) * 100).toFixed(1)}%`, background: i.c }} /></div>
          <span className="num">{fmt(i.v)}</span>
        </div>
      ))}
    </div>
  );
}

function niceMax(v) { if (v <= 0) return 1; const e = Math.pow(10, Math.floor(Math.log10(v))); const f = v / e; return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * e; }
let gradId = 0;
/** Line chart sized for a phone card (viewBox 340 wide). */
export function LineChart({ rows, series, h = 190, fmt = kshort, xfmt = fmtD }) {
  const [gid] = useState(() => 'lg' + gradId++);
  const W = 340, H = h, L = 42, Rp = 10, T = 10, B = 22, iw = W - L - Rp, ih = H - T - B;
  const all = rows.flatMap((r) => series.map((s) => r[s.k] || 0));
  const mx = niceMax(Math.max(...all, 1)), mn = Math.min(0, ...all), st = mx / 4, lo = mn < 0 ? -Math.ceil(-mn / st) * st : 0, nT = Math.round((mx - lo) / st);
  const x = (i) => L + (rows.length < 2 ? iw / 2 : (i * iw) / (rows.length - 1)), y = (v) => T + ih - ((v - lo) / (mx - lo)) * ih;
  const step = Math.max(1, Math.ceil(rows.length / 5));
  return (
    <div className="chart"><svg viewBox={`0 0 ${W} ${H}`} role="img">
      {Array.from({ length: nT + 1 }, (_, t) => { const v = lo + st * t; return <g key={t}><line className="grid-l" x1={L} x2={W - Rp} y1={y(v)} y2={y(v)} /><text x={L - 6} y={y(v) + 3.5} textAnchor="end">{fmt(v)}</text></g>; })}
      {rows.map((r, i) => (i % step === 0 ? <text key={'x' + i} x={x(i)} y={H - 6} textAnchor={i === 0 ? 'start' : 'middle'}>{xfmt(r.label)}</text> : null))}
      {lo < 0 && <line x1={L} x2={W - Rp} y1={y(0)} y2={y(0)} stroke="var(--muted)" strokeDasharray="3 3" />}
      {series.map((s, si) => {
        if (!rows.length) return null;
        const pts = rows.map((r, i) => [x(i), y(r[s.k] || 0)]); const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' '); const lp = pts[pts.length - 1];
        return (
          <g key={s.k}>
            {si === 0 && <><defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={s.c} stopOpacity=".16" /><stop offset="1" stopColor={s.c} stopOpacity="0" /></linearGradient></defs>
              <path d={`${d} L${x(rows.length - 1)} ${y(lo)} L${x(0)} ${y(lo)} Z`} fill={`url(#${gid})`} /></>}
            <path className="ln" d={d} stroke={s.c} /><circle cx={lp[0]} cy={lp[1]} r="4" fill={s.c} stroke="var(--surface)" strokeWidth="2" />
          </g>
        );
      })}
    </svg></div>
  );
}
export function ColChart({ rows, h = 170, fmt = kshort, xfmt = (x) => x, color = 'var(--brown-2)', hi = -1 }) {
  const W = 340, H = h, L = 40, Rp = 6, T = 10, B = 20, iw = W - L - Rp, ih = H - T - B;
  const mx = niceMax(Math.max(1, ...rows.map((r) => r.v))); const bw = iw / Math.max(1, rows.length); const step = Math.max(1, Math.ceil(rows.length / 8));
  return (
    <div className="chart"><svg viewBox={`0 0 ${W} ${H}`} role="img">
      {[0, 1, 2, 3, 4].map((t) => { const v = (mx * t) / 4, yy = T + ih - (v / mx) * ih; return <g key={t}><line className="grid-l" x1={L} x2={W - Rp} y1={yy} y2={yy} /><text x={L - 6} y={yy + 3.5} textAnchor="end">{fmt(v)}</text></g>; })}
      {rows.map((r, i) => { const bh = Math.max(0, (r.v / mx) * ih), xx = L + i * bw + bw * 0.16;
        return <g key={i}><rect className="col" x={xx} y={T + ih - bh} width={bw * 0.68} height={bh} rx="2" fill={i === hi ? 'var(--ink)' : color}><title>{`${xfmt(r.l)}: ${fmt(r.v)}`}</title></rect>
          {i % step === 0 && <text x={xx + bw * 0.34} y={H - 5} textAnchor="middle">{xfmt(r.l)}</text>}</g>; })}
    </svg></div>
  );
}
export const Meter = ({ q }) => <div className="meter"><i className={q <= 1 ? 'bad' : q <= 1.25 ? 'warn' : 'good'} style={{ width: `${Math.min(100, (q / 3) * 100)}%` }} /></div>;

/* ---------- cells ---------- */
export const isNumCol = (c) => ['inr', 'kg', 'n'].includes(c[2]) || c[3] === 'n';
export function cell(r, c) {
  const [k, , f] = c; if (typeof f === 'function') return f(r, getState().DB); const v = r[k];
  if (f === 'date') return fmtD(v); if (f === 'inr') return inr(v); if (f === 'kg') return kg(v); if (f === 'n') return num(v); return v ?? '';
}
/** Plain text of a rendered cell, for Excel export and default list items. */
export function nodeText(n) {
  if (n == null || n === false || n === true) return '';
  if (typeof n === 'string' || typeof n === 'number') return String(n);
  if (Array.isArray(n)) return n.map(nodeText).join('');
  if (n.props) return nodeText(n.props.children);
  return '';
}
const initials = (s) => String(s || '?').replace(/[^A-Za-z0-9 ]/g, '').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '•';
export const dayLabel = (d) => (d === TODAY ? 'Today' : d === addDays(TODAY, -1) ? 'Yesterday' : d === addDays(TODAY, 1) ? 'Tomorrow' : `${weekday(d)} ${fmtD(d)}`);

/** Default list item derived from a record's columns. */
function defaultItem(r, cols) {
  const textCols = cols.filter((c) => c[2] !== 'date' && !isNumCol(c));
  const valCol = cols.find((c) => c[2] === 'inr') || cols.find((c) => c[2] === 'kg');
  return { t: nodeText(cell(r, textCols[0] || cols[0])), s: textCols.slice(1, 3).map((c) => nodeText(cell(r, c))).filter(Boolean).join(' · '), v: valCol ? cell(r, valCol) : null };
}

export function RowButtons({ id, kind, noEdit }) {
  const app = useApp(); const [armed, setArmed] = useState(false);
  useEffect(() => { if (!armed) return; const t = setTimeout(() => setArmed(false), 4000); return () => clearTimeout(t); }, [armed]);
  return (
    <>
      {!noEdit && app.canEdit(kind) && <button type="button" className="btn sm ghost" aria-label="Edit" onClick={() => app.openEdit(id)}><Icon n="edit" /></button>}
      <button type="button" className={`btn sm ghost danger ${armed ? 'armed' : ''}`} aria-label="Delete" onClick={() => (armed ? app.remove(id) : setArmed(true))}>{armed ? 'Confirm delete' : <Icon n="trash" />}</button>
    </>
  );
}

/**
 * Tappable card list of records. Tapping opens a detail sheet with every column,
 * the row's actions, Edit and Delete.
 * item(r, D) → { t, s, v, tag:[text, kind], av, ic, avk, meter }
 */
export function RecordList({ rows, cols, item, actions, onAction, kind, noEdit, group, groupSum, limit = 120 }) {
  const app = useApp(); const D = getState().DB;
  const [lim, setLim] = useState(limit);
  if (!rows.length) return <div className="empty">Nothing here yet. Tap <b>+</b> to add your first entry.</div>;
  const open = (r) => {
    const it = item ? item(r, D) : defaultItem(r, cols);
    app.openDetail({
      title: it.t, sub: it.s, id: r.id, kind, noEdit,
      rows: cols.map((c) => [c[1], cell(r, c)]).filter(([, v]) => nodeText(v) !== '' && nodeText(v) !== '—'),
      actions: (actions ? actions(r, D) : []).map(([a, l]) => ({ label: l, run: () => onAction(a, r) })),
    });
  };
  const shown = rows.slice(0, lim);
  const Item = (r) => {
    const it = item ? item(r, D) : defaultItem(r, cols);
    return (
      <button type="button" className="li" key={r.id} onClick={() => open(r)}>
        <span className={`av ${it.avk || ''}`}>{it.ic ? <Icon n={it.ic} /> : it.av ?? initials(it.t)}</span>
        <span style={{ minWidth: 0 }}><span className="t" style={{ display: 'block' }}>{it.t}</span><span className="s" style={{ display: 'block' }}>{it.s}</span>{it.meter}</span>
        <span className="r">{it.v != null && <span className="v">{it.v}</span>}{it.tag && <Pill k={it.tag[1]}>{it.tag[0]}</Pill>}</span>
      </button>
    );
  };
  let body;
  if (group) {
    const groups = []; shown.forEach((r) => { const g = r[group] || ''; const last = groups[groups.length - 1]; if (last && last.g === g) last.rows.push(r); else groups.push({ g, rows: [r] }); });
    body = groups.map(({ g, rows: rs }) => (
      <div className="grp" key={g}>
        <div className="grp-h"><span>{g ? dayLabel(g) : 'No date'}</span>{groupSum && <span>{groupSum(rs)}</span>}</div>
        <div className="list reveal">{rs.map(Item)}</div>
      </div>
    ));
  } else body = <div className="list reveal">{shown.map(Item)}</div>;
  return (
    <div className="grp">
      {body}
      {rows.length > lim && <button type="button" className="btn ghost block" style={{ marginTop: 8 }} onClick={() => setLim(lim + 120)}>Show more ({rows.length - lim} left)</button>}
    </div>
  );
}
export const sumInr = (k) => (rs) => inr(sum(rs, (r) => r[k]));
export const sumKg = (k) => (rs) => kg(sum(rs, (r) => r[k]));

export function Search({ value, onChange, placeholder }) {
  return <label className="search"><Icon n="search" /><input type="search" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)} aria-label="Search" /></label>;
}
export function AlertList({ items, max }) {
  const list = max ? items.slice(0, max) : items;
  if (!list.length) return <div className="empty sm">All clear.</div>;
  return <div className="alist">{list.map((a, i) => <a key={i} className="aitem" href={`#${a.go}`}><span className={`dot ${a.k}`} /><span><b>{a.t}</b><small>{a.s}</small></span><Icon n="chev" size={16} /></a>)}</div>;
}
