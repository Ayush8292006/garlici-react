// Minimal, dependency-free .xlsx writer.
// Supports: several sheets, bold/filled header row, ₹ / kg / date number formats,
// column widths, frozen header, autofilter and SUM totals rows.
//
// sheet = { name, title, subtitle, columns: [{ h, t, w, total }], rows: [[...values]] }
//   t (type): 'text' | 'date' (YYYY-MM-DD string) | 'inr' | 'kg' | 'int' | 'num' | 'pct'

const enc = new TextEncoder();
const xml = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
const colName = (i) => { let s = ''; i++; while (i) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
const excelDate = (s) => { const [y, m, d] = String(s).split('-').map(Number); if (!y || !m || !d) return null; return (Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 864e5; };
const safeSheetName = (n, used) => {
  let s = String(n).replace(/[[\]:*?/\\]/g, ' ').slice(0, 31).trim() || 'Sheet';
  let k = s, i = 2; while (used.has(k.toLowerCase())) k = s.slice(0, 28) + ' ' + i++; used.add(k.toLowerCase()); return k;
};

// Style indexes (see STYLES below)
const S = { text: 0, head: 1, inr: 2, date: 3, kg: 4, int: 5, totLabel: 6, totInr: 7, totKg: 8, title: 9, totInt: 10, pct: 11, sub: 12, num: 13, totNum: 14 };
const TYPE_STYLE = { text: S.text, inr: S.inr, date: S.date, kg: S.kg, int: S.int, pct: S.pct, num: S.num };
const TOTAL_STYLE = { inr: S.totInr, kg: S.totKg, int: S.totInt, num: S.totNum };

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<numFmts count="5"><numFmt numFmtId="164" formatCode="&quot;₹&quot;#,##0"/><numFmt numFmtId="165" formatCode="dd\\-mmm\\-yyyy"/><numFmt numFmtId="166" formatCode="#,##0.0&quot; kg&quot;"/><numFmt numFmtId="167" formatCode="#,##0"/><numFmt numFmtId="168" formatCode="0.0%"/></numFmts>
<fonts count="4"><font><sz val="11"/><color rgb="FF111111"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="11"/><color rgb="FF111111"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="15"/><color rgb="FF111111"/><name val="Calibri"/><family val="2"/></font><font><sz val="10"/><color rgb="FF6F6A62"/><name val="Calibri"/><family val="2"/></font></fonts>
<fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFEEE7DB"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF5F0E7"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="3"><border><left/><right/><top/><bottom/><diagonal/></border><border><left/><right/><top/><bottom style="medium"><color rgb="FF111111"/></bottom><diagonal/></border><border><left/><right/><top style="thin"><color rgb="FF111111"/></top><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="15">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="166" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="167" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="0" fontId="1" fillId="3" borderId="2" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>
<xf numFmtId="164" fontId="1" fillId="3" borderId="2" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>
<xf numFmtId="166" fontId="1" fillId="3" borderId="2" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="167" fontId="1" fillId="3" borderId="2" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>
<xf numFmtId="168" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1"/>
<xf numFmtId="4" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>
<xf numFmtId="4" fontId="1" fillId="3" borderId="2" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"/>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

function cellXml(ref, v, t, style) {
  if (v === null || v === undefined || v === '') return '';
  if (t === 'date') { const n = excelDate(v); return n === null ? `<c r="${ref}" t="inlineStr" s="${S.text}"><is><t>${xml(v)}</t></is></c>` : `<c r="${ref}" s="${style}"><v>${n}</v></c>`; }
  if (t !== 'text' && typeof v === 'number' && isFinite(v)) return `<c r="${ref}" s="${style}"><v>${Math.round(v * 1e6) / 1e6}</v></c>`;
  return `<c r="${ref}" t="inlineStr" s="${t === 'text' ? style : S.text}"><is><t xml:space="preserve">${xml(v)}</t></is></c>`;
}

function sheetXml(sh) {
  const cols = sh.columns; const nc = cols.length; const last = colName(nc - 1);
  const rowsXml = []; let r = 0;
  const pushRow = (cells, ht) => { r++; rowsXml.push(`<row r="${r}"${ht ? ` ht="${ht}" customHeight="1"` : ''}>${cells.join('')}</row>`); };
  pushRow([cellXml('A1', sh.title, 'text', S.title)], 24);
  pushRow([cellXml('A2', sh.subtitle || '', 'text', S.sub)]);
  pushRow([]);
  const headRow = r + 1;
  pushRow(cols.map((c, i) => cellXml(colName(i) + headRow, c.h, 'text', S.head)), 20);
  const first = r + 1;
  sh.rows.forEach((row) => { const rr = r + 1; pushRow(cols.map((c, i) => cellXml(colName(i) + rr, row[i], c.t || 'text', TYPE_STYLE[c.t] ?? S.text))); });
  const lastData = r;
  const hasTotals = cols.some((c) => c.total);
  if (hasTotals && sh.rows.length) {
    const tr = r + 1;
    pushRow(cols.map((c, i) => {
      const ref = colName(i) + tr;
      if (i === 0) return `<c r="${ref}" t="inlineStr" s="${S.totLabel}"><is><t>Total</t></is></c>`;
      if (!c.total) return `<c r="${ref}" s="${S.totLabel}"/>`;
      const sumV = sh.rows.reduce((a, row) => a + (typeof row[i] === 'number' ? row[i] : 0), 0);
      return `<c r="${ref}" s="${TOTAL_STYLE[c.t] ?? S.totNum}"><f>SUM(${colName(i)}${first}:${colName(i)}${lastData})</f><v>${Math.round(sumV * 1e6) / 1e6}</v></c>`;
    }));
  }
  const widths = cols.map((c, i) => `<col min="${i + 1}" max="${i + 1}" width="${c.w || 14}" customWidth="1"/>`).join('');
  const filter = sh.rows.length ? `<autoFilter ref="A${headRow}:${last}${lastData}"/>` : '';
  return {
    xml: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><dimension ref="A1:${last}${Math.max(r, 1)}"/><sheetViews><sheetView workbookViewId="0" showGridLines="1"><pane ySplit="${headRow}" topLeftCell="A${headRow + 1}" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A${headRow + 1}" sqref="A${headRow + 1}"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/><cols>${widths}</cols><sheetData>${rowsXml.join('')}</sheetData>${filter}<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/><pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0"/></worksheet>`,
    filter: sh.rows.length ? `$A$${headRow}:$${last}$${lastData}` : null,
  };
}

/* ---------- zip (stored, no compression) ---------- */
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (b) => { let c = 0xffffffff; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function zip(files) {
  const parts = [], central = []; let offset = 0;
  const now = new Date(); const dt = ((now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1)) & 0xffff; const dd = (((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()) & 0xffff;
  files.forEach(({ name, data }) => {
    const nb = enc.encode(name), db = typeof data === 'string' ? enc.encode(data) : data, crc = crc32(db);
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true); h.setUint16(10, dt, true); h.setUint16(12, dd, true);
    h.setUint32(14, crc, true); h.setUint32(18, db.length, true); h.setUint32(22, db.length, true); h.setUint16(26, nb.length, true); h.setUint16(28, 0, true);
    parts.push(new Uint8Array(h.buffer), nb, db);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true); c.setUint16(12, dt, true); c.setUint16(14, dd, true);
    c.setUint32(16, crc, true); c.setUint32(20, db.length, true); c.setUint32(24, db.length, true); c.setUint16(28, nb.length, true); c.setUint32(42, offset, true);
    central.push(new Uint8Array(c.buffer), nb);
    offset += 30 + nb.length + db.length;
  });
  const cdSize = central.reduce((a, b) => a + b.length, 0);
  const e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, cdSize, true); e.setUint32(16, offset, true);
  const all = [...parts, ...central, new Uint8Array(e.buffer)]; const out = new Uint8Array(all.reduce((a, b) => a + b.length, 0)); let p = 0;
  all.forEach((b) => { out.set(b, p); p += b.length; });
  return out.buffer;
}

/** Build a workbook and return its bytes as an ArrayBuffer. */
export function buildXlsx(sheets, { creator = 'Garlici' } = {}) {
  const used = new Set(); const names = sheets.map((s) => safeSheetName(s.name, used));
  const built = sheets.map(sheetXml);
  const defined = built.map((b, i) => (b.filter ? `<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">${xml(`'${names[i].replace(/'/g, "''")}'!${b.filter}`)}</definedName>` : '')).join('');
  const files = [
    { name: '[Content_Types].xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${names.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>` },
    { name: '_rels/.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>` },
    { name: 'docProps/core.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:creator>${xml(creator)}</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${new Date().toISOString().slice(0, 19)}Z</dcterms:created></cp:coreProperties>` },
    { name: 'docProps/app.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>Garlici</Application></Properties>` },
    { name: 'xl/workbook.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView activeTab="0"/></bookViews><sheets>${names.map((n, i) => `<sheet name="${xml(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets>${defined ? `<definedNames>${defined}</definedNames>` : ''}<calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>` },
    { name: 'xl/_rels/workbook.xml.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${names.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${names.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
    { name: 'xl/styles.xml', data: STYLES },
    ...built.map((b, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: b.xml })),
  ];
  return zip(files);
}
export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
