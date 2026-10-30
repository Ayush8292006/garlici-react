import { useState } from 'react';
import { useStore, mutate, toast, saveFile, canDownload, replaceDB, resetDB } from '../lib/store.js';
import { toDocs, fromDocs, emptyDB } from '../lib/model.js';
import { TODAY, ss } from '../lib/format.js';
import { sha } from '../components/Lock.jsx';
import { Header, Icon } from '../components/ui.jsx';

const FIELDS = [['name', 'Business name'], ['address', 'Address'], ['gstin', 'GSTIN'], ['phone', 'Phone'], ['upi', 'UPI ID'], ['terms', 'Invoice terms']];

export default function Settings() {
  const st = useStore(); const D = st.DB; const b = D.biz;
  const [pin, setPin] = useState(''); const [armed, setArmed] = useState(false);
  const saveBiz = (e) => { e.preventDefault(); const f = new FormData(e.target); if (mutate((DB) => f.forEach((v, k) => (DB.biz[k] = String(v).trim())))) toast('Business details saved'); };
  const setNewPin = async () => {
    if (!/^\d{4}$/.test(pin)) { toast('Enter exactly 4 digits.'); return; }
    const h = await sha(pin); if (mutate((DB) => (DB.biz.pin = h))) { ss.set('garlici.unlocked', h); setPin(''); toast('PIN set'); }
  };
  const restore = (e) => {
    const f = e.target.files && e.target.files[0]; if (!f) return; const rd = new FileReader();
    rd.onload = () => {
      try { const j = JSON.parse(rd.result); const docs = j.docs || (j.products ? Object.values(toDocs({ ...emptyDB(), ...j })) : null); if (!docs) throw new Error('bad');
        if (replaceDB(fromDocs(docs))) toast('Backup restored'); } catch { toast('That file is not a Garlici backup.'); }
    };
    rd.readAsText(f); e.target.value = '';
  };
  const syncText = st.mode === 'cloud' ? 'Your entries are saved online. Open this app on your phone or laptop and you will see the same books.'
    : st.mode === 'local' ? 'Entries are saved only in this browser on this device. Download a backup regularly, or connect an online database to sync devices.' : 'Connecting to your data…';
  return (
    <div className="page">
      <Header eyebrow="Settings" title={<>Business <em>settings</em></>} desc="Details printed on your invoices, app lock, and your data." />
      <div className="grid">
        <div className="panel c6 reveal"><h3>Your business</h3>
          <form className="form-stack" onSubmit={saveBiz} key={[b.name, b.address, b.gstin, b.phone, b.upi, b.terms].join('|')}>
            {FIELDS.map(([k, l]) => <div className="fld" key={k}><label htmlFor={'b_' + k}>{l}</label>{k === 'terms' ? <textarea id={'b_' + k} name={k} rows="3" defaultValue={b[k]} /> : <input id={'b_' + k} name={k} defaultValue={b[k]} />}</div>)}
            <button className="btn pri" style={{ justifySelf: 'start' }}>Save details</button>
          </form>
        </div>
        <div className="c6 stack">
          <div className="panel reveal"><h3>Sync &amp; sharing</h3><p className="muted" style={{ marginTop: 0 }}>{syncText}</p>
            <p className="muted">To give a partner or accountant access, use the <b>Share</b> menu on this page. People with edit access can add and change entries; view-only people can only read.</p></div>
          <div className="panel reveal"><h3>App lock</h3>
            <p className="muted" style={{ marginTop: 0 }}>{b.pin ? 'A 4-digit PIN is set. The app asks for it each time it is opened in a new tab.' : 'Ask for a 4-digit PIN when the app opens. This hides your numbers from anyone glancing at your screen; it is not a password for your account.'}</p>
            <div className="btnrow">
              <div className="fld inline"><label htmlFor="pinNew">{b.pin ? 'New PIN' : 'PIN'}</label><input id="pinNew" inputMode="numeric" maxLength={4} placeholder="4 digits" style={{ width: 110 }} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} /></div>
              <button type="button" className="btn" onClick={setNewPin}>{b.pin ? 'Change PIN' : 'Set PIN'}</button>
              {b.pin && <button type="button" className="btn ghost danger" onClick={() => mutate((DB) => (DB.biz.pin = '')) && toast('PIN removed')}>Remove PIN</button>}
            </div>
          </div>
          <div className="panel reveal"><h3>Your data</h3>
            <div className="btnrow">
              {canDownload(st) && <button type="button" className="btn" onClick={() => saveFile(`garlici-backup-${TODAY}.json`, JSON.stringify({ app: 'garlici', version: 2, saved: new Date().toISOString(), docs: Object.values(toDocs(D)) }), 'application/json', 'Backup saved')}><Icon n="down" />Download backup</button>}
              {b.example && <button type="button" className={`btn danger ${armed ? 'armed' : ''}`} onClick={() => { if (!armed) { setArmed(true); return; } setArmed(false); if (resetDB({ ...b, example: false })) toast('Example data cleared. Your books are ready.'); }}>{armed ? 'Tap again to clear everything' : 'Clear example data & start fresh'}</button>}
            </div>
            <div className="fld" style={{ marginTop: 14 }}><label htmlFor="restoreFile">Restore from a backup file</label><input id="restoreFile" type="file" accept=".json,application/json" onChange={restore} /><small>This replaces every entry with the backup.</small></div>
          </div>
        </div>
      </div>
    </div>
  );
}
