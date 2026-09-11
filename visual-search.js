(() => {
  'use strict';

  const CACHE_KEY = 'laxman-photos-visual-hashes-v1';
  const SIZE = 16;
  const MAX_DISTANCE = 42;
  const BATCH = 36;
  let cache = {};
  let busy = false;
  let cancelled = false;

  try { cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); } catch (_) { cache = {}; }

  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const photos = () => Array.isArray(window.photos) ? window.photos : [];
  const urlOf = p => p.thumbUrl || p.thumbnail || p.url || p.path || '';
  const nameOf = p => p.filename || p.name || p.path?.split('/').pop() || 'Photo';
  const keyOf = p => `${urlOf(p)}|${p.modified || p.modifiedDate || p.file_size || ''}`;

  function phash(img) {
    const c = document.createElement('canvas'); c.width = SIZE; c.height = SIZE;
    const x = c.getContext('2d', {willReadFrequently:true});
    x.drawImage(img, 0, 0, SIZE, SIZE);
    const d = x.getImageData(0, 0, SIZE, SIZE).data;
    const gray = new Array(SIZE * SIZE);
    let sum = 0;
    for (let i=0, j=0; i<d.length; i+=4, j++) { const g = d[i]*.299 + d[i+1]*.587 + d[i+2]*.114; gray[j]=g; sum+=g; }
    const avg = sum / gray.length;
    let bits = '';
    for (const v of gray) bits += v >= avg ? '1' : '0';
    return bits;
  }

  function distance(a,b) { let n=0; for(let i=0;i<a.length;i++) if(a[i]!==b[i]) n++; return n; }

  function loadImage(src) {
    return new Promise((resolve,reject) => {
      const img = new Image(); img.crossOrigin='anonymous';
      img.onload=()=>resolve(img); img.onerror=()=>reject(new Error('image load failed')); img.src=src;
    });
  }

  function save() { try { localStorage.setItem(CACHE_KEY, JSON.stringify(cache)); } catch (_) {} }

  function injectStyles() {
    if (document.getElementById('visualSearchStyles')) return;
    const s=document.createElement('style'); s.id='visualSearchStyles'; s.textContent=`
      .vs-modal{position:fixed;inset:0;z-index:10000;background:rgba(10,10,14,.66);backdrop-filter:blur(24px);display:flex;align-items:center;justify-content:center;padding:18px}
      .vs-card{width:min(1080px,100%);max-height:min(88vh,900px);overflow:auto;border:1px solid rgba(255,255,255,.16);background:rgba(30,30,34,.82);box-shadow:0 30px 100px rgba(0,0,0,.4);border-radius:28px;padding:22px;color:#fff}
      .vs-head{display:flex;justify-content:space-between;gap:14px;align-items:center;margin-bottom:12px}.vs-head h2{margin:0;font-size:20px}.vs-head small{opacity:.65}.vs-x,.vs-action{border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.08);color:inherit;border-radius:12px;padding:9px 13px;cursor:pointer}.vs-progress{height:6px;background:rgba(255,255,255,.1);border-radius:99px;overflow:hidden;margin:12px 0}.vs-progress i{display:block;height:100%;width:0;background:currentColor;transition:width .2s}.vs-status{font-size:12px;opacity:.7;margin-bottom:14px}.vs-groups{display:grid;gap:16px}.vs-group{border:1px solid rgba(255,255,255,.1);border-radius:20px;padding:12px}.vs-group-title{display:flex;justify-content:space-between;font-size:12px;opacity:.75;margin-bottom:10px}.vs-items{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px}.vs-item{position:relative;border-radius:14px;overflow:hidden;background:#111;aspect-ratio:1}.vs-item img{width:100%;height:100%;object-fit:cover;display:block}.vs-item span{position:absolute;left:7px;right:7px;bottom:6px;padding:4px 6px;border-radius:7px;background:rgba(0,0,0,.62);font-size:10px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.vs-empty{padding:40px 10px;text-align:center;opacity:.65}.vs-actions{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}
      @media(max-width:600px){.vs-modal{padding:8px}.vs-card{border-radius:22px;padding:15px}.vs-items{grid-template-columns:repeat(3,1fr)}}`;
    document.head.appendChild(s);
  }

  function openModal(title='Visual Search') {
    injectStyles();
    const old=document.getElementById('vsModal'); if(old) old.remove();
    const m=document.createElement('div'); m.className='vs-modal'; m.id='vsModal';
    m.innerHTML=`<div class="vs-card"><div class="vs-head"><div><h2>✦ ${esc(title)}</h2><small>Local-only perceptual similarity · photos never leave your device</small></div><button class="vs-x" aria-label="Close">×</button></div><div class="vs-actions"><button class="vs-action" id="vsRun">Analyze library</button><button class="vs-action" id="vsCancel">Cancel</button></div><div class="vs-progress"><i id="vsBar"></i></div><div class="vs-status" id="vsStatus">Ready. Analysis runs only when you start it.</div><div class="vs-groups" id="vsGroups"></div></div>`;
    document.body.appendChild(m);
    m.querySelector('.vs-x').onclick=()=>{cancelled=true;m.remove();};
    m.querySelector('#vsCancel').onclick=()=>{cancelled=true; document.getElementById('vsStatus').textContent='Cancelling…';};
    m.querySelector('#vsRun').onclick=()=>runAnalysis(m);
    return m;
  }

  async function buildHashes(list,m) {
    const status=m.querySelector('#vsStatus'), bar=m.querySelector('#vsBar');
    const usable=list.filter(p=>urlOf(p)); let done=0;
    for(let i=0;i<usable.length;i+=BATCH){
      if(cancelled) break;
      const batch=usable.slice(i,i+BATCH);
      await Promise.all(batch.map(async p=>{
        const k=keyOf(p); if(cache[k]) {done++;return;}
        try { const img=await loadImage(urlOf(p)); cache[k]=phash(img); } catch(_) { cache[k]=null; }
        done++;
      }));
      save(); bar.style.width=Math.round(done/usable.length*100)+'%';
      status.textContent=`Analyzing ${done} of ${usable.length} photos…`;
      await new Promise(r => ('requestIdleCallback' in window ? requestIdleCallback(r,{timeout:80}) : setTimeout(r,20)));
    }
    return usable.filter(p=>cache[keyOf(p)]);
  }

  function findGroups(list) {
    const groups=[], used=new Set();
    for(let i=0;i<list.length;i++){
      if(used.has(i)) continue;
      const matches=[{p:list[i],d:0}];
      for(let j=i+1;j<list.length;j++){
        if(used.has(j)) continue;
        const d=distance(cache[keyOf(list[i])],cache[keyOf(list[j])]);
        if(d<=MAX_DISTANCE) matches.push({p:list[j],d});
      }
      if(matches.length>1){ matches.sort((a,b)=>a.d-b.d); matches.forEach(x=>used.add(list.indexOf(x.p))); groups.push(matches); }
    }
    return groups.sort((a,b)=>a[0].d-b[0].d);
  }

  function renderGroups(groups,m,subject=null) {
    const box=m.querySelector('#vsGroups');
    if(!groups.length){box.innerHTML='<div class="vs-empty">No visually similar groups found at the current threshold.</div>';return;}
    box.innerHTML=groups.slice(0,80).map((g,gi)=>`<section class="vs-group"><div class="vs-group-title"><span>Group ${gi+1} · ${g.length} photos</span><span>${Math.round((1-g[0].d/256)*100)}% closest match</span></div><div class="vs-items">${g.slice(0,12).map(x=>`<div class="vs-item"><img loading="lazy" src="${esc(urlOf(x.p))}" alt="${esc(nameOf(x.p))}"><span>${esc(nameOf(x.p))}${x.d?` · d${x.d}`:''}</span></div>`).join('')}</div></section>`).join('');
  }

  async function runAnalysis(m, subject=null) {
    if(busy) return; busy=true; cancelled=false;
    const status=m.querySelector('#vsStatus'), list=subject ? [subject,...photos().filter(p=>p!==subject)] : photos();
    m.querySelector('#vsRun').disabled=true;
    try {
      const hashed=await buildHashes(list,m); if(cancelled){status.textContent='Analysis cancelled.';return;}
      const groups=findGroups(hashed);
      renderGroups(groups,m,subject);
      status.textContent=`Done · ${hashed.length} thumbnails analyzed · ${groups.length} similar groups found.`;
    } catch(e){status.textContent='Visual analysis could not complete. Some remote thumbnails may block canvas access.';}
    finally{busy=false;m.querySelector('#vsRun').disabled=false;}
  }

  function findCurrent() {
    const img=document.getElementById('viewerImg'); if(!img) return null;
    const alt=img.alt || ''; const src=img.src || '';
    return photos().find(p=>nameOf(p)===alt || src.includes(encodeURIComponent(nameOf(p))) || src.includes(nameOf(p))) || null;
  }

  function addButton() {
    const toolbar=document.querySelector('.toolbar'); if(!toolbar || document.getElementById('visualSearchBtn')) return;
    const b=document.createElement('button'); b.id='visualSearchBtn'; b.className='icon-btn'; b.setAttribute('aria-label','Visual search'); b.title='Visual Search'; b.textContent='✦';
    b.onclick=()=>{const m=openModal();runAnalysis(m);}; toolbar.insertBefore(b,document.getElementById('themeBtn'));
  }

  function addViewerAction() {
    const actions=document.querySelector('.viewer-actions'); if(!actions || document.getElementById('viewerSimilarBtn')) return;
    const b=document.createElement('button'); b.id='viewerSimilarBtn'; b.setAttribute('aria-label','Find similar photos'); b.title='Find similar photos'; b.textContent='✦';
    b.onclick=()=>{const subject=findCurrent(); const m=openModal('Find Similar Photos'); if(subject) runAnalysis(m,subject); else m.querySelector('#vsStatus').textContent='Open a photo from the gallery first.';};
    actions.insertBefore(b,actions.querySelector('#detailsBtn'));
  }

  function init(){ addButton(); addViewerAction(); setInterval(()=>{addButton();addViewerAction();},1200); }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',init); else init();
})();
