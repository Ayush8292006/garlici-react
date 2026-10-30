// Invoice PDF built with jsPDF, logo drawn from the garlic mark.
import loadJsPDF from './jspdfLoader.js';
import { TODAY, addDays, fmtDY, kg, sum, ym } from './format.js';
import { saveFile, toast } from './store.js';
import { GARLIC_SVG } from '../components/ui.jsx';

export const invNo = (D) => `INV-${TODAY.slice(2, 4)}${TODAY.slice(5, 7)}-${String(D.invoices.filter((i) => ym(i.date) === ym(TODAY)).length + 1).padStart(3, '0')}`;
export const invTotals = (v) => { const sub = sum(v.items, (i) => i.qty * i.rate), disc = +v.disc || 0, tax = ((sub - disc) * (+v.gst || 0)) / 100; return { sub, disc, tax, grand: Math.round(sub - disc + tax) }; };
const rupee = (n) => '₹' + Math.round(n).toLocaleString('en-IN');
export function invText(D, v) {
  const { sub, tax, grand } = invTotals(v);
  return `*${D.biz.name}*\nInvoice ${v.no || invNo(D)} · ${fmtDY(v.date || TODAY)}\nTo: ${v.client}\n\n${v.items.map((i) => `${i.product}: ${i.qty} kg × ₹${i.rate} = ${rupee(i.qty * i.rate)}`).join('\n')}\n\nSubtotal ${rupee(sub)}${+v.disc ? `\nDiscount −${rupee(v.disc)}` : ''}${+v.gst ? `\nGST ${v.gst}%: ${rupee(tax)}` : ''}\n*Total ${rupee(grand)}*${D.biz.upi ? `\n\nPay by UPI: ${D.biz.upi}` : ''}`;
}

function logoPNG(color) {
  return new Promise((res) => {
    try {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="192" height="192" stroke="${color}" stroke-width="3"><circle cx="48" cy="48" r="45" fill="none"/>${GARLIC_SVG}</svg>`;
      const img = new Image();
      img.onload = () => { const c = document.createElement('canvas'); c.width = 192; c.height = 192; c.getContext('2d').drawImage(img, 0, 0, 192, 192); try { res(c.toDataURL('image/png')); } catch { res(null); } };
      img.onerror = () => res(null); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    } catch { res(null); }
  });
}

export async function invoicePDF(D, v) {
  let lib; try { lib = await loadJsPDF(); } catch { toast('The PDF maker could not load. Check your connection.'); return; }
  const doc = new lib.jsPDF({ unit: 'pt', format: 'a4' }); const b = D.biz; const no = v.no || invNo(D); const { sub, disc, tax, grand } = invTotals(v);
  const cl = D.clients.find((c) => c.name === v.client) || {};
  const rs = (n) => 'Rs. ' + Math.round(n).toLocaleString('en-IN'); // core PDF fonts have no ₹ glyph
  const hex = v.accent || '#111111', W = 595, M = 48; let y = 56;
  const logo = await logoPNG(hex); const lx = M + (logo ? 56 : 0);
  if (logo) doc.addImage(logo, 'PNG', M, y - 10, 44, 44);
  doc.setFont('times', 'bold'); doc.setFontSize(22); doc.setTextColor(17, 17, 17); doc.text(b.name || 'Garlici', lx, y + 8);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(100, 95, 88);
  [b.address, [b.gstin ? 'GSTIN ' + b.gstin : '', b.phone].filter(Boolean).join(' · ')].filter(Boolean).forEach((l, i) => doc.text(doc.splitTextToSize(l, 280), lx, y + 24 + i * 12));
  doc.setFont('times', 'bold'); doc.setFontSize(24); doc.setTextColor(hex); doc.text('INVOICE', W - M, y + 8, { align: 'right' });
  doc.setFont('courier', 'normal'); doc.setFontSize(9); doc.setTextColor(100, 95, 88); doc.text([no, fmtDY(v.date || TODAY)], W - M, y + 24, { align: 'right' });
  y = 128; doc.setDrawColor(hex); doc.setLineWidth(1.5); doc.line(M, y, W - M, y); doc.setLineWidth(0.5); doc.line(M, y + 3, W - M, y + 3);
  y += 26; doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(17, 17, 17); doc.text('BILL TO', M, y); doc.text('PAYMENT', W - M, y, { align: 'right' });
  doc.setFontSize(12); doc.text(v.client, M, y + 16); doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(100, 95, 88);
  doc.text([cl.city, cl.phone, cl.gstin ? 'GSTIN ' + cl.gstin : ''].filter(Boolean).join(' · '), M, y + 30);
  doc.text([v.mode === 'Credit' ? 'Due ' + fmtDY(addDays(v.date || TODAY, 15)) : v.mode, b.upi ? 'UPI ' + b.upi : ''].filter(Boolean), W - M, y + 16, { align: 'right' });
  y += 58; const cx = [M, M + 28, W - M - 200, W - M - 110, W - M];
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(100, 95, 88);
  doc.text('#', cx[0], y); doc.text('ITEM', cx[1], y); doc.text('WEIGHT', cx[2], y, { align: 'right' }); doc.text('RATE / KG', cx[3], y, { align: 'right' }); doc.text('AMOUNT', cx[4], y, { align: 'right' });
  doc.setDrawColor(17, 17, 17); doc.line(M, y + 6, W - M, y + 6); y += 24; doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(17, 17, 17);
  v.items.forEach((it, i) => {
    doc.text(String(i + 1), cx[0], y); doc.text(it.product, cx[1], y); doc.setFontSize(7.5); doc.setTextColor(100, 95, 88); doc.text('HSN 0712', cx[1], y + 10); doc.setFontSize(10); doc.setTextColor(17, 17, 17);
    doc.text(kg(+it.qty), cx[2], y, { align: 'right' }); doc.text(rs(+it.rate), cx[3], y, { align: 'right' }); doc.text(rs(it.qty * it.rate), cx[4], y, { align: 'right' });
    doc.setDrawColor(226, 217, 202); doc.setLineDashPattern([2, 2], 0); doc.line(M, y + 16, W - M, y + 16); doc.setLineDashPattern([], 0); y += 30; if (y > 700) { doc.addPage(); y = 60; }
  });
  y += 6; const tl = [['Subtotal', rs(sub)]]; if (disc) tl.push(['Discount', '- ' + rs(disc)]); if (+v.gst) { tl.push([`CGST ${v.gst / 2}%`, rs(tax / 2)]); tl.push([`SGST ${v.gst / 2}%`, rs(tax / 2)]); }
  tl.forEach(([l, a]) => { doc.text(l, W - M - 200, y); doc.text(a, W - M, y, { align: 'right' }); y += 16; });
  doc.setDrawColor(17, 17, 17); doc.line(W - M - 200, y - 6, W - M, y - 6); doc.setFont('times', 'bold'); doc.setFontSize(16); doc.text('Total', W - M - 200, y + 12); doc.text(rs(grand), W - M, y + 12, { align: 'right' });
  y += 70; doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(100, 95, 88); doc.text(doc.splitTextToSize(b.terms || '', 260), M, y);
  if (v.mode !== 'Credit') { doc.setDrawColor(hex); doc.setTextColor(hex); doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.roundedRect(W / 2 - 30, y - 14, 62, 24, 4, 4); doc.text('PAID', W / 2 + 1, y + 3, { align: 'center' }); }
  doc.setDrawColor(17, 17, 17); doc.line(W - M - 150, y + 20, W - M, y + 20); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(100, 95, 88); doc.text('Authorised signatory', W - M - 75, y + 32, { align: 'center' });
  await saveFile(`${no} ${v.client}.pdf`.replace(/[\\/:*?"<>|]/g, ''), doc.output('arraybuffer'), 'application/pdf', 'Invoice PDF saved');
}
