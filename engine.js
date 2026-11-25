export const RINK={halfLength:29,halfWidth:13,goal:26,blue:9,free:18,crease:2.25,mouth:1.6};
export const roles=['Centre','Left forward','Right forward','Left defence','Right defence','Goalie'];
const limit=(value,lo,hi)=>Math.min(hi,Math.max(lo,value));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const zone=x=>x < -RINK.blue ? -1 : x > RINK.blue ? 1 : 0;
const teamDir=side=>side===0 ? 1 : -1;
const lanes=[0,-5.5,5.5,-7.4,7.4,0];
const shape=[3.8,8.5,6.8,-5.4,-9,0];
const stat=()=>({goals:0,assists:0,shots:0,saves:0,passes:0,steals:0});
const ownGoal=p=>-teamDir(p.side)*RINK.goal;
export function createMatch({clubs,local=false,seconds=180,practice=false,demo=false,difficulty=1}){
  const athletes=Array.from({length:12},(_,id)=>{
    const side=Number(id>=6),role=id%6;
    return {id,side,role,number:role===5?1:9+role,stats:stat(),x:0,z:0,vx:0,vz:0,yaw:0,effort:0};
  });
  const game={clubs,athletes,local,practice,demo,difficulty,time:seconds,shotClock:30,scores:[0,0],owner:null,
    controls:demo?[]:local?[0,6]:[0], ring:{x:0,z:0,flight:null},hold:0,stoppage:0,restart:null,passer:null,touchDelay:0,
    notice:'',event:0,elapsed:0,ended:false};
  restart(game,0,'Opening free pass',0,0);
  return game;
}
function emit(game,notice){game.notice=notice;game.event++;}
function take(game,player){
  const old=game.ring.flight;
  if(game.possession!==player.side){
    game.shotClock=30;game.passer=null;
  }
  game.possession=player.side;
  game.owner=player.id;game.ring.flight=null;game.hold=0;game.touchDelay=.32;
  if(old?.kind==='pass'&&old.side===player.side&&old.from!==player.id){
    game.athletes[old.from].stats.passes++;
    game.passer={from:old.from,to:player.id};
    const seat=game.controls.indexOf(old.from);
    if(seat!==-1&&player.role!==5)game.controls[seat]=player.id;
  }
}
function restart(game,side,notice,x=0,z=0){
  const atCentre = x===0 && z===0;
  if(atCentre)for(const player of game.athletes){
    const dir=teamDir(player.side);
    player.x=player.role===5?ownGoal(player)+dir*.68:-dir*[1,5,6,14,17][player.role];
    player.z=lanes[player.role];player.vx=0;player.vz=0;player.effort=0;
  }
  game.ring.flight=null;game.owner=null;
  game.ring.x=x;game.ring.z=z;game.stoppage=1.05;game.passer=null;
  game.restart={side,x,z};emit(game,notice);
}
function resume(game){
  const {side,x,z}=game.restart;
  game.restart=null;
  const skaters=game.athletes.filter(p=>p.side===side&&p.role!==5);
  const carrier=skaters.reduce((a,b)=>dist(a,{x,z})<=dist(b,{x,z})?a:b);
  carrier.x=limit(x,-23.2,23.2);carrier.z=limit(z,-10.6,10.6);
  take(game,carrier);
  game.shotClock=30;
  const seat=game.controls.findIndex(id=>game.athletes[id].side===side);
  if(seat!==-1)game.controls[seat]=carrier.id;
}
export function switchPlayer(game,seat){
  const id=game.controls[seat];if(id===undefined||game.ended||game.stoppage>0)return;
  const side=game.athletes[id].side;
  const owner=game.athletes[game.owner];
  const choices=game.athletes.filter(p=>p.side===side&&p.role!==5&&p.id!==id).sort((a,b)=>dist(a,game.ring)-dist(b,game.ring));
  game.controls[seat]=owner?.side===side&&owner.role!==5&&owner.id!==id?owner.id:choices[0].id;
}
function choosePass(game,player,aim){
  const dir=teamDir(player.side);
  const candidates=game.athletes.filter(p=>p.id!==player.id&&p.side===player.side&&p.role!==5&&dist(p,player)>1.35&&Math.abs(zone(p.x)-zone(player.x))<2);
  const score=(other)=>{
    const separation=dist(other,player), advance=(other.x-player.x)*dir;
    if(aim)return dist(aim,other)+separation*.14;
    const pressure=game.athletes.filter(p=>p.side!==player.side).reduce((min,p)=>Math.min(min,dist(p,other)),8);
    return separation*.11-advance*.45-pressure*.34;
  };
  return candidates.sort((a,b)=>score(a)-score(b))[0];
}
function putInMotion(game,player,target,kind){
  const length=Math.max(.1,dist(player,target));
  const speed=kind==='shot'?27:limit(length*2.2+4,8.4,24);
  const dx=(target.x-player.x)/length,dz=(target.z-player.z)/length;
  game.ring.x=player.x+dx*.54;game.ring.z=player.z+dz*.54;
  game.ring.flight={kind,side:player.side,from:player.id,target:target.id,vx:dx*speed,vz:dz*speed,age:0,line:zone(game.ring.x),lines:0};
  game.owner=null;
  if(kind==='shot')player.stats.shots++;
}
export function action(game,id,kind,aim){
  if (game.ended||game.stoppage||id===undefined)return false;
  const player=game.athletes[id];
  const owner=game.athletes[game.owner];
  if(kind==='check'){
    if(!owner||owner.role===5||owner.side===player.side||game.touchDelay>0||dist(player,owner)>1.08)return false;
    player.stats.steals++;take(game,player);return true;
  }
  if(owner!==player||game.touchDelay>.12)return false;
  if(kind==='pass'){
    const target=choosePass(game,player,aim);
    if(!target)return false;
    putInMotion(game,player,target,kind);
    return true;
  }
  if(kind==='shot'){
    const dir=teamDir(player.side);
    putInMotion(game,player,{x:(RINK.goal+1)*dir,z:limit(aim?.z??-Math.sign(player.z)*1.15,-RINK.mouth*1.65,RINK.mouth*1.65)},kind);
    return true;
  }
  return false;
}
function move(game,p,dx,dz,dt){
  const length=Math.hypot(dx,dz);
  const speed=game.owner===p.id?6.7:8.65;
  const ease=1-Math.exp(-dt*9);
  p.vx+=(dx/Math.max(1,length)*speed-p.vx)*ease;
  p.vz+=(dz/Math.max(1,length)*speed-p.vz)*ease;
  const next={x:limit(p.x+p.vx*dt,-RINK.halfLength+.52,RINK.halfLength-.52),z:limit(p.z+p.vz*dt,-RINK.halfWidth+.45,RINK.halfWidth-.45)};
  const end=Math.sign(next.x)*RINK.goal;
  if(Math.hypot(next.x-end,next.z)<RINK.crease+.09){
    const scale=(RINK.crease+.09)/Math.max(.001,Math.hypot(next.x-end,next.z));
    next.x=end+(next.x-end)*scale;next.z*=scale;
  }
  if(Math.abs(next.x)>RINK.free && Math.abs(p.x)<=RINK.free &&
     game.athletes.filter(other=>other!==p&&other.side===p.side&&other.role!==5&&other.x*Math.sign(next.x)>RINK.free).length>=3){
    next.x=Math.sign(next.x)*(RINK.free-.015);
  }
  for(const other of game.athletes){
    if(other===p||dist(next,other)>.69||dist(p,other)<dist(next,other))continue;
    next.x=p.x;next.z=p.z;
    break;
  }
  if(game.owner===p.id&&zone(next.x)!==zone(p.x)){
    restart(game,1-p.side,'Blue-line carry · Opponent free pass',p.x,p.z);return;
  }
  p.effort=Math.hypot(p.vx,p.vz)/speed;
  if(p.effort>.06)p.yaw=Math.atan2(p.vx,p.vz);
  p.x=next.x;p.z=next.z;
}
function bot(game,p,dt){
  const dir=teamDir(p.side);
  const ring=game.ring, owner=game.athletes[game.owner];
  if(p.role===5){
    const incoming=ring.flight?.kind==='shot'&&ring.flight.side!==p.side&&ring.flight.age>.25&&Math.abs(ring.x-p.x)<4.6;
    const toward=incoming&&Math.abs(ring.flight.vx)>.3 ?
      ring.z+ring.flight.vz*(p.x-ring.x)/ring.flight.vx : ring.z*.15;
    p.z+=limit(limit(toward,-1.55,1.55)-p.z,-dt*3.4,dt*3.4);
    p.yaw=dir*Math.PI/2;
    if(owner===p&&game.hold>.48)action(game,p.id,'pass');
    return;
  }
  if(owner===p){
    const distanceToGoal=RINK.goal-p.x*dir;
    const nextBlue = p.x*dir < -RINK.blue ? -RINK.blue : p.x*dir < RINK.blue ? RINK.blue : null;
    if(distanceToGoal<10.2&&game.hold>.42){
      const keeper=game.athletes[p.side===0?11:5];
      const farPost=keeper.z>.05?-1:keeper.z<-.05?1:Math.sign(Math.sin(game.elapsed*2.31+p.id));
      if(action(game,p.id,'shot',{z:farPost*1.34}))return;
    }
    const target=choosePass(game,p);
    const pressured=game.athletes.some(other=>other.side!==p.side&&dist(p,other)<1.65);
    if(pressured&&game.hold>.38&&target&&action(game,p.id,'pass'))return;
    if(nextBlue!==null&&nextBlue-p.x*dir<2.2){
      if(target&&zone(target.x)!==zone(p.x)&&action(game,p.id,'pass'))return;
    }
    const x=nextBlue===null?dir*21.5:dir*(nextBlue-.48);
    move(game,p,limit((x-p.x)*1.5,-1,1),limit((lanes[p.role]*.55-p.z)*.40,-1,1),dt);
    return;
  }
  const others=game.athletes.filter(other=>other!==p&&other.side===p.side&&other.role!==5&&!game.controls.includes(other.id));
  const chase=(!owner||owner.side!==p.side) && others.every(other=>dist(p,ring)<=dist(other,ring));
  const offset = shape[p.role] * dir;
  const x=chase?ring.x:limit(ring.x+offset,-24,24);
  const z=chase?ring.z:lanes[p.role] + ring.z*.20;
  if(chase&&!game.demo&&game.difficulty<1.15&&game.hold<.5){
    move(game,p,limit((x-p.x)*.6,-.65,.65),limit((z-p.z)*.6,-.65,.65),dt);
  }else{
    move(game,p,limit(x-p.x,-1,1),limit(z-p.z,-1,1),dt);
    if(chase&&game.hold>.82)action(game,p.id,'check');
  }
}
function stepRing(game,dt){
  const ring=game.ring, owner=game.athletes[game.owner];
  if(owner){
    ring.x=owner.x+Math.sin(owner.yaw)*.65;ring.z=owner.z+Math.cos(owner.yaw)*.65;
    return;
  }
  const flight=ring.flight;
  if(flight){
    const oldX=ring.x,oldZ=ring.z;
    ring.x += flight.vx*dt;ring.z += flight.vz*dt;flight.age+=dt;
    const newZone=zone(ring.x);
    if(newZone!==flight.line){
      flight.line=newZone;
      if(++flight.lines>1&&flight.kind==='pass'){
        restart(game,1-flight.side,'Two-line pass · Opponent free pass',ring.x,ring.z);return;
      }
    }
    const goalie=game.athletes[flight.side===0?11:5];
    const dir=teamDir(flight.side), cross=(plane)=>oldX*dir<plane && ring.x*dir>=plane;
    if(flight.kind==='shot'&&cross(Math.abs(goalie.x))&&Math.abs(ring.z-goalie.z)<.58){
      goalie.stats.saves++;take(game,goalie);emit(game,'Goalie save');return;
    }
    if(flight.kind==='shot'&&cross(RINK.goal+.19)){
      const at=(dir*(RINK.goal+.19)-oldX)/(ring.x-oldX);
      if(Math.abs(oldZ+(ring.z-oldZ)*at)<RINK.mouth-.19){
        game.scores[flight.side]++;
        const scorer=game.athletes[flight.from];scorer.stats.goals++;
        if(game.passer?.to===scorer.id)game.athletes[game.passer.from].stats.assists++;
        restart(game,1-flight.side,game.clubs[flight.side]+' scores!');
        return;
      }
    }
    if(Math.abs(ring.x)>RINK.halfLength-.18){ring.x=limit(ring.x,-28.82,28.82);flight.vx*=-.72;}
    if(Math.abs(ring.z)>RINK.halfWidth-.19){ring.z=limit(ring.z,-12.81,12.81);flight.vz*=-.72;}
    const drag=Math.exp(-dt*(flight.kind==='pass'?.47:.34));
    flight.vx*=drag;flight.vz*=drag;
    if(Math.hypot(flight.vx,flight.vz)<.84)ring.flight=null;
  }
  if (Math.abs(ring.x)>RINK.goal-RINK.crease && Math.hypot(Math.abs(ring.x)-RINK.goal,ring.z)<RINK.crease){
    if(flight?.kind==='shot' && flight.age<1.25)return;
    const goalie=game.athletes[ring.x>0?11:5];take(game,goalie);return;
  }
  const eligible=game.athletes.filter(p=>p.role!==5&&
    (!flight||(flight.age>.14&&p.id!==flight.from))&&dist(p,ring)<(flight?.target===p.id?1.08:.71));
  if(eligible.length)take(game,eligible.sort((a,b)=>dist(a,ring)-dist(b,ring))[0]);
}
export function tick(game,inputs,dt){
  if(game.ended||!dt)return;
  game.elapsed+=dt;
  if(game.stoppage>0){
    game.stoppage=Math.max(0,game.stoppage-dt);
    if(!game.stoppage)resume(game);
    return;
  }
  if(!game.demo&&!game.practice){
    game.time=Math.max(0,game.time-dt);
    if(game.time===0){game.ended=true;emit(game,'Final horn');return;}
  }
  game.shotClock=Math.max(0,game.shotClock-dt);
  if(!game.shotClock){
    restart(game,1-game.possession,'Shot clock expired · Opponent free pass',game.ring.x,game.ring.z);return;
  }
  game.hold+=dt;game.touchDelay=Math.max(0,game.touchDelay-dt);
  for(const p of game.athletes){
    const seat=game.controls.indexOf(p.id);
    if(seat<0)bot(game,p,dt);
    else{
      const input=inputs[seat]??{};
      move(game,p,input.x??0,input.z??0,dt);
    }
    if(game.stoppage)return;
  }
  stepRing(game,dt);
}
