// Every screen, grouped as on the "More" tab. [id, label, icon]
export const NAV = [
  ['Overview', [['dashboard', 'Home', 'home'], ['reports', 'Smart Reports', 'chart'], ['alerts', 'Low Stock & Alerts', 'bell']]],
  ['Sales & Money', [['sales', 'Sales', 'bag'], ['income', 'Daily Income', 'wallet'], ['payments', 'Payments Received', 'coin'], ['credit', 'Credit Given', 'clock'], ['invoice', 'Billing & Invoices', 'doc'], ['profit', 'Daily Profit', 'trend']]],
  ['Stock', [['products', 'Products', 'box'], ['inventory', 'Inventory', 'layers'], ['purchases', 'Purchases', 'cart'], ['batches', 'Batch & Expiry', 'tag'], ['packaging', 'Packaging', 'package']]],
  ['Customers', [['clients', 'Clients', 'users'], ['leads', 'Leads', 'spark'], ['followups', 'Follow-ups', 'phone'], ['recurring', 'Recurring Orders', 'repeat'], ['deliveries', 'Daily Delivery', 'truck']]],
  ['Costs', [['expenses', 'Expenses', 'receipt'], ['electricity', 'Electricity', 'bolt'], ['dues', 'My Dues & EMI', 'bank']]],
  ['Team', [['labour', 'Labour & Attendance', 'user'], ['salary', 'Salary Paid', 'cash']]],
];
export const TITLES = Object.fromEntries([...NAV.flatMap(([, items]) => items.map(([id, l]) => [id, l])), ['settings', 'Settings'], ['export', 'Download Excel'], ['more', 'More']]);
/** The five bottom tabs; null is the centre "+" button. */
export const TABS = [['dashboard', 'Home', 'home'], ['sales', 'Sales', 'bag'], null, ['inventory', 'Stock', 'layers'], ['more', 'More', 'grid']];
/** Quick add sheet: [label, icon, kind or #page] */
export const QUICK = [['Sale', 'bag', 'sales'], ['Payment in', 'coin', 'payments'], ['Expense', 'receipt', 'expenses'], ['Purchase', 'cart', 'purchases'], ['Packaging', 'package', 'packaging'], ['Delivery', 'truck', 'deliveries'], ['Follow-up', 'phone', 'followups'], ['Electricity', 'bolt', 'electricity'], ['Other income', 'wallet', 'income'], ['Invoice', 'doc', '#invoice'], ['Attendance', 'user', '#labour'], ['Lead', 'spark', 'leads']];
