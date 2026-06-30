const byCountry={};
DOCTORS.forEach(d=>{if(!byCountry[d.country])byCountry[d.country]=[];byCountry[d.country].push(d);});
const svg=document.getElementById("worldmap");
const panel=document.getElementById("panel");
const jtip=document.getElementById("jtip");
let liveByCountry={}; // populated by polling
let liveCount=0;

PATHS.forEach(p=>{
  const el=document.createElementNS("http://www.w3.org/2000/svg","path");
  el.setAttribute("d",p.d);
  el.setAttribute("class","country "+(p.active?"active-c":"inactive"));
  el.dataset.id=p.id;el.dataset.active=p.active?"1":"0";
  svg.appendChild(el);
});

svg.addEventListener("click",e=>{
  const el=e.target.closest("[data-active]");if(!el)return;hideTip();
  if(el.dataset.active==="1"){const c=CNMAP[el.dataset.id];if(c)openPanel(c);}
  else showTip(e.clientX,e.clientY);
});
svg.addEventListener("mouseover",e=>{const el=e.target.closest("[data-active]");if(el&&el.dataset.active==="0")showTip(e.clientX,e.clientY);});
svg.addEventListener("mouseout",e=>{const el=e.target.closest("[data-active]");if(el&&el.dataset.active==="0")hideTip();});
svg.addEventListener("touchend",e=>{
  const t=e.changedTouches[0];const el=document.elementFromPoint(t.clientX,t.clientY);
  if(!el)return;const c=el.closest("[data-active]");if(!c)return;
  if(c.dataset.active==="1"){const cn=CNMAP[c.dataset.id];if(cn)openPanel(cn);}
  else{showTip(t.clientX,t.clientY);setTimeout(hideTip,3000);}
},{passive:true});
document.getElementById("xbtn").onclick=closePanel;
function showTip(x,y){jtip.style.display="block";jtip.style.left=Math.min(x+12,window.innerWidth-256)+"px";jtip.style.top=Math.min(y-6,window.innerHeight-100)+"px";}
function hideTip(){jtip.style.display="none";}

function openPanel(country){
  const historical=byCountry[country]||[];
  const live=(liveByCountry[country]||[]);
  document.getElementById("pFlag").textContent=FLAGS[country]||"🌍";
  document.getElementById("pCountry").textContent=country;
  const allCount=historical.length+live.length;
  const cities=[...new Set([...historical,...live].map(d=>d.city).filter(Boolean))];
  document.getElementById("pMeta").textContent=`${allCount} physician${allCount!==1?"s":""} · ${cities.join(" · ")}`;
  const body=document.getElementById("pBody");body.innerHTML="";body.scrollTop=0;

  // live entries first
  live.forEach(dr=>{
    const card=document.createElement("div");card.className="dcard is-live";
    card.innerHTML=`<div class="dtop"><div class="dicon">⚕</div><div class="dinfo"><div class="dname">${dr.name}</div><div class="dspec live">RiseFor10 · ${dr.specialty||"Physician"}</div></div></div><div class="dcontrib"><span class="dline">${dr.contribution||"Pledged to give back"}</span></div>`;
    body.appendChild(card);
  });
  historical.forEach(dr=>{
    const card=document.createElement("div");card.className="dcard";
    const photoEl=dr.photo?`<img class="dphoto" src="data:image/jpeg;base64,${dr.photo}" alt="${dr.name}" loading="lazy"/>`:`<div class="dicon">⚕</div>`;
    const lines=dr.contribution.split(/[;]/).map(s=>s.trim()).filter(Boolean);
    const contrib=lines.map(l=>`<span class="dline">${l}</span>`).join("");
    card.innerHTML=`<div class="dtop">${photoEl}<div class="dinfo"><div class="dname">${dr.name}</div><div class="dspec">${dr.specialty}</div></div></div><div class="dcontrib">${contrib}</div>`;
    body.appendChild(card);
  });
  panel.classList.add("open");
}
function closePanel(){panel.classList.remove("open");}

// pan & zoom — wheel/scroll zoom disabled so it never fights page scroll.
// Drag-to-pan and pinch-to-zoom (touch) still work.
let vb={x:0,y:0,w:960,h:500},drag=false,ds={},vs={};
svg.addEventListener("mousedown",e=>{if(e.button!==0)return;drag=true;ds={x:e.clientX,y:e.clientY};vs={x:vb.x,y:vb.y};e.preventDefault();});
window.addEventListener("mousemove",e=>{if(!drag)return;const r=svg.getBoundingClientRect();vb.x=Math.max(0,Math.min(960-vb.w,vs.x-(e.clientX-ds.x)/r.width*vb.w));vb.y=Math.max(0,Math.min(500-vb.h,vs.y-(e.clientY-ds.y)/r.height*vb.h));svg.setAttribute("viewBox",`${vb.x} ${vb.y} ${vb.w} ${vb.h}`);});
window.addEventListener("mouseup",()=>{drag=false;});
let pinchDist=null;
svg.addEventListener("touchstart",e=>{
  if(e.touches.length===2){pinchDist=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);vs={x:vb.x,y:vb.y,w:vb.w};}
  else if(e.touches.length===1){ds={x:e.touches[0].clientX,y:e.touches[0].clientY};vs={x:vb.x,y:vb.y};pinchDist=null;}
},{passive:true});
svg.addEventListener("touchmove",e=>{
  e.preventDefault();const r=svg.getBoundingClientRect();
  if(e.touches.length===2&&pinchDist!==null){
    const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);
    const sc=pinchDist/d;vb.w=Math.min(960,Math.max(80,vs.w*sc));vb.h=vb.w*(500/960);
    vb.x=Math.max(0,Math.min(960-vb.w,vs.x));vb.y=Math.max(0,Math.min(500-vb.h,vs.y));
    svg.setAttribute("viewBox",`${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
  } else if(e.touches.length===1&&pinchDist===null){
    vb.x=Math.max(0,Math.min(960-vb.w,vs.x-(e.touches[0].clientX-ds.x)/r.width*vb.w));
    vb.y=Math.max(0,Math.min(500-vb.h,vs.y-(e.touches[0].clientY-ds.y)/r.height*vb.h));
    svg.setAttribute("viewBox",`${vb.x} ${vb.y} ${vb.w} ${vb.h}`);
  }
},{passive:false});
svg.addEventListener("touchend",()=>{pinchDist=null;},{passive:true});

// ── Video ──
var ytPlayer=null,muted=true,ytReady=false;
function onYouTubeIframeAPIReady(){
  ytPlayer=new YT.Player('ytWrap',{
    videoId:'upLldio37qk',
    playerVars:{autoplay:1,mute:1,controls:0,loop:1,playlist:'upLldio37qk',modestbranding:1,rel:0,iv_load_policy:3,disablekb:1,fs:0,showinfo:0,enablejsapi:1,origin:location.origin||'*'},
    events:{
      onReady:function(e){e.target.mute();e.target.playVideo();},
      onStateChange:function(e){
        if(e.data===1&&!ytReady){
          ytReady=true;
          document.getElementById('ytWrap').classList.add('loaded');
          document.getElementById('playArea').classList.add('hidden');
          const th=document.getElementById('videoThumb');if(th)th.style.display='none';
          document.getElementById('muteBtn').classList.add('visible');
        }
      },
      onError:function(){}
    }
  });
}
setTimeout(function(){if(!ytReady)document.getElementById('muteBtn').style.display='none';},5000);
function toggleMute(){
  if(!ytPlayer)return;
  if(muted){ytPlayer.unMute();ytPlayer.setVolume(70);muted=false;document.getElementById('muteIcon').textContent='🔊';document.getElementById('muteLabel').textContent='Mute';}
  else{ytPlayer.mute();muted=true;document.getElementById('muteIcon').textContent='🔇';document.getElementById('muteLabel').textContent='Unmute';}
}

// ── Live participation polling (RiseFor10 form responses) ──
const COUNTRY_FLAGS_EXT={...FLAGS,Kenya:"🇰🇪",Nigeria:"🇳🇬",Uganda:"🇺🇬",Tanzania:"🇹🇿",Canada:"🇨🇦","United Kingdom":"🇬🇧",Philippines:"🇵🇭",Pakistan:"🇵🇰",Bangladesh:"🇧🇩",Mexico:"🇲🇽",Brazil:"🇧🇷",UAE:"🇦🇪",Singapore:"🇸🇬"};

async function pollParticipation(){
  try{
    const res=await fetch('/api/participation',{cache:'no-store'});
    if(!res.ok)throw new Error('fetch failed');
    const data=await res.json();

    liveCount=data.count||0;
    liveByCountry=data.byCountry||{};

    // Update top counter
    const counterEl=document.getElementById('liveCounterN');
    if(counterEl)counterEl.textContent=liveCount;
    const mstatLive=document.getElementById('mstatLive');
    if(mstatLive)mstatLive.textContent=liveCount;

    // Draw live pins for countries with new (non-historical) participation
    document.querySelectorAll('.live-pin-group').forEach(el=>el.remove());
    Object.keys(liveByCountry).forEach(country=>{
      // approximate coordinates: use first historical doctor in that country if known,
      // else skip pin (still counted, just not plotted)
      const ref=DOCTORS.find(d=>d.country===country);
      if(!ref)return;
      const x=((ref.lng+180)/360)*960;
      const y=((90-ref.lat)/180)*500;
      const g=document.createElementNS("http://www.w3.org/2000/svg","g");
      g.setAttribute("class","live-pin-group");
      g.style.cursor="pointer";
      const ring=document.createElementNS("http://www.w3.org/2000/svg","circle");
      ring.setAttribute("cx",x);ring.setAttribute("cy",y-14);ring.setAttribute("r","7");
      ring.setAttribute("class","live-pin-ring");
      const dot=document.createElementNS("http://www.w3.org/2000/svg","circle");
      dot.setAttribute("cx",x);dot.setAttribute("cy",y-14);dot.setAttribute("r","3.5");
      dot.setAttribute("class","live-pin");
      g.appendChild(ring);g.appendChild(dot);
      g.addEventListener("click",ev=>{ev.stopPropagation();openPanel(country);});
      svg.appendChild(g);
    });
  }catch(err){
    console.warn('Participation poll failed:',err);
  }
}
pollParticipation();
setInterval(pollParticipation,20000);
