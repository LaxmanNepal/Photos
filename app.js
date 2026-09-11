const DATA_URL='data/images.json';
const LFS_BASE='https://media.githubusercontent.com/media/LaxmanNepal/Photos/main/';
let photos=[],filtered=[],index=0;
const $=id=>document.getElementById(id);

function imageUrl(photo){
  const path=photo?.path||photo?.url||'';
  if(/^https?:\/\//i.test(path))return path;
  return LFS_BASE+path.replace(/^\.\//,'').split('/').map(encodeURIComponent).join('/');
}

async function load(){
  try{
    const r=await fetch(`${DATA_URL}?v=${Date.now()}`,{cache:'no-store'});
    if(!r.ok)throw 0;
    const d=await r.json();
    photos=(d.images||[]).map(p=>({...p,url:imageUrl(p)}));
    filtered=photos;
    render();
    $('count').textContent=photos.length;
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
    const img=document.createElement('img');
    img.loading='lazy';
    img.decoding='async';
    img.src=p.url;
    img.alt=p.name;
    img.onerror=()=>{img.classList.add('load-error');img.alt=`Unable to load ${p.name}`};
    c.append(img);
    const info=document.createElement('div');
    info.className='card-info';
    info.textContent=p.name;
    c.append(info);
    c.onclick=()=>openViewer(i);
    g.append(c);
  });
}

function openViewer(i){index=i;$('viewerImg').src=filtered[i].url;$('viewerImg').alt=filtered[i].name;$('viewerCaption').textContent=filtered[i].name;$('viewer').classList.remove('hidden');document.body.style.overflow='hidden'}
function closeViewer(){$('viewer').classList.add('hidden');document.body.style.overflow=''}
function move(n){if(!filtered.length)return;index=(index+n+filtered.length)%filtered.length;openViewer(index)}

$('searchBtn').onclick=()=>{$('searchBar').classList.toggle('hidden');if(!$('searchBar').classList.contains('hidden'))$('searchInput').focus()};
$('clearSearch').onclick=()=>{$('searchInput').value='';filtered=photos;render()};
$('searchInput').oninput=e=>{const q=e.target.value.trim().toLowerCase();filtered=photos.filter(p=>p.name.toLowerCase().includes(q));render()};
$('closeViewer').onclick=closeViewer;
$('prevBtn').onclick=()=>move(-1);
$('nextBtn').onclick=()=>move(1);
$('viewer').onclick=e=>{if(e.target===$('viewer'))closeViewer()};
document.onkeydown=e=>{if($('viewer').classList.contains('hidden'))return;if(e.key==='Escape')closeViewer();if(e.key==='ArrowLeft')move(-1);if(e.key==='ArrowRight')move(1)};
$('themeBtn').onclick=()=>{document.body.classList.toggle('dark');localStorage.theme=document.body.classList.contains('dark')?'dark':'light'};
if(localStorage.theme==='dark')document.body.classList.add('dark');
$('year').textContent=new Date().getFullYear();
load();
