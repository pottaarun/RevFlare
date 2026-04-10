/* ══════════════════════════════════════════════════════════════════
   RevFlare — Premium Sales Intelligence SPA
   ══════════════════════════════════════════════════════════════════ */

const CF_LOGO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Cloudflare_Logo.svg/3840px-Cloudflare_Logo.svg.png';

const IC = {
  search: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>`,
  upload: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>`,
  back: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>`,
  globe: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
  building: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M8 10h.01M16 10h.01M12 14h.01M8 14h.01M16 14h.01"/></svg>`,
  copy: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
  sparkles: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/></svg>`,
  linkedin: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>`,
  shield: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  zap: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>`,
  dollar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`,
  alert: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  target: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`,
  bar: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
  mail: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`,
  empty: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>`,
  clock: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  send: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m22 2-7 20-4-9-9-4z"/><path d="m22 2-11 11"/></svg>`,
};

const PERSONA_META = {
  bdr: { icon: '\u{1F3AF}', color: '#60a5fa', bg: 'rgba(96,165,250,0.1)' },
  ae: { icon: '\u{1F4BC}', color: '#a78bfa', bg: 'rgba(167,139,250,0.1)' },
  csm: { icon: '\u{1F91D}', color: '#34d399', bg: 'rgba(52,211,153,0.1)' },
  se: { icon: '\u{1F527}', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)' },
  vp_sales: { icon: '\u{1F451}', color: '#f472b6', bg: 'rgba(244,114,182,0.1)' },
};

// ── API ────────────────────────────────────────────────────────────
const api = {
  async get(p) { const r = await fetch(`/api${p}`); if (!r.ok) throw new Error((await r.json().catch(()=>({}))).error||r.statusText); return r.json(); },
  async post(p, b) { const r = await fetch(`/api${p}`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(b) }); if (!r.ok) throw new Error((await r.json().catch(()=>({}))).error||r.statusText); return r.json(); },
};

// ── State ──────────────────────────────────────────────────────────
const S = { filters:{}, sort:'total_it_spend', order:'DESC', page:1, personas:null, activeTab:'overview', selPersona:null, selMsg:null };

// ── Per-account tab content cache (survives tab switches) ──────────
// Keyed by account ID. Stores generated HTML, selections, and context.
const tabCache = {};
function getCache(accountId) {
  if (!tabCache[accountId]) tabCache[accountId] = {
    research: { selectedType: null, outputHTML: '', results: {} },
    messaging: { selPersona: null, selMsg: null, customContext: '', outputHTML: '', lastResult: null },
  };
  return tabCache[accountId];
}

// ── Helpers ────────────────────────────────────────────────────────
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];

function fmt(n,p=''){if(n==null||n==='')return'--';const v=typeof n==='number'?n:parseFloat(String(n).replace(/[$,]/g,''));if(isNaN(v))return String(n);if(v>=1e6)return`${p}${(v/1e6).toFixed(1)}M`;if(v>=1e3)return`${p}${(v/1e3).toFixed(0)}K`;return`${p}${v.toLocaleString()}`;}
function fmtD(n){return fmt(n,'$');}
function pct(n){return n!=null?(n*100).toFixed(0)+'%':'--';}
function statusPill(s){if(!s)return'<span class="pill pill-neutral">Unknown</span>';const l=s.toLowerCase();if(l==='active')return`<span class="pill pill-active">${s}</span>`;if(l.includes('not renewed'))return`<span class="pill pill-churned">${s}</span>`;return`<span class="pill pill-neutral">${s}</span>`;}
function timeAgo(d){if(!d)return'--';const t=new Date(d);if(isNaN(t))return d;const days=Math.floor((Date.now()-t)/864e5);if(!days)return'Today';if(days===1)return'Yesterday';if(days<30)return days+'d ago';if(days<365)return Math.floor(days/30)+'mo ago';return Math.floor(days/365)+'y ago';}
function truncate(s,n){return s&&s.length>n?s.slice(0,n)+'\u2026':s||'';}
function toast(m,t=''){let e=$('#toast');if(!e){e=document.createElement('div');e.id='toast';e.className='toast';document.body.appendChild(e);}e.textContent=m;e.className=`toast ${t?'toast-'+t:''} show`;clearTimeout(e._t);e._t=setTimeout(()=>e.classList.remove('show'),3500);}
function md(s){if(!s)return'';return s
  .replace(/\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g,'<a href="$2" target="_blank" rel="noopener" style="color:var(--accent-bright);text-decoration:underline;text-underline-offset:2px">$1</a>')
  .replace(/^#### (.+)$/gm,'<h4>$1</h4>').replace(/^### (.+)$/gm,'<h3>$1</h3>').replace(/^## (.+)$/gm,'<h2>$1</h2>').replace(/^# (.+)$/gm,'<h1>$1</h1>')
  .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g,'<em>$1</em>')
  .replace(/`(.+?)`/g,'<code>$1</code>')
  .replace(/^- (.+)$/gm,'<li>$1</li>').replace(/^(\d+)\. (.+)$/gm,'<li>$2</li>').replace(/((?:<li>.*<\/li>\n?)+)/g,'<ul>$1</ul>')
  .replace(/^> (.+)$/gm,'<blockquote>$1</blockquote>')
  .replace(/---/g,'<hr>').replace(/\n\n/g,'</p><p>').replace(/^(?!<[huloba])(.+)$/gm,'<p>$1</p>').replace(/<p><\/p>/g,'');}

// ── Router ─────────────────────────────────────────────────────────
function navigate(){
  const h=location.hash||'#/';const m=$('#main');
  $$('.nav-link').forEach(l=>l.classList.toggle('active',l.getAttribute('href')===h||(h.startsWith('#/account')&&l.dataset.route==='dashboard')));
  if(h==='#/upload')renderUpload(m);
  else if(h==='#/campaigns')renderCampaigns(m);
  else if(h.startsWith('#/campaign/'))renderCampaignDetail(m,h.split('/')[2]);
  else if(h.startsWith('#/share/'))renderShareView(m,h.split('/')[2]);
  else if(h.startsWith('#/account/'))renderAccount(m,h.split('/')[2]);
  else renderDashboard(m);
}
window.addEventListener('hashchange',navigate);
window.addEventListener('DOMContentLoaded', function() {
  navigate();
  // Check Gmail status - upgrade button to green badge if connected
  api.get('/gmail/status').then(function(g) {
    window._gmailConnected = g.connected;
    window._gmailAddress = g.gmailAddress || '';
    if (g.connected) {
      var btn = document.getElementById('gmail-setup-btn');
      if (btn) btn.outerHTML = '<span style="font-size:11px;color:var(--green);font-weight:600;padding:4px 10px;background:var(--green-bg);border:1px solid rgba(52,211,153,0.2);border-radius:var(--radius-pill);cursor:default" title="Connected: ' + g.gmailAddress + '">' + IC.mail + ' Gmail: ' + g.gmailAddress.split('@')[0] + '</span>';
    }
  }).catch(function() { window._gmailConnected = false; });

  // Fetch platform-wide stats for bottom bar
  api.get('/platform-stats').then(function(ps) {
    var bar = document.getElementById('platform-bar');
    if (bar) {
      var items = [
        { label: 'Emails Generated', value: ps.totalEmails, color: '#34d399', icon: '\u{1F4E7}' },
        { label: 'Research Reports', value: ps.totalResearch, color: '#60a5fa', icon: '\u{1F50D}' },
        { label: 'Campaigns', value: ps.totalCampaigns, color: '#a78bfa', icon: '\u{1F3AF}' },
        { label: 'Active Users', value: ps.totalUsers, color: '#fbbf24', icon: '\u{1F465}' },
      ];
      bar.innerHTML = items.map(function(item) {
        return '<div style="display:flex;align-items:center;gap:6px">'
          + '<span style="font-size:13px">' + item.icon + '</span>'
          + '<span class="platform-counter" style="color:' + item.color + ';font-size:14px;font-variant-numeric:tabular-nums" data-target="' + item.value + '">0</span>'
          + '<span style="color:var(--text-muted)">' + item.label + '</span>'
          + '</div>';
      }).join('<span style="color:rgba(255,255,255,0.08)">|</span>');

      // Animate counters
      bar.querySelectorAll('.platform-counter').forEach(function(el) {
        var target = parseInt(el.getAttribute('data-target')) || 0;
        var duration = 1500;
        var start = performance.now();
        function tick(now) {
          var elapsed = now - start;
          var progress = Math.min(elapsed / duration, 1);
          var eased = 1 - Math.pow(1 - progress, 3);
          el.textContent = Math.round(target * eased).toLocaleString();
          if (progress < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      });
    }
  }).catch(function() {});

  // Fetch current user and show in nav
  api.get('/me').then(function(u) {
    var ns = document.getElementById('nav-stat');
    if (ns) {
      var name = (u.email && u.email !== 'default@revflare.local') ? u.email.split('@')[0].replace(/[._]/g, ' ') : 'local';
      ns.innerHTML = name + ' <span style="opacity:0.5">|</span> ' + (u.accountCount || 0) + ' accounts';
      ns.style.display = '';
      // If email doesn't match DB, show warning
      if (u.accountCount === 0 && u.email !== 'default@revflare.local') {
        ns.innerHTML += ' <span style="color:var(--red)" title="Your Access email ' + u.email + ' has no accounts. Re-upload your Excel or check email mismatch.">\u26A0</span>';
      }
    }
  }).catch(function() {});
});

// ══════════════════════════════════════════════════════════════════
// UPLOAD
// ══════════════════════════════════════════════════════════════════
function renderUpload(c){
  c.innerHTML=`<div class="fade-in" style="max-width:640px;margin:60px auto">
    <div style="text-align:center;margin-bottom:40px">
      <img src="${CF_LOGO}" alt="Cloudflare" style="height:32px;filter:brightness(0) invert(1);opacity:0.15;margin-bottom:20px" />
      <h1 class="page-title" style="text-align:center">Upload Account Data</h1>
      <p class="page-subtitle" style="margin:10px auto;text-align:center;max-width:400px">Drop your Salesforce account export to power AI-driven research and persona messaging.</p>
    </div>
    <div class="upload-zone" id="dropzone">
      <div class="upload-icon">${IC.upload}</div>
      <div class="upload-title">Drag & drop your .xlsx file</div>
      <div class="upload-desc">Parsed entirely in your browser. Only structured data is sent to the server.</div>
      <button class="btn btn-primary" style="margin-top:24px" id="browse-btn">Select File</button>
      <input type="file" id="file-input" accept=".xlsx,.xls,.csv" style="display:none" />
    </div>
    <div class="progress-wrap" id="pw" style="display:none">
      <div class="progress-bar"><div class="progress-fill" id="pf" style="width:0"></div></div>
      <div class="progress-text" id="pt">Preparing...</div>
    </div>
  </div>`;
  const dz=$('#dropzone'),fi=$('#file-input');
  $('#browse-btn').onclick=()=>fi.click();
  fi.onchange=e=>{if(e.target.files[0])handleFile(e.target.files[0]);};
  dz.ondragover=e=>{e.preventDefault();dz.classList.add('drag-over');};
  dz.ondragleave=()=>dz.classList.remove('drag-over');
  dz.ondrop=e=>{e.preventDefault();dz.classList.remove('drag-over');if(e.dataTransfer.files[0])handleFile(e.dataTransfer.files[0]);};
}

async function handleFile(file){
  const pw=$('#pw'),pf=$('#pf'),pt=$('#pt');
  pw.style.display='block';pt.textContent='Reading file...';pf.style.width='5%';
  try{
    const data=await file.arrayBuffer();pf.style.width='15%';pt.textContent='Parsing spreadsheet...';
    const wb=XLSX.read(data,{type:'array'});const rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1});
    if(rows.length<2)throw new Error('File appears empty');
    const headers=rows[0];const dataRows=rows.slice(1).filter(r=>r.some(c=>c!=null&&c!==''));
    pf.style.width='20%';pt.textContent=`Parsed ${dataRows.length.toLocaleString()} accounts. Clearing old data...`;
    await api.post('/accounts/clear',{});
    pf.style.width='25%';pt.textContent=`Uploading ${dataRows.length.toLocaleString()} accounts...`;
    const B=100;const total=Math.ceil(dataRows.length/B);
    for(let i=0;i<total;i++){
      await api.post('/accounts/upload',{headers,rows:dataRows.slice(i*B,(i+1)*B)});
      pf.style.width=`${25+((i+1)/total)*70}%`;
      pt.textContent=`Uploading... ${Math.min((i+1)*B,dataRows.length).toLocaleString()} / ${dataRows.length.toLocaleString()}`;
    }
    pf.style.width='100%';pt.textContent=`${dataRows.length.toLocaleString()} accounts loaded successfully.`;
    toast(`${dataRows.length.toLocaleString()} accounts uploaded`,'success');
    setTimeout(()=>{location.hash='#/';},1200);
  }catch(e){pf.style.width='0';pt.textContent=`Error: ${e.message}`;toast(e.message,'error');}
}

// ══════════════════════════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════════════════════════
async function renderDashboard(c){
  c.innerHTML=`<div class="loading-state"><div class="spinner"></div>Loading accounts...</div>`;
  try{
    const[stats,filters]=await Promise.all([api.get('/stats'),api.get('/filters')]);
    if(!stats.total_accounts){
      c.innerHTML=`<div class="empty-state fade-in">
        <div class="empty-icon">${IC.empty}</div>
        <h2 class="page-title" style="font-size:22px">No accounts loaded</h2>
        <p class="page-subtitle" style="margin:8px auto 20px">Upload a Salesforce export to get started.</p>
        <a href="#/upload" class="btn btn-primary btn-lg">${IC.upload} Upload Data</a>
      </div>`;$('#nav-stat').style.display='none';return;
    }
    const ns=$('#nav-stat');ns.textContent=`${stats.total_accounts.toLocaleString()} accounts`;ns.style.display='';
    c.innerHTML=`<div class="fade-in">
      <div class="page-header">
        <div class="page-header-row">
          <div>
            <h1 class="page-title">Account Intelligence</h1>
            <p class="page-subtitle">Select any account to run deep AI research and generate persona-curated outreach with cost-of-inaction analysis.</p>
          </div>
          <a href="#/upload" class="btn btn-ghost btn-sm">${IC.upload} Re-upload</a>
        </div>
      </div>
      <div class="stats-row" id="stats"></div>
      <div class="toolbar" id="toolbar"></div>
      <div class="table-wrap"><div class="table-scroll"><table><thead><tr id="thead"></tr></thead><tbody id="tbody"></tbody></table></div></div>
      <div class="pagination" id="pag"></div>
    </div>`;
    renderStats(stats);renderToolbar(filters);await loadAccounts();
  }catch(e){c.innerHTML=`<div class="empty-state"><p style="color:var(--red)">${e.message}</p><a href="#/upload" class="btn btn-ghost" style="margin-top:16px">Upload</a></div>`;}
}

function renderStats(s){
  const el=$('#stats');if(!el)return;
  const items=[
    {l:'Total Accounts',v:s.total_accounts||0,fmt:v=>v.toLocaleString(),s:`${s.active_accounts||0} active`,cls:'sc-accounts',icon:'\u{1F465}'},
    {l:'Cloudflare MRR',v:s.total_cf_revenue||0,fmt:fmtD,s:'Monthly revenue',cls:'sc-revenue',icon:'\u{1F4B0}'},
    {l:'Addressable Spend',v:s.total_addressable_spend||0,fmt:fmtD,s:'Total IT monthly spend',cls:'sc-spend',icon:'\u{1F4B3}'},
    {l:'Avg IT Spend',v:s.avg_it_spend||0,fmt:fmtD,s:'Per account / month',cls:'sc-avg',icon:'\u{1F4C8}'},
    {l:'Avg CDN Spend',v:s.avg_cdn_spend||0,fmt:fmtD,s:'Displacement opportunity',cls:'sc-cdn',icon:'\u{1F3AF}'},
    {l:'Open Pipeline',v:s.total_open_opps||0,fmt:v=>v.toLocaleString(),s:'Active opportunities',cls:'sc-pipeline',icon:'\u{1F525}'},
  ];
  el.innerHTML=items.map((i,idx)=>`<div class="stat-card ${i.cls}" style="animation-delay:${idx*80}ms">
    <div class="stat-icon">${i.icon}</div>
    <div class="stat-label">${i.l}</div>
    <div class="stat-value counting" data-target="${i.v}" data-idx="${idx}">$0</div>
    <div class="stat-sub">${i.s}</div>
  </div>`).join('');

  // Animate counting up
  el.querySelectorAll('.stat-value').forEach((el,idx)=>{
    const item=items[idx];
    const target=item.v;
    const duration=1200;
    const start=performance.now();
    function tick(now){
      const elapsed=now-start;
      const progress=Math.min(elapsed/duration,1);
      // Ease out cubic
      const eased=1-Math.pow(1-progress,3);
      const current=Math.round(target*eased);
      el.textContent=item.fmt(current);
      if(progress<1)requestAnimationFrame(tick);
    }
    setTimeout(()=>requestAnimationFrame(tick),idx*100);
  });
}

function renderToolbar(f){
  const el=$('#toolbar');if(!el)return;
  el.innerHTML=`<div class="search-wrap">${IC.search}<input type="text" class="search-input" id="si" placeholder="Search accounts, industries, websites..." /></div>
    <select class="filter-select" id="fs"><option value="">All Statuses</option>${(f.statuses||[]).map(s=>`<option>${s}</option>`).join('')}</select>
    <select class="filter-select" id="fi"><option value="">All Industries</option>${(f.industries||[]).map(s=>`<option>${s}</option>`).join('')}</select>
    <select class="filter-select" id="fc"><option value="">All Countries</option>${(f.countries||[]).map(s=>`<option>${s}</option>`).join('')}</select>`;
  let t;$('#si').oninput=e=>{clearTimeout(t);t=setTimeout(()=>{S.filters.search=e.target.value;S.page=1;loadAccounts();},300);};
  $('#fs').onchange=e=>{S.filters.status=e.target.value;S.page=1;loadAccounts();};
  $('#fi').onchange=e=>{S.filters.industry=e.target.value;S.page=1;loadAccounts();};
  $('#fc').onchange=e=>{S.filters.country=e.target.value;S.page=1;loadAccounts();};
}

const COLS=[
  {k:'account_name',l:'Account',sort:1},{k:'industry',l:'Industry',sort:1},{k:'account_status',l:'Status'},
  {k:'total_it_spend',l:'IT Spend/mo',sort:1},{k:'cdn_primary',l:'CDN Provider'},
  {k:'security_primary',l:'Security'},{k:'current_monthly_fee',l:'CF MRR',sort:1},{k:'last_activity',l:'Last Activity'},
];

async function loadAccounts(){
  const tbody=$('#tbody'),thead=$('#thead'),pag=$('#pag');if(!tbody)return;
  tbody.innerHTML=`<tr><td colspan="${COLS.length}" style="text-align:center;padding:48px"><div class="spinner" style="margin:0 auto"></div></td></tr>`;
  thead.innerHTML=COLS.map(c=>{const sorted=S.sort===c.k;return`<th class="${sorted?'sorted':''}" data-s="${c.k}" ${c.sort?'':'style="cursor:default"'}>${c.l}${sorted?(S.order==='ASC'?' \u2191':' \u2193'):''}</th>`;}).join('');
  thead.querySelectorAll('th').forEach(th=>th.onclick=()=>{const c=COLS.find(x=>x.k===th.dataset.s);if(!c?.sort)return;if(S.sort===th.dataset.s)S.order=S.order==='DESC'?'ASC':'DESC';else{S.sort=th.dataset.s;S.order='DESC';}S.page=1;loadAccounts();});
  const p=new URLSearchParams({page:S.page,limit:50,sort:S.sort,order:S.order,...S.filters.search&&{search:S.filters.search},...S.filters.status&&{status:S.filters.status},...S.filters.industry&&{industry:S.filters.industry},...S.filters.country&&{country:S.filters.country}});
  try{
    const d=await api.get(`/accounts?${p}`);const mx=Math.max(...d.accounts.map(a=>a.total_it_spend||0),1);
    tbody.innerHTML=d.accounts.length?d.accounts.map(a=>`<tr>
      <td><a href="#/account/${a.id}" class="row-link">${a.account_name||'--'}</a></td>
      <td style="font-size:12px;color:var(--text-muted)">${truncate(a.industry,24)||'--'}</td>
      <td>${statusPill(a.account_status)}</td>
      <td><div class="spend-cell"><span style="min-width:52px;font-weight:600">${fmtD(a.total_it_spend)}</span><div class="spend-bar"><div class="spend-bar-fill" style="width:${((a.total_it_spend||0)/mx*100).toFixed(0)}%"></div></div></div></td>
      <td><span class="stack-chip${(a.cdn_primary||'').toLowerCase().includes('cloudflare')?' is-cf':''}">${truncate(a.cdn_primary,18)||'--'}</span></td>
      <td><span class="stack-chip">${truncate(a.security_primary,18)||'--'}</span></td>
      <td style="color:var(--green);font-weight:700">${fmtD(a.current_monthly_fee)}</td>
      <td style="font-size:12px;color:var(--text-muted)">${timeAgo(a.last_activity)}</td>
    </tr>`).join(''):`<tr><td colspan="${COLS.length}" style="text-align:center;padding:48px;color:var(--text-muted)">No accounts match</td></tr>`;
    pag.innerHTML=`<span>Showing ${((S.page-1)*50+1).toLocaleString()}\u2013${Math.min(S.page*50,d.total).toLocaleString()} of ${d.total.toLocaleString()}</span><div class="pagination-btns"><button class="btn btn-ghost btn-sm" ${S.page<=1?'disabled':''} id="pp">Prev</button><button class="btn btn-ghost btn-sm" ${S.page>=d.pages?'disabled':''} id="np">Next</button></div>`;
    $('#pp')?.addEventListener('click',()=>{if(S.page>1){S.page--;loadAccounts();}});
    $('#np')?.addEventListener('click',()=>{if(S.page<d.pages){S.page++;loadAccounts();}});
  }catch(e){tbody.innerHTML=`<tr><td colspan="${COLS.length}" style="text-align:center;padding:48px;color:var(--red)">${e.message}</td></tr>`;}
}

// ══════════════════════════════════════════════════════════════════
// ACCOUNT DETAIL
// ══════════════════════════════════════════════════════════════════
async function renderAccount(c,id){
  c.innerHTML=`<div class="loading-state"><div class="spinner"></div></div>`;
  try{
    const a=await api.get(`/accounts/${id}`);
    if(!S.personas)S.personas=await api.get('/personas');
    S.activeTab='overview';S.selPersona=null;S.selMsg=null;

    const cfMRR=a.current_monthly_fee||0;const itSpend=a.total_it_spend||0;
    const penetration=itSpend>0?((cfMRR/itSpend)*100).toFixed(1):0;

    c.innerHTML=`<div class="slide-up">
      <a href="#/" class="back-link">${IC.back} All Accounts</a>
      <div class="acct-hero">
        <div class="acct-hero-top">
          <div>
            <h1 class="acct-name">${a.account_name}</h1>
            <div class="acct-meta-row">
              ${statusPill(a.account_status)}
              ${a.industry?`<span class="acct-meta-item">${IC.building} ${a.industry}</span>`:''}
              ${a.website?`<span class="acct-meta-item">${IC.globe} <a href="https://${a.website}" target="_blank">${a.website}</a></span>`:''}
              ${a.billing_country?`<span class="acct-meta-item">${[a.billing_city,a.billing_state,a.billing_country].filter(Boolean).join(', ')}</span>`:''}
              ${a.linkedin_url?`<span class="acct-meta-item"><a href="${a.linkedin_url}" target="_blank">${IC.linkedin} ${a.linkedin_followers?fmt(a.linkedin_followers)+' followers':'LinkedIn'}</a></span>`:''}
            </div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:8px;flex-shrink:0">
            <img src="${CF_LOGO}" alt="" style="height:20px;opacity:0.08;filter:brightness(0) invert(1)" />
            <button class="btn btn-accent-ghost btn-sm" id="share-btn">${IC.send} Share</button>
          </div>
        </div>
        <div class="acct-kpis">
          <div><div class="acct-kpi-label">Cloudflare MRR</div><div class="acct-kpi-value green">${fmtD(cfMRR)}</div></div>
          <div><div class="acct-kpi-label">Total IT Spend/mo</div><div class="acct-kpi-value purple">${fmtD(itSpend)}</div></div>
          <div><div class="acct-kpi-label">Wallet Penetration</div><div class="acct-kpi-value amber">${penetration}%</div></div>
          <div><div class="acct-kpi-label">Spend Potential</div><div class="acct-kpi-value blue">${a.spend_potential||'--'}</div></div>
          <div><div class="acct-kpi-label">Revenue</div><div class="acct-kpi-value pink">${a.revenue_bucket||'--'}</div></div>
          <div><div class="acct-kpi-label">Employees</div><div class="acct-kpi-value">${a.employees?.toLocaleString()||'--'}</div></div>
        </div>
      </div>

      <div class="tabs" id="tabs">
        <button class="tab active" data-t="overview">Overview</button>
        <button class="tab" data-t="research">Deep Research</button>
        <button class="tab" data-t="competitive">Competitive Intel</button>
        <button class="tab" data-t="messaging">Email Composer</button>
        <button class="tab" data-t="history">History</button>
      </div>
      <div id="tc"></div>
    </div>`;

    $$('#tabs .tab').forEach(t=>t.onclick=()=>{$$('#tabs .tab').forEach(x=>x.classList.remove('active'));t.classList.add('active');S.activeTab=t.dataset.t;renderTab(a);});
    renderTab(a);

    // Share button handler
    var shareBtn = document.getElementById('share-btn');
    if (shareBtn) shareBtn.addEventListener('click', function() {
      shareBtn.disabled = true;
      shareBtn.innerHTML = IC.send + ' Creating link...';
      fetch('/api/share/' + a.id, { method: 'POST', headers: {'Content-Type':'application/json'}, body: '{}' })
        .then(function(r) { return r.json(); })
        .then(function(d) {
          if (d.error) { toast(d.error, 'error'); shareBtn.disabled = false; shareBtn.innerHTML = IC.send + ' Share'; return; }
          var shareUrl = location.origin + '/#/share/' + d.token;
          navigator.clipboard.writeText(shareUrl).then(function() {
            shareBtn.innerHTML = IC.copy + ' Link copied!';
            toast('Share link copied to clipboard', 'success');
          }).catch(function() {
            prompt('Share this link:', shareUrl);
          });
          setTimeout(function() { shareBtn.disabled = false; shareBtn.innerHTML = IC.send + ' Share'; }, 3000);
        })
        .catch(function(e) { toast('Failed: ' + e.message, 'error'); shareBtn.disabled = false; shareBtn.innerHTML = IC.send + ' Share'; });
    });
  }catch(e){c.innerHTML=`<div class="empty-state"><p style="color:var(--red)">${e.message}</p><a href="#/" class="btn btn-ghost" style="margin-top:16px">Back</a></div>`;}
}

function renderTab(a){const c=$('#tc');switch(S.activeTab){case'overview':tabOverview(c,a);break;case'research':tabResearch(c,a);break;case'competitive':tabCompetitive(c,a);break;case'messaging':tabMessaging(c,a);break;case'history':tabHistory(c,a);break;}}

// ── Overview Tab ───────────────────────────────────────────────────
function tabOverview(c,a){
  const chips=s=>{if(!s)return'<span style="color:var(--text-muted);font-size:12px">None detected</span>';return s.split(';').filter(Boolean).map(p=>{const cf=p.toLowerCase().includes('cloudflare');return`<span class="stack-chip${cf?' is-cf':''}">${p.trim()}</span>`;}).join('');};
  const tBar=(region,key,color)=>{const v=a[key];const w=v?(v*100).toFixed(0):0;return`<div class="d-row"><span class="d-row-label">${region}</span><div class="traffic-bar-wrap"><div class="traffic-bar"><div class="traffic-bar-fill" style="width:${w}%;background:${color}"></div></div><span class="d-row-value" style="min-width:36px">${pct(v)}</span></div></div>`;};

  c.innerHTML=`<div class="fade-in">
    <div class="detail-grid">
      <div class="d-card"><div class="d-card-title">${IC.building} Company Profile</div>
        <div class="d-row"><span class="d-row-label">Revenue Band</span><span class="d-row-value">${a.revenue_bucket||'--'}</span></div>
        <div class="d-row"><span class="d-row-label">Annual Revenue</span><span class="d-row-value">${fmtD(a.annual_revenue)}</span></div>
        <div class="d-row"><span class="d-row-label">Employees</span><span class="d-row-value">${a.employees?.toLocaleString()||'--'} (${a.employee_bucket||'--'})</span></div>
        <div class="d-row"><span class="d-row-label">Segment</span><span class="d-row-value">${a.account_segment||'--'}</span></div>
        <div class="d-row"><span class="d-row-label">SAM</span><span class="d-row-value">${fmtD(a.sam)}</span></div>
        <div class="d-row"><span class="d-row-label">Customer Since</span><span class="d-row-value">${a.customer_acquisition_date||'--'}</span></div>
      </div>
      <div class="d-card"><div class="d-card-title">${IC.bar} Sales Pipeline</div>
        <div class="d-row"><span class="d-row-label">Total Opps</span><span class="d-row-value">${a.opportunities_total||0}</span></div>
        <div class="d-row"><span class="d-row-label">Open Opps</span><span class="d-row-value" style="color:var(--amber)">${a.opportunities_open||0}</span></div>
        <div class="d-row"><span class="d-row-label">Closed Lost</span><span class="d-row-value" style="color:var(--red)">${a.opportunities_closed_lost||0}</span></div>
        <div class="d-row"><span class="d-row-label">Last Activity</span><span class="d-row-value">${timeAgo(a.last_activity)}</span></div>
        <div class="d-row"><span class="d-row-label">30-day Activities</span><span class="d-row-value">${a.activities_last_30||0}</span></div>
      </div>
      <div class="d-card"><div class="d-card-title">${IC.globe} Traffic Distribution</div>
        ${tBar('North America','na_traffic','#7c7fff')}
        ${tBar('EMEA','emea_traffic','#34d399')}
        ${tBar('APJ','apj_traffic','#fbbf24')}
        ${tBar('LATAM','latam_traffic','#f472b6')}
      </div>
    </div>
    <div class="detail-grid" style="grid-template-columns:repeat(auto-fit,minmax(320px,1fr))">
      <div class="d-card"><div class="d-card-title">${IC.zap} CDN / Content Delivery</div><div class="d-row"><span class="d-row-label">Primary</span><span class="d-row-value">${a.cdn_primary||'None'}</span></div><div class="d-row"><span class="d-row-label">Spend</span><span class="d-row-value">${fmtD(a.cdn_spend)}/mo</span></div><div class="stack-list">${chips(a.cdn_products)}</div></div>
      <div class="d-card"><div class="d-card-title">${IC.shield} Security</div><div class="d-row"><span class="d-row-label">Primary</span><span class="d-row-value">${a.security_primary||'None'}</span></div><div class="d-row"><span class="d-row-label">Spend</span><span class="d-row-value">${fmtD(a.security_spend)}/mo</span></div><div class="stack-list">${chips(a.security_products)}</div></div>
      <div class="d-card"><div class="d-card-title">${IC.globe} DNS</div><div class="d-row"><span class="d-row-label">Primary</span><span class="d-row-value">${a.dns_primary||'None'}</span></div><div class="d-row"><span class="d-row-label">Spend</span><span class="d-row-value">${fmtD(a.dns_spend)}/mo</span></div><div class="stack-list">${chips(a.dns_products)}</div></div>
      <div class="d-card"><div class="d-card-title">${IC.target} Cloud Hosting</div><div class="d-row"><span class="d-row-label">Primary</span><span class="d-row-value">${a.cloud_hosting_primary||'None'}</span></div><div class="d-row"><span class="d-row-label">Spend</span><span class="d-row-value">${fmtD(a.cloud_hosting_spend)}/mo</span></div><div class="stack-list">${chips(a.cloud_hosting_products)}</div></div>
    </div>
  </div>`;
}

// ── Research Tab (cached) ──────────────────────────────────────────
function tabResearch(c,a){
  const cache = getCache(a.id).research;
  const types=[
    {id:'company_overview',icon:IC.building,title:'Company Overview',desc:'Executive briefing with business context, digital maturity, and growth signals',bg:'var(--blue-bg)'},
    {id:'competitive_analysis',icon:IC.target,title:'Competitive Displacement',desc:'Vendor-by-vendor displacement strategy with migration complexity and savings',bg:'var(--red-bg)'},
    {id:'cf_positioning',icon:IC.zap,title:'Cloudflare Positioning',desc:'Product-to-need mapping with quantified value and deal structure',bg:'var(--accent-glow)'},
    {id:'quarterly_intel',icon:IC.bar,title:'Earnings & Market Intel',desc:'Quarterly signals, earnings call themes, buying intent indicators',bg:'var(--amber-bg)'},
  ];
  c.innerHTML=`<div class="fade-in">
    <p style="font-size:14px;color:var(--text-muted);margin-bottom:24px">Generate AI-powered research reports. Each report runs live probes (DNS, HTTP headers, website, news, SEC) then analyzes with DeepSeek R1. Results persist across tabs.</p>
    <div class="research-grid">${types.map(t=>`<div class="research-card${cache.selectedType===t.id?' selected':''}" data-t="${t.id}"><div class="research-card-icon" style="background:${t.bg};border-radius:var(--radius-md)">${t.icon}</div><div class="research-card-title">${t.title}</div><div class="research-card-desc">${t.desc}</div>${cache.results[t.id]?'<div style="margin-top:8px;font-size:10px;color:var(--green);font-weight:600">GENERATED</div>':''}</div>`).join('')}</div>
    <div id="ro">${cache.outputHTML||''}</div>
  </div>`;

  $$('.research-card').forEach(card=>card.onclick=async()=>{
    const type = card.dataset.t;
    $$('.research-card').forEach(x=>x.classList.remove('selected'));card.classList.add('selected');
    cache.selectedType = type;

    // If we have a cached result for this type, show it with a regenerate button
    if (cache.results[type]) {
      showResearchResult(a, cache, type);
      return;
    }

    // Generate new
    const ro=$('#ro');
    ro.innerHTML=`<div class="output-card"><div class="ai-loading"><div class="ai-pulse">${IC.sparkles}</div><div class="ai-loading-text">Running live research on ${a.account_name}...</div><div class="ai-loading-sub">Probing DNS records, HTTP headers, scraping website, searching news, checking SEC filings &mdash; then analyzing with DeepSeek R1</div></div></div>`;
    await runResearch(a, cache, type);
  });
}

async function runResearch(a, cache, type) {
  const ro=$('#ro');
  try{
    const r=await api.post(`/research/${a.id}`,{type});
    cache.results[type] = r;
    showResearchResult(a, cache, type);
    // Update the "GENERATED" badges
    $$('.research-card').forEach(card=>{
      const badge = card.querySelector('[style*="color:var(--green)"]');
      if (cache.results[card.dataset.t] && !badge) {
        card.insertAdjacentHTML('beforeend','<div style="margin-top:8px;font-size:10px;color:var(--green);font-weight:600">GENERATED</div>');
      }
    });
  }catch(e){
    ro.innerHTML=`<div class="output-card"><div style="padding:32px;color:var(--red)">Error: ${e.message}</div></div>`;
    cache.outputHTML = ro.innerHTML;
  }
}

function showResearchResult(a, cache, type) {
  const r = cache.results[type];
  const ro=$('#ro');
  const title = r.title || type.replace(/_/g,' ');
  ro.innerHTML=`<div class="output-card slide-up">
    <div class="output-header">
      <div class="output-header-left">
        <img src="${CF_LOGO}" style="height:18px;filter:brightness(0) invert(1);opacity:0.5" />
        <div><div class="output-header-title">${title}</div><div class="output-header-sub">Generated for ${a.account_name}</div></div>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-accent-ghost btn-sm" id="regen-research">${IC.sparkles} Regenerate</button>
        <button class="btn btn-ghost btn-sm" onclick="copyEl(this)">${IC.copy} Copy</button>
      </div>
    </div>
    <div class="output-body">${md(r.content)}</div>
  </div>`;
  cache.outputHTML = ro.innerHTML;

  $('#regen-research')?.addEventListener('click', async ()=>{
    ro.innerHTML=`<div class="output-card"><div class="ai-loading"><div class="ai-pulse">${IC.sparkles}</div><div class="ai-loading-text">Regenerating research...</div><div class="ai-loading-sub">Running fresh live probes and analysis</div></div></div>`;
    delete cache.results[type];
    await runResearch(a, cache, type);
  });
}

// ── Competitive Intel Tab (full product catalog) ──────────────────
function tabCompetitive(c, a) {
  c.innerHTML = '<div class="loading-state"><div class="spinner"></div>Loading competitive catalog...</div>';

  // Fetch both catalog and account-detected competitors in parallel
  Promise.all([
    api.get('/catalog'),
    api.post('/competitive/' + a.id, {}).catch(function() { return { detected: [] }; })
  ]).then(function(results) {
    var catalog = results[0];
    var accountData = results[1];
    var detectedKeys = {};
    (accountData.detected || []).forEach(function(d) { detectedKeys[d.competitorKey] = d; });

    var catColors = ['#60a5fa','#f87171','#fb923c','#a78bfa','#34d399','#fbbf24','#f472b6','#60a5fa','#34d399','#fb923c','#a78bfa','#f87171'];

    var html = '<div class="fade-in">';
    html += '<p style="font-size:14px;color:var(--text-muted);margin-bottom:28px">Browse <strong style="color:var(--text-primary)">all Cloudflare products</strong> and generate live battlecards against any competitor. Products where <strong style="color:var(--green)">' + a.account_name + '</strong> uses a competitor are highlighted.</p>';

    for (var ci = 0; ci < catalog.length; ci++) {
      var cat = catalog[ci];
      var color = catColors[ci % catColors.length];
      var hasDetected = cat.competitors.some(function(comp) { return detectedKeys[comp.key]; });

      html += '<div class="d-card" style="margin-bottom:16px;border-color:' + color + '15">';
      html += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">';
      html += '<div class="d-card-title" style="margin-bottom:0;color:' + color + '">' + cat.icon + ' ' + cat.category;
      if (hasDetected) html += ' <span class="pill pill-churned" style="font-size:9px;padding:2px 6px;margin-left:8px;background:rgba(248,113,113,0.1);color:#f87171">DETECTED IN STACK</span>';
      html += '</div>';
      html += '<span style="font-size:11px;color:var(--text-muted)">' + cat.productCount + ' products &middot; ' + cat.competitorCount + ' competitors</span>';
      html += '</div>';

      // CF Products row
      html += '<div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px">';
      for (var pi = 0; pi < cat.products.length; pi++) {
        var p = cat.products[pi];
        html += '<span class="stack-chip is-cf" title="' + p.desc + '">' + p.name + '</span>';
      }
      html += '</div>';

      // Competitor cards
      html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px">';
      for (var ki = 0; ki < cat.competitors.length; ki++) {
        var comp = cat.competitors[ki];
        var isDetected = !!detectedKeys[comp.key];
        var borderStyle = isDetected ? 'border-color:' + color + ';background:' + color + '0a' : '';
        html += '<button class="msg-type-btn comp-btn" data-cat="' + cat.key + '" data-comp="' + comp.key + '" data-name="' + comp.name + '" style="' + borderStyle + '">';
        if (isDetected) html += '<span style="color:' + color + ';margin-right:4px">\u{1F534}</span> ';
        html += comp.name;
        if (isDetected) html += ' <span style="font-size:10px;color:var(--text-muted)">(in use)</span>';
        html += '</button>';
      }
      html += '</div></div>';
    }

    html += '<div id="comp-output" style="margin-top:32px"></div>';
    html += '</div>';
    c.innerHTML = html;

    // Click handlers for every competitor button
    var compBtns = document.querySelectorAll('.comp-btn');
    for (var i = 0; i < compBtns.length; i++) {
      (function(btn) {
        btn.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          var catKey = btn.getAttribute('data-cat');
          var compKey = btn.getAttribute('data-comp');
          var compName = btn.getAttribute('data-name');
          var out = document.getElementById('comp-output');
          if (!out) { toast('UI error: output area not found', 'error'); return; }

          // Highlight selected
          for (var x = 0; x < compBtns.length; x++) compBtns[x].classList.remove('selected');
          btn.classList.add('selected');

          // Show loading immediately
          btn.style.opacity = '0.5';
          btn.textContent = 'Generating...';
          out.innerHTML = '<div style="padding:48px;text-align:center"><div class="spinner" style="margin:0 auto 16px"></div><div style="color:var(--text-secondary);font-size:14px;font-weight:600">Generating battlecard: ' + compName + ' vs Cloudflare...</div><div style="color:var(--text-muted);font-size:12px;margin-top:6px">Live-scraping ' + compName + '\'s product &amp; pricing pages, then analyzing with DeepSeek R1. 30-60 seconds.</div></div>';
          out.scrollIntoView({ behavior: 'smooth', block: 'center' });

          var reqBody = JSON.stringify({ category: catKey, competitorKey: compKey });
          fetch('/api/competitive/' + a.id, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: reqBody,
          }).then(function(r) {
            if (!r.ok) return r.json().then(function(d) { throw new Error(d.error || r.statusText); });
            return r.json();
          }).then(function(result) {
            if (!result.battlecard) {
              out.innerHTML = '<div style="padding:32px;color:var(--text-muted);text-align:center">No battlecard generated. The account may need to be re-uploaded after auth was enabled.</div>';
              return;
            }
            var bc = result.battlecard;
            var h = '<div class="output-card slide-up">';
            h += '<div class="output-header" style="background:linear-gradient(135deg, rgba(248,113,113,0.06), rgba(96,165,250,0.06))">';
            h += '<div class="output-header-left">';
            h += '<div style="font-size:20px;margin-right:8px">' + IC.shield + '</div>';
            h += '<div><div class="output-header-title">' + bc.competitor + ' vs Cloudflare ' + bc.category + '</div>';
            h += '<div class="output-header-sub">Live data from both websites &mdash; Powered by DeepSeek R1</div></div></div>';
            h += '<button class="btn btn-ghost btn-sm" onclick="copyEl(this)">' + IC.copy + ' Copy</button></div>';
            h += '<div class="output-body">' + md(bc.content) + '</div>';
            h += '<div style="padding:14px 28px 18px;border-top:1px solid var(--border-glass);display:flex;flex-wrap:wrap;gap:8px;align-items:center">';
            h += '<span style="font-size:11px;color:var(--text-muted);font-weight:600">CF Products:</span>';
            if (bc.cfProducts) {
              for (var pi = 0; pi < bc.cfProducts.length; pi++) {
                var cfp = bc.cfProducts[pi];
                h += '<a href="' + cfp.url + '" target="_blank" class="stack-chip is-cf" style="text-decoration:none">' + cfp.name + '</a>';
              }
            }
            h += '</div></div>';
            out.innerHTML = h;
            out.scrollIntoView({ behavior: 'smooth', block: 'start' });
            btn.style.opacity = '1';
            btn.textContent = compName;
          }).catch(function(err) {
            out.innerHTML = '<div style="padding:32px;text-align:center"><div style="color:var(--red);font-size:14px;font-weight:600;margin-bottom:8px">Battlecard generation failed</div><div style="color:var(--text-muted);font-size:13px">' + (err.message || err) + '</div></div>';
            btn.style.opacity = '1';
            btn.textContent = compName;
          });
        });
      })(compBtns[i]);
    }
  }).catch(function(err) {
    c.innerHTML = '<div style="padding:32px;color:var(--red)">Failed to load catalog: ' + (err.message || err) + '</div>';
  });
}

// ── Messaging Tab (bulletproof, no template literals for dynamic content) ──
function tabMessaging(c,a){
  var personas=S.personas||{};
  var cache = getCache(a.id).messaging;
  var personaKeys = Object.keys(personas);

  // Build HTML with string concatenation only (no template literals for dynamic content)
  var html = '<div class="fade-in">';
  html += '<div id="probe-status" style="margin-bottom:24px"></div>';
  html += '<div class="persona-section-title">1. Choose Your Persona</div>';
  html += '<div class="persona-grid" id="pg">';
  for (var i = 0; i < personaKeys.length; i++) {
    var k = personaKeys[i];
    var p = personas[k];
    var sel = cache.selPersona === k ? ' selected' : '';
    html += '<div class="persona-card' + sel + '" data-p="' + k + '">';
    html += '<div class="persona-avatar">' + (PERSONA_META[k] ? PERSONA_META[k].icon : '') + '</div>';
    html += '<div class="persona-name">' + p.name + '</div>';
    html += '<div class="persona-role">' + p.title + '</div>';
    html += '</div>';
  }
  html += '</div>';
  html += '<div class="persona-section-title" style="margin-top:28px">2. Message Type</div>';
  html += '<div class="msg-types" id="mt"><div style="color:var(--text-muted);font-size:13px;padding:8px 0">Select a persona above to see message types</div></div>';
  html += '<div class="persona-section-title" style="margin-top:24px">3. Additional Context <span style="font-weight:400;color:var(--text-muted);text-transform:none;letter-spacing:0;font-size:11px">(optional)</span></div>';
  html += '<textarea class="context-area" id="ctx" placeholder="Recent call notes, deal stage, specific pain points, upcoming events...">' + (cache.customContext || '') + '</textarea>';
  html += '<button class="btn btn-primary btn-lg" id="gen-btn" style="width:100%;justify-content:center;padding:16px 24px;font-size:15px;margin-top:8px">' + IC.send + ' Generate Email</button>';
  html += '<div id="mo" style="margin-top:32px"></div>';
  html += '</div>';

  c.innerHTML = html;

  // Restore cached output if exists (set via DOM to avoid escaping issues)
  if (cache.outputHTML) {
    document.getElementById('mo').innerHTML = cache.outputHTML;
  }

  // ── Pre-fetch probes ────────────────────────────────────────────
  var probeEl = document.getElementById('probe-status');
  if (probeEl) {
    if (cache.probeData && cache.probeSummary) {
      renderProbeStatus(probeEl, cache.probeSummary, true);
    } else {
      probeEl.innerHTML = '<div style="display:flex;align-items:center;gap:10px;padding:10px 16px;background:var(--accent-glow);border:1px solid var(--border-accent);border-radius:var(--radius-md);font-size:12px;color:var(--accent-bright)"><div class="spinner" style="width:14px;height:14px;border-width:2px"></div><span>Probing ' + a.account_name + ' &mdash; website, DNS, headers, SEC, news, browser rendering...</span></div>';
      api.post('/live-probe/' + a.id, {}).then(function(result) {
        cache.probeData = result.probeData;
        cache.probeSummary = result.summary;
        if (document.getElementById('probe-status')) renderProbeStatus(document.getElementById('probe-status'), result.summary, true);
      }).catch(function(err) {
        if (document.getElementById('probe-status')) document.getElementById('probe-status').innerHTML = '<div style="padding:8px 16px;font-size:12px;color:var(--text-muted)">Probes will run during generation.</div>';
      });
    }
  }

  // ── Show message types for a persona ────────────────────────────
  function showMsgTypes(personaKey) {
    var p = personas[personaKey];
    if (!p || !p.messageTypes) return;
    var mt = document.getElementById('mt');
    if (!mt) return;
    var btnsHtml = '';
    for (var j = 0; j < p.messageTypes.length; j++) {
      var t = p.messageTypes[j];
      var msel = cache.selMsg === t.id ? ' selected' : '';
      btnsHtml += '<button class="msg-type-btn' + msel + '" data-m="' + t.id + '">' + t.label + '</button>';
    }
    mt.innerHTML = btnsHtml;
    var btns = mt.querySelectorAll('.msg-type-btn');
    for (var j = 0; j < btns.length; j++) {
      (function(b) {
        b.addEventListener('click', function() {
          for (var x = 0; x < btns.length; x++) btns[x].classList.remove('selected');
          b.classList.add('selected');
          cache.selMsg = b.getAttribute('data-m');
          S.selMsg = cache.selMsg;
        });
      })(btns[j]);
    }
  }

  if (cache.selPersona) showMsgTypes(cache.selPersona);

  // ── Context save ────────────────────────────────────────────────
  var ctxEl = document.getElementById('ctx');
  if (ctxEl) ctxEl.addEventListener('input', function() { cache.customContext = ctxEl.value; });

  // ── Persona click handlers ──────────────────────────────────────
  var pgCards = document.querySelectorAll('#pg .persona-card');
  for (var i = 0; i < pgCards.length; i++) {
    (function(card) {
      card.addEventListener('click', function() {
        for (var x = 0; x < pgCards.length; x++) pgCards[x].classList.remove('selected');
        card.classList.add('selected');
        var pk = card.getAttribute('data-p');
        cache.selPersona = pk;
        S.selPersona = pk;
        cache.selMsg = null;
        S.selMsg = null;
        showMsgTypes(pk);
        var mtEl = document.getElementById('mt');
        if (mtEl) mtEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    })(pgCards[i]);
  }

  // ── Generate button (bulletproof) ─────────────────────────────────
  var genBtn = document.getElementById('gen-btn');
  if (genBtn) {
    genBtn.addEventListener('click', function(e) {
      e.preventDefault();
      if (!cache.selPersona) { toast('Select a persona first', 'error'); return; }
      if (!cache.selMsg) { toast('Select a message type', 'error'); return; }
      S.selPersona = cache.selPersona;
      S.selMsg = cache.selMsg;

      // Show loading IMMEDIATELY in the button handler (before async)
      var mo = document.getElementById('mo');
      if (mo) {
        mo.innerHTML = '<div style="padding:48px;text-align:center"><div class="spinner" style="margin:0 auto 16px"></div><div style="color:var(--text-secondary);font-size:14px;font-weight:600">Generating email with Llama 3.3...</div><div style="color:var(--text-muted);font-size:12px;margin-top:6px">This takes 15-30 seconds. Live research data is being fed to the AI.</div></div>';
        mo.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      // Call async generator with explicit error catch
      generateEmail(a, cache).catch(function(err) {
        if (mo) mo.innerHTML = '<div style="padding:32px;color:var(--red);text-align:center"><div style="font-size:18px;margin-bottom:8px">Generation failed</div><div style="font-size:13px">' + (err.message || err) + '</div></div>';
        toast('Email generation failed: ' + (err.message || err), 'error');
      });
    });
  }
}

function renderProbeStatus(el, summary, done) {
  const found = summary.filter(p=>p.status==='found').length;
  const total = summary.length;
  // Compact single-line summary with expandable details
  const chips = summary.map(p=>{
    const color = p.status==='found'?'var(--green)':p.status==='empty'?'var(--text-muted)':'var(--red)';
    const icon = p.status==='found'?'\u2713':p.status==='empty'?'\u2014':'\u2717';
    return `<span style="font-size:11px;color:${color};font-weight:600" title="${p.label}: ${p.detail||p.status} (${p.ms}ms)">${icon} ${p.label.split(' ')[0]}</span>`;
  }).join('<span style="color:var(--border-glass);margin:0 4px">|</span>');

  el.innerHTML=`<div style="display:flex;align-items:center;gap:12px;padding:10px 16px;background:rgba(52,211,153,0.06);border:1px solid rgba(52,211,153,0.15);border-radius:var(--radius-md);font-size:12px;flex-wrap:wrap">
    <span style="color:var(--green);font-weight:700;white-space:nowrap">\u2713 Research ready</span>
    <span style="color:var(--text-muted)">${found}/${total} sources found</span>
    <span style="display:flex;align-items:center;gap:0;flex-wrap:wrap">${chips}</span>
    <button class="btn btn-ghost btn-sm" style="margin-left:auto;font-size:10px;padding:3px 8px" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display==='none'?'block':'none'">Details</button>
    <div style="display:none;width:100%;padding-top:10px;border-top:1px solid rgba(255,255,255,0.04);margin-top:6px">
      ${summary.map(p=>`<div style="display:flex;align-items:baseline;gap:8px;padding:3px 0;font-size:11px">
        <span style="color:${p.status==='found'?'var(--green)':'var(--text-muted)'};min-width:12px">${p.status==='found'?'\u2713':'\u2014'}</span>
        <span style="color:var(--text-secondary);min-width:100px">${p.label}</span>
        <span style="color:var(--text-muted);flex:1;font-style:italic">${p.detail?.slice(0,100)||'—'}</span>
        <span style="color:var(--text-muted)">${p.ms}ms</span>
      </div>`).join('')}
    </div>
  </div>`;
}

async function generateEmail(a, cache) {
  var mo = document.getElementById('mo');
  if (!mo) { toast('UI error: output container not found', 'error'); return; }

  // Safely get persona data
  var personas = S.personas || {};
  var p = personas[S.selPersona];
  var pm = PERSONA_META[S.selPersona] || { icon: '', color: '' };
  if (!p) { mo.innerHTML = '<div style="padding:32px;color:var(--red)">Error: persona "' + S.selPersona + '" not found</div>'; return; }

  var msgLabel = '';
  for (var i = 0; i < p.messageTypes.length; i++) {
    if (p.messageTypes[i].id === S.selMsg) { msgLabel = p.messageTypes[i].label; break; }
  }

  var ctx = '';
  var ctxEl = document.getElementById('ctx');
  if (ctxEl) ctx = ctxEl.value || '';
  if (!ctx && cache) ctx = cache.customContext || '';

  // Build request
  var reqBody = { persona: S.selPersona, messageType: S.selMsg, customContext: ctx };
  if (cache && cache.probeData) reqBody.prefetchedProbeData = cache.probeData;

  // Call API
  var r = await api.post('/messaging/' + a.id, reqBody);

  // Parse result
  var content = r.content || '';
  var subjectMatch = content.match(/Subject:?\s*(.+?)(?:\n|$)/i);
  var subject = subjectMatch ? subjectMatch[1].trim() : (msgLabel + ' - ' + a.account_name);
  var emailBody = content.replace(/^Subject:?\s*.+\n*/im, '');

  if (cache) cache.lastResult = r;

  // Build email HTML using string concatenation (no template literals)
  var h = '<div class="email-preview slide-up">';
  h += '<div class="email-toolbar"><div class="email-dot r"></div><div class="email-dot y"></div><div class="email-dot g"></div>';
  h += '<span style="margin-left:auto;font-size:11px;color:var(--text-muted);font-weight:600">' + p.name + ' / ' + msgLabel + '</span></div>';
  h += '<div class="email-subject-bar">';
  h += '<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">';
  h += '<span style="font-size:28px">' + pm.icon + '</span>';
  h += '<div><div style="font-size:11px;color:var(--text-muted);font-weight:600">' + p.title + ' at Cloudflare</div>';
  h += '<div style="font-size:10px;color:var(--text-muted)">' + (p.tone ? p.tone.split('.')[0] : '') + '</div></div>';
  h += '<img src="' + CF_LOGO + '" style="height:16px;margin-left:auto;opacity:0.12;filter:brightness(0) invert(1)" /></div>';
  h += '<div class="email-subject-label">Subject</div>';
  h += '<div class="email-subject">' + subject + '</div></div>';
  h += '<div class="email-body">' + md(emailBody) + '</div>';
    h += '<div class="email-actions">';
    h += '<button class="btn btn-primary btn-sm" onclick="copyEl(this,\'email\')">' + IC.copy + ' Copy Email</button>';
    h += '<button class="btn btn-ghost btn-sm" onclick="copyEl(this,\'subject\')" data-subject="' + subject.replace(/"/g, '&quot;') + '">' + IC.mail + ' Copy Subject</button>';
    if (window._gmailConnected) {
      h += '<button class="btn btn-sm" style="background:linear-gradient(135deg,#34d399,#10b981);color:#fff" id="send-gmail" data-subject="' + subject.replace(/"/g, '&quot;') + '">' + IC.send + ' Send via Gmail</button>';
    } else {
      h += '<a href="/api/gmail/connect" target="_blank" class="btn btn-ghost btn-sm">' + IC.mail + ' Connect Gmail to Send</a>';
    }
    h += '<button class="btn btn-accent-ghost btn-sm" id="regen-email">' + IC.sparkles + ' Regenerate</button>';
    h += '</div></div>';

  mo.innerHTML = h;
  if (cache) cache.outputHTML = h;
  mo.scrollIntoView({ behavior: 'smooth', block: 'start' });

  var sendGmailBtn = document.getElementById('send-gmail');
  if (sendGmailBtn) {
    sendGmailBtn.addEventListener('click', function() {
      var subj = sendGmailBtn.getAttribute('data-subject') || '';
      var bodyEl = mo.querySelector('.email-body');
      var bodyText = bodyEl ? bodyEl.innerText : '';
      var toAddr = prompt('Send to email address:');
      if (!toAddr) return;
      sendGmailBtn.disabled = true;
      sendGmailBtn.innerHTML = '<div class="spinner" style="width:12px;height:12px;border-width:2px;display:inline-block;vertical-align:middle;margin-right:6px"></div> Sending...';
      fetch('/api/gmail/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: toAddr, subject: subj, body: bodyText, accountId: a.id }),
      }).then(function(r) { return r.json(); }).then(function(d) {
        if (d.success) {
          sendGmailBtn.innerHTML = '\u2713 Sent!';
          sendGmailBtn.style.background = 'var(--green)';
          toast('Email sent to ' + toAddr, 'success');
        } else {
          sendGmailBtn.innerHTML = IC.send + ' Failed';
          toast('Send failed: ' + (d.error || 'Unknown error'), 'error');
          sendGmailBtn.disabled = false;
          setTimeout(function() { sendGmailBtn.innerHTML = IC.send + ' Send via Gmail'; }, 2000);
        }
      }).catch(function(e) {
        toast('Error: ' + e.message, 'error');
        sendGmailBtn.disabled = false;
        sendGmailBtn.innerHTML = IC.send + ' Send via Gmail';
      });
    });
  }

  var regenBtn = document.getElementById('regen-email');
  if (regenBtn) {
    regenBtn.addEventListener('click', function() {
      mo.innerHTML = '<div style="padding:48px;text-align:center"><div class="spinner" style="margin:0 auto 16px"></div><div style="color:var(--text-secondary);font-size:14px">Regenerating...</div></div>';
      generateEmail(a, cache).catch(function(err) {
        mo.innerHTML = '<div style="padding:32px;color:var(--red)">Error: ' + (err.message || err) + '</div>';
      });
    });
  }
}

// ── History Tab ────────────────────────────────────────────────────
async function tabHistory(c,a){
  c.innerHTML=`<div class="loading-state"><div class="spinner"></div></div>`;
  try{
    const[research,messages]=await Promise.all([api.get(`/research/${a.id}`),api.get(`/messaging/${a.id}`)]);
    const items=[...research.map(r=>({...r,kind:'research'})),...messages.map(m=>({...m,kind:'message'}))].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
    if(!items.length){c.innerHTML=`<div class="fade-in" style="text-align:center;padding:60px 0;color:var(--text-muted)"><div style="font-size:32px;margin-bottom:12px;opacity:0.3">${IC.clock}</div><p>No research or messages generated yet.</p><p style="font-size:12px;margin-top:4px">Use the Deep Research and Email Composer tabs above.</p></div>`;return;}
    c.innerHTML=`<div class="fade-in"><p style="font-size:13px;color:var(--text-muted);margin-bottom:20px">${items.length} items generated</p>${items.map((it,i)=>`<div class="history-item" data-i="${i}"><div class="history-item-head"><span class="history-item-title">${it.kind==='research'?(it.title||it.report_type):`${(it.persona||'').toUpperCase()}: ${it.message_type}`}</span><span class="history-item-date">${timeAgo(it.created_at)}</span></div><div class="history-item-preview">${(it.content||'').slice(0,180)}...</div></div>`).join('')}<div id="hd"></div></div>`;
    $$('.history-item').forEach(el=>el.onclick=()=>{
      const it=items[+el.dataset.i];
      $('#hd').innerHTML=`<div class="output-card slide-up" style="margin-top:16px"><div class="output-header"><div class="output-header-left"><div class="output-header-title">${it.kind==='research'?(it.title||it.report_type):`${(it.persona||'').toUpperCase()}: ${it.message_type}`}</div></div><button class="btn btn-ghost btn-sm" onclick="copyEl(this)">${IC.copy} Copy</button></div><div class="output-body">${md(it.content)}</div></div>`;
      $('#hd').scrollIntoView({behavior:'smooth',block:'start'});
    });
  }catch(e){c.innerHTML=`<div style="padding:32px;color:var(--red)">${e.message}</div>`;}
}

// ══════════════════════════════════════════════════════════════════
// CAMPAIGNS
// ══════════════════════════════════════════════════════════════════
function renderCampaigns(c) {
  c.innerHTML = '<div class="loading-state"><div class="spinner"></div></div>';

  Promise.all([
    api.get('/campaign-themes'),
    api.get('/campaigns'),
    api.get('/filters'),
    api.get('/personas'),
  ]).then(function(res) {
    var themes = res[0];
    var campaigns = res[1];
    var filters = res[2];
    var personas = res[3];

    var h = '<div class="fade-in">';
    h += '<div class="page-header"><div class="page-header-row"><div>';
    h += '<h1 class="page-title">Mass Email Campaigns</h1>';
    h += '<p class="page-subtitle">Select a theme, persona, and audience filters to generate personalized emails for hundreds of accounts at once.</p>';
    h += '</div></div></div>';

    // Existing campaigns
    if (campaigns.length) {
      h += '<div class="persona-section-title" style="margin-bottom:14px">Your Campaigns</div>';
      for (var i = 0; i < campaigns.length; i++) {
        var cp = campaigns[i];
        var th = themes[cp.theme] || {};
        var statusColor = cp.status === 'complete' ? 'var(--green)' : cp.status === 'generating' ? 'var(--amber)' : 'var(--text-muted)';
        h += '<a href="#/campaign/' + cp.id + '" style="text-decoration:none;display:block" class="d-card" style="margin-bottom:12px">';
        h += '<div style="display:flex;align-items:center;justify-content:space-between">';
        h += '<div><div style="font-size:15px;font-weight:700;color:var(--text-primary)">' + (th.icon || '') + ' ' + cp.name + '</div>';
        h += '<div style="font-size:12px;color:var(--text-muted);margin-top:4px">' + (th.name || cp.theme) + ' &middot; ' + (cp.persona || '').toUpperCase() + ' &middot; ' + cp.total_accounts + ' accounts</div></div>';
        h += '<div style="text-align:right"><div style="font-size:14px;font-weight:700;color:' + statusColor + '">' + cp.generated + '/' + cp.total_accounts + '</div>';
        h += '<div style="font-size:11px;color:var(--text-muted)">' + cp.status + '</div></div>';
        h += '</div></a>';
      }
      h += '<div style="margin-bottom:32px"></div>';
    }

    // New campaign builder
    h += '<div class="persona-section-title">1. Choose Campaign Theme</div>';
    h += '<div class="research-grid" id="theme-grid">';
    var themeKeys = Object.keys(themes);
    for (var i = 0; i < themeKeys.length; i++) {
      var tk = themeKeys[i];
      var t = themes[tk];
      h += '<div class="research-card" data-theme="' + tk + '" style="background:linear-gradient(135deg,' + t.color + '14,' + t.color + '04);border-color:' + t.color + '25">';
      h += '<div class="research-card-icon" style="background:' + t.color + '20;color:' + t.color + ';border-radius:var(--radius-md);font-size:22px">' + t.icon + '</div>';
      h += '<div class="research-card-title" style="color:' + t.color + '">' + t.name + '</div>';
      h += '<div class="research-card-desc">' + t.description + '</div></div>';
    }
    h += '</div>';

    h += '<div class="persona-section-title" style="margin-top:28px">2. Choose Persona</div>';
    h += '<div class="persona-grid" id="camp-persona-grid">';
    var pKeys = Object.keys(personas);
    for (var i = 0; i < pKeys.length; i++) {
      var pk = pKeys[i];
      var p = personas[pk];
      var pm = PERSONA_META[pk] || {};
      h += '<div class="persona-card" data-p="' + pk + '">';
      h += '<div class="persona-avatar">' + (pm.icon || '') + '</div>';
      h += '<div class="persona-name">' + p.name + '</div>';
      h += '<div class="persona-role">' + p.title + '</div></div>';
    }
    h += '</div>';

    h += '<div class="persona-section-title" style="margin-top:28px">3. Message Type</div>';
    h += '<div class="msg-types" id="camp-msg-types"><div style="color:var(--text-muted);font-size:13px;padding:8px 0">Select a persona to see message types</div></div>';

    // Step 4: Account Selection with checkbox table
    h += '<div class="persona-section-title" style="margin-top:28px">4. Select Accounts</div>';
    h += '<p style="font-size:12px;color:var(--text-muted);margin-bottom:12px">Check the accounts you want to include. Each email will be hyper-personalized with live public intel (news, earnings, website, SEC filings).</p>';
    h += '<div class="toolbar" style="margin-bottom:8px">';
    h += '<div class="search-wrap">' + IC.search + '<input type="text" class="search-input" id="camp-search" placeholder="Filter accounts..." /></div>';
    h += '<select class="filter-select" id="cf-industry"><option value="">All Industries</option>' + (filters.industries || []).map(function(s) { return '<option>' + s + '</option>'; }).join('') + '</select>';
    h += '<select class="filter-select" id="cf-country"><option value="">All Countries</option>' + (filters.countries || []).map(function(s) { return '<option>' + s + '</option>'; }).join('') + '</select>';
    h += '<select class="filter-select" id="cf-spend"><option value="">Any Spend</option><option value="1000">$1K+ /mo</option><option value="10000">$10K+ /mo</option><option value="100000">$100K+ /mo</option><option value="1000000">$1M+ /mo</option></select>';
    h += '</div>';
    h += '<div style="display:flex;align-items:center;gap:12px;margin-bottom:10px">';
    h += '<label style="font-size:12px;color:var(--accent-bright);cursor:pointer;font-weight:600" id="select-all-label"><input type="checkbox" id="select-all-cb" style="margin-right:6px;accent-color:var(--accent)" />Select All Visible</label>';
    h += '<span style="font-size:12px;color:var(--text-muted)" id="selected-count">0 selected</span>';
    h += '<button class="btn btn-ghost btn-sm" id="clear-selection-btn" style="margin-left:auto;font-size:11px">Clear</button>';
    h += '</div>';
    h += '<div id="account-table" style="max-height:400px;overflow-y:auto;border:1px solid var(--border-glass);border-radius:var(--radius-md)"></div>';

    h += '<div class="persona-section-title" style="margin-top:24px">5. Campaign Name & Context <span style="font-weight:400;color:var(--text-muted);text-transform:none;letter-spacing:0;font-size:11px">(optional)</span></div>';
    h += '<input type="text" class="search-input" id="camp-name" placeholder="Campaign name (e.g. Q1 Security Push - EMEA)" style="margin-bottom:10px;padding-left:14px" />';
    h += '<textarea class="context-area" id="camp-context" placeholder="Additional context for all emails: upcoming event, promo, specific angle..."></textarea>';

    h += '<button class="btn btn-primary btn-lg" id="create-campaign-btn" style="width:100%;justify-content:center;padding:16px 24px;font-size:15px;margin-top:12px">' + IC.send + ' Create & Generate Campaign</button>';
    h += '<div id="camp-status" style="margin-top:24px"></div>';
    h += '</div>';

    c.innerHTML = h;

    // State
    var selTheme = null, selPersona = null, selMsg = null;
    var selectedAccountIds = [];
    var selectedAccountMap = {};
    var allLoadedAccounts = [];
    var campPage = 1;

    function updateSelectedCount() {
      var countEl = document.getElementById('selected-count');
      if (countEl) countEl.innerHTML = '<strong style="color:var(--accent-bright)">' + selectedAccountIds.length + '</strong> selected';
    }

    function renderAccountTable(accounts) {
      allLoadedAccounts = accounts;
      var tbl = document.getElementById('account-table');
      if (!tbl) return;
      if (!accounts.length) { tbl.innerHTML = '<div style="padding:24px;text-align:center;color:var(--text-muted);font-size:13px">No accounts match filters</div>'; return; }

      var html = '<table style="width:100%"><thead><tr>';
      html += '<th style="width:40px;padding:8px 12px"><input type="checkbox" id="head-cb" style="accent-color:var(--accent)" /></th>';
      html += '<th>Account</th><th>Industry</th><th>CDN</th><th>Security</th><th>IT Spend</th><th>Status</th>';
      html += '</tr></thead><tbody>';
      for (var i = 0; i < accounts.length; i++) {
        var a = accounts[i];
        var checked = selectedAccountIds.indexOf(a.id) >= 0 ? ' checked' : '';
        html += '<tr style="cursor:pointer" data-row-id="' + a.id + '">';
        html += '<td style="padding:8px 12px"><input type="checkbox" class="acct-cb" data-id="' + a.id + '" style="accent-color:var(--accent)"' + checked + ' /></td>';
        html += '<td style="font-weight:600;color:var(--text-primary)">' + a.account_name + '</td>';
        html += '<td style="font-size:12px;color:var(--text-muted)">' + (a.industry || '--') + '</td>';
        html += '<td><span class="stack-chip' + ((a.cdn_primary||'').toLowerCase().includes('cloudflare')?' is-cf':'') + '">' + truncate(a.cdn_primary,15) + '</span></td>';
        html += '<td><span class="stack-chip">' + truncate(a.security_primary,15) + '</span></td>';
        html += '<td style="font-weight:600">' + fmtD(a.total_it_spend) + '</td>';
        html += '<td>' + statusPill(a.account_status) + '</td>';
        html += '</tr>';
      }
      html += '</tbody></table>';
      tbl.innerHTML = html;

      // Row click toggles checkbox
      var rows = tbl.querySelectorAll('tr[data-row-id]');
      for (var i = 0; i < rows.length; i++) {
        (function(row) {
          row.addEventListener('click', function(e) {
            if (e.target.type === 'checkbox') return; // let checkbox handle itself
            var cb = row.querySelector('.acct-cb');
            if (cb) { cb.checked = !cb.checked; cb.dispatchEvent(new Event('change')); }
          });
        })(rows[i]);
      }

      // Checkbox handlers
      var cbs = tbl.querySelectorAll('.acct-cb');
      for (var i = 0; i < cbs.length; i++) {
        (function(cb) {
          cb.addEventListener('change', function() {
            var aid = parseInt(cb.getAttribute('data-id'));
            if (cb.checked) {
              if (selectedAccountIds.indexOf(aid) < 0) {
                selectedAccountIds.push(aid);
                var acc = accounts.find(function(a) { return a.id === aid; });
                if (acc) selectedAccountMap[aid] = acc;
              }
            } else {
              selectedAccountIds = selectedAccountIds.filter(function(x) { return x !== aid; });
              delete selectedAccountMap[aid];
            }
            updateSelectedCount();
          });
        })(cbs[i]);
      }

      // Header checkbox
      var headCb = document.getElementById('head-cb');
      if (headCb) {
        headCb.addEventListener('change', function() {
          for (var i = 0; i < cbs.length; i++) {
            cbs[i].checked = headCb.checked;
            cbs[i].dispatchEvent(new Event('change'));
          }
        });
      }
    }

    // Load accounts with filters
    function loadCampAccounts() {
      var params = 'limit=100&sort=total_it_spend&order=DESC&page=' + campPage;
      var search = document.getElementById('camp-search').value;
      var fInd = document.getElementById('cf-industry').value;
      var fCountry = document.getElementById('cf-country').value;
      var fSpend = document.getElementById('cf-spend').value;
      if (search) params += '&search=' + encodeURIComponent(search);
      if (fInd) params += '&industry=' + encodeURIComponent(fInd);
      if (fCountry) params += '&country=' + encodeURIComponent(fCountry);

      api.get('/accounts?' + params).then(function(d) {
        var accounts = d.accounts;
        if (fSpend) accounts = accounts.filter(function(a) { return (a.total_it_spend || 0) >= parseInt(fSpend); });
        renderAccountTable(accounts);
      });
    }

    // Initial load
    loadCampAccounts();

    // Filter handlers
    var searchTimer;
    document.getElementById('camp-search').addEventListener('input', function() { clearTimeout(searchTimer); searchTimer = setTimeout(loadCampAccounts, 300); });
    document.getElementById('cf-industry').addEventListener('change', loadCampAccounts);
    document.getElementById('cf-country').addEventListener('change', loadCampAccounts);
    document.getElementById('cf-spend').addEventListener('change', loadCampAccounts);

    // Select all visible
    var selectAllCb = document.getElementById('select-all-cb');
    if (selectAllCb) {
      selectAllCb.addEventListener('change', function() {
        var cbs = document.querySelectorAll('.acct-cb');
        for (var i = 0; i < cbs.length; i++) {
          cbs[i].checked = selectAllCb.checked;
          cbs[i].dispatchEvent(new Event('change'));
        }
      });
    }

    // Clear selection
    document.getElementById('clear-selection-btn').addEventListener('click', function() {
      selectedAccountIds = [];
      selectedAccountMap = {};
      updateSelectedCount();
      var cbs = document.querySelectorAll('.acct-cb');
      for (var i = 0; i < cbs.length; i++) cbs[i].checked = false;
      var headCb = document.getElementById('head-cb');
      if (headCb) headCb.checked = false;
      if (selectAllCb) selectAllCb.checked = false;
    });

    // Theme selection
    var themeCards = document.querySelectorAll('#theme-grid .research-card');
    for (var i = 0; i < themeCards.length; i++) {
      (function(card) {
        card.addEventListener('click', function() {
          for (var x = 0; x < themeCards.length; x++) themeCards[x].classList.remove('selected');
          card.classList.add('selected');
          selTheme = card.getAttribute('data-theme');
        });
      })(themeCards[i]);
    }

    // Persona selection + message types
    var pCards = document.querySelectorAll('#camp-persona-grid .persona-card');
    for (var i = 0; i < pCards.length; i++) {
      (function(card) {
        card.addEventListener('click', function() {
          for (var x = 0; x < pCards.length; x++) pCards[x].classList.remove('selected');
          card.classList.add('selected');
          selPersona = card.getAttribute('data-p');
          selMsg = null;
          var p = personas[selPersona];
          if (!p) return;
          var mt = document.getElementById('camp-msg-types');
          var btnsHtml = '';
          for (var j = 0; j < p.messageTypes.length; j++) {
            var t = p.messageTypes[j];
            btnsHtml += '<button class="msg-type-btn" data-m="' + t.id + '">' + t.label + '</button>';
          }
          mt.innerHTML = btnsHtml;
          var btns = mt.querySelectorAll('.msg-type-btn');
          for (var j = 0; j < btns.length; j++) {
            (function(b) {
              b.addEventListener('click', function() {
                for (var x = 0; x < btns.length; x++) btns[x].classList.remove('selected');
                b.classList.add('selected');
                selMsg = b.getAttribute('data-m');
              });
            })(btns[j]);
          }
        });
      })(pCards[i]);
    }

    // Create campaign
    var createBtn = document.getElementById('create-campaign-btn');
    createBtn.addEventListener('click', function() {
      if (!selTheme) { toast('Select a campaign theme', 'error'); return; }
      if (!selPersona) { toast('Select a persona', 'error'); return; }
      if (!selMsg) { toast('Select a message type', 'error'); return; }
      if (!selectedAccountIds.length) { toast('Select at least one account', 'error'); return; }

      var name = document.getElementById('camp-name').value || (themes[selTheme].name + ' - ' + new Date().toLocaleDateString());
      var context = document.getElementById('camp-context').value || '';

      createBtn.disabled = true;
      createBtn.innerHTML = '<div class="spinner" style="width:14px;height:14px;border-width:2px;display:inline-block;vertical-align:middle;margin-right:8px"></div> Creating campaign for ' + selectedAccountIds.length + ' accounts...';

      api.post('/campaigns', {
        name: name,
        theme: selTheme,
        persona: selPersona,
        messageType: selMsg,
        accountIds: selectedAccountIds,
        customContext: context,
      }).then(function(result) {
        toast('Campaign created with ' + result.totalAccounts + ' accounts', 'success');
        location.hash = '#/campaign/' + result.id;
      }).catch(function(err) {
        toast('Error: ' + err.message, 'error');
        createBtn.disabled = false;
        createBtn.innerHTML = IC.send + ' Create & Generate Campaign';
      });
    });

  }).catch(function(err) {
    c.innerHTML = '<div style="padding:32px;color:var(--red)">' + err.message + '</div>';
  });
}

// ── Campaign Detail (generation + preview) ────────────────────────
function renderCampaignDetail(c, id) {
  c.innerHTML = '<div class="loading-state"><div class="spinner"></div></div>';

  api.get('/campaigns/' + id + '/emails').then(function(data) {
    var cp = data.campaign;
    var emails = data.emails;

    var h = '<div class="fade-in">';
    h += '<a href="#/campaigns" class="back-link">' + IC.back + ' All Campaigns</a>';

    // Campaign header
    h += '<div class="acct-hero">';
    h += '<div class="acct-hero-top"><div>';
    h += '<h1 class="acct-name">' + cp.name + '</h1>';
    h += '<div class="acct-meta-row" style="margin-top:8px">';
    h += '<span class="pill pill-active">' + cp.theme + '</span>';
    h += '<span class="acct-meta-item">' + (cp.persona || '').toUpperCase() + ' / ' + cp.message_type + '</span>';
    h += '<span class="acct-meta-item">' + cp.total_accounts + ' accounts</span>';
    h += '</div></div>';
    h += '<div style="text-align:right"><div class="acct-kpi-value green">' + cp.generated + '/' + cp.total_accounts + '</div><div style="font-size:11px;color:var(--text-muted)">generated</div></div>';
    h += '</div></div>';

    // Generate button
    if (cp.generated < cp.total_accounts) {
      h += '<button class="btn btn-primary btn-lg" id="gen-batch-btn" style="width:100%;justify-content:center;padding:14px 24px;font-size:15px;margin-bottom:8px">' + IC.sparkles + ' Generate Next Batch (2 emails with full live research)</button>';
      h += '<div id="gen-progress" style="margin-bottom:24px"></div>';
    }

    // Export button
    if (emails.length) {
      h += '<div style="display:flex;gap:8px;margin-bottom:24px">';
      h += '<a href="/api/campaigns/' + id + '/export" class="btn btn-ghost">' + IC.copy + ' Export CSV</a>';
      h += '<button class="btn btn-ghost" id="copy-all-btn">' + IC.copy + ' Copy All Emails</button>';
      h += '</div>';
    }

    // Email list
    h += '<div class="persona-section-title">Generated Emails (' + emails.length + ')</div>';
    for (var i = 0; i < emails.length; i++) {
      var e = emails[i];
      var body = (e.content || '').replace(/^Subject:.*\n*/im, '');
      h += '<div class="email-preview" style="margin-bottom:14px">';
      h += '<div class="email-toolbar"><div class="email-dot r"></div><div class="email-dot y"></div><div class="email-dot g"></div>';
      h += '<span style="margin-left:auto;font-size:11px;color:var(--text-muted);font-weight:600">' + e.account_name + '</span></div>';
      h += '<div class="email-subject-bar"><div class="email-subject-label">Subject</div><div class="email-subject">' + (e.subject || '') + '</div></div>';
      h += '<div class="email-body" style="max-height:200px;overflow:hidden;position:relative">' + md(body);
      h += '<div style="position:absolute;bottom:0;left:0;right:0;height:60px;background:linear-gradient(transparent,var(--bg-surface))"></div>';
      h += '</div>';
      h += '<div class="email-actions"><button class="btn btn-primary btn-sm" onclick="copyEl(this,\'email\')">' + IC.copy + ' Copy</button>';
      h += '<button class="btn btn-ghost btn-sm" onclick="this.closest(\'.email-preview\').querySelector(\'.email-body\').style.maxHeight=\'none\';this.closest(\'.email-preview\').querySelector(\'.email-body div\').style.display=\'none\';this.textContent=\'Expanded\'">Expand</button></div>';
      h += '</div>';
    }

    h += '</div>';
    c.innerHTML = h;

    // Generate batch handler
    var genBtn = document.getElementById('gen-batch-btn');
    if (genBtn) {
      genBtn.addEventListener('click', function runBatch() {
        genBtn.disabled = true;
        genBtn.style.display = 'none';
        var prog = document.getElementById('gen-progress');
        var pctDone = cp.total_accounts > 0 ? Math.round((cp.generated / cp.total_accounts) * 100) : 0;
        var remaining = cp.total_accounts - cp.generated;
        var batchSize = Math.min(2, remaining);

        prog.innerHTML = '<div class="d-card" style="border-color:var(--border-accent);overflow:hidden">'
          // Header
          + '<div style="display:flex;align-items:center;gap:14px;margin-bottom:20px">'
          + '<div class="ai-pulse" style="width:40px;height:40px;flex-shrink:0">' + IC.sparkles + '</div>'
          + '<div style="flex:1"><div style="font-size:15px;font-weight:700;color:var(--text-primary)">Generating ' + batchSize + ' hyper-personalized emails...</div>'
          + '<div style="font-size:12px;color:var(--text-muted);margin-top:2px">Live research (website, news, SEC, Intricately) + AI generation per account</div></div>'
          + '</div>'
          // Progress bar
          + '<div style="margin-bottom:16px">'
          + '<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--text-muted);margin-bottom:6px"><span>' + cp.generated + ' of ' + cp.total_accounts + ' emails</span><span>' + pctDone + '%</span></div>'
          + '<div class="progress-bar" style="height:8px"><div class="progress-fill" id="batch-progress-fill" style="width:' + pctDone + '%;transition:width 1s ease"></div></div>'
          + '</div>'
          // Per-account status
          + '<div id="batch-account-status" style="font-size:12px">'
          + '<div style="display:flex;align-items:center;gap:8px;padding:6px 0;color:var(--text-muted)"><div class="spinner" style="width:12px;height:12px;border-width:1.5px;flex-shrink:0"></div><span>Fetching account data and running live probes...</span></div>'
          + '</div>'
          + '</div>';
        prog.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Animate the progress bar while waiting
        var animInterval = setInterval(function() {
          var fill = document.getElementById('batch-progress-fill');
          if (fill) {
            var current = parseFloat(fill.style.width);
            var target = Math.min(current + 0.3, pctDone + (100 - pctDone) * 0.8);
            fill.style.width = target + '%';
          }
        }, 500);

        api.post('/campaigns/' + id + '/generate', {}).then(function(result) {
          clearInterval(animInterval);
          var statusEl = document.getElementById('batch-account-status');
          if (statusEl && result.batch) {
            var statusHtml = '';
            for (var i = 0; i < result.batch.length; i++) {
              var b = result.batch[i];
              var icon = b.status === 'generated' ? '<span style="color:var(--green)">\u2713</span>' : '<span style="color:var(--red)">\u2717</span>';
              statusHtml += '<div style="display:flex;align-items:center;gap:8px;padding:4px 0">' + icon + ' <span style="color:var(--text-primary);font-weight:600">' + b.accountName + '</span>';
              if (b.subject) statusHtml += ' <span style="color:var(--text-muted)">&mdash; ' + b.subject.slice(0, 50) + '</span>';
              if (b.error) statusHtml += ' <span style="color:var(--red)">' + b.error + '</span>';
              statusHtml += '</div>';
            }
            statusEl.innerHTML = statusHtml;
          }

          // Update progress bar to actual
          var newPct = result.total > 0 ? Math.round((result.generated / result.total) * 100) : 100;
          var fill = document.getElementById('batch-progress-fill');
          if (fill) fill.style.width = newPct + '%';

          // Wait a moment to show results, then refresh
          setTimeout(function() {
            renderCampaignDetail(document.getElementById('main'), id);
          }, 2000);
        }).catch(function(err) {
          clearInterval(animInterval);
          prog.innerHTML = '<div class="d-card" style="border-color:rgba(248,113,113,0.3);text-align:center;padding:24px">'
            + '<div style="color:var(--red);font-size:15px;font-weight:700;margin-bottom:8px">Generation failed</div>'
            + '<div style="color:var(--text-muted);font-size:13px;margin-bottom:16px">' + (err.message || err) + '</div>'
            + '<button class="btn btn-primary" onclick="renderCampaignDetail(document.getElementById(\'main\'),\'' + id + '\')">' + IC.sparkles + ' Retry</button>'
            + '</div>';
        });
      });
    }

    // Copy all
    var copyAllBtn = document.getElementById('copy-all-btn');
    if (copyAllBtn) {
      copyAllBtn.addEventListener('click', function() {
        var allText = emails.map(function(e) {
          return 'TO: ' + e.account_name + '\n' + e.content + '\n---\n';
        }).join('\n');
        navigator.clipboard.writeText(allText).then(function() {
          copyAllBtn.innerHTML = IC.copy + ' Copied ' + emails.length + ' emails!';
          setTimeout(function() { copyAllBtn.innerHTML = IC.copy + ' Copy All Emails'; }, 2000);
        });
      });
    }

  }).catch(function(err) {
    c.innerHTML = '<div style="padding:32px;color:var(--red)">' + err.message + '</div>';
  });
}

// ══════════════════════════════════════════════════════════════════
// PUBLIC SHARE VIEW (no auth needed, read-only)
// ══════════════════════════════════════════════════════════════════
function renderShareView(container, token) {
  container.innerHTML = '<div class="loading-state"><div class="spinner"></div>Loading shared account...</div>';

  // Hide nav links for share view
  var navLinks = document.querySelector('.nav-links');
  if (navLinks) navLinks.style.display = 'none';

  fetch('/api/public/' + token).then(function(r) {
    if (!r.ok) return r.json().then(function(d) { throw new Error(d.error || 'Invalid share link'); });
    return r.json();
  }).then(function(data) {
    var a = data.account;
    var research = data.research || [];
    var messages = data.messages || [];

    var h = '<div class="slide-up" style="max-width:900px;margin:0 auto">';

    // Shared banner
    h += '<div style="background:linear-gradient(135deg,var(--accent-glow),rgba(52,211,153,0.06));border:1px solid var(--border-accent);border-radius:var(--radius-lg);padding:16px 24px;margin-bottom:28px;display:flex;align-items:center;gap:12px">';
    h += '<img src="' + CF_LOGO + '" style="height:20px;filter:brightness(0) invert(1);opacity:0.6" />';
    h += '<div><div style="font-size:14px;font-weight:700;color:var(--text-primary)">RevFlare &mdash; Shared Account Intelligence</div>';
    h += '<div style="font-size:12px;color:var(--text-muted)">Shared by ' + data.sharedBy + '</div></div></div>';

    // Account header
    h += '<div class="acct-hero">';
    h += '<h1 class="acct-name">' + a.account_name + '</h1>';
    h += '<div class="acct-meta-row" style="margin-top:12px">';
    if (a.industry) h += '<span class="acct-meta-item">' + IC.building + ' ' + a.industry + '</span>';
    if (a.website) h += '<span class="acct-meta-item">' + IC.globe + ' ' + a.website + '</span>';
    if (a.billing_country) h += '<span class="acct-meta-item">' + [a.billing_city, a.billing_state, a.billing_country].filter(Boolean).join(', ') + '</span>';
    h += '</div>';
    h += '<div class="acct-kpis" style="margin-top:20px">';
    h += '<div><div class="acct-kpi-label">IT Spend/mo</div><div class="acct-kpi-value purple">' + fmtD(a.total_it_spend) + '</div></div>';
    h += '<div><div class="acct-kpi-label">Revenue</div><div class="acct-kpi-value pink">' + (a.revenue_bucket || '--') + '</div></div>';
    h += '<div><div class="acct-kpi-label">Employees</div><div class="acct-kpi-value">' + (a.employees ? a.employees.toLocaleString() : '--') + '</div></div>';
    h += '<div><div class="acct-kpi-label">Spend Potential</div><div class="acct-kpi-value blue">' + (a.spend_potential || '--') + '</div></div>';
    h += '</div></div>';

    // Research reports
    if (research.length) {
      h += '<div class="persona-section-title" style="margin-top:32px">Research Reports (' + research.length + ')</div>';
      for (var i = 0; i < research.length; i++) {
        var r = research[i];
        h += '<div class="output-card" style="margin-bottom:16px">';
        h += '<div class="output-header"><div class="output-header-left"><div class="output-header-title">' + (r.title || r.report_type) + '</div></div>';
        h += '<span style="font-size:11px;color:var(--text-muted)">' + timeAgo(r.created_at) + '</span></div>';
        h += '<div class="output-body">' + md(r.content) + '</div></div>';
      }
    }

    // Generated messages
    if (messages.length) {
      h += '<div class="persona-section-title" style="margin-top:32px">Generated Messages (' + messages.length + ')</div>';
      for (var i = 0; i < messages.length; i++) {
        var m = messages[i];
        var pm = PERSONA_META[m.persona] || { icon: '', color: '' };
        h += '<div class="email-preview" style="margin-bottom:16px">';
        h += '<div class="email-toolbar"><div class="email-dot r"></div><div class="email-dot y"></div><div class="email-dot g"></div>';
        h += '<span style="margin-left:auto;font-size:11px;color:var(--text-muted);font-weight:600">' + (m.persona || '').toUpperCase() + ' / ' + m.message_type + '</span></div>';
        h += '<div class="email-subject-bar"><div class="email-subject-label">Subject</div><div class="email-subject">' + (m.subject || '') + '</div></div>';
        h += '<div class="email-body">' + md(m.content) + '</div></div>';
      }
    }

    // If no research or messages yet, offer to generate
    if (!research.length && !messages.length) {
      h += '<div style="text-align:center;padding:48px 0;color:var(--text-muted)">';
      h += '<div style="font-size:24px;opacity:0.3;margin-bottom:12px">' + IC.sparkles + '</div>';
      h += '<p style="font-size:14px">No research or messages have been generated for this account yet.</p>';
      h += '<button class="btn btn-primary" id="gen-shared-research" style="margin-top:16px">' + IC.sparkles + ' Generate Research</button>';
      h += '</div>';
    }

    h += '</div>';
    container.innerHTML = h;

    // Generate research button for empty shared accounts
    var genShared = document.getElementById('gen-shared-research');
    if (genShared) {
      genShared.addEventListener('click', function() {
        genShared.disabled = true;
        genShared.innerHTML = '<div class="spinner" style="width:14px;height:14px;border-width:2px;display:inline-block;vertical-align:middle;margin-right:8px"></div> Generating...';
        fetch('/api/public/' + token + '/research', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'company_overview' }),
        }).then(function(r) { return r.json(); }).then(function(d) {
          if (d.content) {
            genShared.parentElement.innerHTML = '<div class="output-card"><div class="output-header"><div class="output-header-title">' + (d.title || 'Research') + '</div></div><div class="output-body">' + md(d.content) + '</div></div>';
          }
        }).catch(function(e) { genShared.innerHTML = 'Error: ' + e.message; });
      });
    }

  }).catch(function(err) {
    container.innerHTML = '<div class="empty-state"><div style="font-size:48px;opacity:0.3;margin-bottom:16px">' + IC.shield + '</div><h2 class="page-title" style="font-size:22px">' + err.message + '</h2><p class="page-subtitle" style="margin-top:8px">This share link may be invalid or expired.</p></div>';
  });
}

// ══════════════════════════════════════════════════════════════════
// GMAIL SETUP WIZARD (in-app guided walkthrough)
// ══════════════════════════════════════════════════════════════════
function showGmailSetupWizard() {
  // Create modal overlay
  var overlay = document.createElement('div');
  overlay.id = 'gmail-wizard-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);backdrop-filter:blur(8px);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px';

  var modal = document.createElement('div');
  modal.style.cssText = 'background:var(--bg-surface);border:1px solid var(--border-glass);border-radius:var(--radius-xl);max-width:640px;width:100%;max-height:90vh;overflow-y:auto;box-shadow:var(--shadow-float)';

  var steps = [
    {
      title: 'Connect Your Gmail',
      icon: IC.mail,
      content: '<p style="font-size:14px;color:var(--text-secondary);line-height:1.7;margin-bottom:20px">Connecting Gmail lets you send AI-generated emails directly from RevFlare using your own email address. Emails appear in your Sent folder, recipients see your real address.</p>'
        + '<div style="display:flex;gap:12px;margin-bottom:20px">'
        + '<div class="d-card" style="flex:1;text-align:center;padding:16px"><div style="font-size:24px;margin-bottom:6px">' + IC.shield + '</div><div style="font-size:12px;color:var(--text-secondary);font-weight:600">Secure OAuth</div><div style="font-size:11px;color:var(--text-muted)">No passwords stored</div></div>'
        + '<div class="d-card" style="flex:1;text-align:center;padding:16px"><div style="font-size:24px;margin-bottom:6px">' + IC.send + '</div><div style="font-size:12px;color:var(--text-secondary);font-weight:600">Send Only</div><div style="font-size:11px;color:var(--text-muted)">Cannot read your inbox</div></div>'
        + '<div class="d-card" style="flex:1;text-align:center;padding:16px"><div style="font-size:24px;margin-bottom:6px">' + IC.zap + '</div><div style="font-size:12px;color:var(--text-secondary);font-weight:600">One-Click</div><div style="font-size:11px;color:var(--text-muted)">Send directly from RevFlare</div></div>'
        + '</div>'
        + '<p style="font-size:13px;color:var(--text-muted)">This requires a Google Cloud OAuth app. Your admin may have already set this up. Click Next to check.</p>',
      action: 'Next',
    },
    {
      title: 'Step 1: Check If Ready',
      icon: IC.zap,
      content: '<p style="font-size:14px;color:var(--text-secondary);line-height:1.7;margin-bottom:16px">Let\'s first check if Gmail is already configured on this RevFlare instance.</p>'
        + '<div id="wizard-check" style="padding:20px;text-align:center"><div class="spinner" style="margin:0 auto 12px"></div><div style="color:var(--text-muted);font-size:13px">Checking configuration...</div></div>',
      action: 'Check Now',
      onShow: function() {
        fetch('/api/gmail/connect', { redirect: 'manual' }).then(function(r) {
          var checkEl = document.getElementById('wizard-check');
          if (r.status === 302 || r.type === 'opaqueredirect') {
            // OAuth is configured, redirect exists
            checkEl.innerHTML = '<div style="font-size:28px;color:var(--green);margin-bottom:12px">\u2713</div>'
              + '<div style="font-size:15px;font-weight:700;color:var(--green);margin-bottom:8px">Gmail is configured!</div>'
              + '<p style="font-size:13px;color:var(--text-muted);margin-bottom:20px">Click the button below to authorize RevFlare to send emails from your Gmail account.</p>'
              + '<a href="/api/gmail/connect" target="_blank" class="btn btn-primary btn-lg" style="width:100%;justify-content:center">' + IC.mail + ' Authorize Gmail Now</a>'
              + '<p style="font-size:11px;color:var(--text-muted);margin-top:12px">A Google sign-in window will open. Select your account and click Allow.</p>';
          } else {
            return r.json().then(function(d) {
              if (d.error && d.error.includes('GOOGLE_CLIENT_ID')) {
                checkEl.innerHTML = '<div style="font-size:28px;color:var(--amber);margin-bottom:12px">\u26A0</div>'
                  + '<div style="font-size:15px;font-weight:700;color:var(--amber);margin-bottom:8px">Gmail Not Configured Yet</div>'
                  + '<p style="font-size:13px;color:var(--text-muted)">An admin needs to set up Google OAuth credentials first. Follow the steps on the next pages.</p>';
              }
            });
          }
        }).catch(function() {
          var checkEl = document.getElementById('wizard-check');
          if (checkEl) checkEl.innerHTML = '<div style="font-size:15px;font-weight:700;color:var(--amber);margin-bottom:8px">Could not check</div><p style="font-size:13px;color:var(--text-muted)">Follow the setup steps on the next pages.</p>';
        });
      },
    },
    {
      title: 'Step 2: Create Google Cloud Project',
      icon: IC.building,
      content: '<div style="font-size:14px;color:var(--text-secondary);line-height:1.8">'
        + '<div class="d-card" style="margin-bottom:12px"><div style="display:flex;align-items:center;gap:10px;margin-bottom:8px"><span style="background:var(--accent-glow);color:var(--accent-bright);font-weight:700;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px">1</span><strong>Open Google Cloud Console</strong></div><p style="font-size:13px;color:var(--text-muted)">Go to <a href="https://console.cloud.google.com" target="_blank" style="color:var(--accent-bright)">console.cloud.google.com</a></p></div>'
        + '<div class="d-card" style="margin-bottom:12px"><div style="display:flex;align-items:center;gap:10px;margin-bottom:8px"><span style="background:var(--accent-glow);color:var(--accent-bright);font-weight:700;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px">2</span><strong>Create a New Project</strong></div><p style="font-size:13px;color:var(--text-muted)">Click the project dropdown at the top &rarr; <strong>New Project</strong> &rarr; Name it <code>RevFlare</code> &rarr; Click <strong>Create</strong></p></div>'
        + '<div class="d-card" style="margin-bottom:12px"><div style="display:flex;align-items:center;gap:10px;margin-bottom:8px"><span style="background:var(--accent-glow);color:var(--accent-bright);font-weight:700;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px">3</span><strong>Enable Gmail API</strong></div><p style="font-size:13px;color:var(--text-muted)">Left sidebar &rarr; <strong>APIs &amp; Services</strong> &rarr; <strong>Library</strong> &rarr; Search <code>Gmail API</code> &rarr; Click <strong>Enable</strong></p></div>'
        + '</div>',
      action: 'Next',
    },
    {
      title: 'Step 3: OAuth Consent Screen',
      icon: IC.shield,
      content: '<div style="font-size:14px;color:var(--text-secondary);line-height:1.8">'
        + '<div class="d-card" style="margin-bottom:12px"><div style="display:flex;align-items:center;gap:10px;margin-bottom:8px"><span style="background:var(--accent-glow);color:var(--accent-bright);font-weight:700;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px">4</span><strong>Configure Consent Screen</strong></div><p style="font-size:13px;color:var(--text-muted)">Left sidebar &rarr; <strong>APIs &amp; Services</strong> &rarr; <strong>OAuth consent screen</strong><br/>Select <strong>External</strong> &rarr; Click <strong>Create</strong></p></div>'
        + '<div class="d-card" style="margin-bottom:12px"><div style="display:flex;align-items:center;gap:10px;margin-bottom:8px"><span style="background:var(--accent-glow);color:var(--accent-bright);font-weight:700;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px">5</span><strong>Fill In Details</strong></div><p style="font-size:13px;color:var(--text-muted)"><strong>App name:</strong> <code>RevFlare</code><br/><strong>User support email:</strong> your email<br/><strong>Developer contact:</strong> your email<br/>Click <strong>Save and Continue</strong> through all steps</p></div>'
        + '<div class="d-card" style="margin-bottom:12px"><div style="display:flex;align-items:center;gap:10px;margin-bottom:8px"><span style="background:var(--accent-glow);color:var(--accent-bright);font-weight:700;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px">6</span><strong>Add Test User</strong></div><p style="font-size:13px;color:var(--text-muted)">On the <strong>Test users</strong> step, add your Gmail address and click <strong>Save</strong></p></div>'
        + '</div>',
      action: 'Next',
    },
    {
      title: 'Step 4: Create OAuth Credentials',
      icon: IC.zap,
      content: '<div style="font-size:14px;color:var(--text-secondary);line-height:1.8">'
        + '<div class="d-card" style="margin-bottom:12px"><div style="display:flex;align-items:center;gap:10px;margin-bottom:8px"><span style="background:var(--accent-glow);color:var(--accent-bright);font-weight:700;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px">7</span><strong>Create Credentials</strong></div><p style="font-size:13px;color:var(--text-muted)">Left sidebar &rarr; <strong>Credentials</strong> &rarr; <strong>+ Create Credentials</strong> &rarr; <strong>OAuth client ID</strong><br/>Application type: <strong>Web application</strong><br/>Name: <code>RevFlare</code></p></div>'
        + '<div class="d-card" style="margin-bottom:12px;border-color:rgba(52,211,153,0.2)"><div style="display:flex;align-items:center;gap:10px;margin-bottom:8px"><span style="background:var(--green-bg);color:var(--green);font-weight:700;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px">8</span><strong style="color:var(--green)">Add Redirect URI (Critical!)</strong></div><p style="font-size:13px;color:var(--text-muted)">Under <strong>Authorized redirect URIs</strong>, click <strong>Add URI</strong> and paste exactly:</p><div style="background:var(--bg-deep);padding:10px 14px;border-radius:var(--radius-md);margin-top:8px;font-family:monospace;font-size:12px;color:var(--accent-bright);cursor:pointer;border:1px solid var(--border-glass)" onclick="navigator.clipboard.writeText(location.origin+\'/api/gmail/callback\');this.style.borderColor=\'var(--green)\';setTimeout(function(){},1500)" id="redirect-uri-box">' + location.origin + '/api/gmail/callback <span style="opacity:0.5;margin-left:8px">click to copy</span></div></div>'
        + '<div class="d-card" style="margin-bottom:12px"><div style="display:flex;align-items:center;gap:10px;margin-bottom:8px"><span style="background:var(--accent-glow);color:var(--accent-bright);font-weight:700;width:24px;height:24px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px">9</span><strong>Copy Client ID &amp; Secret</strong></div><p style="font-size:13px;color:var(--text-muted)">Click <strong>Create</strong>. A popup shows your <strong>Client ID</strong> and <strong>Client Secret</strong>. Copy both.</p></div>'
        + '</div>',
      action: 'Next',
    },
    {
      title: 'Step 5: Store Credentials',
      icon: IC.shield,
      content: '<div style="font-size:14px;color:var(--text-secondary);line-height:1.8">'
        + '<p style="margin-bottom:16px">An admin needs to run these two commands in the RevFlare project directory to store the credentials securely:</p>'
        + '<div style="background:var(--bg-deep);padding:14px 16px;border-radius:var(--radius-md);font-family:monospace;font-size:12px;color:var(--text-primary);margin-bottom:12px;border:1px solid var(--border-glass);line-height:2">'
        + '<span style="color:var(--text-muted)"># Run these in your terminal:</span><br/>'
        + '<span style="color:var(--accent-bright)">npx wrangler secret put GOOGLE_CLIENT_ID</span><br/>'
        + '<span style="color:var(--text-muted)"># paste your Client ID when prompted</span><br/><br/>'
        + '<span style="color:var(--accent-bright)">npx wrangler secret put GOOGLE_CLIENT_SECRET</span><br/>'
        + '<span style="color:var(--text-muted)"># paste your Client Secret when prompted</span>'
        + '</div>'
        + '<p style="font-size:13px;color:var(--text-muted)">Secrets are encrypted and stored in Cloudflare\'s secret store. They never appear in code or git. No redeploy needed &mdash; they take effect immediately.</p>'
        + '</div>',
      action: 'Next',
    },
    {
      title: 'Step 6: Connect!',
      icon: IC.send,
      content: '<div style="text-align:center;padding:20px 0">'
        + '<div style="font-size:48px;margin-bottom:16px">' + IC.mail + '</div>'
        + '<p style="font-size:15px;color:var(--text-secondary);margin-bottom:24px">Once the admin has stored the credentials, click the button below to authorize your Gmail account.</p>'
        + '<a href="/api/gmail/connect" target="_blank" class="btn btn-primary btn-lg" style="width:100%;justify-content:center;padding:16px 24px;font-size:15px">' + IC.send + ' Connect Gmail Now</a>'
        + '<p style="font-size:12px;color:var(--text-muted);margin-top:16px">A Google sign-in window will open. Select your Gmail account, review permissions (send-only), and click <strong>Allow</strong>. The window will close automatically and you\'re connected.</p>'
        + '<div style="margin-top:24px;padding:14px;background:var(--green-bg);border:1px solid rgba(52,211,153,0.2);border-radius:var(--radius-md);font-size:12px;color:var(--green)"><strong>After connecting:</strong> Every generated email will show a green "Send via Gmail" button. Click it, enter the recipient, and the email sends directly from your Gmail. It appears in your Sent folder.</div>'
        + '</div>',
      action: 'Done',
    },
  ];

  var currentStep = 0;

  function renderStep() {
    var step = steps[currentStep];
    var isLast = currentStep === steps.length - 1;
    var isFirst = currentStep === 0;

    modal.innerHTML = '<div style="padding:28px">'
      + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:24px">'
      + '<div style="display:flex;align-items:center;gap:12px"><span style="color:var(--accent-bright)">' + step.icon + '</span><h2 style="font-size:18px;font-weight:700;color:var(--text-primary);letter-spacing:-0.3px">' + step.title + '</h2></div>'
      + '<button style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:18px;padding:4px" id="wizard-close">\u2715</button>'
      + '</div>'

      // Step indicators
      + '<div style="display:flex;gap:4px;margin-bottom:24px">'
      + steps.map(function(_, i) {
          var color = i < currentStep ? 'var(--green)' : i === currentStep ? 'var(--accent-bright)' : 'var(--bg-elevated)';
          return '<div style="flex:1;height:3px;border-radius:2px;background:' + color + '"></div>';
        }).join('')
      + '</div>'

      + step.content

      + '<div style="display:flex;gap:8px;margin-top:24px;justify-content:flex-end">'
      + (isFirst ? '' : '<button class="btn btn-ghost" id="wizard-back">Back</button>')
      + '<button class="btn btn-primary" id="wizard-next">' + step.action + '</button>'
      + '</div></div>';

    document.getElementById('wizard-close').addEventListener('click', function() { overlay.remove(); });
    if (!isFirst) document.getElementById('wizard-back').addEventListener('click', function() { currentStep--; renderStep(); });
    document.getElementById('wizard-next').addEventListener('click', function() {
      if (isLast) { overlay.remove(); location.reload(); }
      else { currentStep++; renderStep(); }
    });

    // Copy redirect URI on click
    var uriBox = document.getElementById('redirect-uri-box');
    if (uriBox) {
      uriBox.addEventListener('click', function() {
        navigator.clipboard.writeText(location.origin + '/api/gmail/callback');
        uriBox.style.borderColor = 'var(--green)';
        uriBox.querySelector('span').textContent = 'Copied!';
      });
    }

    // Run onShow callback
    if (step.onShow) step.onShow();
  }

  renderStep();
  modal.style.cssText += '';
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Close on overlay click
  overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
}

// ── Copy Utility ───────────────────────────────────────────────────
window.copyEl=function(btn,mode){
  let text;
  if(mode==='subject'){text=btn.dataset.subject;}
  else if(mode==='email'){const body=btn.closest('.email-preview')?.querySelector('.email-body');text=body?.innerText||'';}
  else{const body=btn.closest('.output-card')?.querySelector('.output-body');text=body?.innerText||'';}
  navigator.clipboard.writeText(text).then(()=>{const orig=btn.innerHTML;btn.innerHTML=`${IC.copy} Copied!`;setTimeout(()=>btn.innerHTML=orig,2000);});
};
