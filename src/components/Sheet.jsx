import { useEffect, useRef, useState } from 'react';
import { TODAY } from '../lib/format.js';
import { QUICK } from '../config/nav.js';
import { Icon, useApp } from './ui.jsx';

const OPTIONAL_TEXT = ['note', 'gstin', 'batch', 'period', 'phone', 'from', 'vehicle'];
const PLACEHOLDER = '(add one first)';

function FormBody({ form, D }) {
  return form.fields.map(([k, label, type, o, hint]) => {
    const id = 'f_' + k; const v = form.vals ? form.vals[k] : type === 'date' && k === 'date' ? TODAY : undefined;
    const req = !hint && (type === 'number' || type === 'select' || (type === 'text' && !OPTIONAL_TEXT.includes(k)));
    let input;
    if (type === 'select') {
      let opt = [...((typeof o === 'function' ? o(D) : o) || [])];
      if (v && !opt.includes(v)) opt.unshift(v); if (!opt.length) opt = [PLACEHOLDER];
      input = <select id={id} name={k} required={req} defaultValue={v ?? opt[0]}>{opt.map((x) => <option key={x}>{x}</option>)}</select>;
    } else if (type === 'textarea') input = <textarea id={id} name={k} rows="3" defaultValue={v ?? ''} />;
    else input = <input id={id} name={k} type={type} inputMode={type === 'number' ? 'decimal' : undefined} step={type === 'number' ? 'any' : undefined} required={req} defaultValue={v ?? ''} />;
    return <div className="fld" key={k}><label htmlFor={id}>{label}</label>{input}{hint && <small>{hint}</small>}</div>;
  });
}

function Detail({ s, onClose }) {
  const app = useApp(); const [armed, setArmed] = useState(false);
  return (
    <>
      <div className="sh-body">
        <div className="dl">{s.rows.map(([l, v], i) => <div key={i}><span>{l}</span><b>{v}</b></div>)}</div>
        <div className="btncol">
          {s.actions.map((a) => <button key={a.label} type="button" className="btn pri block" onClick={() => { onClose(); a.run(); }}>{a.label}</button>)}
          <div className="two">
            {!s.noEdit && app.canEdit(s.kind) ? <button type="button" className="btn" onClick={() => app.openEdit(s.id)}><Icon n="edit" />Edit</button> : <span />}
            <button type="button" className={`btn danger ${armed ? 'armed' : ''}`} onClick={() => (armed ? (onClose(), app.remove(s.id)) : setArmed(true))}><Icon n="trash" />{armed ? 'Tap to confirm' : 'Delete'}</button>
          </div>
        </div>
      </div>
    </>
  );
}

/** Bottom sheet for forms, record details, custom info and the quick-add grid. */
export default function Sheet({ sheet, D, onClose }) {
  const app = useApp(); const ref = useRef(null);
  useEffect(() => {
    if (!sheet) return;
    const t = setTimeout(() => sheet.mode === 'form' && ref.current?.querySelector('input,select')?.focus({ preventScroll: true }), 420);
    const onKey = (e) => e.key === 'Escape' && onClose();
    addEventListener('keydown', onKey);
    return () => { clearTimeout(t); removeEventListener('keydown', onKey); };
  }, [sheet, onClose]);
  const submit = (e) => {
    e.preventDefault();
    const r = {}; new FormData(e.target).forEach((v, k) => (r[k] = v));
    if (Object.values(r).includes(PLACEHOLDER)) return sheet.onError?.('Add the missing client, product or worker first.');
    sheet.onSubmit(r);
  };
  const s = sheet;
  return (
    <>
      <div className={`sheet-bg ${s ? 'open' : ''}`} onClick={onClose} />
      <section className={`sheet ${s ? 'open' : ''}`} aria-hidden={!s} role="dialog" aria-modal="true" ref={ref}>
        <div className="grab" />
        {s && (
          <>
            <div className="sh-head">
              <div style={{ minWidth: 0 }}>{s.eyebrow && <div className="eyebrow">{s.eyebrow}</div>}<h2>{s.title}</h2>{s.sub && <div className="sub">{s.sub}</div>}</div>
              <button type="button" className="x" aria-label="Close" onClick={onClose}>×</button>
            </div>
            {s.mode === 'form' && (
              <form className="dform" onSubmit={submit} key={s.key}>
                <div className="sh-body"><FormBody form={s} D={D} /></div>
                <div className="sh-foot"><button type="button" className="btn" onClick={onClose}>Cancel</button><button type="submit" className="btn pri">{s.submitLabel || 'Save'}</button></div>
              </form>
            )}
            {s.mode === 'detail' && <Detail s={s} onClose={onClose} key={s.key} />}
            {s.mode === 'quick' && (
              <div className="sh-body">
                <div className="qa">{QUICK.map(([l, i, k]) => (
                  <button key={l} type="button" onClick={() => { if (k.startsWith('#')) { onClose(); location.hash = k.slice(1); } else app.openAdd(k); }}>
                    <span className="ci"><Icon n={i} /></span>{l}
                  </button>
                ))}</div>
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
}
