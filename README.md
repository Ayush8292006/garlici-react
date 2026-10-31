# Garlici

Phone app for Garlici: sales, stock, raw garlic, batches and expiry, expenses, labour and attendance, EMIs, invoices, monthly smart reports, and Excel downloads.

Built with React 19 and Vite. No other runtime libraries: the Excel (.xlsx) writer is built in (`src/lib/xlsx.js`), and jsPDF loads only when you make an invoice PDF.

## Run it

```bash
npm install
npm run dev        # open the URL it prints, e.g. http://localhost:5173
npm run build      # production files in dist/
```

Deploy `dist/` to any static host (Netlify, Vercel, Cloudflare Pages). Then open the site on your phone and choose **Add to Home Screen**: it installs like an app with the Garlici icon and opens full screen.

On a computer the app shows inside a phone frame; on a phone it fills the screen.

## How the app is laid out

- **Bottom tabs:** Home, Sales, **+** (quick add), Stock, More.
- **Quick add (+):** sale, payment, expense, purchase, packaging, delivery, follow-up, electricity, other income, invoice, attendance, lead.
- **More:** every feature as a tile with a live figure, plus Settings and Excel.
- **Lists:** tap any row to see all its details, run its action (mark settled, dispatch, mark received…), edit or delete.

## Excel downloads

- **Excel button** on every list: downloads exactly what is on screen (current filter and search).
- **Stock Excel** on the Stock tab: products, raw & packing material, batches with expiry.
- **Download reports** (More → Excel, or `#export`): choose Sales, Stock, Revenue & profit, or the Full workbook (18 sheets), and a period (this month, last month, last 3 months, this year, all time, or custom dates).

Amounts are real numbers with ₹ formatting, dates are real dates, every sheet has a filter and frozen header, and totals use SUM formulas.

## Where data is saved

`src/lib/store.js` decides this.

- **Inside claude.ai** (the shared prototype), entries sync through the artifact database, so every device you sign in on sees the same books.
- **On your own hosting,** entries are saved in that browser's localStorage. Use **Settings → Download backup** regularly. To sync devices, replace `connect()` and the `REMOTE.doc(...).set / delete` calls in `store.js` with Firebase Firestore or Supabase; data is already grouped into documents named `kind~month` (e.g. `sales~2026-10`).

## Project layout

```
src/
  App.jsx               phone shell: status bar, app bar, tabs, quick add, routing (#page), splash
  styles.css            the whole visual design (beige, white, black)
  config/
    nav.js              screens, tabs and quick-add items
    records.jsx         every record type: fields, filters, summary tiles, actions
    listItems.jsx       how each record looks as a list row
  lib/
    model.js            data model, daily/monthly maths, alerts, stock effects
    store.js            state, saving and sync, downloads
    excel.js            what goes into each Excel report
    xlsx.js             the .xlsx file writer
    pdf.js              invoice PDF
  components/           ui.jsx (tiles, charts, lists), Sheet.jsx (bottom sheets), Lock.jsx (PIN)
  pages/                Home, Reports, Alerts, Money, Stock, Costs, Labour, Invoice, Export, More, Settings, ListPage
public/                 app icon and manifest for "Add to Home Screen"
```

## How stock moves

- A **sale** takes kg out of the product and records a payment (cash/UPI) or a credit entry.
- A **received purchase** adds to raw or packing material.
- **Packaging** adds finished kg, uses raw garlic (kg per kg set on the product) and one pouch or jar per pack, and creates a batch with its best-before date.
- Editing or deleting any of these reverses its effect first, so stock stays correct.
