// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const DEFAULT_SHEET_ID   = '1a8MB2MZlViXyoCA45QuOw2ahiipGBmUH0CbzF5CgY0Q';
const DEFAULT_SHEET_NAME = 'Sheet1';
const DEFAULT_DETAIL_SHEET_NAME = 'Detail';
const DEFAULT_PO_MASTER_SHEET_NAME = 'PO Master';
const DEFAULT_PWD_SHEET_NAME = 'Password';

const PERIODE_ORDER = [
  'Januari','Februari','Maret','April','Mei','Juni',
  'Juli','Agustus','September','Oktober','November','Desember'
];
const PERIODE_ORDER_EN = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

const TIPE_COLORS = {
  'Reenginering':          '#e63c2f',
  'Recbatt':               '#f97316',
  'CET':                   '#eab308',
  'Validasi Inaktif Radio':'#ec4899',
};
function tipeColor(t) { return TIPE_COLORS[t] || '#888'; }

// ─── STATE ────────────────────────────────────────────────────────────────────
let rawData      = [];
let filteredData = [];
let detailData   = [];
let poMasterData = [];
let sheetPdfPin  = ''; // PIN/password diambil dari tab "Password" di Google Sheets (bukan localStorage)
let currentTableRows = [];
let showAll      = false;
let charts       = {};
let activeTab    = 'default';

// PDF password state
let _pendingPdfUrl   = '';
let _pendingPdfTitle = '';
let _pendingPdfAction = ''; // 'view' | 'download'

// ─── INIT ─────────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  document.querySelector('.table-wrap')?.addEventListener('click', e => {
    const link = e.target.closest('.inv-link');
    if (!link) return;
    const idx = parseInt(link.dataset.idx, 10);
    const row = currentTableRows[idx];
    if (row) openInvoiceDetail(row);
  });

  document.getElementById('milestoneList')?.addEventListener('click', e => {
    const item = e.target.closest('.milestone-item');
    if (!item || !item.dataset.po) return;
    openPOMilestoneDetail(item.dataset.po);
  });

  // Allow pressing Enter in PDF password field
  document.getElementById('pdfPwdField')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') checkPdfPwd();
  });

  const savedId   = localStorage.getItem('inv_sheet_id');
  const savedName = localStorage.getItem('inv_sheet_name') || DEFAULT_SHEET_NAME;
  const savedDetailName = localStorage.getItem('inv_detail_sheet_name') || DEFAULT_DETAIL_SHEET_NAME;
  const savedPOMasterName = localStorage.getItem('inv_po_master_sheet_name') || DEFAULT_PO_MASTER_SHEET_NAME;
  const savedSrc  = localStorage.getItem('inv_source') || 'default';

  if (savedSrc === 'demo') {
    loadDemo();
  } else if (savedSrc === 'custom' && savedId) {
    setSourceIndicator('Custom Sheet');
    fetchSheetData(savedId, savedName, savedDetailName, savedPOMasterName);
  } else {
    setSourceIndicator('Sheet Default');
    fetchSheetData(DEFAULT_SHEET_ID, savedName, savedDetailName, savedPOMasterName);
  }
});

// ─── MOBILE ──────────────────────────────────────────────────────────────────
function openFilterDrawer() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('drawerOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeFilterDrawer() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('drawerOverlay').classList.remove('open');
  document.body.style.overflow = '';
}
function scrollToTable() {
  const el = document.querySelector('.table-card');
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ─── PDF PASSWORD SYSTEM ──────────────────────────────────────────────────────
function getPdfPassword() {
  return sheetPdfPin || '';
}

function togglePwdVisibility() {
  const inp = document.getElementById('pdfPwdField');
  inp.type = inp.type === 'password' ? 'text' : 'password';
}

// Called when user clicks "Lihat Dokumen PO" or "Download PDF PO"
function requestPdfAccess(url, title, action) {
  const pwd = getPdfPassword();
  if (!pwd) {
    // No password set — open directly
    if (action === 'download') {
      openDownloadDirect(url);
    } else {
      openPdfViewer(url, title);
    }
    return;
  }
  // Password required — show prompt
  _pendingPdfUrl    = url;
  _pendingPdfTitle  = title;
  _pendingPdfAction = action;
  document.getElementById('pdfPwdField').value = '';
  document.getElementById('pdfPwdError').textContent = '';
  document.getElementById('pdfPwdDesc').textContent =
    `Masukkan password untuk mengakses dokumen: "${title}"`;
  document.getElementById('pdfPwdOverlay').style.display = 'flex';
  setTimeout(() => document.getElementById('pdfPwdField').focus(), 100);
}

function checkPdfPwd() {
  const entered = document.getElementById('pdfPwdField').value;
  const correct = getPdfPassword();
  if (entered === correct) {
    closePdfPwd();
    if (_pendingPdfAction === 'download') {
      openDownloadDirect(_pendingPdfUrl);
    } else {
      openPdfViewer(_pendingPdfUrl, _pendingPdfTitle);
    }
  } else {
    document.getElementById('pdfPwdError').textContent = '❌ Password salah. Coba lagi.';
    document.getElementById('pdfPwdField').select();
  }
}

function closePdfPwd() {
  document.getElementById('pdfPwdOverlay').style.display = 'none';
  document.getElementById('pdfPwdField').value = '';
  document.getElementById('pdfPwdError').textContent = '';
}

// For Google Drive links, force a direct-download URL instead of the
// share/view link (which just opens Drive's preview page in a new tab).
function getPdfDownloadUrl(url) {
  const driveId = extractDriveFileId(url);
  if (driveId) {
    return `https://drive.google.com/uc?export=download&id=${driveId}`;
  }
  return url;
}

function openDownloadDirect(url) {
  const a = document.createElement('a');
  a.href = getPdfDownloadUrl(url);
  a.target = '_blank';
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// Extract a Google Drive file ID from common share-link formats.
// Handles:
//   https://drive.google.com/file/d/FILE_ID/view?usp=sharing
//   https://drive.google.com/open?id=FILE_ID
//   https://drive.google.com/uc?id=FILE_ID&export=download
// Returns null if the URL doesn't look like a Google Drive link.
function extractDriveFileId(url) {
  if (!url) return null;
  let m = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (m) return m[1];
  m = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (m) return m[1];
  return null;
}

// Build the best embeddable preview URL for a given PDF link.
// Google Drive links use Drive's own /preview endpoint (far more reliable
// than the old Google Docs gview embed, which frequently fails to load
// external/Drive links and just shows a blank "no preview" state).
// Non-Drive links fall back to the Google Docs viewer as before.
function getPdfEmbedUrl(url) {
  const driveId = extractDriveFileId(url);
  if (driveId) {
    return `https://drive.google.com/file/d/${driveId}/preview`;
  }
  return `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`;
}

function openPdfViewer(url, title) {
  document.getElementById('pdfViewerTitle').textContent = `📄 ${title}`;
  document.getElementById('pdfViewerDownload').href = getPdfDownloadUrl(url);

  // Try iframe embed; some PDF hosts block iframe
  const body = document.getElementById('pdfViewerBody');
  const embedUrl = getPdfEmbedUrl(url);
  body.innerHTML = `<iframe src="${embedUrl}" class="pdf-iframe-wrap" allowfullscreen></iframe>`;

  document.getElementById('pdfViewerOverlay').style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closePdfViewer() {
  document.getElementById('pdfViewerOverlay').style.display = 'none';
  document.getElementById('pdfViewerBody').innerHTML = '';
  document.body.style.overflow = '';
}

// ─── INVOICE DETAIL MODAL ────────────────────────────────────────────────────
function openInvoiceDetail(inv) {
  const noInv = inv['No Invoice'];
  document.getElementById('detailModalTitle').textContent = `📄 Detail Invoice — ${noInv}`;

  const statusRaw = String(inv['Paid']||'').trim().toLowerCase();
  const statusHtml = statusRaw === 'paid'
    ? `<span class="badge badge-green">Paid</span>`
    : statusRaw === 'unpaid'
      ? `<span class="badge badge-gray">Unpaid</span>`
      : `<span class="badge badge-gray">–</span>`;

  document.getElementById('detailInfoGrid').innerHTML = `
    <div class="detail-info-item"><div class="di-label">ACT ID</div><div class="di-val">${inv['ACT ID']||'–'}</div></div>
    <div class="detail-info-item"><div class="di-label">No PO</div><div class="di-val">${inv['No PO']||'–'}</div></div>
    <div class="detail-info-item"><div class="di-label">No BAST</div><div class="di-val">${inv['No BAST']||'–'}</div></div>
    <div class="detail-info-item"><div class="di-label">Status</div><div class="di-val">${statusHtml}</div></div>
    <div class="detail-info-item"><div class="di-label">Periode</div><div class="di-val">${inv['Periode']||'–'} ${inv['Tahun']||''}</div></div>
    <div class="detail-info-item"><div class="di-label">Tipe Pekerjaan</div><div class="di-val">${inv['Tipe Pekerjaan']||'–'}</div></div>
    <div class="detail-info-item"><div class="di-label">Value Invoice</div><div class="di-val" style="color:var(--orange)">Rp ${Number(inv['Value Invoice']||0).toLocaleString('id-ID')}</div></div>
    <div class="detail-info-item"><div class="di-label">Bulan Tanggal</div><div class="di-val">${inv['Bulan Tanggal']||'–'}</div></div>
  `;

  const pdfLink = String(inv['Link PDF']||'').trim();
  document.getElementById('detailPdfRow').innerHTML = pdfLink
    ? `<button class="btn-pdf" onclick="requestPdfAccess('${pdfLink}','Invoice ${noInv}','view')">📄 Lihat PDF Invoice</button>
       <button class="btn-pdf" style="background:var(--bg3);color:var(--muted);border:1px solid var(--border)" onclick="requestPdfAccess('${pdfLink}','Invoice ${noInv}','download')">⬇ Download</button>`
    : `<span class="btn-pdf disabled">📄 PDF belum tersedia</span>`;

  const items = detailData.filter(d => d['No Invoice'] === noInv);
  const body = document.getElementById('detailItemsBody');
  const foot = document.getElementById('detailItemsFoot');

  if (!items.length) {
    body.innerHTML = `<tr><td colspan="14" class="detail-empty">Belum ada data detail item untuk invoice ini.</td></tr>`;
    foot.innerHTML = '';
  } else {
    body.innerHTML = items.map((it, i) => `
      <tr>
        <td>${i+1}</td>
        <td>${it['PO Item']||'–'}</td>
        <td>${it['Nama Pekerjaan']||'–'}</td>
        <td>${it['Site ID']||'–'}</td>
        <td>${it['ACT ID']||'–'}</td>
        <td>${Number(it['Price Per Unit']||0).toLocaleString('id-ID')}</td>
        <td>${it['Qty']||'–'}</td>
        <td>${it['Unit']||'–'}</td>
        <td>${Number(it['Total Price']||0).toLocaleString('id-ID')}</td>
        <td>${Number(it['Total Billed']||0).toLocaleString('id-ID')}</td>
        <td>${it['Delivery Progress (%)']||0}%</td>
        <td>${Number(it['GR Amount']||0).toLocaleString('id-ID')}</td>
        <td>${it['GR Progress (%)']||0}%</td>
        <td>${Number(it['Balance']||0).toLocaleString('id-ID')}</td>
      </tr>
    `).join('');
    const sum = key => items.reduce((s,it) => s + (+it[key]||0), 0);
    foot.innerHTML = `
      <tr>
        <td colspan="8">TOTAL</td>
        <td>${sum('Total Price').toLocaleString('id-ID')}</td>
        <td>${sum('Total Billed').toLocaleString('id-ID')}</td>
        <td>–</td>
        <td>${sum('GR Amount').toLocaleString('id-ID')}</td>
        <td>–</td>
        <td>${sum('Balance').toLocaleString('id-ID')}</td>
      </tr>
    `;
  }
  document.getElementById('invoiceDetailModal').style.display = 'flex';
}
function closeInvoiceDetail() {
  document.getElementById('invoiceDetailModal').style.display = 'none';
}

// ─── TAB SWITCH ───────────────────────────────────────────────────────────────
function switchTab(tab) {
  activeTab = tab;
  ['default','custom','demo'].forEach(t => {
    document.getElementById('tab' + t.charAt(0).toUpperCase() + t.slice(1)).classList.toggle('active', t===tab);
    document.getElementById('panel' + t.charAt(0).toUpperCase() + t.slice(1)).classList.toggle('active', t===tab);
  });
  document.getElementById('defaultError').style.display = 'none';
  document.getElementById('configError').style.display  = 'none';
}

// ─── CONFIG ───────────────────────────────────────────────────────────────────
function openConfig() {
  const src = localStorage.getItem('inv_source') || 'default';
  switchTab(src === 'custom' ? 'custom' : src === 'demo' ? 'demo' : 'default');
  const savedDetailName   = localStorage.getItem('inv_detail_sheet_name') || DEFAULT_DETAIL_SHEET_NAME;
  const savedPOMasterName = localStorage.getItem('inv_po_master_sheet_name') || DEFAULT_PO_MASTER_SHEET_NAME;
  document.getElementById('defaultDetailSheetName').value   = savedDetailName;
  document.getElementById('detailSheetNameInput').value     = savedDetailName;
  document.getElementById('defaultPOMasterSheetName').value = savedPOMasterName;
  document.getElementById('poMasterSheetNameInput').value   = savedPOMasterName;
  if (src === 'custom') {
    document.getElementById('sheetIdInput').value   = localStorage.getItem('inv_sheet_id') || '';
    document.getElementById('sheetNameInput').value = localStorage.getItem('inv_sheet_name') || DEFAULT_SHEET_NAME;
  }
  document.getElementById('configModal').style.display = 'flex';
}
function hideConfig() {
  document.getElementById('configModal').style.display = 'none';
}

function connectDefault() {
  const name         = document.getElementById('defaultSheetName').value.trim() || DEFAULT_SHEET_NAME;
  const detailName   = document.getElementById('defaultDetailSheetName').value.trim() || DEFAULT_DETAIL_SHEET_NAME;
  const poMasterName = document.getElementById('defaultPOMasterSheetName').value.trim() || DEFAULT_PO_MASTER_SHEET_NAME;
  localStorage.setItem('inv_source',     'default');
  localStorage.setItem('inv_sheet_name', name);
  localStorage.setItem('inv_detail_sheet_name', detailName);
  localStorage.setItem('inv_po_master_sheet_name', poMasterName);
  localStorage.removeItem('inv_sheet_id');
  hideConfig();
  setSourceIndicator('Sheet Default');
  showLoading('Menghubungkan ke Sheet Default…');
  fetchSheetData(DEFAULT_SHEET_ID, name, detailName, poMasterName);
}

function connectCustom() {
  const id           = document.getElementById('sheetIdInput').value.trim();
  const name         = document.getElementById('sheetNameInput').value.trim() || DEFAULT_SHEET_NAME;
  const detailName   = document.getElementById('detailSheetNameInput').value.trim() || DEFAULT_DETAIL_SHEET_NAME;
  const poMasterName = document.getElementById('poMasterSheetNameInput').value.trim() || DEFAULT_PO_MASTER_SHEET_NAME;
  if (!id) { showErr('configError', 'Sheet ID tidak boleh kosong.'); return; }
  localStorage.setItem('inv_source',     'custom');
  localStorage.setItem('inv_sheet_id',   id);
  localStorage.setItem('inv_sheet_name', name);
  localStorage.setItem('inv_detail_sheet_name', detailName);
  localStorage.setItem('inv_po_master_sheet_name', poMasterName);
  hideConfig();
  setSourceIndicator('Custom Sheet');
  showLoading('Mengambil data dari Google Sheets…');
  fetchSheetData(id, name, detailName, poMasterName);
}

function useDummyData() {
  localStorage.setItem('inv_source', 'demo');
  localStorage.removeItem('inv_sheet_id');
  hideConfig();
  setSourceIndicator('Data Demo');
  loadDemo();
}
function loadDemo() {
  showLoading('Memuat data demo…');
  setTimeout(() => {
    rawData      = generateDummyData();
    detailData   = generateDummyDetailData(rawData);
    poMasterData = generateDummyPOMasterData();
    sheetPdfPin  = '1234'; // contoh PIN untuk mode demo
    onDataReady();
  }, 600);
}

function showErr(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg; el.style.display = 'block';
}
function setSourceIndicator(label) {
  document.getElementById('sourceIndicator').innerHTML = `Sumber: <span>${label}</span>`;
}

// ─── FETCH SHEET ──────────────────────────────────────────────────────────────
function fetchSheetData(sheetId, sheetName, detailSheetName, poMasterSheetName) {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;
  fetch(url)
    .then(r => r.text())
    .then(text => {
      try {
        const json = JSON.parse(text.substring(47, text.length - 2));
        rawData = parseGvizData(json);
        onDataReady();
      } catch(e) {
        hideLoading();
        showConfig_withError('Gagal parsing data. Cek apakah sheet sudah dibagikan (Anyone with link – Viewer).');
        return;
      }
      fetchDetailSheetData(sheetId, detailSheetName || DEFAULT_DETAIL_SHEET_NAME);
      fetchPOMasterData(sheetId, poMasterSheetName || DEFAULT_PO_MASTER_SHEET_NAME);
      fetchPwdSheetData(sheetId);
    })
    .catch(() => {
      hideLoading();
      showConfig_withError('Gagal terhubung. Cek Sheet ID dan koneksi internet.');
    });
}

function fetchDetailSheetData(sheetId, detailSheetName) {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(detailSheetName)}`;
  fetch(url)
    .then(r => r.text())
    .then(text => {
      try {
        const json = JSON.parse(text.substring(47, text.length - 2));
        detailData = parseGvizDetailData(json);
      } catch(e) { detailData = []; }
    })
    .catch(() => { detailData = []; });
}

function fetchPOMasterData(sheetId, poMasterSheetName) {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(poMasterSheetName)}`;
  fetch(url)
    .then(r => r.text())
    .then(text => {
      try {
        const json = JSON.parse(text.substring(47, text.length - 2));
        poMasterData = parseGvizPOMasterData(json);
      } catch(e) { poMasterData = []; }
      renderMilestonePO(filteredData);
      renderKpiNilaiPO(filteredData);
    })
    .catch(() => { poMasterData = []; renderMilestonePO(filteredData); renderKpiNilaiPO(filteredData); });
}

// Tab "Password" berisi PIN untuk buka/download PDF PO & Invoice.
// Cukup 1 kolom (header bebas, misal "PIN" atau "Password") + 1 baris data berisi PIN-nya.
// Kalau tab-nya tidak ada / kosong, PDF dianggap tanpa proteksi (langsung terbuka).
function fetchPwdSheetData(sheetId) {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(DEFAULT_PWD_SHEET_NAME)}`;
  fetch(url)
    .then(r => r.text())
    .then(text => {
      try {
        const json = JSON.parse(text.substring(47, text.length - 2));
        sheetPdfPin = parseGvizPwdData(json);
      } catch(e) { sheetPdfPin = ''; }
    })
    .catch(() => { sheetPdfPin = ''; });
}

function parseGvizPwdData(json) {
  const rows = json.table.rows;
  if (!rows || !rows.length) return '';
  const firstRow = rows[0];
  if (!firstRow || !firstRow.c || !firstRow.c.length) return '';
  const cell = firstRow.c.find(c => c && c.v !== null && c.v !== undefined && String(c.v).trim() !== '');
  return cell ? String(cell.v).trim() : '';
}

function showConfig_withError(msg) {
  openConfig();
  const errId = activeTab === 'custom' ? 'configError' : 'defaultError';
  showErr(errId, msg);
}

function parseGvizData(json) {
  const cols = json.table.cols.map(c => c.label);
  return json.table.rows
    .map(row => {
      const obj = {};
      cols.forEach((col, i) => {
        const cell = row.c[i];
        obj[col] = cell ? (cell.v !== null && cell.v !== undefined ? cell.v : '') : '';
      });
      return obj;
    })
    .filter(r => r['No Invoice']);
}

function parseGvizDetailData(json) {
  const cols = json.table.cols.map(c => c.label);
  return json.table.rows
    .map(row => {
      const obj = {};
      cols.forEach((col, i) => {
        const cell = row.c[i];
        obj[col] = cell ? (cell.v !== null && cell.v !== undefined ? cell.v : '') : '';
      });
      return obj;
    })
    .filter(r => r['No Invoice']);
}

function parseGvizPOMasterData(json) {
  const cols = json.table.cols.map(c => c.label);
  return json.table.rows
    .map(row => {
      const obj = {};
      cols.forEach((col, i) => {
        const cell = row.c[i];
        obj[col] = cell ? (cell.v !== null && cell.v !== undefined ? cell.v : '') : '';
      });
      return obj;
    })
    .filter(r => r['No PO']);
}

// ─── DUMMY DATA ───────────────────────────────────────────────────────────────
function generateDummyData() {
  const invoices = [];
  const tipes = ['Reenginering','Reenginering','Reenginering','Recbatt','Recbatt','CET','Validasi Inaktif Radio'];
  const pos   = ['4110006476','4110006233','4110006956','4110006744','4110006527','4110006599','4110006798','4110007034','4110006687','4110006769'];
  const acts  = ['2605000327','2606000267','2606000266','2606000269','2605000312','2606000270','2606000271','2606000280'];
  const months = [
    {periode:'Desember', tahun:2025, bulanTgl:'December 2025', w:1},
    {periode:'Januari',  tahun:2026, bulanTgl:'January 2026',  w:0},
    {periode:'Februari', tahun:2026, bulanTgl:'February 2026', w:2},
    {periode:'Maret',    tahun:2026, bulanTgl:'March 2026',    w:6},
    {periode:'April',    tahun:2026, bulanTgl:'April 2026',    w:7},
    {periode:'Mei',      tahun:2026, bulanTgl:'May 2026',      w:11},
    {periode:'Juni',     tahun:2026, bulanTgl:'June 2026',     w:28},
  ];
  let invNum = 229;
  months.forEach((m, mi) => {
    const count = Math.max(m.w > 0 ? 1 : 0, Math.round(m.w * 2.1));
    for (let i = 0; i < count; i++) {
      const tipe    = tipes[Math.floor(Math.random() * tipes.length)];
      const po      = pos[Math.floor(Math.random() * pos.length)];
      const act     = acts[Math.floor(Math.random() * acts.length)];
      const baseVal = tipe==='Reenginering'?150e6 : tipe==='Recbatt'?80e6 : tipe==='CET'?200e6 : 120e6;
      const val     = Math.round(baseVal * (0.5 + Math.random()*2.5) / 1000) * 1000;
      const bastNum = String(Math.floor(Math.random()*999)+1).padStart(3,'0');
      const romawi  = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'][mi];
      const paid    = Math.random() < 0.65 ? 'Paid' : 'Unpaid';
      const noInvoice = `${invNum}-INV-ISM-${String(m.tahun).slice(2)}-${String(mi+1).padStart(2,'0')}`;
      invoices.push({
        'No Invoice':     noInvoice,
        'ACT ID':         act,
        'No PO':          po,
        'No BAST':        `${bastNum}/ISM-BAST/${po}/${romawi}/${m.tahun}`,
        'Value Invoice':  val,
        'Periode':        m.periode,
        'Tahun':          m.tahun,
        'Bulan Tanggal':  m.bulanTgl,
        'Tipe Pekerjaan': tipe,
        'Paid':           paid,
        'Link PDF':       '',
      });
      invNum++;
    }
  });
  return invoices;
}

function generateDummyPOMasterData() {
  return [
    { 'No PO':'4110006476','Nama Pekerjaan':'Reengineering Site Jabodetabek',  'Nilai PO':950e6,  'Link PDF PO':'' },
    { 'No PO':'4110006233','Nama Pekerjaan':'Recbatt Regional Jawa Barat',     'Nilai PO':620e6,  'Link PDF PO':'' },
    { 'No PO':'4110006956','Nama Pekerjaan':'CET Site Migration',              'Nilai PO':1450e6, 'Link PDF PO':'' },
    { 'No PO':'4110006744','Nama Pekerjaan':'Validasi Inaktif Radio Nasional', 'Nilai PO':780e6,  'Link PDF PO':'' },
    { 'No PO':'4110006527','Nama Pekerjaan':'Reengineering Site Jawa Tengah',  'Nilai PO':890e6,  'Link PDF PO':'' },
    { 'No PO':'4110006599','Nama Pekerjaan':'Recbatt Regional Sumatera',       'Nilai PO':540e6,  'Link PDF PO':'' },
    { 'No PO':'4110006798','Nama Pekerjaan':'CET Optimasi Jaringan',           'Nilai PO':1100e6, 'Link PDF PO':'' },
    { 'No PO':'4110007034','Nama Pekerjaan':'Reengineering Site Jawa Timur',   'Nilai PO':1020e6, 'Link PDF PO':'' },
    { 'No PO':'4110006687','Nama Pekerjaan':'Validasi Inaktif Radio Regional', 'Nilai PO':460e6,  'Link PDF PO':'' },
    { 'No PO':'4110006769','Nama Pekerjaan':'Recbatt Regional Kalimantan',     'Nilai PO':610e6,  'Link PDF PO':'' },
  ];
}

function generateDummyDetailData(invoices) {
  const siteNames = ['PAD019','PAD185','PAD503','PAD542','PAD572','BKS021','BKS114','TGR087'];
  const jobs = [
    { name: 'Dismantle ANT3_Sum',           price: 869400 },
    { name: 'Reposisi RRU+Ins Mat_Sum',     price: 1938418 },
    { name: 'Site Survey_Sum',              price: 433382 },
    { name: 'Antenna Modernization Service', price: 15264802 },
    { name: '1st Tier Optim (2 Tech)_Sum',  price: 5930550 },
  ];
  const rows = [];
  let poItem = 10;
  invoices.forEach(inv => {
    const lineCount = 1 + Math.floor(Math.random() * 3);
    const site = siteNames[Math.floor(Math.random() * siteNames.length)];
    for (let i = 0; i < lineCount; i++) {
      const job = jobs[Math.floor(Math.random() * jobs.length)];
      const qty = 1 + Math.floor(Math.random() * 3);
      const total = job.price * qty;
      rows.push({
        'No Invoice':            inv['No Invoice'],
        'PO Item':               poItem,
        'Nama Pekerjaan':        `${site}_${job.name}`,
        'Price Per Unit':        job.price,
        'Qty':                   qty,
        'Unit':                  'UNT',
        'Total Price':           total,
        'Total Billed':          total,
        'Delivery Progress (%)': 100,
        'GR Amount':             total,
        'GR Progress (%)':       100,
        'Balance':               0,
        'ACT ID':                inv['ACT ID'],
        'Site ID':               site,
      });
      poItem += 10;
    }
  });
  return rows;
}

// ─── ON DATA READY ────────────────────────────────────────────────────────────
function onDataReady() {
  document.getElementById('data-update-date').textContent =
    new Date().toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'});
  populateFilters();
  applyFilters();
  hideLoading();
}

// ─── SORTING / GROUPING HELPERS ───────────────────────────────────────────────
function groupByPeriode(data) {
  const map = {};
  data.forEach(r => {
    const p = String(r['Periode'] || '').trim();
    const t = String(r['Tahun']   || '').trim();
    if (!p) return;
    const key = `${p}|${t}`;
    if (!map[key]) map[key] = 0;
    map[key] += (+r['Value Invoice'] || 0);
  });
  const keys = Object.keys(map).sort((a, b) => {
    const [pa, ta] = a.split('|');
    const [pb, tb] = b.split('|');
    const ya = parseInt(ta) || 0, yb = parseInt(tb) || 0;
    if (ya !== yb) return ya - yb;
    return periodeIndex(pa) - periodeIndex(pb);
  });
  return { map, keys };
}

function periodeIndex(p) {
  let i = PERIODE_ORDER.indexOf(p);
  if (i === -1) i = PERIODE_ORDER_EN.indexOf(p);
  return i === -1 ? 99 : i;
}

function periodeLabel(key) {
  const [p, t] = key.split('|');
  return `${p} ${t}`;
}

// ─── FORMAT HELPERS ───────────────────────────────────────────────────────────
/**
 * Format a rupiah value with explicit unit label.
 * Returns e.g.  "Rp 1,23 Miliar" / "Rp 450,00 Juta" / "Rp 850.000"
 */
function formatRp(v) {
  const abs = Math.abs(v);
  if (abs >= 1e9) return `Rp ${(v/1e9).toFixed(2)} Miliar`;
  if (abs >= 1e6) return `Rp ${(v/1e6).toFixed(2)} Juta`;
  return `Rp ${v.toLocaleString('id-ID')}`;
}

/**
 * Compact KPI label — always shows unit suffix.
 * e.g. "1,23 M" (Miliar), "450 Jt" (Juta)
 */
function formatKpi(v) {
  const abs = Math.abs(v);
  if (abs >= 1e9) return `${(v/1e9).toFixed(2)} M`;
  if (abs >= 1e6) return `${(v/1e6).toFixed(0)} Jt`;
  return v.toLocaleString('id-ID');
}

/**
 * For tooltip / sidebar summary — full Rp with unit
 */
function formatM(v) { return formatRp(v); }

/**
 * Monthly list value: always show amount + explicit unit badge info
 * Returns { amount: string, unit: string }
 */
function formatMonthly(v) {
  const abs = Math.abs(v);
  if (abs >= 1e9) return { amount: `Rp ${(v/1e9).toFixed(3)}`, unit: 'Miliar' };
  if (abs >= 1e6) return { amount: `Rp ${(v/1e6).toFixed(2)}`, unit: 'Juta' };
  return { amount: `Rp ${v.toLocaleString('id-ID')}`, unit: '' };
}

// ─── POPULATE FILTERS ─────────────────────────────────────────────────────────
function populateFilters() {
  const tahuns   = [...new Set(rawData.map(r => String(r['Tahun']||'')))].filter(Boolean).sort();
  const periodes = [...new Set(rawData.map(r => String(r['Periode']||'')))].filter(Boolean)
    .sort((a,b) => periodeIndex(a) - periodeIndex(b));
  const tipes    = [...new Set(rawData.map(r => r['Tipe Pekerjaan']))].filter(Boolean).sort();
  const poses    = [...new Set(rawData.map(r => String(r['No PO']||'')))].filter(Boolean).sort();
  const acts     = [...new Set(rawData.map(r => String(r['ACT ID']||'')))].filter(Boolean).sort();
  const statuses = [...new Set(rawData.map(r => String(r['Paid']||'').trim()))].filter(Boolean).sort();
  fillSelect('fTahun',   tahuns);
  fillSelect('fPeriode', periodes);
  fillSelect('fTipe',    tipes);
  fillSelect('fPO',      poses);
  fillSelect('fACT',     acts);
  fillSelect('fStatus',  statuses);
}

function fillSelect(id, vals) {
  const sel = document.getElementById(id);
  const cur = sel.value;
  sel.innerHTML = '<option value="">All</option>' +
    vals.map(v => `<option value="${v}"${v==cur?' selected':''}>${v}</option>`).join('');
}

// ─── FILTERS ──────────────────────────────────────────────────────────────────
function applyFilters() {
  const fT  = document.getElementById('fTahun').value;
  const fP  = document.getElementById('fPeriode').value;
  const fTp = document.getElementById('fTipe').value;
  const fPO = document.getElementById('fPO').value;
  const fA  = document.getElementById('fACT').value;
  const fS  = document.getElementById('fStatus').value;

  filteredData = rawData.filter(r =>
    (!fT  || String(r['Tahun'])           === fT)  &&
    (!fP  || String(r['Periode'])         === fP)  &&
    (!fTp || r['Tipe Pekerjaan']          === fTp) &&
    (!fPO || String(r['No PO'])           === fPO) &&
    (!fA  || String(r['ACT ID'])          === fA)  &&
    (!fS  || String(r['Paid']||'').trim() === fS)
  );

  const pl = fP ? (fT ? `${fP} ${fT}` : fP) : (fT ? `Tahun ${fT}` : 'All Periode');
  document.getElementById('sumPeriode').textContent = pl;
  renderAll();
}

function resetFilters() {
  ['fTahun','fPeriode','fTipe','fPO','fACT','fStatus'].forEach(id => document.getElementById(id).value = '');
  applyFilters();
}

// ─── RENDER ALL ───────────────────────────────────────────────────────────────
function renderAll() {
  const data = filteredData;

  const totalVal = data.reduce((s,r) => s + (+r['Value Invoice']||0), 0);
  const totalInv = data.length;
  const totalPO  = new Set(data.map(r=>r['No PO'])).size;
  const totalACT = new Set(data.map(r=>r['ACT ID'])).size;

  const paidRows   = data.filter(r => String(r['Paid']||'').trim().toLowerCase() === 'paid');
  const unpaidRows = data.filter(r => String(r['Paid']||'').trim().toLowerCase() === 'unpaid');
  const paidVal    = paidRows.reduce((s,r) => s + (+r['Value Invoice']||0), 0);
  const unpaidVal  = unpaidRows.reduce((s,r) => s + (+r['Value Invoice']||0), 0);

  // KPI
  document.getElementById('kpiTotalValue').textContent    = formatKpi(totalVal);
  document.getElementById('kpiTotalValueSub').textContent = `${totalInv} Invoice`;
  document.getElementById('kpiTotalInvoice').textContent  = totalInv;
  document.getElementById('kpiTotalPO').textContent       = totalPO;
  document.getElementById('kpiTotalACT').textContent      = totalACT;
  document.getElementById('kpiPaidValue').textContent     = formatKpi(paidVal);
  document.getElementById('kpiPaidSub').textContent       = `${paidRows.length} Invoice`;
  document.getElementById('kpiUnpaidValue').textContent   = formatKpi(unpaidVal);
  document.getElementById('kpiUnpaidSub').textContent     = `${unpaidRows.length} Invoice`;
  document.getElementById('sumValue').textContent         = formatRp(totalVal);
  document.getElementById('sumCount').textContent         = `${totalInv} Invoice`;

  renderKpiNilaiPO(data);

  // Grouping periode
  const { map: periodeMap, keys: periodeKeys } = groupByPeriode(data);
  renderTrend(periodeKeys, periodeMap);

  // Donut
  const tipeMap = {};
  data.forEach(r => {
    const t = r['Tipe Pekerjaan'] || 'Lain-lain';
    if (!tipeMap[t]) tipeMap[t] = 0;
    tipeMap[t] += (+r['Value Invoice']||0);
  });
  renderDonut(tipeMap, totalVal);

  // Bar PO
  const poMap = {};
  data.forEach(r => {
    const p = r['No PO'] || 'Unknown';
    if (!poMap[p]) poMap[p] = 0;
    poMap[p] += (+r['Value Invoice']||0);
  });
  renderBarPO(Object.entries(poMap).sort((a,b)=>b[1]-a[1]).slice(0,10));

  // Stacked
  const allTipes = [...new Set(rawData.map(r=>r['Tipe Pekerjaan']))].filter(Boolean);
  renderStacked(periodeKeys, allTipes, data);

  // Monthly list
  renderMonthlyList(periodeKeys, periodeMap);

  // Milestone PO
  renderMilestonePO(data);

  // Table
  renderTable(data);
}

// ─── KPI: TOTAL NILAI PO ──────────────────────────────────────────────────────
// Shows total nilai PO from PO Master, and how many of those POs have been invoiced
function renderKpiNilaiPO(data) {
  const totalNilai = poMasterData.reduce((s, r) => s + (+r['Nilai PO']||0), 0);

  // Count how many POs in master have at least one invoice in current filtered data
  const invoicedPOs = new Set(data.map(r => String(r['No PO']||'').trim()).filter(Boolean));
  const masterPOs   = poMasterData.map(r => String(r['No PO']||'').trim()).filter(Boolean);
  const terinvoice  = masterPOs.filter(po => invoicedPOs.has(po)).length;
  const totalMaster = masterPOs.length;

  document.getElementById('kpiTotalNilaiPO').textContent = totalNilai > 0 ? formatKpi(totalNilai) : '–';
  document.getElementById('kpiNilaiPOSub').textContent   =
    totalMaster > 0
      ? `${terinvoice} dari ${totalMaster} PO terinvoice`
      : '– PO terinvoice';
}

// ─── CHART: TREND ─────────────────────────────────────────────────────────────
function renderTrend(periodeKeys, periodeMap) {
  const vals   = periodeKeys.map(k => periodeMap[k] / 1e6);
  const labels = periodeKeys.map(k => { const [p,t] = k.split('|'); return `${p.substring(0,3)} '${String(t).slice(2)}`; });

  if (charts.trend) charts.trend.destroy();
  charts.trend = new Chart(document.getElementById('chartTrend'), {
    type: 'line',
    data: {
      labels,
      datasets: [{
        data: vals,
        borderColor: '#f97316',
        backgroundColor: 'rgba(249,115,22,0.08)',
        fill: true, tension: 0.4,
        pointBackgroundColor: '#f97316', pointRadius: 4, pointHoverRadius: 6, borderWidth: 2,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` Rp ${ctx.parsed.y.toFixed(2)} Juta` } } },
      scales: {
        x: { grid: { color: '#222' }, ticks: { color: '#888', font: { size: 10 } } },
        y: { grid: { color: '#222' }, ticks: { color: '#888', font: { size: 10 }, callback: v => `${v.toFixed(1)} Jt` } }
      }
    }
  });
}

// ─── CHART: DONUT ─────────────────────────────────────────────────────────────
function renderDonut(tipeMap, totalVal) {
  const entries = Object.entries(tipeMap).sort((a,b)=>b[1]-a[1]);
  // Choose unit dynamically
  const useMilliar = totalVal >= 1e9;
  document.getElementById('donutCenter').textContent = useMilliar
    ? (totalVal/1e9).toFixed(2)
    : (totalVal/1e6).toFixed(1);
  document.getElementById('donutCenterUnit').textContent = useMilliar ? 'Miliar' : 'Juta';

  if (charts.donut) charts.donut.destroy();
  charts.donut = new Chart(document.getElementById('chartDonut'), {
    type: 'doughnut',
    data: {
      labels: entries.map(e=>e[0]),
      datasets: [{ data: entries.map(e=>e[1]), backgroundColor: entries.map(e=>tipeColor(e[0])), borderWidth: 2, borderColor: '#1c1c1c', hoverOffset: 6 }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '65%',
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${formatRp(ctx.parsed)}` } } }
    }
  });

  document.getElementById('donutLegend').innerHTML = entries.map(([t,v]) => {
    const pct = totalVal ? ((v/totalVal)*100).toFixed(1) : 0;
    return `<div class="legend-row">
      <span class="legend-dot" style="background:${tipeColor(t)}"></span>
      <span class="legend-name">${t}</span>
      <span class="legend-pct">${pct}%</span>
      <span class="legend-val">${formatRp(v)}</span>
    </div>`;
  }).join('');
}

// ─── CHART: BAR PO ────────────────────────────────────────────────────────────
function renderBarPO(poSorted) {
  // Determine best unit for the axis
  const maxVal = poSorted.length ? poSorted[0][1] : 0;
  const useMilliar = maxVal >= 1e9;
  const divisor = useMilliar ? 1e9 : 1e6;
  const unitLabel = useMilliar ? 'M' : 'Jt';

  document.getElementById('barPOWrap').style.height = Math.max(180, poSorted.length*26+40)+'px';
  if (charts.barPO) charts.barPO.destroy();
  charts.barPO = new Chart(document.getElementById('chartBarPO'), {
    type: 'bar',
    data: {
      labels: poSorted.map(e=>e[0]),
      datasets: [{ data: poSorted.map(e=>e[1]/divisor), backgroundColor: poSorted.map((_,i)=>i===0?'#e63c2f':'#f97316'), borderRadius:4, barThickness:16 }]
    },
    options: {
      indexAxis: 'y', responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${formatRp(ctx.parsed.x * divisor)}` } } },
      scales: {
        x: { grid:{color:'#222'}, ticks:{color:'#888',font:{size:10},callback:v=>`${v.toFixed(1)} ${unitLabel}`} },
        y: { grid:{display:false}, ticks:{color:'#bbb',font:{size:10}} }
      }
    }
  });
}

// ─── CHART: STACKED ───────────────────────────────────────────────────────────
function renderStacked(periodeKeys, allTipes, data) {
  const labels = periodeKeys.map(k => { const [p,t]=k.split('|'); return `${p.substring(0,3)} '${String(t).slice(2)}`; });
  const allVals = periodeKeys.flatMap(k => {
    const [p, yr] = k.split('|');
    return allTipes.map(t =>
      data.filter(r => String(r['Periode'])===p && String(r['Tahun'])===yr && r['Tipe Pekerjaan']===t)
        .reduce((s,r) => s+(+r['Value Invoice']||0), 0)
    );
  });
  const maxVal = Math.max(...allVals, 0);
  const useMilliar = maxVal >= 1e9;
  const divisor = useMilliar ? 1e9 : 1e6;
  const unitLabel = useMilliar ? 'M' : 'Jt';

  const datasets = allTipes.map(t => ({
    label: t,
    data: periodeKeys.map(k => {
      const [p, yr] = k.split('|');
      return data.filter(r => String(r['Periode'])===p && String(r['Tahun'])===yr && r['Tipe Pekerjaan']===t)
        .reduce((s,r) => s+(+r['Value Invoice']||0), 0) / divisor;
    }),
    backgroundColor: tipeColor(t), stack: 'a', borderRadius: 2, barThickness: 20,
  }));

  if (charts.stacked) charts.stacked.destroy();
  charts.stacked = new Chart(document.getElementById('chartStacked'), {
    type: 'bar',
    data: { labels, datasets },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${formatRp(ctx.parsed.y * divisor)}` } } },
      scales: {
        x: { stacked:true, grid:{color:'#222'}, ticks:{color:'#888',font:{size:10}} },
        y: { stacked:true, grid:{color:'#222'}, ticks:{color:'#888',font:{size:10},callback:v=>`${v.toFixed(1)} ${unitLabel}`} }
      }
    }
  });
}

// ─── MONTHLY LIST ─────────────────────────────────────────────────────────────
function renderMonthlyList(periodeKeys, periodeMap) {
  const sorted = [...periodeKeys].reverse().slice(0, 7);
  document.getElementById('monthlyList').innerHTML = sorted.map(k => {
    const { amount, unit } = formatMonthly(periodeMap[k]);
    return `
      <div class="monthly-item">
        <div class="monthly-icon">📈</div>
        <div class="monthly-info">
          <div class="monthly-month">${periodeLabel(k)}</div>
          <div class="monthly-amt">${amount}${unit ? `<span class="monthly-unit">${unit}</span>` : ''}</div>
        </div>
      </div>
    `;
  }).join('');
}

// ─── MILESTONE PO ─────────────────────────────────────────────────────────────
let milestoneSourceData = [];

function getActiveFilterInfo() {
  const specs = [
    { id: 'fTahun',   label: 'Tahun' },
    { id: 'fPeriode', label: 'Periode' },
    { id: 'fTipe',    label: 'Tipe Pekerjaan' },
    { id: 'fPO',      label: 'No PO' },
    { id: 'fACT',     label: 'ACT ID' },
    { id: 'fStatus',  label: 'Status Bayar' },
  ];
  return specs
    .map(s => ({ label: s.label, val: document.getElementById(s.id)?.value || '' }))
    .filter(s => s.val);
}

function renderMilestonePO(data) {
  milestoneSourceData = data;

  const invoicedByPO = {};
  data.forEach(r => {
    const po = String(r['No PO'] || '').trim();
    if (!po) return;
    invoicedByPO[po] = (invoicedByPO[po] || 0) + (+r['Value Invoice'] || 0);
  });

  const activeFilters = getActiveFilterInfo();
  const isFiltered = activeFilters.length > 0;

  const relevantMaster = isFiltered
    ? poMasterData.filter(r => invoicedByPO[String(r['No PO'] || '').trim()])
    : poMasterData;

  const totalPOValue  = relevantMaster.reduce((s, r) => s + (+r['Nilai PO'] || 0), 0);
  const totalInvoiced = relevantMaster.reduce((s, r) => {
    const po = String(r['No PO'] || '').trim();
    const nilai = +r['Nilai PO'] || 0;
    return s + Math.min(invoicedByPO[po] || 0, nilai);
  }, 0);
  const totalBelum = Math.max(totalPOValue - totalInvoiced, 0);

  const filterNote = isFiltered
    ? `<div class="milestone-filter-note">⚠️ <span><strong>Filter aktif</strong> (${activeFilters.map(f=>`${f.label}: ${f.val}`).join(', ')}) — hanya PO yang punya invoice sesuai filter.</span></div>`
    : '';

  document.getElementById('milestoneSummary').innerHTML = `
    ${filterNote}
    <div class="milestone-stat"><div class="ms-label">Total Nilai PO${isFiltered?' (Relevan)':''}</div><div class="ms-val">${formatRp(totalPOValue)}</div></div>
    <div class="milestone-stat orange"><div class="ms-label">Sudah Terinvoice</div><div class="ms-val">${formatRp(totalInvoiced)}</div></div>
    <div class="milestone-stat"><div class="ms-label">Belum Terinvoice</div><div class="ms-val">${formatRp(totalBelum)}</div></div>
  `;

  if (!relevantMaster.length) {
    document.getElementById('milestoneList').innerHTML = isFiltered
      ? `<div class="milestone-empty">Tidak ada PO dengan invoice yang cocok filter ini.</div>`
      : `<div class="milestone-empty">Belum ada data PO Master. Tambahkan tab <strong>"PO Master"</strong> di sheet dengan kolom: No PO, Nilai PO, Nama Pekerjaan, Link PDF PO.</div>`;
    return;
  }

  const rows = relevantMaster.map(r => {
    const po    = String(r['No PO'] || '').trim();
    const nilai = +r['Nilai PO'] || 0;
    const inv   = Math.min(invoicedByPO[po] || 0, nilai);
    const pct   = nilai ? (inv / nilai * 100) : 0;
    return { po, nama: r['Nama Pekerjaan'] || '–', nilai, inv, pct };
  }).sort((a, b) => b.nilai - a.nilai);

  document.getElementById('milestoneList').innerHTML = rows.map(r => `
    <div class="milestone-item" data-po="${r.po}" title="Klik untuk lihat detail & dokumen PO">
      <div class="milestone-item-top">
        <span class="milestone-po">${r.po} <span class="milestone-job">— ${r.nama}</span></span>
        <span class="milestone-pct">${r.pct.toFixed(0)}%</span>
      </div>
      <div class="milestone-bar-wrap"><div class="milestone-bar" style="width:${Math.min(r.pct,100)}%"></div></div>
      <div class="milestone-sub">${formatRp(r.inv)} / ${formatRp(r.nilai)}</div>
    </div>
  `).join('');
}

// ─── PO MILESTONE DETAIL MODAL ────────────────────────────────────────────────
function openPOMilestoneDetail(po) {
  const master = poMasterData.find(r => String(r['No PO'] || '').trim() === po);
  if (!master) return;

  const nilai = +master['Nilai PO'] || 0;
  const invoices = milestoneSourceData
    .filter(r => String(r['No PO'] || '').trim() === po)
    .sort((a, b) => (a['Tahun'] - b['Tahun']) || (periodeIndex(a['Periode']) - periodeIndex(b['Periode'])));
  const invoiced = Math.min(invoices.reduce((s, r) => s + (+r['Value Invoice'] || 0), 0), nilai || Infinity);
  const belum = Math.max(nilai - invoiced, 0);
  const pct = nilai ? (invoiced / nilai * 100) : 0;

  document.getElementById('poDetailModalTitle').textContent = `📦 Detail Milestone PO — ${po}`;
  document.getElementById('poDetailInfoGrid').innerHTML = `
    <div class="detail-info-item"><div class="di-label">No PO</div><div class="di-val">${po}</div></div>
    <div class="detail-info-item"><div class="di-label">Nama Pekerjaan</div><div class="di-val">${master['Nama Pekerjaan']||'–'}</div></div>
    <div class="detail-info-item"><div class="di-label">Nilai PO</div><div class="di-val">${formatRp(nilai)}</div></div>
    <div class="detail-info-item"><div class="di-label">Sudah Terinvoice</div><div class="di-val" style="color:var(--orange)">${formatRp(invoiced)} (${pct.toFixed(1)}%)</div></div>
    <div class="detail-info-item"><div class="di-label">Belum Terinvoice</div><div class="di-val">${formatRp(belum)}</div></div>
    <div class="detail-info-item"><div class="di-label">Jumlah Invoice</div><div class="di-val">${invoices.length}</div></div>
  `;
  document.getElementById('poDetailBar').style.width = `${Math.min(pct,100)}%`;

  // PDF PO document button
  const pdfPO = String(master['Link PDF PO'] || '').trim();
  const pwdSet = !!getPdfPassword();
  let pdfHtml = '';
  if (pdfPO) {
    pdfHtml = `
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn-pdf" onclick="requestPdfAccess('${pdfPO}','Dokumen PO ${po}','view')">
          📄 Lihat Dokumen PO${pwdSet?' 🔐':''}
        </button>
        <button class="btn-pdf" style="background:var(--bg3);color:var(--muted);border:1px solid var(--border)"
          onclick="requestPdfAccess('${pdfPO}','Dokumen PO ${po}','download')">
          ⬇ Download PDF${pwdSet?' 🔐':''}
        </button>
      </div>
      ${pwdSet ? `<p style="font-size:10px;color:var(--muted);margin-top:6px">🔐 Dokumen ini dilindungi password. Kamu akan diminta memasukkan password sebelum mengakses.</p>` : ''}
    `;
  } else {
    pdfHtml = `<span class="btn-pdf disabled">📄 Dokumen PO belum tersedia</span>
      <span style="font-size:10px;color:var(--muted);margin-left:8px">Tambahkan kolom <code style="color:var(--orange)">Link PDF PO</code> di tab PO Master</span>`;
  }
  document.getElementById('poPdfBtnArea').innerHTML = pdfHtml;

  // Invoice list
  const body = document.getElementById('poDetailItemsBody');
  const foot = document.getElementById('poDetailItemsFoot');
  const statusBadge = s => {
    const norm = String(s||'').trim().toLowerCase();
    if (norm === 'paid')   return `<span class="badge badge-green">Paid</span>`;
    if (norm === 'unpaid') return `<span class="badge badge-gray">Unpaid</span>`;
    return `<span class="badge badge-gray">–</span>`;
  };

  if (!invoices.length) {
    body.innerHTML = `<tr><td colspan="6" class="detail-empty">Belum ada invoice untuk PO ini (sesuai filter yang aktif).</td></tr>`;
    foot.innerHTML = '';
  } else {
    body.innerHTML = invoices.map(inv => `
      <tr>
        <td>${inv['No Invoice']||'–'}</td>
        <td>${inv['ACT ID']||'–'}</td>
        <td style="font-size:10px;color:var(--muted)">${inv['No BAST']||'–'}</td>
        <td>${inv['Periode']||'–'} ${inv['Tahun']||''}</td>
        <td style="color:var(--orange);font-weight:600">${formatRp(+inv['Value Invoice']||0)}</td>
        <td>${statusBadge(inv['Paid'])}</td>
      </tr>
    `).join('');
    const totalInv2 = invoices.reduce((s,r)=>s+(+r['Value Invoice']||0),0);
    foot.innerHTML = `
      <tr>
        <td colspan="4">TOTAL</td>
        <td>${formatRp(totalInv2)}</td>
        <td>–</td>
      </tr>
    `;
  }

  document.getElementById('poDetailModal').style.display = 'flex';
}
function closePOMilestoneDetail() {
  document.getElementById('poDetailModal').style.display = 'none';
}

// ─── TABLE ────────────────────────────────────────────────────────────────────
function renderTable(data) {
  const shown = showAll ? data : data.slice(0, 8);
  document.getElementById('seeAllBtn').textContent =
    showAll ? '↑ Tampilkan lebih sedikit' : `Lihat semua data (${data.length}) →`;

  const tipeBadge = t => {
    const cls = t==='Reenginering'?'badge-red': t==='Recbatt'?'badge-orange': t==='CET'?'badge-yellow':'badge-pink';
    return `<span class="badge ${cls}">${t}</span>`;
  };
  const statusBadge = s => {
    const norm = String(s||'').trim().toLowerCase();
    if (norm === 'paid')   return `<span class="badge badge-green">Paid</span>`;
    if (norm === 'unpaid') return `<span class="badge badge-gray">Unpaid</span>`;
    return `<span class="badge badge-gray">–</span>`;
  };
  document.getElementById('tableBody').innerHTML = shown.map((r,i) => `
    <tr>
      <td><span class="inv-link" data-idx="${i}">${r['No Invoice']||'–'}</span></td>
      <td>${r['ACT ID']||'–'}</td>
      <td>${r['No PO']||'–'}</td>
      <td style="font-size:10px;color:var(--muted)">${r['No BAST']||'–'}</td>
      <td style="color:var(--orange);font-weight:600">${formatRp(+r['Value Invoice']||0)}</td>
      <td>${r['Periode']||'–'}</td>
      <td>${r['Tahun']||'–'}</td>
      <td>${r['Bulan Tanggal']||'–'}</td>
      <td>${tipeBadge(r['Tipe Pekerjaan']||'–')}</td>
      <td>${statusBadge(r['Paid'])}</td>
    </tr>
  `).join('');
  currentTableRows = shown;
}
function toggleShowAll() { showAll = !showAll; renderTable(filteredData); }

// ─── LOADING ──────────────────────────────────────────────────────────────────
function showLoading(msg) {
  document.getElementById('loadingText').textContent = msg || 'Memuat…';
  document.getElementById('loadingOverlay').style.display = 'flex';
}
function hideLoading() { document.getElementById('loadingOverlay').style.display = 'none'; }
