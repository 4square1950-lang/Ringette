import {action,createMatch,roles,switchPlayer,tick} from './engine.js';
import {createRinkView} from './rink.js';
import {limits,rooms,stations,spawn,moveWalker,nearestStation,roomAt} from './campus.js';

const $=id=>document.getElementById(id);
const clubs=[
  {name:'Capital Aurora',short:'CAP',color:'#296397',trim:'#a9daf2'},
  {name:'Rideau Comets',short:'RID',color:'#b14655',trim:'#fbceaa'},
  {name:'Prairie Pulse',short:'PRA',color:'#558051',trim:'#e7db86'},
  {name:'Pacific Tide',short:'PAC',color:'#287b83',trim:'#b7e9db'},
  {name:'Harbour Lights',short:'HRB',color:'#825e9e',trim:'#ddc6ef'},
  {name:'Northern Lynx',short:'LYN',color:'#b97838',trim:'#f9ddaa'},
];
const venues=[
  ['Ottawa','Capital Ice',-75.7,45.4],['Gatineau','Riverfront Rink',-75.5,45.5],
  ['Montréal','Laurentian Forum',-73.6,45.5],['Québec City','Citadel Ice',-71.2,46.8],
  ['Halifax','Harbour Pavilion',-63.6,44.7],['Toronto','Lakeshore Arena',-79.4,43.7],
  ['Winnipeg','Prairie Centre',-97.1,49.9],['Calgary','Foothills Arena',-114.1,51.0],
  ['Edmonton','Northern Ice Centre',-113.5,53.5],['Vancouver','Pacific Ice',-123.1,49.3],
].map(([city,name,lon,lat],i)=>({city,name,lon,lat,club:(i%5)+1}));
const cosmetics=[
  {name:'Glacier',color:'#a4d5e8',price:45},{name:'Night Ice',color:'#443c73',price:55},
  {name:'Crimson',color:'#ac324c',price:65},{name:'Pine',color:'#43725c',price:80},
];
const lots=[
  {name:'Copper warmup jersey',color:'#a96544',price:90},
  {name:'Twilight jersey',color:'#496a9f',price:125},
];
const key='ringette-northern-circuit.v1';
const navyKit='#161f43';
const save={profile:{name:'Player',handle:'player',bio:'',height:170,number:9,color:navyKit,jerseyName:'',accent:'#c5deed',pattern:'solid',logo:'',pants:'#172039',skates:'#13171c',gloves:'#13171c',helmet:'#15191e',skin:'#c88e72',hair:'#2c201e'},wins:[],games:[],
  coins:120,xp:0,clan:null,cup:null,owned:[],currentVenue:0,period:180,mutedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches};
try{const previous=JSON.parse(localStorage.getItem(key)??'{}');const profile={...save.profile,...previous.profile};Object.assign(save,previous,{profile});}catch{}
function persist(){localStorage.setItem(key,JSON.stringify(save));}
const canvas=document.createElement('canvas');
canvas.setAttribute('aria-label','3D ringette rink');
let rink;
try{rink=createRinkView(canvas);}catch{$('homeIce').textContent='WebGL is required to play.';}
const viewTitles={map:'World Tour',venues:'Venue tours',travel:'Travel',explore:'Venue',tournaments:'Tournaments',stats:'Stats',standings:'Standings',
  clans:'Clans',studio:'Character Studio',players:'Players',shop:'Shop',auctions:'Auctions',profile:'Profile',settings:'Settings',
  rules:'Rules & controls',setup:'Match setup'};
let screen='home',match,selectedVenue=save.currentVenue,selectedHome=0,selectedAway=1,mode='single',identityDraft,spin=0,last=performance.now(),matchTime=0;
let studioZoom=1,studioRotate=false,studioCycle=false,studioPose='Ready',strokeStart=0;
let demo=createMatch({clubs:clubs.slice(0,2).map(({name})=>name),demo:true});
let currentEvent=-1,aim;
const keys=new Set();

function element(tag,text='',className=''){
  const node=document.createElement(tag);
  node.textContent=text;
  if(className)node.className=className;
  return node;
}
function button(label,callback,css=''){
  const node=element('button',label,css);node.type='button';node.onclick=callback;return node;
}
function choose(label,items,selected,onchange){
  const node=element('label',label),select=document.createElement('select');
  select.replaceChildren(...items.map(({value,text})=>new Option(text,value)));
  select.value=selected;select.onchange=()=>onchange(select.value);node.append(select);return node;
}
function field(label,tag,value,attrs={}){
  const node=element('label',label),input=document.createElement(tag);
  Object.entries(attrs).forEach(([name,value])=>input.setAttribute(name,value));
  input.value=value;node.append(input);return {node,input};
}
function card(...children){const node=element('article','','panel');node.append(...children);return node;}
function grid(...children){const node=element('div','','grid');node.append(...children);return node;}
function mount(viewport){if(rink)viewport.append(canvas);}
function gallery(identity,interactive=false){
  const pane=element('div','','viewport portrait'+(interactive?' studio':''));
  if(interactive){
    let drag;
    pane.onpointerdown=event=>{drag=event.clientX;pane.setPointerCapture(event.pointerId);};
    pane.onpointermove=event=>{if(drag!==undefined){spin+=(event.clientX-drag)*.012;drag=event.clientX;}};
    pane.onlostpointercapture=()=>{drag=undefined;};
  }
  identityDraft=identity;
  mount(pane);return pane;
}
function show(next){
  screen=next;keys.clear();
  $('panel').classList.toggle('campaign-page',next==='map'||next==='venues'||next==='explore'||next==='travel');
  document.querySelectorAll('#home details').forEach(item=>{item.open=false;});
  $('home').hidden=next!=='home';$('match').hidden=next!=='match';$('panel').hidden=['home','match'].includes(next);
  $('panelContent').replaceChildren();
  if(next==='home'){mount($('homeIce'));rink?.setTeams(clubs[0],clubs[1]);}
  else if(next==='match')mount($('matchIce'));
  else{
    $('panelTitle').textContent=viewTitles[next];
    const pages={map:()=>tour(false),venues:()=>tour(true),explore:exploreVenue,travel:travelVenue,tournaments,stats:()=>statistics(false),standings:()=>statistics(true),
      clans,studio,players,shop:()=>store(false),auctions:()=>store(true),profile,settings,rules,setup};
    $('panelContent').append(pages[next]());
  }
  window.scrollTo(0,0);
}
function table(headers,rows){
  const scroll=element('div','','table-scroll'), table=document.createElement('table');
  const header=table.createTHead().insertRow();
  headers.forEach(label=>{const cell=element('th',label);cell.scope='col';header.append(cell);});
  const body=table.createTBody();
  rows.forEach(row=>{const cells=body.insertRow();row.forEach(value=>{cells.insertCell().textContent=value;});});
  scroll.append(table);return scroll;
}
const cityWeather=new Map();
let mapView='globe',mapAngle={x:0,y:0},travelStart=0,travelActivity=false;
let campusUI;
const arrival={...spawn,yaw:-Math.PI/2,cameraYaw:-Math.PI/2,pitch:0,effort:0,stride:0};
const walk={...arrival,firstPerson:false};
function attachDrag(node,move,click){
  let active;
  node.onpointerdown=event=>{
    if(!event.isPrimary||event.button!==0||event.target.closest('button,a'))return;
    active={id:event.pointerId,x:event.clientX,y:event.clientY,distance:0};node.setPointerCapture(event.pointerId);
  };
  node.onpointermove=event=>{
    if(!active||active.id!==event.pointerId)return;
    const dx=event.clientX-active.x,dy=event.clientY-active.y;
    active.x=event.clientX;active.y=event.clientY;active.distance+=Math.abs(dx)+Math.abs(dy);move(dx,dy);
  };
  node.onpointerup=event=>{if(active?.id===event.pointerId&&active.distance<5)click?.();active=null;};
  node.onlostpointercapture=()=>{active=null;};
}
function streetMap(stop){
  const frame=element('div','','tour-visual street-map'),layer=element('div','','street-tiles');
  const legend=element('div','','map-attribution'),credit=element('a','© OpenStreetMap contributors');
  credit.href='https://www.openstreetmap.org/copyright';credit.target='_blank';credit.rel='noopener';
  const browserMap=element('a','Open map');browserMap.target='_blank';browserMap.rel='noopener';
  legend.append(browserMap,credit);
  const marker=element('span','◆','map-pin'),zoomControls=element('div','','map-zoom');
  let zoom=13,dx=0,dy=0,failed=false,tiles=new Map();
  const status=element('span','','map-fallback');
  function draw(){
    const w=frame.clientWidth,h=frame.clientHeight;if(!w||!h)return;
    const world=256*2**zoom,radians=stop.lat*Math.PI/180;
    const centerX=(stop.lon+180)/360*world,centerY=(1-Math.asinh(Math.tan(radians))/Math.PI)/2*world;
    const left=Math.floor(centerX+dx-w/2),top=Math.floor(centerY+dy-h/2);
    const visible=new Map();
    for(let y=Math.floor(top/256);y<=Math.floor((top+h)/256);y++)for(let x=Math.floor(left/256);x<=Math.floor((left+w)/256);x++){
      if(x<0||y<0||x>=2**zoom||y>=2**zoom)continue;
      const key=[zoom,x,y].join('/');
      let tile=tiles.get(key);
      if(!tile){
        tile=element('img');tile.alt='';tile.width=tile.height=256;tile.draggable=false;
        tile.referrerPolicy='strict-origin-when-cross-origin';tile.src='https://tile.openstreetmap.org/'+key+'.png';
        tile.onerror=()=>{tile.hidden=true;if(!failed){status.textContent='Some map tiles are unavailable.';failed=true;}};
        layer.append(tile);
      }
      tile.style.transform='translate('+(x*256-left)+'px,'+(y*256-top)+'px)';visible.set(key,tile);
    }
    for(const [key,tile] of tiles)if(!visible.has(key))tile.remove();
    tiles=visible;marker.style.left=(centerX-left)+'px';marker.style.top=(centerY-top)+'px';
    browserMap.href='https://www.openstreetmap.org/#map='+zoom+'/'+stop.lat+'/'+stop.lon;
  }
  const zoomStep=step=>{
    const next=Math.max(10,Math.min(17,zoom+step)),factor=2**(next-zoom);
    dx*=factor;dy*=factor;zoom=next;draw();
  };
  const plus=button('+',()=>zoomStep(1)),minus=button('−',()=>zoomStep(-1));
  plus.setAttribute('aria-label','Zoom in');minus.setAttribute('aria-label','Zoom out');zoomControls.append(plus,minus);
  attachDrag(layer,(x,y)=>{dx-=x;dy-=y;draw();});
  frame.append(layer,marker,legend,zoomControls,status);
  const observer=new ResizeObserver(()=>{if(frame.isConnected)draw();});
  observer.observe(frame);
  const stopObserving=new MutationObserver(()=>{if(!frame.isConnected){observer.disconnect();stopObserving.disconnect();}});
  stopObserving.observe($('panelContent'),{childList:true});
  return frame;
}
function highlightWeather(stop,tag){
  const key=stop.city;
  if(!cityWeather.has(key)){
    const url=new URL('https://api.open-meteo.com/v1/forecast');
    url.search=new URLSearchParams({latitude:stop.lat,longitude:stop.lon,current:'temperature_2m,weather_code'});
    const pending=fetch(url,{signal:AbortSignal.timeout(6500)}).then(res=>{
      if(!res.ok)throw new Error('Weather unavailable');return res.json();
    }).then(({current})=>{
      if(!Number.isFinite(current?.temperature_2m))throw new Error('Weather unavailable');
      const code=current.weather_code;
      const condition=code===0?'Clear':code<=3?'Cloudy':code<=48?'Fog':code>=95?'Storm':code>=71&&code<=77||code===85||code===86?'Snow':'Rain';
      return condition+' · '+Math.round(current.temperature_2m)+'°C';
    }).catch(()=>{cityWeather.delete(key);return 'Weather unavailable';});
    cityWeather.set(key,pending);
  }
  cityWeather.get(key).then(label=>{if(tag.isConnected)tag.textContent=label;});
}
function tour(preview){
  const wrap=element('div','','tour-grid'),mapCard=element('div','','tour-mapcard');
  const pick=i=>{
    selectedVenue=(i+venues.length)%venues.length;mapAngle={x:0,y:0};show(preview?'venues':'map');
  };
  const stop=venues[selectedVenue];
  rink?.setVenue(stop,clubs[stop.club].trim);
  let visual;
  if(preview||mapView==='globe'){
    visual=element('div','','viewport tour-visual');
    mount(visual);
    if(preview)rink?.setTeams(clubs[0],clubs[stop.club]);
    attachDrag(visual,(x,y)=>{mapAngle.x=Math.max(-1.05,Math.min(1.05,mapAngle.x-y*.009));mapAngle.y+=x*.009;});
    visual.append(button('Reset view',()=>{mapAngle={x:0,y:0};},'reset-map'));
  }else visual=streetMap(stop);
  const cityTag=element('div','','map-city');
  const weather=element('a','Loading weather…');weather.href='https://open-meteo.com/';weather.target='_blank';weather.rel='noopener';
  highlightWeather(stop,weather);cityTag.append(element('strong',stop.city),weather);visual.append(cityTag);
  const stops=element('div','','tour-stops');
  for(const [i,venue] of venues.entries()){
    const item=button(String(i+1),()=>{pick(i);$('panelContent').querySelectorAll('.tour-stops button')[i].focus();});
    item.title=venue.city;item.setAttribute('aria-label',i+1+'. '+venue.city);item.setAttribute('aria-pressed',String(i===selectedVenue));
    stops.append(item);
  }
  mapCard.append(visual,stops);
  const art=element('div','','venue-card-art');art.style.setProperty('--venue-accent',clubs[stop.club].trim);
  art.append(element('div','','rink-diagram'),element('span',clubs[stop.club].name));
  art.setAttribute('aria-hidden','true');
  const details=card(art,element('p',stop.city+' · Canada','venue-location'),element('h2',stop.name),
    element('p','Stop '+(selectedVenue+1)+' of '+venues.length),
    element('p',save.wins.includes(selectedVenue)?'Completed':save.currentVenue===selectedVenue?'Current stop':'Available for playtesting'));
  const actions=element('div','','tour-actions');
  const prev=button('‹',()=>pick(selectedVenue-1)),next=button('›',()=>pick(selectedVenue+1));
  prev.setAttribute('aria-label','Previous city');next.setAttribute('aria-label','Next city');
  actions.append(prev,button(save.currentVenue===selectedVenue?'Enter venue':'Travel',()=>{
    if(!rink)return;
    if(save.currentVenue===selectedVenue){openVenue();return;}
    travelStart=performance.now();show('travel');
  },'primary'),next);
  details.append(actions,button(preview?'Back to world map':'Venue tour',()=>show(preview?'map':'venues')));
  const views=element('div','','tour-views actions');
  if(!preview)for(const [value,label] of [['street','Street map'],['globe','Globe']]){
    const tab=button(label,()=>{mapView=value;show('map');});
    tab.setAttribute('aria-pressed',String(mapView===value));views.append(tab);
  }
  const outer=element('div','','tour-layout');wrap.append(mapCard,details);outer.append(views,wrap);
  return outer;
}
function openVenue(){
  save.currentVenue=selectedVenue;
  try{persist();}catch{}
  Object.assign(walk,arrival);
  show('explore');
}
function travelVenue(){
  const wrap=element('div','','travel-wrap'),view=element('div','','viewport visit-rink');mount(view);
  const stop=venues[selectedVenue];rink?.setVenue(stop,clubs[stop.club].trim);
  const info=element('div','','visit-hud');info.append(element('h2',stop.city),element('p',stop.name),button('Skip travel',openVenue,'primary'));
  wrap.append(view,info);return wrap;
}
function campusMap(){
  const canvas=element('canvas','','campus-minimap');canvas.width=360;canvas.height=310;
  canvas.setAttribute('aria-label','Map of the arena campus');
  const g=canvas.getContext('2d'),edge=18;
  const scale=Math.min((canvas.width-edge*2)/(limits.maxZ-limits.minZ),(canvas.height-edge*2)/(limits.maxX-limits.minX));
  const point=(x,z)=>[canvas.width/2-z*scale,canvas.height-edge-(limits.maxX-x)*scale];
  const draw=(walk,active)=>{
    g.fillStyle='#0b1724';g.fillRect(0,0,canvas.width,canvas.height);
    const [left,top]=point(limits.minX,limits.maxZ);
    g.fillStyle='#172b3b';g.strokeStyle='#526f83';g.lineWidth=2;
    const width=(limits.maxZ-limits.minZ)*scale,height=(limits.maxX-limits.minX)*scale;
    g.fillRect(left,top,width,height);g.strokeRect(left,top,width,height);
    const [pathX,pathY]=point(41,5.5);
    g.fillStyle='#395263';g.fillRect(pathX,pathY,11*scale,30*scale);
    g.font='800 16px system-ui';g.textAlign='center';g.textBaseline='middle';
    for(const room of rooms){
      const [x,y]=point(room.x,room.z),w=room.d*scale,h=room.w*scale;
      g.fillStyle=room.key==='ice'?'#36576b':'#2a4153';g.strokeStyle='#617e93';
      g.fillRect(x-w/2,y-h/2,w,h);g.strokeRect(x-w/2,y-h/2,w,h);
      g.fillStyle='#e0edf5';g.fillText(room.name,x,y,w-8);
    }
    for(const station of stations){
      const [x,y]=point(station.x,station.z);
      g.beginPath();g.arc(x,y,station===active?5:3,0,Math.PI*2);
      g.fillStyle=station===active?'#ffe7b4':'#e7ad67';g.fill();
    }
    const [x,y]=point(walk.x,walk.z);
    const yaw=walk.effort?walk.yaw:walk.cameraYaw;
    g.save();g.translate(x,y);g.rotate(Math.atan2(-Math.cos(yaw),-Math.sin(yaw)));
    g.beginPath();g.moveTo(0,-10);g.lineTo(-6,6);g.lineTo(0,3);g.lineTo(6,6);g.closePath();
    g.fillStyle='#8cebfb';g.fill();g.strokeStyle='#142332';g.stroke();g.restore();
  };
  return {canvas,draw};
}
const campusLines={
  desk:['Arena desk','Head through the lobby toward the gate to play the campaign match. The coach is across the plaza at practice ice.'],
  cafe:['Café counter','The next club is warming up. You can see their lineup at the rink gate inside the arena.'],
  gear:['Pro shop','Your saved jersey, colors, and chest logo carry onto the ice. You can change them in Character Studio.'],
  training:['Practice coach','Try a blue-line pass before the tournament. The receiver can cross the line and pick up the ring on the other side.'],
};
function visitStation(station){
  if(!station||$('campusTalk').open)return;
  if(station.key==='match'){
    travelActivity=true;mode='campaign';selectedAway=venues[selectedVenue].club;
    if(selectedHome===selectedAway)selectedHome=0;
    show('setup');return;
  }
  keys.clear();
  const [title,line]=campusLines[station.key];
  $('campusTalkTitle').textContent=title;$('campusTalkLine').textContent=line;
  $('campusTalkAction').hidden=station.key!=='training';
  $('campusTalk').showModal();
}
function exploreVenue(){
  const wrap=element('div','','travel-wrap'),view=element('div','','viewport visit-rink');mount(view);
  attachDrag(view,(x,y)=>{walk.cameraYaw-=x*.006;walk.pitch=Math.max(-.31,Math.min(.55,walk.pitch+y*.004));});
  const stop=venues[selectedVenue];rink?.setVenue(stop,clubs[stop.club].trim);
  const hud=element('div','','campus-hud');
  const location=element('div','','visit-hud campus-location');
  const zone=element('p','Plaza');location.append(element('h2',stop.name),zone);
  const actions=element('div','','campus-actions');
  const camera=button(walk.firstPerson?'Third person':'First person',()=>{
    walk.firstPerson=!walk.firstPerson;camera.textContent=walk.firstPerson?'Third person':'First person';
  });
  actions.append(button('World Tour',()=>show('map')),camera);
  const hint=element('p','WASD or arrows · Shift to run · Drag to look','campus-hint');
  const interaction=button('',()=>visitStation(nearestStation(walk)),'campus-interact primary');interaction.hidden=true;
  const map=campusMap(),mini=element('div','','campus-map-box');
  const toggle=button('Campus map',()=>{
    const expanded=map.canvas.hidden;map.canvas.hidden=!expanded;toggle.setAttribute('aria-expanded',String(expanded));
  });
  toggle.setAttribute('aria-expanded','true');mini.append(toggle,map.canvas);
  hud.append(location,actions,hint,interaction,mini);
  wrap.append(view,hud);
  campusUI={zone,interaction,map,lastZone:'',lastStation:undefined};
  refreshCampusHud();
  return wrap;
}


function refreshCampusHud(){
  const station=nearestStation(walk);
  const room=roomAt(walk);
  const zone=room?.name??'Plaza';
  if(campusUI.lastZone!==zone){campusUI.zone.textContent=zone;campusUI.lastZone=zone;}
  if(campusUI.lastStation!==station){
    campusUI.interaction.hidden=!station;
    campusUI.interaction.textContent=station?(station.key==='match'?'Enter rink · E':'Talk · '+station.name+' · E'):'';
    campusUI.lastStation=station;
  }
  if(!campusUI.map.canvas.hidden)campusUI.map.draw(walk,station);
}
function updateWalk(dt){
  if($('campusTalk').open)return;
  const horizontal=Number(keys.has('KeyD')||keys.has('ArrowRight'))-Number(keys.has('KeyA')||keys.has('ArrowLeft'));
  const forward=Number(keys.has('KeyW')||keys.has('ArrowUp'))-Number(keys.has('KeyS')||keys.has('ArrowDown'));
  const length=Math.hypot(horizontal,forward),running=keys.has('ShiftLeft')||keys.has('ShiftRight');
  walk.effort=0;
  if(length){
    const sin=Math.sin(walk.cameraYaw),cos=Math.cos(walk.cameraYaw),step=dt*(running?8.5:5.4)/length;
    const dx=(sin*forward-cos*horizontal)*step,dz=(cos*forward+sin*horizontal)*step;
    const priorX=walk.x,priorZ=walk.z;moveWalker(walk,dx,dz);
    const distance=Math.hypot(walk.x-priorX,walk.z-priorZ);
    if(distance){walk.yaw=Math.atan2(dx,dz);walk.effort=running?.84:.48;walk.stride=(walk.stride+distance*(running?1.38:1.92))%(Math.PI*2);}
  }
  refreshCampusHud();
}
function setup(){
  const form=element('form','','panel');
  const entries=clubs.map(({name},i)=>({value:i,text:name}));
  function refresh(){const pair=form.querySelectorAll('select');pair[1].querySelectorAll('option').forEach((option,i)=>{option.disabled=i===selectedHome;});pair[0].querySelectorAll('option').forEach((option,i)=>{option.disabled=i===selectedAway;});}
  form.append(element('h2',({campaign:venues[selectedVenue].name,local:'Local multiplayer',training:'Training',cup:'Northern Cup'})[mode]??'Single player'),
    choose('Home club',entries,selectedHome,value=>{selectedHome=Number(value);refresh();}),
    choose('Away club',entries,selectedAway,value=>{selectedAway=Number(value);refresh();}),
    element('p',mode==='local'?'Two players share one keyboard. Remaining skaters are controlled by the game.':'Take control of your team against the CPU.'));
  if(mode==='campaign'||mode==='cup')form.querySelectorAll('select')[1].disabled=true;
  if(mode==='cup')form.querySelectorAll('select')[0].disabled=true;
  refresh();
  const submit=element('button','Start match','primary');form.append(submit);
  form.onsubmit=event=>{event.preventDefault();launch();};
  submit.disabled=!rink;
  return form;
}
function launch(){
  if(!rink||selectedHome===selectedAway)return;
  match=createMatch({clubs:[clubs[selectedHome].name,clubs[selectedAway].name],local:mode==='local',seconds:save.period,practice:mode==='training'});
  currentEvent=-1;
  aim=null;matchTime=0;
  rink.setTeams(clubs[selectedHome],clubs[selectedAway],save.profile);
  $('controls').textContent=match.local
    ?'P1 WASD · E pass/check · Space shoot · Q switch  |  P2 arrows · O pass/check · Enter shoot · U switch'
    :'WASD or arrows move · Mouse aim · E pass/check · Space or click shoot · Q switch · Esc pause';
  show('match');paintScore();
}
function standings(){
  const rows=clubs.map(club=>({club,g:0,w:0,l:0,d:0,gf:0,ga:0}));
  for(const game of save.games){
    for(const side of [0,1]){
      const row=rows[game.teams[side]], a=game.score[side], b=game.score[1-side];
      row.g++;row.w+=Number(a>b);row.l+=Number(a<b);row.d+=Number(a===b);row.gf+=a;row.ga+=b;
    }
  }
  return rows.sort((a,b)=>(b.w*2+b.d)-(a.w*2+a.d)||b.gf-b.ga-a.gf+a.ga||a.club.name.localeCompare(b.club.name));
}
function statistics(team){
  if(team)return card(table(['Club','GP','W','L','D','GF','GA','PTS'],standings().map(({club,g,w,l,d,gf,ga})=>[club.name,g,w,l,d,gf,ga,w*2+d])));
  const totals=new Map();
  for(const game of save.games){
    game.players.forEach(({id,role,side,stats})=>{
      const idKey=game.teams[side]+'/'+role;
      const row=totals.get(idKey)??{label:clubs[game.teams[side]].name+' · '+roles[role],matches:0,goals:0,assists:0,shots:0,saves:0,passes:0,steals:0};
      row.matches++;
      for(const field of ['goals','assists','shots','saves','passes','steals'])row[field]+=stats[field];
      totals.set(idKey,row);
    });
  }
  if(!totals.size)return card(element('p','Finish a match to record skater and goalie stats.'));
  return card(table(['Player','GP','G','A','Shots','Saves','Passes','Steals'],
    [...totals.values()].sort((a,b)=>b.goals-a.goals||b.assists-a.assists||b.saves-a.saves)
      .map(({label,matches,goals,assists,shots,saves,passes,steals})=>[label,matches,goals,assists,shots,saves,passes,steals])));
}
function tournaments(){
  const cup=save.cup,status=cup?.stage;
  const name=index=>clubs[index].name;
  const bracket=cup?grid(card(element('h3','Semifinal 1'),element('p',name(cup.home)+' vs. '+name(cup.opponent)),element('small',cup.semi??'Scheduled')),
    card(element('h3','Semifinal 2'),element('p',name(cup.aiPair[0])+' vs. '+name(cup.aiPair[1])),element('small',cup.aiResult??'Scheduled')),
    card(element('h3','Final'),element('p',cup.finalist===undefined?'Awaiting semifinal results':name(cup.home)+' vs. '+name(cup.finalist)),element('small',cup.final??'Scheduled'))):null;
  const actionLabel=status==='semi'?'Play semifinal':status==='final'?'Play final':'Start a cup';
  const pane=card(element('h2','Northern Cup'),element('p','Local four-club knockout bracket.'));
  if(bracket)pane.append(bracket);
  if(status==='won')pane.append(element('p','Northern Cup champion'));
  if(status==='out')pane.append(element('p','Eliminated'));
  pane.append(button(actionLabel,()=>{
    if(status!=='semi'&&status!=='final'){
      const possible=clubs.map((_,i)=>i).filter(i=>i!==selectedHome);
      save.cup={stage:'semi',home:selectedHome,opponent:possible[0],aiPair:possible.slice(1,3)};persist();
    }
    mode='cup';selectedHome=save.cup.home;selectedAway=save.cup.stage==='semi'?save.cup.opponent:save.cup.finalist;show('setup');
  },'primary'));
  return pane;
}
function finish(){
  if(mode!=='training'){
    save.games.push({score:match.scores,teams:[selectedHome,selectedAway],players:match.athletes.map(({id,role,side,stats})=>({id,role,side,stats}))});
    save.games=save.games.slice(-300);
    const won=match.scores[0]>match.scores[1];
    save.xp+=won?180:85;save.coins+=won?35:15;
    if(mode==='campaign'&&won&&!save.wins.includes(selectedVenue)){save.wins.push(selectedVenue);save.xp+=220;}
    if(mode==='cup'){
      const cup=save.cup;
      if(cup.stage==='semi'){
        cup.semi=match.scores.join('–');
        const ai=createMatch({clubs:cup.aiPair.map(i=>clubs[i].name),seconds:65,difficulty:1.3});
        ai.controls=[];
        for(let steps=0;steps<5400&&!ai.ended;steps++)tick(ai,[],1/30);
        cup.aiResult=ai.scores.join('–');
        cup.finalist=cup.aiPair[Number(ai.scores[1]>ai.scores[0])];
        cup.stage=won?'final':'out';
      }else{cup.final=match.scores.join('–');cup.stage=won?'won':'out';}
    }
    persist();
  }
  const winner=match.scores[0]===match.scores[1]?'Draw':match.clubs[Number(match.scores[1]>match.scores[0])]+' wins';
  $('resultTitle').textContent=winner;$('resultLine').textContent=match.scores.join(' – ');
  $('result').showModal();
}
function profile(){
  const form=element('form','','panel'),name=field('Display name','input',save.profile.name,{required:'',maxlength:'64'}),
    handle=field('Username','input',save.profile.handle,{required:'',maxlength:'64'}),bio=field('Bio','textarea',save.profile.bio,{maxlength:'1000',rows:'3'});
  const output=element('output');
  const level=Math.floor((Math.sqrt(1+8*save.xp/1000)-1)/2);
  const bar=document.createElement('progress');bar.className='stat-bar';bar.max=(level+1)*1000;bar.value=save.xp-level*(level+1)*500;
  form.append(name.node,handle.node,bio.node,element('button','Save profile','primary'),output,element('h3','Level '+level),bar,
    element('p',bar.value+' / '+bar.max+' XP · '+save.coins+' coins'),button('Character Studio',()=>show('studio')));
  form.onsubmit=event=>{
    event.preventDefault();
    if(!name.input.value.trim()||!handle.input.value.trim()){output.textContent='Enter a display name and username.';return;}
    Object.assign(save.profile,{name:name.input.value.trim(),handle:handle.input.value.trim(),bio:bio.input.value.trim()});
    persist();output.textContent='Profile saved';
  };
  return grid(form,gallery({...save.profile}));
}
function studio(){
  spin=0;studioZoom=1;studioRotate=false;studioCycle=false;studioPose='Ready';strokeStart=0;
  const form=element('form','','panel kit-editor'),stage=element('div','','studio-stage');
  const output=element('output');output.setAttribute('aria-live','polite');
  const pane=gallery({...save.profile},true);
  const view=element('div','','actions studio-controls');
  const toggle=(label,read,write)=>{
    const control=button(label,()=>{write(!read());control.setAttribute('aria-pressed',String(read()));});
    control.setAttribute('aria-pressed',String(read()));return control;
  };
  view.append(button('Front',()=>{spin=0;}),button('Back',()=>{spin=Math.PI;}),
    button('−',()=>{studioZoom=Math.max(.8,studioZoom-.12);}),
    button('+',()=>{studioZoom=Math.min(1.65,studioZoom+.12);}),
    toggle('Auto rotate',()=>studioRotate,v=>studioRotate=v));
  const motionControls=element('div','','actions studio-controls');
  motionControls.append(choose('Pose',['Ready','Skate','Look around'].map(value=>({value,text:value})),studioPose,value=>studioPose=value),
    toggle('Auto pose',()=>studioCycle,v=>{studioCycle=v;strokeStart=performance.now();}));
  stage.append(pane,view,motionControls);
  const sections=element('div','','kit-tabs'),groups=element('div','','kit-sections');
  const addTab=(label,...items)=>{
    const group=element('div','','kit-group');group.append(...items);group.hidden=groups.children.length>0;
    const control=button(label,()=>{
      for(const pane of groups.children)pane.hidden=pane!==group;
      for(const tab of sections.children)tab.setAttribute('aria-pressed',String(tab===control));
    });
    control.setAttribute('aria-pressed',String(!group.hidden));sections.append(control);groups.append(group);
  };
  const update=(key,value)=>{identityDraft={...identityDraft,[key]:value};output.textContent='';};
  const collect=(label,key,type,options={})=>{
    const {node,input}=field(label,'input',identityDraft[key],{type,...options});
    input.addEventListener('input',()=>{
      if(type==='number'&&(!input.value||!input.validity.valid))return;
      update(key,type==='number'?Number(input.value):input.value);
    });
    return {node,input};
  };
  const color=collect('Primary color','color','color'),accent=collect('Accent color','accent','color');
  const name=collect('Jersey name','jerseyName','text',{maxlength:14});
  name.input.onfocus=()=>{spin=Math.PI;};
  const number=collect('Jersey number','number','number',{min:0,max:99,required:''});
  const patterns=['solid','split','striped','hoops','checker','geometric','drip'];
  const pattern=choose('Pattern',patterns.map(value=>({value,text:value[0].toUpperCase()+value.slice(1)})),identityDraft.pattern,value=>update('pattern',value));
  const logo=element('label','Chest logo'),upload=element('input');upload.type='file';upload.accept='image/png,image/jpeg,image/webp';logo.append(upload);
  let logoVersion=0;
  upload.onchange=async ()=>{
    const file=upload.files[0],version=++logoVersion;if(!file)return;
    if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>5*1024*1024){output.textContent='Choose a PNG, JPG, or WebP under 5 MB.';return;}
    try{
      const bitmap=await createImageBitmap(file);
      try{
        if(version!==logoVersion||screen!=='studio')return;
        const image=document.createElement('canvas');image.width=image.height=192;
        const ratio=184/Math.max(bitmap.width,bitmap.height),w=bitmap.width*ratio,h=bitmap.height*ratio;
        image.getContext('2d').drawImage(bitmap,(192-w)/2,(192-h)/2,w,h);
        update('logo',image.toDataURL('image/png'));spin=0;
      }finally{bitmap.close();}
    }catch{output.textContent='That image could not be opened.';}
  };
  const remove=button('Remove logo',()=>{logoVersion++;upload.value='';update('logo','');});
  const navy=button('Navy kit',()=>{
    color.input.value=navyKit;accent.input.value=save.profile.accent;pattern.querySelector('select').value='solid';
    identityDraft={...identityDraft,color:navyKit,pattern:'solid'};spin=0;
  });
  addTab('Jersey',pattern,grid(color.node,accent.node),grid(name.node,number.node),logo,grid(remove,navy));
  addTab('Equipment',grid(collect('Pants color','pants','color').node,collect('Skate color','skates','color').node,
    collect('Glove color','gloves','color').node,collect('Helmet color','helmet','color').node));
  addTab('Appearance',grid(collect('Skin tone','skin','color').node,collect('Hair color','hair','color').node,
    collect('Height (cm)','height','number',{min:150,max:195,required:''}).node));
  form.append(sections,groups,element('button','Save character','primary'),output);
  form.onsubmit=event=>{
    event.preventDefault();
    const previous=save.profile;
    save.profile={...identityDraft,jerseyName:identityDraft.jerseyName.trim()};
    try{persist();output.textContent='Character saved';}
    catch{save.profile=previous;output.textContent='Character could not be saved. Check browser storage.';}
  };
  return grid(stage,form);
}
function players(){
  spin=0;
  const list=element('div','','stack');
  const roster=clubs.map((club,i)=>({value:i,text:club.name}));
  let current=0, role=0;
  const refresh=()=>{
    for(const [index,control] of [...list.children].entries())control.setAttribute('aria-pressed',String(index===role));
    identityDraft={color:clubs[current].color,number:role===5?1:9+role,height:170+(role===5?8:0),variant:role};
  };
  const pane=gallery({...save.profile},true);
  roles.forEach((title,i)=>list.append(button(title,()=>{role=i;refresh();})));
  const club=choose('Club',roster,current,value=>{current=Number(value);refresh();});
  refresh();
  return grid(card(club,list),pane);
}
function clans(){
  return grid(...clubs.slice(0,3).map((club,i)=>{
    const swatch=element('span','','clan-color');swatch.style.background=club.color;
    return card(swatch,element('h3',club.name),element('p',['Community','Challenger','Competitive'][i]),
      button(save.clan===i?'Leave clan':'Join clan',()=>{save.clan=save.clan===i?null:i;persist();show('clans');}));
  }));
}
function store(auction){
  const offerList=auction?lots:cosmetics,out=element('output');
  out.textContent=auction?'Offline practice listings · '+save.coins+' coins':save.coins+' coins';
  const offers=offerList.map(item=>{
    const swatch=element('span','','swatch');swatch.style.background=item.color;
    const owned=save.owned.includes(item.name);
    const acquire=button(owned?'Equip':auction?'Buy listing':'Buy jersey',()=>{
      if(!owned&&save.coins<item.price){out.textContent='You need '+(item.price-save.coins)+' more coins.';return;}
      if(!owned){save.coins-=item.price;save.owned.push(item.name);}
      save.profile.color=item.color;persist();show(auction?'auctions':'shop');
    });
    return card(swatch,element('h3',item.name),element('p',owned?'Owned':item.price+' coins'),acquire);
  });
  const wrapper=document.createElement('div');wrapper.append(out,grid(...offers));return wrapper;
}
function settings(){
  return card(choose('Quick match length',[{value:120,text:'2 minutes'},{value:180,text:'3 minutes'},{value:300,text:'5 minutes'}],save.period,
    value=>{save.period=Number(value);persist();}),button(save.mutedMotion?'Play home background':'Pause home background',()=>{toggleMotion();show('settings');}));
}
function rules(){
  return card(element('h2','On the ice'),
    element('p','Each club has five skaters and one goalie. Pass the ring across each blue line. The goalie has the crease, and no more than three skaters per club can cross each free-play line.'),
    element('p','Shoot before the 30-second clock expires. Use a stick check to take the ring. Players cannot body-check.'),
    element('h2','Controls'),element('p','WASD or arrows to skate. Aim with the mouse. E passes or stick-checks. Space or click shoots. Q switches your skater. Esc pauses.'),
    button('Start training',()=>{mode='training';show('setup');},'primary'));
}
function paintScore(){
  $('score').textContent=clubs[selectedHome].short+' '+match.scores[0]+' – '+match.scores[1]+' '+clubs[selectedAway].short;
  const left=Math.ceil(match.time);
  $('time').textContent=match.practice?'Training':Math.floor(left/60)+':'+String(left%60).padStart(2,'0');
  $('shotClock').textContent='Shot clock '+Math.ceil(match.shotClock);
  if(currentEvent!==match.event){$('notice').textContent=match.notice;currentEvent=match.event;}
}
function toggleMotion(){
  save.mutedMotion=!save.mutedMotion;persist();$('motion').textContent=save.mutedMotion?'Play background':'Pause background';
}
$('motion').textContent=save.mutedMotion?'Play background':'Pause background';
$('motion').onclick=toggleMotion;
document.querySelectorAll('[data-open]').forEach(node=>{node.onclick=()=>show(node.dataset.open);});
$('resumeCampaign').onclick=()=>{if(!rink)return;selectedVenue=save.currentVenue;openVenue();};
$('panelBack').onclick=()=>show(screen==='setup'&&travelActivity?'explore':screen==='travel'||screen==='explore'?'map':'home');
document.querySelectorAll('[data-play]').forEach(node=>{node.onclick=()=>{travelActivity=false;mode=node.dataset.play;show('setup');};});
$('campusTalkClose').onclick=()=>$('campusTalk').close();
$('campusTalkAction').onclick=()=>{
  $('campusTalk').close();travelActivity=true;mode='training';selectedAway=venues[selectedVenue].club;
  if(selectedHome===selectedAway)selectedHome=0;
  show('setup');
};
$('pause').onclick=()=>{keys.clear();$('break').showModal();};
$('resume').onclick=()=>$('break').close();
const leave=()=>{const onCampus=travelActivity;travelActivity=false;show(onCampus?'explore':mode==='campaign'?'map':mode==='cup'?'tournaments':'home');};
$('quit').onclick=()=>{$('break').close();leave();};
$('resultNext').onclick=()=>{$('result').close();leave();};
$('result').oncancel=event=>event.preventDefault();
function playerAction(seat,kind){
  const id=match.controls[seat];
  if(kind==='pass'&&match.owner!==id)kind='check';
  action(match,id,kind,seat===0?aim:undefined);
}
window.addEventListener('keydown',event=>{
  if(screen==='map'||screen==='venues'){
    if(event.code==='Escape')show('home');
    if(event.code==='ArrowLeft'||event.code==='ArrowRight'){
      event.preventDefault();$('panelContent').querySelector('[aria-label="'+(event.code==='ArrowLeft'?'Previous':'Next')+' city"]').click();
    }
    return;
  }
  if(screen==='explore'){
    if($('campusTalk').open)return;
    if(event.code==='Escape'){show('map');return;}
    if(/^Arrow/.test(event.code))event.preventDefault();
    keys.add(event.code);
    if(event.code==='KeyE'&&!event.repeat)visitStation(nearestStation(walk));
    return;
  }
  if(screen!=='match'||document.querySelector('dialog[open]')||event.target instanceof HTMLButtonElement&&event.code==='Space')return;
  if(/^Arrow|Space/.test(event.code))event.preventDefault();
  keys.add(event.code);
  if(event.repeat)return;
  if(event.code==='Escape')$('pause').click();
  if(event.code==='KeyQ')switchPlayer(match,0);
  if(event.code==='KeyU'&&match.local)switchPlayer(match,1);
  if(event.code==='KeyE')playerAction(0,'pass');
  if(event.code==='KeyO'&&match.local)playerAction(1,'pass');
  if(event.code==='Space')playerAction(0,'shot');
  if(event.code==='Enter'&&match.local)playerAction(1,'shot');
});
window.addEventListener('keyup',event=>keys.delete(event.code));
window.addEventListener('blur',()=>keys.clear());
canvas.onpointermove=event=>{if(screen==='match')aim=rink.aim(event.clientX,event.clientY);};
canvas.onclick=()=>{if(screen==='match')playerAction(0,'shot');};
canvas.oncontextmenu=event=>{if(screen==='match'){event.preventDefault();playerAction(0,'pass');}};
const motion=(left,right,up,down)=>({x:Number(keys.has(right))-Number(keys.has(left)),z:Number(keys.has(down))-Number(keys.has(up))});
function frame(time){
  requestAnimationFrame(frame);const dt=Math.min(.04,(time-last)/1000);last=time;
  if(!rink)return;
  if(screen==='home'){
    if(!save.mutedMotion)tick(demo,[],dt);
    rink.draw(demo,'home',save.mutedMotion?0:time/1000,save.profile);
  }else if(screen==='match'){
    if(!$('break').open&&!match.ended){
      const p1=motion('KeyA','KeyD','KeyW','KeyS'),arrows=motion('ArrowLeft','ArrowRight','ArrowUp','ArrowDown');
      if(!match.local){p1.x+=arrows.x;p1.z+=arrows.z;}
      tick(match,[p1,arrows],dt);matchTime+=dt;paintScore();
      if(match.ended)finish();
    }
    rink.draw(match,'match',matchTime,save.profile);
  }else if(screen==='venues')rink.draw(demo,'venues',time/1000,save.profile,mapAngle.y);
  else if(screen==='map'&&mapView==='globe')rink.draw({venues,index:selectedVenue,angle:mapAngle},'globe',time/1000,save.profile);
  else if(screen==='travel'){
    const elapsed=(time-travelStart)/1550;
    if(elapsed>=1)openVenue();else rink.draw(null,'travel',Math.max(0,elapsed),save.profile);
  }else if(screen==='explore'){
    updateWalk(dt);rink.draw(walk,'explore',time/1000,save.profile);
  }else if(['profile','studio','players'].includes(screen)){
    if(screen==='studio'&&studioRotate)spin=(spin+dt*.62)%(Math.PI*2);
    const pose=studioCycle?['Ready','Skate','Look around'][Math.floor(Math.max(0,time-strokeStart)/3400)%3]:studioPose;
    rink.draw(null,screen,time/1000,identityDraft,screen==='profile'?0:spin,screen==='studio'?studioZoom:1,screen==='studio'?pose:'Ready');
  }
}
show('home');
requestAnimationFrame(frame);



