// Loads jsPDF only when an invoice PDF is requested, so it stays out of the main bundle.
export default function loadJsPDF() {
  return import('jspdf');
}
