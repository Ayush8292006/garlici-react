import { useEffect, useRef } from 'react';
import { TODAY } from '../lib/format.js';

const OPTIONAL_TEXT = ['note', 'gstin', 'batch', 'period', 'phone', 'from', 'vehicle'];
const PLACEHOLDER = '(add one first)';

/**
 * Slide-in form. `form` = { title, sub, fields, vals, submitLabel, onSubmit }.
 * fields: [key, label, type, options|fn(D), hint] — a hint marks the field optional.
 */
export default function Drawer({ form, D, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!form) return;
    const t = setTimeout(() => ref.current?.querySelector('input,select')?.focus(), 350);
    const onKey = (e) => e.key === 'Escape' && onClose();
    addEventListener('keydown', onKey);
    return () => { clearTimeout(t); removeEventListener('keydown', onKey); };
  }, [form, onClose]);

  const submit = (e) => {
    e.preventDefault();
    const r = {}; new FormData(e.target).forEach((v, k) => (r[k] = v));
    if (Object.values(r).includes(PLACEHOLDER)) return form.onError?.('Add the missing client, product or worker first.');
    form.onSubmit(r);
  };
  return (
    <>
      <div className={`drawer-bg ${form ? 'open' : ''}`} onClick={onClose} />
      <aside className={`drawer ${form ? 'open' : ''}`} aria-hidden={!form} ref={ref}>
        {form && (
          <>
            <div className="dh"><div><div className="eyebrow">{form.sub || 'New entry'}</div><h2>{form.title}</h2></div><button type="button" className="x" aria-label="Close" onClick={onClose}>×</button></div>
            <form className="dform" onSubmit={submit} key={form.key}>
              <div className="db">
                {form.fields.map(([k, label, type, o, hint]) => {
                  const id = 'f_' + k; const v = form.vals ? form.vals[k] : type === 'date' && k === 'date' ? TODAY : undefined;
                  const req = !hint && (type === 'number' || type === 'select' || (type === 'text' && !OPTIONAL_TEXT.includes(k)));
                  let input;
                  if (type === 'select') {
                    let opt = [...((typeof o === 'function' ? o(D) : o) || [])];
                    if (v && !opt.includes(v)) opt.unshift(v); if (!opt.length) opt = [PLACEHOLDER];
                    input = <select id={id} name={k} required={req} defaultValue={v ?? opt[0]}>{opt.map((x) => <option key={x}>{x}</option>)}</select>;
                  } else if (type === 'textarea') input = <textarea id={id} name={k} rows="3" defaultValue={v ?? ''} />;
                  else input = <input id={id} name={k} type={type} step={type === 'number' ? 'any' : undefined} required={req} defaultValue={v ?? ''} />;
                  return <div className="fld" key={k}><label htmlFor={id}>{label}</label>{input}{hint && <small>{hint}</small>}</div>;
                })}
              </div>
              <div className="df"><button type="button" className="btn" onClick={onClose}>Cancel</button><button type="submit" className="btn pri">{form.submitLabel || 'Save'}</button></div>
            </form>
          </>
        )}
      </aside>
    </>
  );
}
