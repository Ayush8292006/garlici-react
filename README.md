# Garlici

Personal business app for Garlici: sales, stock, raw garlic, batches and expiry, expenses, labour and attendance, EMIs, invoices and monthly smart reports.

Built with React 19 and Vite.

## Run it

```bash
npm install
npm run dev        # open the URL it prints, e.g. http://localhost:5173
npm run build      # production files in dist/
```

Deploy `dist/` to any static host (Netlify, Vercel, Cloudflare Pages, GitHub Pages).

## Where data is saved

`src/lib/store.js` decides this.

- **Inside claude.ai** (the shared prototype), entries sync through the artifact database, so every device you sign in on sees the same books.
- **Anywhere else** (this project on your own computer or host), entries are saved in the browser's localStorage. They stay on that one browser. Use **Settings → Download backup** regularly.

To sync across devices on your own hosting, replace `connect()` and the `REMOTE.doc(...).set / delete` calls in `store.js` with a hosted database such as Firebase Firestore or Supabase. The data is already grouped into documents named `kind~month` (for example `sales~2026-10`), which maps directly onto a Firestore collection.

## Project layout

```
src/
  App.jsx               layout, sidebar, routing (#page), splash, drawer forms
  main.jsx              entry point
  styles.css            the whole visual design (beige, white, black)
  lib/
    format.js           dates, ₹ and kg formatting
    model.js            data model, daily/monthly maths, alerts, stock effects
    store.js            app state, saving and sync, downloads
    pdf.js              invoice PDF
  config/records.jsx    every record type: columns, filters, form fields
  components/           ui.jsx (tiles, charts, tables), Drawer.jsx, Lock.jsx
  pages/                Dashboard, Reports, Alerts, Money, Stock, Costs, Labour, Invoice, Settings, ListPage
```

## How stock moves

- A **sale** takes kg out of the product and records a payment (cash/UPI) or a credit entry.
- A **received purchase** adds to raw or packing material.
- **Packaging** adds finished kg, uses raw garlic (kg per kg set on the product) and one pouch or jar per pack, and creates a batch with its best-before date.
- Editing or deleting any of these reverses its effect first, so stock stays correct.

## Adding a field or a record type

Add the field to the record's `fields` list in `src/config/records.jsx`, and a column to `cols` if it should show in the table. A new record type needs an entry in `KINDS` (and `DATED` if it has a date) in `model.js`, a config in `records.jsx`, and a nav item in `App.jsx`.
