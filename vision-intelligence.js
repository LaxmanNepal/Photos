(() => {
  'use strict';
  const DB='laxman-photos-ai-v1', STORE='analyses', VERSION=1;
  let dbPromise;
  const openDB=()=>dbPromise||(dbPromise=new Promise((resolve,reject)=>{const r=indexedDB.open(DB,VERSION);r.onupgradeneeded=()=>r.result.createObjectStore(STORE,{keyPath:'key'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)}));
  async function get(key){const db=await openDB();return new Promise((res,rej)=>{const t=db.transaction(STORE,'readonly');const r=t.objectStore(STORE).get(key);r.onsuccess=()=>res(r.result||null);r.onerror=()=>rej(r.error)})}
  async function put(v){const db=await openDB();return new Promise((res,rej)=>{const t=db.transaction(STORE,'readwrite');t.objectStore(STORE).put(v);t.oncomplete=res;t.onerror=()=>rej(t.error)})}
  const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function heuristic(p){
    const n=(p.name||p.path||'').toLowerCase(), w=+p.width||0,h=+p.height||0;
    const tags=[];
    if(w&&h){ if(h>w*1.12)tags.push('portrait','vertical'); else if(w>h*1.12)tags.push('landscape','wide'); else tags.push('square'); }
    if(/screenshot|screen[_ -]?shot|capture/.test(n))tags.push('screenshot','screen');
    if(/food|meal|lunch|dinner|restaurant|kitchen/.test(n))tags.push('food');
    if(/trip|travel|tour|flight|hotel|temple|beach|mountain|pokhara|kathmandu/.test(n))tags.push('travel','places');
    if(/document|scan|invoice|receipt|bill|pdf/.test(n))tags.push('document','text');
    if(/selfie|portrait|profile/.test(n))tags.push('person','portrait');
    return [...new Set(tags)];
  }
  let classifier=null, loading=false;
  async function loadModel(){
    if(classifier)return classifier;
    if(loading)return loading;
    loading=(async()=>{const m=await import('https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.2/+esm');m.env.allowLocalModels=false;m.env.useBrowserCache=true;classifier=await m.pipeline('image-classification','Xenova/mobilevit-small',{dtype:'q8'});return classifier})().finally(()=>loading=false);
    return loading;
  }
  async function analyze(p, ai=true){
    const key=p.path||p.url||p.name; const old=await get(key); if(old)return old;
    const tags=heuristic(p); let labels=[]; let mode='local heuristic';
    if(ai){try{const c=await loadModel();const src=p.thumbnail||p.url||p.path;const out=await c(src,{top_k:5});labels=out.map(x=>x.label);mode='local AI + metadata';labels.forEach(x=>tags.push(x.toLowerCase()))}catch(e){console.warn('Local AI unavailable',e)}}
    const unique=[...new Set(tags)].slice(0,24); const result={key,name:p.name||p.path,tags:unique,labels,caption:unique.length?`Photo with ${unique.slice(0,4).join(', ')}`:'Photo',mode,updated:new Date().toISOString()}; await put(result);return result;
  }
  async function photos(){if(window.PhotoLibrary?.getPhotos)return window.PhotoLibrary.getPhotos();const r=await fetch('data/images.json');return r.json()}
  function addButton(){if(document.getElementById('visionBtn'))return;const b=document.createElement('button');b.id='visionBtn';b.className='icon-btn';b.textContent='✦';b.title='Local AI Vision';b.setAttribute('aria-label','Local AI Vision');b.onclick=openPanel;document.querySelector('.toolbar')?.appendChild(b)}
  async function openPanel(){
    let modal=document.getElementById('visionModal');if(!modal){modal=document.createElement('div');modal.id='visionModal';modal.innerHTML=`<div class="vision-backdrop"></div><section class="vision-modal glass" role="dialog" aria-modal="true"><button class="vision-close">×</button><p class="eyebrow">PRIVATE ON-DEVICE ANALYSIS</p><h2>AI Vision</h2><p class="vision-sub">Analyze thumbnails locally. Nothing is uploaded to an AI service.</p><div class="vision-status" id="visionStatus">Ready</div><div class="vision-actions"><button id="visionStart" class="primary">Analyze library</button><button id="visionOne">Analyze 20 recent</button></div><div class="vision-progress"><i id="visionProgress"></i></div><div id="visionResults" class="vision-results"></div><p class="vision-note">First AI use downloads an open-source model to your browser cache. If unavailable, metadata-based local analysis continues.</p></section>`;document.body.appendChild(modal);modal.querySelector('.vision-close').onclick=()=>modal.remove();modal.querySelector('.vision-backdrop').onclick=()=>modal.remove();document.getElementById('visionStart').onclick=()=>run(false);document.getElementById('visionOne').onclick=()=>run(true)}
    modal.classList.add('show');
    const existing=JSON.parse(localStorage.getItem('laxman-ai-vision-summary')||'null'); if(existing)renderSummary(existing);
  }
  async function run(recentOnly){
    const all=await photos(); const list=(recentOnly?all.slice().sort((a,b)=>String(b.captureDate||b.modified||'').localeCompare(String(a.captureDate||a.modified||''))).slice(0,20):all).filter(Boolean);
    const status=document.getElementById('visionStatus'), bar=document.getElementById('visionProgress'), results=document.getElementById('visionResults'); if(!status)return;
    status.textContent='Loading local vision model…';
    if(!recentOnly){try{await loadModel()}catch(e){}}
    let done=0, tags=new Map(), captions=[];
    for(const p of list){const a=await analyze(p,true);done++;bar.style.width=Math.round(done/list.length*100)+'%';status.textContent=`Analyzed ${done} / ${list.length}`;a.tags.forEach(t=>tags.set(t,(tags.get(t)||0)+1));if(a.caption)captions.push(a.caption)}
    const summary={count:done,tags:[...tags.entries()].sort((a,b)=>b[1]-a[1]).slice(0,30),updated:new Date().toISOString()};localStorage.setItem('laxman-ai-vision-summary',JSON.stringify(summary));renderSummary(summary);status.textContent=`Done — ${done} photos analyzed locally`;
  }
  function renderSummary(s){const el=document.getElementById('visionResults');if(!el)return;el.innerHTML=`<div class="vision-stat"><strong>${s.count||0}</strong><span>Analyzed</span></div><div class="vision-tags">${(s.tags||[]).map(([t,n])=>`<button data-q="${esc(t)}">${esc(t)} <b>${n}</b></button>`).join('')}</div>`;el.querySelectorAll('[data-q]').forEach(b=>b.onclick=()=>{document.getElementById('visionModal')?.remove();window.location.hash='vision='+encodeURIComponent(b.dataset.q)})}
  const style=document.createElement('style');style.textContent=`#visionModal{position:fixed;inset:0;z-index:10000;display:none}#visionModal.show{display:block}.vision-backdrop{position:absolute;inset:0;background:rgba(10,10,18,.5);backdrop-filter:blur(14px)}.vision-modal{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(720px,calc(100% - 28px));max-height:min(82vh,760px);overflow:auto;padding:28px;border:1px solid rgba(255,255,255,.45);border-radius:28px;box-shadow:0 24px 90px rgba(0,0,0,.3)}.vision-close{position:absolute;right:14px;top:12px;border:0;background:transparent;font-size:28px;cursor:pointer}.vision-sub,.vision-note{opacity:.68}.vision-actions{display:flex;gap:10px;flex-wrap:wrap;margin:20px 0}.vision-actions button{padding:11px 16px;border:0;border-radius:14px;cursor:pointer}.vision-actions .primary{background:#111;color:#fff}.vision-progress{height:8px;background:rgba(127,127,127,.18);border-radius:9px;overflow:hidden}.vision-progress i{display:block;height:100%;width:0;background:currentColor;transition:width .2s}.vision-results{margin-top:20px}.vision-stat{display:inline-flex;flex-direction:column;padding:14px 18px;border-radius:18px;background:rgba(127,127,127,.1);margin-bottom:15px}.vision-stat strong{font-size:24px}.vision-tags{display:flex;gap:8px;flex-wrap:wrap}.vision-tags button{border:1px solid rgba(127,127,127,.2);background:rgba(127,127,127,.08);border-radius:999px;padding:8px 11px;cursor:pointer}.vision-tags b{opacity:.55}.vision-note{font-size:12px;margin-top:18px}`;document.head.appendChild(style);
  addButton();
  new MutationObserver(addButton).observe(document.body,{childList:true,subtree:true});
  window.PhotoVision={analyze,search:async q=>{const all=await photos(),out=[];for(const p of all){const a=await get(p.path||p.url||p.name);if(a&&(a.tags.join(' ')+' '+a.caption).toLowerCase().includes(String(q).toLowerCase()))out.push({...p,_vision:a})}return out}};
})();
