'use strict';
/* Tender Document Package Builder - frontend only, all processing in the browser. */
const { PDFDocument, StandardFonts, rgb } = PDFLib;
const FOOT = 30; // extra strip (pt) added under every page for the footer
const BLOCKING = ['missing', 'needDate', 'expired'];

/* ---------- Translations ---------- */
const T = {
  en: {
    title: 'Tender Document Package Builder',
    step1: '1. Load tender requirements', loadReq: 'Load requirements.json',
    noReq: 'No requirements loaded yet. Click the button above.',
    tId: 'Tender ID', tTitle: 'Title', tEntity: 'Procuring entity', tBidder: 'Bidder', tDeadline: 'Submission deadline',
    step2: '2. Upload PDF files', upload: 'Upload PDF files', noFiles: 'No files uploaded yet.',
    pages: 'pages', remove: 'Remove', duplicate: 'Duplicate of {name}',
    step3: '3. Match files and check status', none: '— none —', expiry: 'Expiry date',
    mandatory: 'Mandatory', optional: 'Optional', usedElsewhere: '(already used)',
    s_missing: 'Missing', s_needDate: 'Expiry date needed', s_expired: 'Expired', s_notProvided: 'Not provided', s_ok: 'OK',
    step4: '4. Create package', generate: 'Generate package',
    summary: '{ok} of {total} mandatory documents are OK',
    fixFirst: 'Fix these first:', rNoReq: 'Load requirements.json first',
    rMissing: '{doc}: no file matched', rNeed: '{doc}: enter the expiry date', rExpired: '{doc}: expired on {date}',
    notPdf: '"{name}" is not a PDF file and was rejected.',
    badPdf: '"{name}" could not be read (damaged or password-protected) and was rejected.',
    loadError: 'Could not read the file. Please choose a valid requirements.json.',
    success: 'Package created with {n} pages. Download started.', error: 'Could not create the package: {msg}',
    undo: 'Undo', autoMatch: 'Suggest matches', exportCsv: 'Export checklist (CSV)',
    colDoc: 'Document', colFile: 'File', colPages: 'Pages', colExpiry: 'Expiry date', colStatus: 'Status',
    restoreNote: 'Your matches and dates are saved in this browser. After a reload, upload the same files again and matches come back.'
  },
  bn: {
    title: 'টেন্ডার ডকুমেন্ট প্যাকেজ বিল্ডার',
    step1: '১. টেন্ডারের প্রয়োজনীয় তালিকা লোড করুন', loadReq: 'requirements.json লোড করুন',
    noReq: 'এখনও কোনো তালিকা লোড হয়নি। উপরের বাটনে ক্লিক করুন।',
    tId: 'টেন্ডার আইডি', tTitle: 'শিরোনাম', tEntity: 'ক্রয়কারী প্রতিষ্ঠান', tBidder: 'দরদাতা', tDeadline: 'জমা দেওয়ার শেষ তারিখ',
    step2: '২. পিডিএফ ফাইল আপলোড করুন', upload: 'পিডিএফ ফাইল আপলোড করুন', noFiles: 'এখনও কোনো ফাইল আপলোড হয়নি।',
    pages: 'পৃষ্ঠা', remove: 'মুছুন', duplicate: '{name} ফাইলের হুবহু কপি',
    step3: '৩. ফাইল মিলান ও অবস্থা দেখুন', none: '— কিছু নয় —', expiry: 'মেয়াদ শেষের তারিখ',
    mandatory: 'আবশ্যক', optional: 'ঐচ্ছিক', usedElsewhere: '(আগেই ব্যবহৃত)',
    s_missing: 'নেই', s_needDate: 'মেয়াদের তারিখ দিন', s_expired: 'মেয়াদ শেষ', s_notProvided: 'দেওয়া হয়নি', s_ok: 'ঠিক আছে',
    step4: '৪. প্যাকেজ তৈরি করুন', generate: 'প্যাকেজ তৈরি করুন',
    summary: '{total}টি আবশ্যক ডকুমেন্টের মধ্যে {ok}টি ঠিক আছে',
    fixFirst: 'আগে এগুলো ঠিক করুন:', rNoReq: 'আগে requirements.json লোড করুন',
    rMissing: '{doc}: কোনো ফাইল মেলানো হয়নি', rNeed: '{doc}: মেয়াদের তারিখ দিন', rExpired: '{doc}: মেয়াদ শেষ হয়েছে {date} তারিখে',
    notPdf: '"{name}" পিডিএফ ফাইল নয়, তাই বাদ দেওয়া হয়েছে।',
    badPdf: '"{name}" পড়া যায়নি (ফাইল নষ্ট অথবা পাসওয়ার্ড দেওয়া), তাই বাদ দেওয়া হয়েছে।',
    loadError: 'ফাইলটি পড়া যায়নি। সঠিক requirements.json বেছে নিন।',
    success: 'প্যাকেজ তৈরি হয়েছে, মোট {n} পৃষ্ঠা। ডাউনলোড শুরু হয়েছে।', error: 'প্যাকেজ তৈরি করা যায়নি: {msg}',
    undo: 'পূর্বাবস্থায় ফেরান', autoMatch: 'নাম দেখে মিলানোর পরামর্শ', exportCsv: 'চেকলিস্ট এক্সপোর্ট (CSV)',
    colDoc: 'ডকুমেন্ট', colFile: 'ফাইল', colPages: 'পৃষ্ঠা', colExpiry: 'মেয়াদ', colStatus: 'অবস্থা',
    restoreNote: 'আপনার মিলানো ফাইল ও তারিখ এই ব্রাউজারে সংরক্ষিত থাকে। রিলোডের পর একই ফাইল আবার আপলোড করলে মিল ফিরে আসবে।'
  }
};

/* ---------- State ---------- */
const $ = id => document.getElementById(id);
const state = { lang: localStorage.getItem('tpb_lang') || 'en', req: null, files: [], matches: {}, expiry: {}, pending: {}, undo: [], notes: [], result: null };
let fileSeq = 1;

try { // restore saved work (files themselves cannot be restored)
  const s = JSON.parse(localStorage.getItem('tpb_state') || 'null');
  if (s && s.req) { state.req = s.req; state.expiry = s.expiry || {}; state.pending = s.pending || {}; }
} catch (e) { /* ignore broken saved data */ }

const t = (k, p = {}) => {
  let s = (T[state.lang] && T[state.lang][k]) ?? T.en[k] ?? k;
  for (const x in p) s = s.split('{' + x + '}').join(p[x]);
  return s;
};
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fileById = id => state.files.find(f => f.id === id);
const reqs = () => (state.req ? [...state.req.requirements].sort((a, b) => a.order - b.order) : []);
const title = r => (state.lang === 'bn' ? (r.title_bn || r.title_en) : (r.title_en || r.title_bn)) || r.id;

/* ---------- Hashing (duplicate detection) ---------- */
async function sha256(buf) {
  if (window.crypto && crypto.subtle) {
    const h = await crypto.subtle.digest('SHA-256', buf);
    return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, '0')).join('');
  }
  let h1 = 0x811c9dc5; const u = new Uint8Array(buf); // fallback: FNV-1a
  for (let i = 0; i < u.length; i++) { h1 ^= u[i]; h1 = Math.imul(h1, 16777619); }
  return 'fnv' + (h1 >>> 0) + '-' + u.length;
}

/* ---------- Loading requirements ---------- */
async function loadReq(file) {
  state.notes = [];
  try {
    const data = JSON.parse(await file.text());
    if (!data.tender || !Array.isArray(data.requirements) || !data.tender.tender_id) throw new Error('bad format');
    state.req = data; state.matches = {}; state.expiry = {}; state.pending = {}; state.undo = []; state.result = null;
  } catch (e) { state.notes.push({ k: 'loadError', p: {} }); }
  renderAll();
}

/* ---------- Uploading files ---------- */
async function addFiles(list) {
  state.notes = []; state.result = null;
  for (const f of list) {
    const buf = await f.arrayBuffer();
    const head = new TextDecoder('latin1').decode(buf.slice(0, 1024));
    if (!head.includes('%PDF-')) { state.notes.push({ k: 'notPdf', p: { name: f.name } }); continue; }
    let pages;
    try { pages = (await PDFDocument.load(buf)).getPageCount(); }
    catch (e) { state.notes.push({ k: 'badPdf', p: { name: f.name } }); continue; }
    state.files.push({ id: 'f' + fileSeq++, name: f.name, bytes: buf, pages, hash: await sha256(buf) });
  }
  // bring back saved matches by file name
  for (const [rid, name] of Object.entries(state.pending)) {
    if (state.matches[rid]) continue;
    const f = state.files.find(x => x.name === name);
    if (f && !fileBlocked(f.id, rid)) state.matches[rid] = f.id;
  }
  renderAll();
}

function removeFile(id) {
  for (const rid of Object.keys(state.matches)) {
    if (state.matches[rid] === id) { delete state.matches[rid]; delete state.expiry[rid]; delete state.pending[rid]; }
  }
  state.files = state.files.filter(f => f.id !== id);
  state.result = null; renderAll();
}

/* ---------- Matching ---------- */
// A file cannot be used if it (or an identical-content file) is already matched to a different document.
function fileBlocked(fileId, reqId) {
  const f = fileById(fileId);
  for (const [rid, fid] of Object.entries(state.matches)) {
    if (rid === reqId) continue;
    if (fid === fileId) return true;
    const g = fileById(fid);
    if (g && f && g.hash === f.hash) return true;
  }
  return false;
}
function pushUndo() {
  state.undo.push(JSON.stringify({ matches: state.matches, expiry: state.expiry, pending: state.pending }));
  if (state.undo.length > 50) state.undo.shift();
}
function setMatch(rid, fid) {
  if ((state.matches[rid] || '') === fid) return;
  pushUndo(); state.result = null;
  delete state.expiry[rid];
  if (fid) { state.matches[rid] = fid; state.pending[rid] = fileById(fid).name; }
  else { delete state.matches[rid]; delete state.pending[rid]; }
  renderAll();
}
function setExpiry(rid, val) {
  pushUndo(); state.result = null;
  if (val) state.expiry[rid] = val; else delete state.expiry[rid];
  renderAll();
}
function undo() {
  const s = state.undo.pop(); if (!s) return;
  const o = JSON.parse(s);
  // drop matches to files that were removed meanwhile
  for (const rid of Object.keys(o.matches)) if (!fileById(o.matches[rid])) delete o.matches[rid];
  state.matches = o.matches; state.expiry = o.expiry; state.pending = o.pending; state.result = null;
  renderAll();
}
// Suggest matches from file names (word overlap with the document title)
function autoMatch() {
  const stop = ['certificate', 'registration', 'signed', 'of', 'and', 'the'];
  const pairs = [];
  for (const r of reqs()) {
    if (state.matches[r.id]) continue;
    const words = (r.title_en || '').toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length >= 3 && !stop.includes(w));
    for (const f of state.files) {
      const n = f.name.toLowerCase();
      const score = words.filter(w => n.includes(w)).length;
      if (score > 0) pairs.push({ r, f, score });
    }
  }
  pairs.sort((a, b) => b.score - a.score || b.f.name.localeCompare(a.f.name));
  pushUndo();
  for (const p of pairs) {
    if (state.matches[p.r.id] || fileBlocked(p.f.id, p.r.id)) continue;
    state.matches[p.r.id] = p.f.id; state.pending[p.r.id] = p.f.name;
  }
  state.result = null; renderAll();
}

/* ---------- Status ---------- */
function statusOf(r) {
  if (!state.matches[r.id]) return r.mandatory ? 'missing' : 'notProvided';
  if (r.has_expiry) {
    const d = state.expiry[r.id];
    if (!d) return 'needDate';
    if (d < state.req.tender.submission_deadline) return 'expired'; // same day = OK
  }
  return 'ok';
}
const blockers = () => reqs().filter(r => BLOCKING.includes(statusOf(r)));

/* ---------- Rendering ---------- */
function renderStatic() {
  document.documentElement.lang = state.lang === 'bn' ? 'bn' : 'en';
  document.title = t('title');
  document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
  $('btnEn').classList.toggle('active', state.lang === 'en');
  $('btnBn').classList.toggle('active', state.lang === 'bn');
}
function renderTender() {
  if (!state.req) { $('tender').innerHTML = `<p class="muted">${t('noReq')}</p>`; return; }
  const d = state.req.tender;
  $('tender').innerHTML = `<dl class="kv">
    <dt>${t('tId')}</dt><dd>${esc(d.tender_id)}</dd>
    <dt>${t('tTitle')}</dt><dd>${esc(d.title)}</dd>
    <dt>${t('tEntity')}</dt><dd>${esc(d.procuring_entity)}</dd>
    <dt>${t('tBidder')}</dt><dd>${esc(d.bidder)}</dd>
    <dt>${t('tDeadline')}</dt><dd>${esc(d.submission_deadline)}</dd></dl>`;
}
function renderNotes() {
  $('notes').innerHTML = state.notes.map(n => {
    const p = {}; for (const k in n.p) p[k] = esc(n.p[k]);
    return `<div class="note">${t(n.k, p)}</div>`;
  }).join('');
}
function renderFiles() {
  if (!state.files.length) { $('fileList').innerHTML = `<p class="muted">${t('noFiles')}</p>`; return; }
  $('fileList').innerHTML = state.files.map(f => {
    const twin = state.files.find(g => g.id !== f.id && g.hash === f.hash);
    return `<div class="file"><div><b>${esc(f.name)}</b> <span class="muted">${f.pages} ${t('pages')}</span>
      ${twin ? `<span class="badge b-dup">${t('duplicate', { name: esc(twin.name) })}</span>` : ''}</div>
      <button class="btn small ghost" data-remove="${f.id}">${t('remove')}</button></div>`;
  }).join('');
}
function renderReqs() {
  const box = $('reqList');
  if (!state.req) { box.innerHTML = ''; $('summary').textContent = ''; return; }
  const mand = reqs().filter(r => r.mandatory);
  $('summary').textContent = t('summary', { ok: mand.filter(r => statusOf(r) === 'ok').length, total: mand.length });
  box.innerHTML = reqs().map(r => {
    const st = statusOf(r), sel = state.matches[r.id] || '';
    const opts = `<option value="">${t('none')}</option>` + state.files.map(f => {
      const blocked = fileBlocked(f.id, r.id);
      return `<option value="${f.id}" ${sel === f.id ? 'selected' : ''} ${blocked ? 'disabled' : ''}>${esc(f.name)} (${f.pages})${blocked ? ' ' + t('usedElsewhere') : ''}</option>`;
    }).join('');
    const exp = r.has_expiry && sel
      ? `<label class="muted">${t('expiry')}<input type="date" data-exp="${esc(r.id)}" value="${esc(state.expiry[r.id] || '')}"></label>` : '';
    return `<div class="row s-${st}">
      <div><b>${r.order}. ${esc(title(r))}</b><span class="tag">${r.mandatory ? t('mandatory') : t('optional')}</span></div>
      <div><select data-req="${esc(r.id)}" aria-label="${esc(title(r))}">${opts}</select></div>
      <div>${exp}</div>
      <div><span class="badge b-${st}">${t('s_' + st)}</span></div></div>`;
  }).join('');
}
function renderGen() {
  const btn = $('btnGen'), box = $('reasons');
  if (!state.req) { btn.disabled = true; box.innerHTML = `<p>${t('rNoReq')}</p>`; }
  else {
    const bl = blockers(); btn.disabled = bl.length > 0;
    box.innerHTML = bl.length ? `<p>${t('fixFirst')}</p><ul>` + bl.map(r => {
      const st = statusOf(r), doc = esc(title(r));
      const k = st === 'missing' ? 'rMissing' : st === 'needDate' ? 'rNeed' : 'rExpired';
      return `<li>${t(k, { doc, date: esc(state.expiry[r.id] || '') })}</li>`;
    }).join('') + '</ul>' : '';
  }
  btn.textContent = t('generate');
  const res = state.result;
  $('result').innerHTML = res ? `<div class="${res.ok ? 'success' : 'error'}">${esc(res.ok ? t('success', { n: res.n }) : t('error', { msg: res.msg }))}</div>` : '';
}
function renderAll() {
  renderStatic(); renderTender(); renderNotes(); renderFiles(); renderReqs(); renderGen();
  $('btnUndo').disabled = !state.undo.length;
  $('btnAuto').disabled = !state.req || !state.files.length;
  $('btnCsv').disabled = !state.req;
  try { localStorage.setItem('tpb_state', JSON.stringify({ req: state.req, expiry: state.expiry, pending: state.pending })); } catch (e) { /* storage full or blocked */ }
}

/* ---------- CSV export ---------- */
function exportCsv() {
  const q = v => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  const rows = [[t('colDoc'), t('colFile'), t('colPages'), t('colExpiry'), t('colStatus')]];
  for (const r of reqs()) {
    const f = fileById(state.matches[r.id]);
    rows.push([title(r), f ? f.name : '', f ? f.pages : '', state.expiry[r.id] || '', t('s_' + statusOf(r))]);
  }
  const csv = '\uFEFF' + rows.map(r => r.map(q).join(',')).join('\r\n');
  download(new Blob([csv], { type: 'text/csv;charset=utf-8' }), state.req.tender.tender_id + '_Checklist.csv');
}
function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name.replace(/[\\/:*?"<>|]/g, '_');
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

/* ---------- PDF package ---------- */
const S = s => String(s ?? '').replace(/[^\x20-\x7E]/g, '?'); // Helvetica supports only basic Latin
function fit(text, maxW, size, font) {
  let s = text;
  while (s.length > 3 && font.widthOfTextAtSize(s, size) > maxW) s = s.slice(0, -1);
  return s === text ? s : s.slice(0, -2) + '...';
}
async function generatePackage() {
  try {
    const tn = state.req.tender;
    const items = reqs().filter(r => state.matches[r.id]).map(r => ({ r, f: fileById(state.matches[r.id]) }));
    const out = await PDFDocument.create();
    const font = await out.embedFont(StandardFonts.Helvetica);
    const bold = await out.embedFont(StandardFonts.HelveticaBold);

    // Page 1: cover (English)
    const W = 595.28, H = 841.89, dark = rgb(0.1, 0.16, 0.18);
    const cover = out.addPage([W, H]);
    cover.drawRectangle({ x: 0, y: H - 110, width: W, height: 110, color: rgb(0.06, 0.3, 0.36) });
    cover.drawText('Tender Document Package', { x: 40, y: H - 58, size: 24, font: bold, color: rgb(1, 1, 1) });
    cover.drawText(S(tn.tender_id), { x: 40, y: H - 88, size: 14, font, color: rgb(1, 1, 1) });
    const today = new Date(); const pad = n => String(n).padStart(2, '0');
    const made = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
    let y = H - 150;
    [['Tender ID', tn.tender_id], ['Tender title', tn.title], ['Procuring entity', tn.procuring_entity],
     ['Bidder', tn.bidder], ['Submission deadline', tn.submission_deadline], ['Package date', made]].forEach(([k, v]) => {
      cover.drawText(k + ':', { x: 40, y, size: 11, font: bold, color: dark });
      cover.drawText(fit(S(v), 385, 11, font), { x: 170, y, size: 11, font, color: dark });
      y -= 22;
    });
    y -= 14;
    cover.drawText('Included documents (in order)', { x: 40, y, size: 13, font: bold, color: dark }); y -= 22;
    items.forEach(({ r, f }, i) => {
      if (y < 60) return;
      cover.drawText(fit(`${i + 1}. ${S(r.title_en || r.id)}  -  ${S(f.name)}`, 515, 10.5, font), { x: 40, y, size: 10.5, font, color: dark });
      y -= 17;
    });

    // Documents: every page, original order, shifted up to leave a footer strip
    for (const { f } of items) {
      const src = await PDFDocument.load(f.bytes);
      const embedded = await out.embedPdf(src, src.getPageIndices());
      embedded.forEach(ep => {
        const pg = out.addPage([ep.width, ep.height + FOOT]);
        pg.drawPage(ep, { x: 0, y: FOOT });
      });
    }

    // Footer on every page: <tender_id> | Page X of Y
    const pages = out.getPages(), total = pages.length;
    pages.forEach((p, i) => {
      const txt = `${S(tn.tender_id)} | Page ${i + 1} of ${total}`;
      const w = font.widthOfTextAtSize(txt, 10);
      p.drawText(txt, { x: (p.getWidth() - w) / 2, y: 11, size: 10, font, color: rgb(0.1, 0.1, 0.1) });
    });

    const bytes = await out.save();
    download(new Blob([bytes], { type: 'application/pdf' }), tn.tender_id + '_Package.pdf');
    state.result = { ok: true, n: total };
  } catch (e) {
    state.result = { ok: false, msg: e.message || String(e) };
  }
  renderGen();
}

/* ---------- Events ---------- */
$('reqInput').addEventListener('change', async e => { const f = e.target.files[0]; e.target.value = ''; if (f) await loadReq(f); });
$('pdfInput').addEventListener('change', async e => { const l = [...e.target.files]; e.target.value = ''; if (l.length) await addFiles(l); });
$('btnEn').addEventListener('click', () => { state.lang = 'en'; localStorage.setItem('tpb_lang', 'en'); renderAll(); });
$('btnBn').addEventListener('click', () => { state.lang = 'bn'; localStorage.setItem('tpb_lang', 'bn'); renderAll(); });
$('btnUndo').addEventListener('click', undo);
$('btnAuto').addEventListener('click', autoMatch);
$('btnCsv').addEventListener('click', exportCsv);
$('btnGen').addEventListener('click', generatePackage);
$('fileList').addEventListener('click', e => { const b = e.target.closest('[data-remove]'); if (b) removeFile(b.dataset.remove); });
$('reqList').addEventListener('change', e => {
  if (e.target.dataset.req) setMatch(e.target.dataset.req, e.target.value);
  else if (e.target.dataset.exp) setExpiry(e.target.dataset.exp, e.target.value);
});

renderAll();