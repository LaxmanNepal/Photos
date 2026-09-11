(()=>{
'use strict';
const viewer=()=>document.getElementById('viewer');
const content=()=>document.querySelector('.viewer-content');
const img=()=>document.getElementById('viewerImg');
let slideTimer=null,slideOn=false,lastCard=null;
const css=`
.viewer-pro-tools{position:absolute;top:18px;left:50%;transform:translateX(-50%);display:flex;gap:7px;z-index:30;padding:6px;border:1px solid rgba(255,255,255,.16);background:rgba(20,20,24,.38);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);border-radius:18px;box-shadow:0 12px 40px rgba(0,0,0,.22)}
.viewer-pro-tools button{border:0;border-radius:12px;min-width:38px;height:34px;padding:0 11px;background:rgba(255,255,255,.12);color:#fff;font:600 13px Inter,sans-serif;cursor:pointer;transition:.2s transform,.2s background}
.viewer-pro-tools button:hover{transform:scale(1.06);background:rgba(255,255,255,.2)}
.viewer-filmstrip{position:absolute;left:50%;bottom:18px;transform:translateX(-50%);z-index:25;display:flex;gap:7px;max-width:min(92vw,720px);padding:7px;overflow:hidden;border:1px solid rgba(255,255,255,.14);background:rgba(15,15,18,.42);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);border-radius:17px;box-shadow:0 14px 45px rgba(0,0,0,.25)}
.viewer-filmstrip button{width:54px;height:42px;flex:0 0 54px;border:2px solid transparent;border-radius:10px;padding:0;overflow:hidden;background:rgba(255,255,255,.08);cursor:pointer;opacity:.72;transition:.2s transform,.2s opacity,.2s border-color}
.viewer-filmstrip button:hover{transform:translateY(-2px);opacity:1}.viewer-filmstrip button.active{border-color:#fff;opacity:1;transform:scale(1.04)}
.viewer-filmstrip img{width:100%;height:100%;object-fit:cover;display:block}
.viewer.viewer-present .viewer-content{animation:viewerPresent .42s cubic-bezier(.16,1,.3,1)}
.viewer.viewer-slide-next .viewer-content{animation:viewerNext .28s ease}.viewer.viewer-slide-prev .viewer-content{animation:viewerPrev .28s ease}
@keyframes viewerPresent{from{opacity:0;transform:translateY(18px) scale(.965)}to{opacity:1;transform:none}}
@keyframes viewerNext{from{opacity:.25;transform:translateX(18px) scale(.985)}to{opacity:1;transform:none}}
@keyframes viewerPrev{from{opacity:.25;transform:translateX(-18px) scale(.985)}to{opacity:1;transform:none}}
@media(max-width:640px){.viewer-pro-tools{top:auto;bottom:76px}.viewer-filmstrip{bottom:12px;max-width:94vw}.viewer-filmstrip button{width:48px;height:38px;flex-basis:48px}}
`;
function inject(){if(document.getElementById('viewer-pro-style'))return;const s=document.createElement('style');s.id='viewer-pro-style';s.textContent=css;document.head.appendChild(s)}
function findCards(){return [...document.querySelectorAll('#gallery .photo-card, #gallery [data-photo], #gallery article')].filter(Boolean)}
function sourceForCard(c){return c?.querySelector('img')?.src||''}
function rememberCard(){const v=img();if(!v)return;const src=v.currentSrc||v.src;lastCard=findCards().find(c=>sourceForCard(c)===src)||lastCard}
function buildTools(){if(document.querySelector('.viewer-pro-tools'))return;const v=viewer();if(!v)return;const bar=document.createElement('div');bar.className='viewer-pro-tools';bar.innerHTML='<button type="button" data-vp="play" title="Slideshow (Space)">▶</button><button type="button" data-vp="full" title="Fullscreen (F)">⛶</button><button type="button" data-vp="fit" title="Reset zoom (0)">↺</button>';
v.appendChild(bar);bar.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.vp==='play')toggleSlide();if(b.dataset.vp==='full')toggleFull();if(b.dataset.vp==='fit')document.getElementById('zoomReset')?.click()})}
function buildFilmstrip(){if(document.querySelector('.viewer-filmstrip'))return;const v=viewer();const strip=document.createElement('div');strip.className='viewer-filmstrip';v.appendChild(strip)}
function renderFilmstrip(){const strip=document.querySelector('.viewer-filmstrip');if(!strip)return;const cards=findCards();if(!cards.length){strip.innerHTML='';return}const current=img()?.currentSrc||img()?.src||'';let pos=cards.findIndex(c=>sourceForCard(c)===current);if(pos<0&&lastCard)pos=cards.indexOf(lastCard);if(pos<0)pos=0;const start=Math.max(0,Math.min(pos-3,Math.max(0,cards.length-7)));strip.innerHTML='';cards.slice(start,start+7).forEach((card,i)=>{const b=document.createElement('button');const im=card.querySelector('img');b.className=(start+i===pos?'active':'');if(im){const x=document.createElement('img');x.src=im.currentSrc||im.src;x.alt='';b.appendChild(x)}b.addEventListener('click',()=>{card.scrollIntoView({block:'nearest'});card.click();lastCard=card;setTimeout(renderFilmstrip,80)});strip.appendChild(b)})}
function toggleSlide(){slideOn=!slideOn;const b=document.querySelector('[data-vp="play"]');if(b)b.textContent=slideOn?'❚❚':'▶';clearInterval(slideTimer);if(slideOn){slideTimer=setInterval(()=>{if(viewer()?.classList.contains('hidden')){stopSlide();return}document.getElementById('nextBtn')?.click()},4500)}}
function stopSlide(){slideOn=false;clearInterval(slideTimer);slideTimer=null;const b=document.querySelector('[data-vp="play"]');if(b)b.textContent='▶'}
async function toggleFull(){const v=viewer();if(!v)return;try{if(!document.fullscreenElement){await v.requestFullscreen?.()}else await document.exitFullscreen?.()}catch{}}
function animateDirection(dir){const v=viewer();if(!v)return;v.classList.remove('viewer-slide-next','viewer-slide-prev');void v.offsetWidth;v.classList.add(dir>0?'viewer-slide-next':'viewer-slide-prev');setTimeout(()=>v.classList.remove('viewer-slide-next','viewer-slide-prev'),320)}
function setup(){inject();buildTools();buildFilmstrip();
 document.addEventListener('click',e=>{const card=e.target.closest('#gallery .photo-card, #gallery [data-photo], #gallery article');if(card)lastCard=card},true);
 const v=viewer();if(!v)return;
 new MutationObserver(()=>{if(!v.classList.contains('hidden')){rememberCard();renderFilmstrip();v.classList.add('viewer-present');setTimeout(()=>v.classList.remove('viewer-present'),450)}else stopSlide()}).observe(v,{attributes:true,attributeFilter:['class']});
 document.getElementById('nextBtn')?.addEventListener('click',()=>{animateDirection(1);setTimeout(renderFilmstrip,100)});
 document.getElementById('prevBtn')?.addEventListener('click',()=>{animateDirection(-1);setTimeout(renderFilmstrip,100)});
 document.getElementById('closeViewer')?.addEventListener('click',()=>{stopSlide();if(lastCard){const r=lastCard.getBoundingClientRect(),c=content();if(c&&r.width){c.animate([{transform:'scale(1)',opacity:1},{transform:`translate3d(${r.left+ r.width/2-window.innerWidth/2}px,${r.top+r.height/2-window.innerHeight/2}px,0) scale(${Math.max(.08,Math.min(1,r.width/Math.max(1,c.getBoundingClientRect().width)) )})`,opacity:.15}],{duration:300,easing:'cubic-bezier(.4,0,.2,1)'})}}});
 document.addEventListener('keydown',e=>{if(v.classList.contains('hidden'))return;if(e.target.matches('input,textarea'))return;const k=e.key.toLowerCase();if(k===' '){e.preventDefault();toggleSlide()}else if(k==='f')toggleFull();else if(k==='0')document.getElementById('zoomReset')?.click();else if(k==='n')document.getElementById('nextBtn')?.click();else if(k==='p')document.getElementById('prevBtn')?.click();else if(k==='d')document.getElementById('downloadBtn')?.click();else if(k==='s')document.getElementById('shareBtn')?.click();else if(k==='i')document.getElementById('detailsBtn')?.click();});
 document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement)document.body.classList.remove('photo-fullscreen')});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup);else setup();
})();