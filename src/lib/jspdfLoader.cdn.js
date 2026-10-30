// Used by the single-file artifact build: loads the jsPDF UMD build from cdnjs on demand.
let p = null;
export default function loadJsPDF() {
  if (window.jspdf) return Promise.resolve(window.jspdf);
  return (p = p || new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    s.onload = () => res(window.jspdf); s.onerror = rej; document.head.appendChild(s);
  }));
}
