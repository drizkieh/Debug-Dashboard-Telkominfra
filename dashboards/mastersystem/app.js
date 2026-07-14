// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const DEFAULT_SHEET_ID = '1a8MB2MZlViXyoCA45QuOw2ahiipGBmUH0CbzF5CgY0Q'; // sheet gabungan Telkominfra (tab baru bisa ditambahkan di sini)
const COMPANY   = 'PT INTEGRA SOLUSI MANDIRI';
const CUSTOMER  = 'PT MASTERSYSTEM INFOTAMA TBK';
const DATA_UPDATE = '12-Jul-26';
const REF_DATE  = new Date(2026, 6, 12); // tanggal acuan "hari ini" = tanggal update data

// ─── DATA BAWAAN (dari upload terakhir user) ──────────────────────────────────
// invDate/received/dueDate/paidDate: [tahun, bulanIndex0, tanggal] atau null
const RAW_ROWS = [
  { no:'047/INV-ISM/02/25', invDate:[2025,1,25], received:[2025,1,25], top:14, due:[2025,2,11], periode:'Feb-25', status:'CLOSED',
    desc:'Pengadaan Jasa Implementasi Network, Firewall dan Sarana Pendukung DC DRC - PO No. XXAE-RJRMS/PO/0466',
    amount:2760000000, ppn:303600000, pph23:-55200000, ar:3063600000, paid:3008400000, paidDate:[2025,2,6], bupot:'25017ACWK', paidStatus:'FULLY PAID' },
  { no:'048/INV-ISM/02/25', invDate:[2025,1,25], received:[2025,1,25], top:14, due:[2025,2,11], periode:'Feb-25', status:'CLOSED',
    desc:'Pengadaan Jasa Implementasi Firewall Core Network DC-DRC - PO No. XXAE-RJRMS/PO/0465',
    amount:2352942000, ppn:258823620, pph23:-47058840, ar:2611765620, paid:2564706780, paidDate:[2025,2,6], bupot:'25017ACIW', paidStatus:'FULLY PAID' },
  { no:'097/INV-ISM/04/25', invDate:[2025,3,30], received:[2025,3,30], top:14, due:[2025,4,14], periode:'Apr-25', status:'CLOSED',
    desc:'Pengadaan Jasa Instalasi SDWAN - PO No. XXAE-RMRMS/PO/0443',
    amount:1150000000, ppn:126500000, pph23:-23000000, ar:1276500000, paid:1253500000, paidDate:[2025,4,14], bupot:'2502HHZLG', paidStatus:'FULLY PAID' },
  { no:'130R/INV-ISM/04/26', invDate:[2026,3,6], received:[2026,3,21], top:30, due:[2026,4,21], periode:'Apr-26', status:'OPEN',
    desc:'Pekerjaan Instalasi Partial Perangkat Project IOT BGN Peruri Pada 109 SPPG dari 575 SPPG - Implementation - Partial',
    amount:2426434830, ppn:266907831, pph23:-48528697, ar:2693342661, paid:0, paidDate:null, bupot:'', paidStatus:'UNPAID' },
  { no:'131R/INV-ISM/04/26', invDate:[2026,3,6], received:[2026,3,21], top:30, due:[2026,4,21], periode:'Apr-26', status:'OPEN',
    desc:'Pekerjaan Instalasi Fullset Perangkat Project IOT BGN Peruri Pada 109 SPPG dari 575 SPPG - Implementation - Fullset',
    amount:125350000, ppn:13788500, pph23:-2507000, ar:139138500, paid:0, paidDate:null, bupot:'', paidStatus:'UNPAID' },
  { no:'193/INV-ISM/05/26', invDate:[2026,4,18], received:[2026,4,20], top:30, due:[2026,5,19], periode:'May-26', status:'CLOSED',
    desc:'HPE Non Stop Implementation - PO No: XXBF-RJR/PO/415',
    amount:4905000000, ppn:539550000, pph23:-98100000, ar:5444550000, paid:4905000000, paidDate:[2026,4,25], bupot:'', paidStatus:'FULLY PAID' },
  { no:'192/INV-ISM/05/26', invDate:[2026,4,18], received:[2026,4,20], top:30, due:[2026,5,19], periode:'May-26', status:'CLOSED',
    desc:'HPE Non Stop Implementation - PO No: XXAE-RNV/PO/542',
    amount:3815000000, ppn:419650000, pph23:-76300000, ar:4234650000, paid:3815000000, paidDate:[2026,4,25], bupot:'', paidStatus:'FULLY PAID' },
  { no:'207/INV-ISM/05/26', invDate:[2026,4,25], received:[2026,4,29], top:7, due:[2026,5,5], periode:'May-26', status:'CLOSED',
    desc:'SAN Director Module Expansion Implementation - PO No: XXAE-RDC/PO/475',
    amount:3000000000, ppn:330000000, pph23:-60000000, ar:3330000000, paid:3270000000, paidDate:[2026,5,3], bupot:'', paidStatus:'FULLY PAID' },
  { no:'208/INV-ISM/05/26', invDate:[2026,4,25], received:[2026,4,29], top:7, due:[2026,5,5], periode:'May-26', status:'CLOSED',
    desc:'IBM Websphere Application Server Implementation - PO No: XXAE-RDC/PO/588',
    amount:3000000000, ppn:330000000, pph23:-60000000, ar:3330000000, paid:3270000000, paidDate:[2026,5,3], bupot:'', paidStatus:'FULLY PAID' },
  { no:'210/INV-ISM/05/26', invDate:[2026,4,21], received:[2026,4,29], top:14, due:[2026,5,12], periode:'May-26', status:'OPEN',
    desc:'Pekerjaan Instalasi Partial Perangkat Project IOT BGN Peruri pada 464 SPPG dari 575 SPPG, based on PO No: XXAE-RNV/PO/301',
    amount:10329043680, ppn:1136194805, pph23:-206580874, ar:11465238485, paid:5737418933, paidDate:[2026,6,3], bupot:'', paidStatus:'PARTIAL PAID' },
  { no:'225/INV-ISM/06/26', invDate:[2026,5,2], received:[2026,5,5], top:7, due:[2026,5,12], periode:'Jun-26', status:'CLOSED',
    desc:'Data Center Maintenance - PO No: XXBF-RJR/PO/416',
    amount:6000000000, ppn:660000000, pph23:-120000000, ar:6660000000, paid:6540000000, paidDate:[2026,5,8], bupot:'', paidStatus:'FULLY PAID' },
];

// ─── STATE ────────────────────────────────────────────────────────────────────
let rows = [];
let filteredRows = [];
let charts = {};

// ─── UTIL ─────────────────────────────────────────────────────────────────────
function d(arr) { return arr ? new Date(arr[0], arr[1], arr[2]) : null; }
function fmtDate(arr) {
  if (!arr) return '–';
  const D = d(arr);
  const bulan = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${D.getDate()}-${bulan[D.getMonth()]}-${String(D.getFullYear()).slice(2)}`;
}
function fmtIDR(n) { return 'Rp ' + Math.round(n).toLocaleString('id-ID'); }
function fmtM(n) {
  const v = n / 1000000;
  return (Math.round(v * 100) / 100).toLocaleString('id-ID', { minimumFractionDigits: v % 1 === 0 ? 0 : 1, maximumFractionDigits: 2 }) + ' M';
}
function daysBetween(a, b) { return Math.round((b - a) / 86400000); }
function lateDays(row) {
  if (row.paidStatus === 'FULLY PAID') return 0;
  const dd = d(row.due);
  const diff = daysBetween(dd, REF_DATE);
  return diff > 0 ? diff : 0;
}
function outstanding(row) {
  if (row.paidStatus === 'FULLY PAID') return 0;
  return Math.max(0, row.ar - row.paid);
}
function agingBucket(days) {
  if (days <= 0) return 'Current';
  if (days <= 30) return '1 - 30 Days';
  if (days <= 60) return '31 - 60 Days';
  if (days <= 90) return '61 - 90 Days';
  return '> 90 Days';
}
function jobType(desc) {
  return desc.split(' - ')[0].split(',')[0].trim();
}
function badgeStatus(s) { return s === 'CLOSED' ? 'badge-closed' : 'badge-open'; }
function badgePaid(s) {
  if (s === 'FULLY PAID') return 'badge-fully';
  if (s === 'PARTIAL PAID') return 'badge-partial';
  return 'badge-unpaid';
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  rows = RAW_ROWS.map(r => r); // pakai data bawaan sebagai default
  document.getElementById('dataUpdateDate').textContent = DATA_UPDATE + ' 14:16';
  document.getElementById('customerName').textContent = CUSTOMER;
  buildFilterOptions();
  applyFilters();

  ['fCustomer','fPeriode','fTipe','fStatus','fBayar'].forEach(id => {
    document.getElementById(id).addEventListener('change', applyFilters);
  });
});

// ─── FILTERS ──────────────────────────────────────────────────────────────────
function buildFilterOptions() {
  const uniq = (arr) => [...new Set(arr)].sort();

  const custSel = document.getElementById('fCustomer');
  custSel.innerHTML = '<option value="">Semua</option>' +
    uniq(rows.map(r => CUSTOMER)).map(c => `<option value="${c}" selected>${c}</option>`).join('');

  const periodeSel = document.getElementById('fPeriode');
  periodeSel.innerHTML = '<option value="">Semua</option>' +
    uniq(rows.map(r => r.periode)).map(p => `<option value="${p}">${p}</option>`).join('');

  const tipeSel = document.getElementById('fTipe');
  tipeSel.innerHTML = '<option value="">Semua</option>' +
    uniq(rows.map(r => jobType(r.desc))).map(t => `<option value="${t}">${t}</option>`).join('');
}

function resetFilters() {
  ['fCustomer','fPeriode','fTipe','fStatus','fBayar'].forEach(id => document.getElementById(id).value = '');
  applyFilters();
}

function applyFilters() {
  const periode = document.getElementById('fPeriode').value;
  const tipe    = document.getElementById('fTipe').value;
  const status  = document.getElementById('fStatus').value;
  const bayar   = document.getElementById('fBayar').value;

  filteredRows = rows.filter(r =>
    (!periode || r.periode === periode) &&
    (!tipe || jobType(r.desc) === tipe) &&
    (!status || r.status === status) &&
    (!bayar || r.paidStatus === bayar)
  );

  renderAll();
  closeFilterDrawer();
}

// ─── RENDER ALL ───────────────────────────────────────────────────────────────
function renderAll() {
  renderKPI();
  renderDonutStatus();
  renderDonutBayar();
  renderLineChart();
  renderBarChart();
  renderAging();
  renderAccountSummary();
  renderTopOutstanding();
  renderDetailTable();
}

// ─── KPI ──────────────────────────────────────────────────────────────────────
function renderKPI() {
  const n = filteredRows.length;
  const totalAR = filteredRows.reduce((s, r) => s + r.ar, 0);
  const totalPaid = filteredRows.reduce((s, r) => s + r.paid, 0);
  const totalOutstanding = filteredRows.reduce((s, r) => s + outstanding(r), 0);
  const openCount = filteredRows.filter(r => r.status === 'OPEN').length;
  const collectionRate = totalAR ? (totalPaid / totalAR * 100) : 0;
  const avgPaymentDays = n ? Math.round(filteredRows.reduce((s, r) => s + r.top, 0) / n) : 0;
  const overdueCount = filteredRows.filter(r => r.paidStatus === 'UNPAID' && lateDays(r) > 0).length;

  const kpis = [
    { icon:'📄', label:'Total Invoice', val:n, sub:'Invoice' },
    { icon:'Rp', label:'Total AR Amount', val:fmtM(totalAR), sub:'IDR' },
    { icon:'👛', label:'Outstanding AR', val:fmtM(totalOutstanding), sub:'IDR' },
    { icon:'✔', label:'Paid Amount', val:fmtM(totalPaid), sub:'IDR' },
    { icon:'📃', label:'Open Invoice', val:openCount, sub:'Invoice' },
    { icon:'%', label:'Collection Rate', val:collectionRate.toFixed(1) + '%', sub:'Paid / AR Amount' },
    { icon:'📅', label:'Avg Payment Days', val:avgPaymentDays, sub:'Days' },
    { icon:'⚠', label:'Overdue Invoice', val:overdueCount, sub:'Invoice' },
  ];

  document.getElementById('kpiRow').innerHTML = kpis.map(k => `
    <div class="kpi-card">
      <div class="kpi-icon">${k.icon}</div>
      <div>
        <div class="kpi-label">${k.label}</div>
        <div class="kpi-val orange">${k.val}</div>
        <div class="kpi-sub">${k.sub}</div>
      </div>
    </div>
  `).join('');
}

// ─── DONUT: INVOICE STATUS ────────────────────────────────────────────────────
function renderDonutStatus() {
  const closed = filteredRows.filter(r => r.status === 'CLOSED').length;
  const open   = filteredRows.filter(r => r.status === 'OPEN').length;
  const total  = closed + open;

  document.getElementById('donutStatusCenter').innerHTML = `${total}<div class="sm" style="font-size:9px">TOTAL</div>`;

  const ctx = document.getElementById('chartDonutStatus');
  if (charts.donutStatus) charts.donutStatus.destroy();
  charts.donutStatus = new Chart(ctx, {
    type: 'doughnut',
    data: { labels:['Closed','Open'], datasets:[{ data:[closed, open], backgroundColor:['#2f6fe6','#f97316'], borderWidth:0 }] },
    options: { cutout:'70%', plugins:{ legend:{ display:false }, tooltip:{ enabled:true } } }
  });

  document.getElementById('legendStatus').innerHTML = [
    { name:'Closed', val:closed, color:'#2f6fe6' },
    { name:'Open', val:open, color:'#f97316' },
  ].map(e => `
    <div class="legend-row">
      <div class="legend-dot" style="background:${e.color}"></div>
      <div class="legend-name">${e.name.toUpperCase()}</div>
      <div class="legend-pct">${e.val} (${total ? (e.val/total*100).toFixed(1) : 0}%)</div>
    </div>
  `).join('');
}

// ─── DONUT: PAYMENT STATUS ────────────────────────────────────────────────────
function renderDonutBayar() {
  const fully   = filteredRows.filter(r => r.paidStatus === 'FULLY PAID').length;
  const partial = filteredRows.filter(r => r.paidStatus === 'PARTIAL PAID').length;
  const unpaid  = filteredRows.filter(r => r.paidStatus === 'UNPAID').length;
  const total   = fully + partial + unpaid;

  document.getElementById('donutBayarCenter').innerHTML = `${total}<div class="sm" style="font-size:9px">TOTAL</div>`;

  const ctx = document.getElementById('chartDonutBayar');
  if (charts.donutBayar) charts.donutBayar.destroy();
  charts.donutBayar = new Chart(ctx, {
    type: 'doughnut',
    data: { labels:['Fully Paid','Partial Paid','Unpaid'], datasets:[{ data:[fully, partial, unpaid], backgroundColor:['#22c55e','#eab308','#ef4444'], borderWidth:0 }] },
    options: { cutout:'70%', plugins:{ legend:{ display:false } } }
  });

  document.getElementById('legendBayar').innerHTML = [
    { name:'Fully Paid', val:fully, color:'#22c55e' },
    { name:'Partial Paid', val:partial, color:'#eab308' },
    { name:'Unpaid', val:unpaid, color:'#ef4444' },
  ].map(e => `
    <div class="legend-row">
      <div class="legend-dot" style="background:${e.color}"></div>
      <div class="legend-name">${e.name.toUpperCase()}</div>
      <div class="legend-pct">${e.val} (${total ? (e.val/total*100).toFixed(1) : 0}%)</div>
    </div>
  `).join('');
}

// ─── LINE CHART: INVOICE VS COLLECTION ────────────────────────────────────────
function periodeSort(list) {
  return list.sort((a, b) => {
    const da = new Date('1 ' + a.replace('-', ' 20'));
    const db = new Date('1 ' + b.replace('-', ' 20'));
    return da - db;
  });
}

function renderLineChart() {
  const periods = periodeSort([...new Set(filteredRows.map(r => r.periode))]);
  const invByPeriod = periods.map(p => filteredRows.filter(r => r.periode === p).reduce((s, r) => s + r.ar, 0) / 1000000);
  const paidByPeriod = periods.map(p => filteredRows.filter(r => r.periode === p).reduce((s, r) => s + r.paid, 0) / 1000000);

  const ctx = document.getElementById('chartLine');
  if (charts.line) charts.line.destroy();
  charts.line = new Chart(ctx, {
    type: 'line',
    data: {
      labels: periods,
      datasets: [
        { label:'Invoice Amount', data:invByPeriod, borderColor:'#f97316', backgroundColor:'#f97316', tension:0.3 },
        { label:'Paid Amount', data:paidByPeriod, borderColor:'#22c55e', backgroundColor:'#22c55e', tension:0.3 },
      ]
    },
    options: {
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ position:'top', labels:{ color:'#aaa', boxWidth:10, font:{ size:10 } } } },
      scales:{
        x:{ ticks:{ color:'#888', font:{ size:10 } }, grid:{ color:'#222' } },
        y:{ ticks:{ color:'#888', font:{ size:10 }, callback:v=>v }, grid:{ color:'#222' }, title:{ display:true, text:'Miliar', color:'#888', font:{ size:9 } } }
      }
    }
  });
}

// ─── BAR CHART: PAYMENT BY MONTH ──────────────────────────────────────────────
function renderBarChart() {
  const periods = periodeSort([...new Set(filteredRows.map(r => r.periode))]);
  const paidByPeriod = periods.map(p => filteredRows.filter(r => r.periode === p).reduce((s, r) => s + r.paid, 0) / 1000000);

  const ctx = document.getElementById('chartBar');
  if (charts.bar) charts.bar.destroy();
  charts.bar = new Chart(ctx, {
    type: 'bar',
    data: { labels:periods, datasets:[{ label:'Paid Amount', data:paidByPeriod, backgroundColor:'#22c55e', borderRadius:4, maxBarThickness:42 }] },
    options: {
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ display:false } },
      scales:{
        x:{ ticks:{ color:'#888', font:{ size:10 } }, grid:{ display:false } },
        y:{ ticks:{ color:'#888', font:{ size:10 } }, grid:{ color:'#222' }, title:{ display:true, text:'Miliar', color:'#888', font:{ size:9 } } }
      }
    }
  });
}

// ─── AGING RECEIVABLE ─────────────────────────────────────────────────────────
function renderAging() {
  const buckets = ['Current','1 - 30 Days','31 - 60 Days','61 - 90 Days','> 90 Days'];
  const sums = {}; buckets.forEach(b => sums[b] = 0);
  filteredRows.forEach(r => {
    const out = outstanding(r);
    if (out <= 0) return;
    sums[agingBucket(lateDays(r))] += out;
  });
  const total = Object.values(sums).reduce((a, b) => a + b, 0);

  let html = buckets.map(b => `
    <div class="distrib-row">
      <div class="distrib-label">${b}</div>
      <div class="distrib-bar-wrap"><div class="distrib-bar" style="width:${total ? sums[b]/total*100 : 0}%"></div></div>
      <div class="distrib-pct">${total ? (sums[b]/total*100).toFixed(1) : '0.0'}%</div>
    </div>
  `).join('');
  html += `
    <div class="distrib-row" style="border-top:1px solid var(--border);margin-top:4px;padding-top:8px">
      <div class="distrib-label" style="color:var(--text);font-weight:700">TOTAL</div>
      <div style="flex:1;font-size:11px;font-weight:700;color:var(--blue)">${fmtIDR(total)}</div>
      <div class="distrib-pct">100%</div>
    </div>`;
  document.getElementById('agingTable').innerHTML = html;
}

// ─── ACCOUNT SUMMARY ──────────────────────────────────────────────────────────
function renderAccountSummary() {
  const n = filteredRows.length;
  const totalAR = filteredRows.reduce((s, r) => s + r.ar, 0);
  const totalPaid = filteredRows.reduce((s, r) => s + r.paid, 0);
  const totalOutstanding = filteredRows.reduce((s, r) => s + outstanding(r), 0);
  const collectionRate = totalAR ? (totalPaid / totalAR * 100) : 0;
  const avgPaymentDays = n ? Math.round(filteredRows.reduce((s, r) => s + r.top, 0) / n) : 0;
  const overdueCount = filteredRows.filter(r => r.paidStatus === 'UNPAID' && lateDays(r) > 0).length;
  const openCount = filteredRows.filter(r => r.status === 'OPEN').length;
  const closedCount = filteredRows.filter(r => r.status === 'CLOSED').length;

  const rowsHtml = [
    ['Total Invoice Amount', fmtM(totalAR)],
    ['Average Payment Days', avgPaymentDays + ' Days'],
    ['Total Paid Amount', fmtM(totalPaid)],
    ['Overdue Invoice', overdueCount + ' Invoice'],
    ['Total Outstanding', fmtM(totalOutstanding), true],
    ['Open Invoice', openCount + ' Invoice'],
    ['Collection Rate', collectionRate.toFixed(1) + '%'],
    ['Closed Invoice', closedCount + ' Invoice'],
  ];
  document.getElementById('acctSummary').innerHTML = rowsHtml.map(([label, val, hl]) => `
    <div class="acct-row"><span class="acct-label">${label}</span><span class="acct-val ${hl?'hl':''}">${val}</span></div>
  `).join('');
}

// ─── TOP OUTSTANDING INVOICE ──────────────────────────────────────────────────
function renderTopOutstanding() {
  const list = filteredRows
    .map(r => ({ ...r, out: outstanding(r), late: lateDays(r) }))
    .filter(r => r.out > 0)
    .sort((a, b) => b.out - a.out);

  const total = list.reduce((s, r) => s + r.out, 0);

  let html = `
    <thead><tr>
      <th>Invoice No</th><th>Due Date</th><th>Late Days</th><th>Outstanding (IDR)</th><th>Status</th>
    </tr></thead><tbody>`;
  if (!list.length) {
    html += `<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:16px">Tidak ada invoice outstanding</td></tr>`;
  } else {
    html += list.map(r => `
      <tr>
        <td>${r.no}</td>
        <td>${fmtDate(r.due)}</td>
        <td>${r.late}</td>
        <td>${r.out.toLocaleString('id-ID')}</td>
        <td><span class="badge ${badgePaid(r.paidStatus)}">${r.paidStatus}</span></td>
      </tr>`).join('');
  }
  html += `</tbody><tfoot><tr>
    <td colspan="3" style="font-weight:700;color:var(--text)">Total Outstanding</td>
    <td colspan="2" style="font-weight:700;color:var(--blue)">${total.toLocaleString('id-ID')}</td>
  </tr></tfoot>`;
  document.getElementById('topOutstandingTable').innerHTML = html;
}

// ─── DETAIL INVOICE TABLE ─────────────────────────────────────────────────────
function renderDetailTable() {
  document.getElementById('detailCount').textContent = filteredRows.length + ' invoice';

  let html = `
    <thead><tr>
      <th>No Invoice</th><th>Invoice Date</th><th>Invoice Received</th><th>Top (Days)</th><th>Due Date</th>
      <th>Invoice Period</th><th>Status</th><th>Description</th><th>Invoice Amount (IDR)</th>
      <th>AR Amount (IDR)</th><th>Paid Amount (IDR)</th><th>Outstanding (IDR)</th><th>Late Days</th>
      <th>Paid Date</th><th>Payment Status</th>
    </tr></thead><tbody>`;

  if (!filteredRows.length) {
    html += `<tr><td colspan="15" style="text-align:center;color:var(--muted);padding:20px">Tidak ada data sesuai filter</td></tr>`;
  } else {
    html += filteredRows.map(r => `
      <tr>
        <td style="white-space:nowrap;font-weight:600">${r.no}</td>
        <td>${fmtDate(r.invDate)}</td>
        <td>${fmtDate(r.received)}</td>
        <td>${r.top}</td>
        <td>${fmtDate(r.due)}</td>
        <td>${r.periode}</td>
        <td><span class="badge ${badgeStatus(r.status)}">${r.status}</span></td>
        <td style="max-width:280px;white-space:normal;font-size:10.5px;color:var(--muted)">${r.desc}</td>
        <td>${r.ar.toLocaleString('id-ID')}</td>
        <td>${r.ar.toLocaleString('id-ID')}</td>
        <td>${r.paid.toLocaleString('id-ID')}</td>
        <td>${outstanding(r).toLocaleString('id-ID')}</td>
        <td>${lateDays(r)}</td>
        <td>${fmtDate(r.paidDate)}</td>
        <td><span class="badge ${badgePaid(r.paidStatus)}">${r.paidStatus}</span></td>
      </tr>`).join('');

    const sumAR = filteredRows.reduce((s, r) => s + r.ar, 0);
    const sumPaid = filteredRows.reduce((s, r) => s + r.paid, 0);
    const sumOut = filteredRows.reduce((s, r) => s + outstanding(r), 0);
    html += `<tfoot><tr>
      <td colspan="8" style="font-weight:700;color:var(--text)">TOTAL</td>
      <td style="font-weight:700;color:var(--blue)">${sumAR.toLocaleString('id-ID')}</td>
      <td style="font-weight:700;color:var(--blue)">${sumAR.toLocaleString('id-ID')}</td>
      <td style="font-weight:700;color:var(--blue)">${sumPaid.toLocaleString('id-ID')}</td>
      <td style="font-weight:700;color:var(--blue)">${sumOut.toLocaleString('id-ID')}</td>
      <td colspan="3"></td>
    </tr></tfoot>`;
  }
  document.getElementById('detailTable').innerHTML = html;
}

// ─── MOBILE DRAWER ────────────────────────────────────────────────────────────
function openFilterDrawer() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('drawerOverlay').classList.add('open');
}
function closeFilterDrawer() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('drawerOverlay').classList.remove('open');
}

// ─── CONFIG MODAL (Ganti Sheet) ───────────────────────────────────────────────
function openConfig() {
  document.getElementById('cfgSheetId').value = localStorage.getItem('soa_ms_sheet_id') || '';
  document.getElementById('cfgSheetName').value = localStorage.getItem('soa_ms_sheet_name') || '';
  document.getElementById('configModal').style.display = 'flex';
}
function closeConfig() { document.getElementById('configModal').style.display = 'none'; }

function applySheetConfig() {
  const sheetId = document.getElementById('cfgSheetId').value.trim();
  const sheetName = document.getElementById('cfgSheetName').value.trim();
  const errEl = document.getElementById('cfgError');
  if (!sheetId || !sheetName) { errEl.textContent = 'Sheet ID dan Nama Tab wajib diisi.'; errEl.style.display = 'block'; return; }
  errEl.style.display = 'none';

  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;
  fetch(url).then(r => r.text()).then(text => {
    try {
      const json = JSON.parse(text.substring(47, text.length - 2));
      const parsed = parseGvizSheet(json);
      if (!parsed.length) throw new Error('empty');
      rows = parsed;
      localStorage.setItem('soa_ms_sheet_id', sheetId);
      localStorage.setItem('soa_ms_sheet_name', sheetName);
      document.getElementById('sourceIndicator').innerHTML = 'Sumber: <span>Custom Sheet</span>';
      buildFilterOptions();
      applyFilters();
      closeConfig();
    } catch (e) {
      errEl.textContent = 'Gagal parsing data. Pastikan sheet sudah dibagikan (Anyone with link – Viewer) dan struktur kolom sesuai.';
      errEl.style.display = 'block';
    }
  }).catch(() => {
    errEl.textContent = 'Gagal terhubung. Cek Sheet ID, nama tab, dan koneksi internet.';
    errEl.style.display = 'block';
  });
}

// Parser untuk tab Google Sheet dengan header sesuai kolom data SOA
function parseGvizSheet(json) {
  const cols = json.table.cols.map(c => (c.label || '').trim());
  const idx = (name) => cols.findIndex(c => c.toUpperCase().replace(/\s+/g,' ') === name.toUpperCase());
  const num = (c) => c && c.v != null ? Number(c.v) : 0;
  const dateArr = (c) => {
    if (!c || c.v == null) return null;
    if (typeof c.v === 'string' && c.v.startsWith('Date(')) {
      const m = c.v.match(/Date\((\d+),(\d+),(\d+)/);
      if (m) return [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])];
    }
    return null;
  };
  const iNo=idx('NO INVOICE'), iInv=idx('INVOICE DATE'), iRec=idx('INVOICE RECEIVED'),
        iTop=idx('TERM OF PAYMENT'), iDue=idx('INVOICE DUE DATE'), iPer=idx('INVOICE PERIOD'),
        iStat=idx('STATUS'), iDesc=idx('DESCRIPTIONS'), iAmt=idx('AMOUNT'), iPpn=idx('PPN'),
        iPph=idx('PPH 23'), iAr=idx('AR Amount'), iPaid=idx('Paid Amount'), iPaidDate=idx('PAID DATE'),
        iBupot=idx('Bupot PPh23'), iPaidStatus=idx('PAID STATUS');

  return json.table.rows.map(row => {
    const c = row.c;
    if (!c || iNo < 0 || !c[iNo] || !c[iNo].v) return null;
    return {
      no: String(c[iNo].v), invDate: dateArr(c[iInv]), received: dateArr(c[iRec]),
      top: num(c[iTop]), due: dateArr(c[iDue]), periode: c[iPer] ? String(c[iPer].v) : '',
      status: c[iStat] ? String(c[iStat].v).toUpperCase() : '',
      desc: c[iDesc] ? String(c[iDesc].v) : '',
      amount: num(c[iAmt]), ppn: num(c[iPpn]), pph23: num(c[iPph]),
      ar: num(c[iAr]), paid: num(c[iPaid]), paidDate: dateArr(c[iPaidDate]),
      bupot: c[iBupot] ? String(c[iBupot].v) : '',
      paidStatus: c[iPaidStatus] ? String(c[iPaidStatus].v).toUpperCase().trim() : 'UNPAID',
    };
  }).filter(Boolean);
}
