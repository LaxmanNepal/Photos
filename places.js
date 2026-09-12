(() => {
  'use strict';

  const DATA_URL = 'data/images.json';
  let places = [];
  let mapOpen = false;

  const esc = value => String(value ?? '').replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
  const coords = p => {
    const g = p?.gps || p?.location || {};
    const lat = Number(g.latitude ?? g.lat);
    const lon = Number(g.longitude ?? g.lon ?? g.lng);
    return Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180 ? {lat,lon} : null;
  };

  function cluster(items) {
    const buckets = new Map();
    for (const p of items) {
      const c = coords(p); if (!c) continue;
      // Metadata is deliberately coarse (normally ~1 km at the equator) for public-repo privacy.
      const key = `${c.lat.toFixed(2)},${c.lon.toFixed(2)}`;
      if (!buckets.has(key)) buckets.set(key, {lat:0,lon:0,photos:[]});
      const b = buckets.get(key); b.lat += c.lat; b.lon += c.lon; b.photos.push(p);
    }
    return [...buckets.values()].map((b,i) => ({
      id:i+1, lat:b.lat/b.photos.length, lon:b.lon/b.photos.length, photos:b.photos
    })).sort((a,b)=>b.photos.length-a.photos.length);
  }

  function project(lat, lon, width, height) {
    const x = ((lon + 180) / 360) * width;
    const y = ((90 - lat) / 180) * height;
    return [Math.max(10, Math.min(width-10,x)), Math.max(10, Math.min(height-10,y))];
  }

  function injectStyle() {
    if (document.getElementById('placesStyle')) return;
    const s = document.createElement('style'); s.id='placesStyle';
    s.textContent = `
      .places-modal{position:fixed;inset:0;z-index:80;background:rgba(10,12,18,.55);backdrop-filter:blur(18px);display:grid;place-items:center;padding:18px}
      .places-shell{width:min(1100px,100%);max-height:min(88vh,900px);overflow:auto;border:1px solid rgba(255,255,255,.35);border-radius:28px;background:rgba(255,255,255,.86);box-shadow:0 30px 90px rgba(0,0,0,.28);padding:20px}
      .places-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:14px}.places-head h2{margin:0}.places-head p{margin:5px 0 0;color:#6b7280;font-size:13px}
      .places-close{border:0;border-radius:14px;background:rgba(0,0,0,.06);font-size:22px;width:40px;height:40px;cursor:pointer}
      .places-map{position:relative;aspect-ratio:2/1;border-radius:22px;overflow:hidden;background:linear-gradient(180deg,#dbeafe,#f8fafc);border:1px solid rgba(0,0,0,.08)}
      .places-map svg{width:100%;height:100%;display:block}.places-graticule{stroke:rgba(100,116,139,.18);stroke-width:1;fill:none}.places-land{fill:rgba(100,116,139,.09)}
      .place-pin{cursor:pointer}.place-pin circle{fill:#111827;stroke:white;stroke-width:2}.place-pin text{font:700 11px Inter,sans-serif;fill:white;text-anchor:middle;dominant-baseline:middle}
      .places-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:10px;margin-top:14px}.place-card{border:1px solid rgba(0,0,0,.08);border-radius:18px;background:rgba(255,255,255,.72);padding:12px;cursor:pointer;text-align:left}.place-card:hover{transform:translateY(-1px)}.place-card strong{display:block}.place-card small{color:#6b7280}.places-empty{text-align:center;padding:55px 20px;color:#6b7280}.places-privacy{font-size:12px;color:#6b7280;margin-top:10px}
      @media(prefers-color-scheme:dark){.places-shell{background:rgba(24,26,32,.94);color:#f8fafc}.place-card{background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.1)}.places-head p,.places-privacy,.place-card small{color:#9ca3af}.places-close{background:rgba(255,255,255,.1);color:white}}
    `; document.head.appendChild(s);
  }

  function openModal() {
    if (mapOpen) return; mapOpen=true; injectStyle();
    const modal=document.createElement('div'); modal.className='places-modal'; modal.id='placesModal';
    modal.innerHTML=`<div class="places-shell"><div class="places-head"><div><h2>⌖ Photo Map</h2><p>${places.reduce((n,p)=>n+p.photos.length,0)} geotagged photos · ${places.length} areas</p></div><button class="places-close" aria-label="Close">×</button></div><div id="placesBody"></div><div class="places-privacy">Location data is shown only at coarse precision to reduce privacy risk in this public repository.</div></div>`;
    document.body.append(modal); modal.querySelector('.places-close').onclick=closeModal; modal.onclick=e=>{if(e.target===modal)closeModal()}; render(modal.querySelector('#placesBody'));
  }

  function closeModal(){document.getElementById('placesModal')?.remove();mapOpen=false}

  function render(root){
    if (!places.length) { root.innerHTML='<div class="places-empty"><div style="font-size:42px">⌖</div><h3>No GPS locations yet</h3><p>New metadata indexing will add coarse GPS coordinates when your photos contain location EXIF.</p></div>'; return; }
    const W=1000,H=500;
    const lines=[]; for(let lon=-150;lon<=150;lon+=30){const[x]=project(0,lon,W,H);lines.push(`<path class="places-graticule" d="M ${x} 0 V ${H}"/>`)} for(let lat=-60;lat<=60;lat+=30){const[,y]=project(lat,0,W,H);lines.push(`<path class="places-graticule" d="M 0 ${y} H ${W}"/>`)}
    const pins=places.map(p=>{const [x,y]=project(p.lat,p.lon,W,H);return `<g class="place-pin" data-place="${p.id}"><circle cx="${x}" cy="${y}" r="${Math.min(18,7+Math.log2(p.photos.length+1)*2)}"/><text x="${x}" y="${y}">${p.photos.length}</text></g>`}).join('');
    root.innerHTML=`<div class="places-map"><svg viewBox="0 0 ${W} ${H}" aria-label="Photo location map"><rect width="${W}" height="${H}" fill="transparent"/>${lines.join('')}${pins}</svg></div><div class="places-list">${places.map(p=>`<button class="place-card" data-place="${p.id}"><strong>Area ${p.id}</strong><small>${p.photos.length} photos · ${p.lat.toFixed(2)}, ${p.lon.toFixed(2)}</small></button>`).join('')}</div>`;
    root.querySelectorAll('[data-place]').forEach(el=>el.onclick=()=>showPlace(el.dataset.place));
  }

  function showPlace(id){
    const p=places.find(x=>String(x.id)===String(id)); if(!p)return;
    closeModal();
    // Reuse the existing gallery through a lightweight selection exposed by the app.
    window.__placesSelection=p.photos;
    if(typeof window.showPlacePhotos==='function') window.showPlacePhotos(p.photos,`Area ${p.id}`);
    else location.hash=`#places=${encodeURIComponent(p.lat.toFixed(2)+','+p.lon.toFixed(2))}`;
  }

  async function load() {
    try { const r=await fetch(`${DATA_URL}?places=${Date.now()}`); const d=await r.json(); places=cluster(d.images||[]); }
    catch(e){ places=[]; }
  }

  function addButton(){
    const toolbar=document.querySelector('.toolbar'); if(!toolbar || document.getElementById('placesBtn')) return;
    const b=document.createElement('button'); b.id='placesBtn'; b.className='icon-btn'; b.setAttribute('aria-label','Photo map'); b.textContent='⌖'; b.onclick=openModal; toolbar.insertBefore(b,toolbar.firstChild);
  }

  window.PhotoPlaces={open:openModal,refresh:load};
  load().then(addButton);
  window.addEventListener('load',addButton);
})();
