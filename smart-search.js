(() => {
  'use strict';
  const DATA_URL='data/images.json';
  let photos=[],open=false;
  const esc=s=>String(s??'').replace(/[&<>\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  const date=p=>new Date(p.date||p.modified_at||0);
  const url=p=>p.url||p.path||'';
  const tokens=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim().split(/\s+/).filter(Boolean);
  const score=(p,q)=>{const text=[p.name,p.path,p.year,p.month,p.type,p.width,p.height].join(' ').toLowerCase();const ts=tokens(q);let n=0;for(const t of ts){if(text.includes(t))n+=t.length>2?2:1}return n};
  function parse(q){
    const x=q.toLowerCase().trim();
    const out={text:x,year:null,month:null,type:null,large:false,portrait:false,landscape:false,square:false};
    const ym=x.match(/\b(20\d{2})\b/);if(ym)out.year=+ym[1];
    if(/\b(january|jan)\b/.test(x))out.month=1;if(/\b(february|feb)\b/.test(x))out.month=2;if(/\b(march|mar)\b/.test(x))out.month=3;if(/\b(april|apr)\b/.test(x))out.month=4;if(/\b(may)\b/.test(x))out.month=5;if(/\b(june|jun)\b/.test(x))out.month=6;if(/\b(july|jul)\b/.test(x))out.month=7;if(/\b(august|aug)\b/.test(x))out.month=8;if(/\b(september|sep)\b/.test(x))out.month=9;if(/\b(october|oct)\b/.test(x))out.month=10;if(/\b(november|nov)\b/.test(x))out.month=11;if(/\b(december|dec)\b/.test(x))out.month=12;
    out.large=/\b(large|big|huge)\b/.test(x);out.portrait=/\b(portrait|vertical)\b/.test(x);out.landscape=/\b(landscape|horizontal|wide)\b/.test(x);out.square=/\bsquare\b/.test(x);
    return out;
  }
  function match(p,a){
    const d=date(p),okd=!Number.isNaN(d.getTime());
    if(a.year && (p.year||d.getFullYear())!==a.year)return false;
    if(a.month && okd && d.getMonth()+1!==a.month)return false;
    if(a.large && (p.size||0)<5*1024*1024)return false;
    const r=p.width&&p.height?p.width/p.height:0;if(a.portrait&&!(r<.95))return false;if(a.landscape&&!(r>1.05))return false;if(a.square&&!(Math.abs(r-1)<.08))return false;
    return true;
  }
  function run(q){const a=parse(q);return photos.filter(p=>match(p,a)).map(p=>({p,s:score(p,q)})).sort((a,b)=>b.s-a.s||date(b.p)-date(a.p)).slice(0,120).map(x=>x.p)}
  function style(){if(document.getElementById('smartSearchStyle'))return;const s=document.createElement('style');s.id='smartSearchStyle';s.textContent=`
  .smart-search-modal{position:fixed;inset:0;z-index:90;background:rgba(8,10,16,.58);backdrop-filter:blur(22px);display:grid;place-items:center;padding:16px}.smart-search-shell{width:min(1120px,100%);max-height:90vh;overflow:auto;border:1px solid rgba(255,255,255,.35);border-radius:28px;background:rgba(248,249,252,.94);box-shadow:0 30px 100px rgba(0,0,0,.3);padding:20px}.smart-search-head{display:flex;gap:12px;align-items:center}.smart-search-input{flex:1;border:0;outline:0;border-radius:18px;padding:15px 17px;font:600 16px Inter,sans-serif;background:rgba(0,0,0,.06)}.smart-search-close{border:0;border-radius:14px;width:44px;height:44px;font-size:22px;cursor:pointer}.smart-search-hint{font-size:12px;color:#6b7280;margin:10px 2px}.smart-search-chips{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0}.smart-search-chip{border:0;border-radius:999px;padding:8px 12px;background:rgba(0,0,0,.06);cursor:pointer}.smart-search-results{display:grid;grid-template-columns:repeat(auto-fill,minmax(170px,1fr));gap:10px}.smart-result{border:0;border-radius:18px;overflow:hidden;padding:0;background:rgba(255,255,255,.65);text-align:left;cursor:pointer}.smart-result img{width:100%;aspect-ratio:1;object-fit:cover;display:block}.smart-result div{padding:9px}.smart-result strong,.smart-result small{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.smart-result small{color:#6b7280;margin-top:3px}.smart-search-count{font-weight:700;margin:14px 0 10px}.smart-search-empty{text-align:center;padding:50px;color:#6b7280}@media(prefers-color-scheme:dark){.smart-search-shell{background:rgba(22,24,30,.95);color:#fff}.smart-search-input,.smart-search-chip,.smart-search-close{background:rgba(255,255,255,.08);color:#fff}.smart-search-hint,.smart-result small{color:#9ca3af}.smart-result{background:rgba(255,255,255,.06)}}`;
  document.head.appendChild(s)}
  function render(root,q){const results=run(q);root.querySelector('.smart-search-count').textContent=q?`${results.length} matching photos`:'Try a natural search';const box=root.querySelector('.smart-search-results');box.innerHTML=results.map((p,i)=>`<button class="smart-result" data-i="${i}"><img loading="lazy" src="${esc(p.thumbnail||url(p))}" alt=""><div><strong>${esc(p.name||'Photo')}</strong><small>${esc([p.year||'',p.month||''].filter(Boolean).join(' · '))}</small></div></button>`).join('')||'<div class="smart-search-empty">No photos match that search.</div>';box.querySelectorAll('[data-i]').forEach(b=>b.onclick=()=>{const p=results[+b.dataset.i];if(p)window.open(url(p),'_blank','noopener')})}
  async function openModal(){if(open)return;open=true;style();const m=document.createElement('div');m.className='smart-search-modal';m.innerHTML='<div class="smart-search-shell"><div class="smart-search-head"><input class="smart-search-input" autofocus placeholder="Try: portraits from 2025, large photos, landscape…"><button class="smart-search-close">×</button></div><div class="smart-search-hint">Private, local-style search: results are ranked in your browser. No search query is sent to an AI service.</div><div class="smart-search-chips"><button class="smart-search-chip">Portraits from 2025</button><button class="smart-search-chip">Large photos</button><button class="smart-search-chip">Landscape 2026</button><button class="smart-search-chip">Photos from November</button></div><div class="smart-search-count"></div><div class="smart-search-results"></div></div>';document.body.append(m);m.querySelector('.smart-search-close').onclick=close;const input=m.querySelector('input');const renderNow=()=>render(m,input.value);input.oninput=renderNow;m.querySelectorAll('.smart-search-chip').forEach(c=>c.onclick=()=>{input.value=c.textContent;renderNow();input.focus()});m.onclick=e=>{if(e.target===m)close()};renderNow();input.focus()}
  function close(){document.querySelector('.smart-search-modal')?.remove();open=false}
  async function load(){try{const r=await fetch(`${DATA_URL}?smartsearch=${Date.now()}`);const d=await r.json();photos=d.images||[]}catch(e){photos=[]}}
  function addButton(){const t=document.querySelector('.toolbar');if(!t||document.getElementById('smartSearchBtn'))return;const b=document.createElement('button');b.id='smartSearchBtn';b.className='icon-btn';b.setAttribute('aria-label','Smart search');b.textContent='⌕';b.onclick=openModal;t.insertBefore(b,t.firstChild)}
  window.PhotoSmartSearch={open:openModal,search:run};load().then(addButton);window.addEventListener('load',addButton);
})();
