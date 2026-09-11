const DATA_URL='data/images.json';
const LFS_BASE='https://media.githubusercontent.com/media/LaxmanNepal/Photos/main/';
const THUMB_BASE='https://media.githubusercontent.com/media/LaxmanNepal/Photos/main/thumbnails/';
let photos=[],filtered=[],index=0;
const $=id=>document.getElementById(id);

function imageUrl(photo, thumbnail=false){
  const path=photo?.path||photo?.url||'';
  if(/^https?:\/\//i.test(path))return path;
  const clean=path.replace(/^\.\//,'');
  if(thumbnail && photo?.thumbnail){
    return THUMB_BASE+photo.thumbnail.replace(/^thumbnails\//,'').split('/').map(encodeURIComponent).join('/');
  }
  return LFS_BASE+clean.split('/').map(encodeURIComponent).join('/');
}

function formatBytes(bytes){
  if(!Number.isFinite(bytes)||bytes<=0)return '';
  const units=['B','KB','MB','GB']; let i=0,n=bytes;
  while(n>=1024&&i<units.length-1){n/=1024;i++}
  return `${n.toFixed(n>=100||i===0?0:1)} ${units[i]}`;
}

function photoDate(p){
  if(!p.date)return '';
  const d=new Date(p.date);
  return Number.isNaN(d.getTime())?'':d.toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'});
}

async function load(){
  try{
    const r=await fetch(`${DATA_URL}?v=${Date.now()}`,{cache:'no-store'});
    if(!r.ok)throw new Error('index');
    const d=await r.json();
    photos=(d.images||[]).map(p=>({...p,url:imageUrl(p),thumbUrl:imageUrl(p,true)}));
    filtered=photos;
    render();
    $('count').textContent=d.count||photos.length;
    $('updated').textContent=d.generated_at?`Updated ${new Date(d.generated_at).toLocaleDateString()}`:'Updated automatically';
  }catch(e){
    $('updated').textContent='Waiting for photo index';
  }finally{
    $('loading').classList.add('hidden');
    if(!photos.length)$('empty').classList.remove('hidden');
  }
}

function render(){
  const g=$('gallery');
  g.innerHTML='';
  if(!filtered.length){$('empty').classList.remove('hidden');return}
  $('empty').classList.add('hidden');
  filtered.forEach((p,i)=>{
    const c=document.createElement('article');
    c.className='card';
    c.dataset.path=p.path||'';
    const img=document.createElement('img');
    img.loading=i<12?'eager':'lazy';
    img.fetchPriority=i<6?'high':'auto';
    img.decoding='async';
    img.src=p.thumbUrl||p.url;
    img.alt=p.name||'Photo';
    img.onerror=()=>{
      if(img.src!==p.url){img.src=p.url;return}
      img.classList.add('load-error');
    };
    c.append(img);
    const info=document.createElement('div');
    info.className='card-info';
    const title=document.createElement('strong');
    title.textContent=p.name||'Photo';
    const meta=document.createElement('small');
    meta.textContent=[photoDate(p),formatBytes(p.size),p.width&&p.height?`${p.width}×${p.height}`:''].filter(Boolean).join(' · ');
    info.append(title,meta);
    c.append(info);
    c.onclick=()=>openViewer(i);
    g.append(c);
  });
}

function openViewer(i){
  index=i;
  const p=filtered[i];
  $('viewerImg').src=p.url;
  $('viewerImg').alt=p.name||'Photo';
  $('viewerCaption').innerHTML='';
  const title=document.createElement('strong'); title.textContent=p.name||'Photo';
  const meta=document.createElement('small'); meta.textContent=[photoDate(p),formatBytes(p.size),p.width&&p.height?`${p.width}×${p.height}`:''].filter(Boolean).join(' · ');
  $('viewerCaption').append(title,meta);
  $('viewer').classList.remove('hidden');
  document.body.style.overflow='hidden';
}
function closeViewer(){$('viewer').classList.add('hidden');document.body.style.overflow=''}
function move(n){if(!filtered.length)return;index=(index+n+filtered.length)%filtered.length;openViewer(index)}

$('searchBtn').onclick=()=>{$('searchBar').classList.toggle('hidden');if(!$('searchBar').classList.contains('hidden'))$('searchInput').focus()};
$('clearSearch').onclick=()=>{$('searchInput').value='';filtered=photos;render()};
$('searchInput').oninput=e=>{const q=e.target.value.trim().toLowerCase();filtered=photos.filter(p=>[p.name,p.path,p.date,p.year,p.month].filter(Boolean).join(' ').toLowerCase().includes(q));render()};
$('closeViewer').onclick=closeViewer;
$('prevBtn').onclick=()=>move(-1);
$('nextBtn').onclick=()=>move(1);
$('viewer').onclick=e=>{if(e.target===$('viewer'))closeViewer()};
document.onkeydown=e=>{if($('viewer').classList.contains('hidden'))return;if(e.key==='Escape')closeViewer();if(e.key==='ArrowLeft')move(-1);if(e.key==='ArrowRight')move(1)};
$('themeBtn').onclick=()=>{document.body.classList.toggle('dark');localStorage.theme=document.body.classList.contains('dark')?'dark':'light'};
if(localStorage.theme==='dark')document.body.classList.add('dark');
$('year').textContent=new Date().getFullYear();
load();
